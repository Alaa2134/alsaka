// Per-tenant OAuth / access-token connectors. Each registered provider
// exposes the same surface: { connect(), disconnect(), test() }. The
// renderer asks for a provider by name and the framework takes care of
// the flow type (Device Flow for GitHub, token-paste for Vercel /
// Netlify, etc.). Tokens are AES-encrypted at rest in the `connections`
// table.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

// ---------------------------------------------------------------------------
// Generic CRUD
// ---------------------------------------------------------------------------
function get({ tenantId, provider }) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT * FROM connections WHERE tenant_id = ? AND provider = ?`)
    .get(tenantId, provider);
  return row ? dbMod.decryptRow('connections', row) : null;
}

function listForTenant(tenantId) {
  const db = dbMod.get();
  const rows = db
    .prepare(`SELECT id, provider, account_login, account_email, account_name, avatar_url, scopes, connected_at, last_used_at, token_type FROM connections WHERE tenant_id = ? ORDER BY connected_at DESC`)
    .all(tenantId);
  // Don't decrypt tokens for the list — we only need the metadata.
  return rows.map((r) => ({ ...r, has_token: true }));
}

function save({ tenantId, provider, payload }) {
  const db = dbMod.get();
  const existing = get({ tenantId, provider });
  const data = dbMod.encryptRow('connections', {
    id: existing?.id || uuid(),
    tenant_id: tenantId,
    provider,
    access_token: payload.access_token ?? existing?.access_token ?? null,
    refresh_token: payload.refresh_token ?? existing?.refresh_token ?? null,
    token_type: payload.token_type ?? existing?.token_type ?? 'bearer',
    scopes: payload.scopes ?? existing?.scopes ?? null,
    account_login: payload.account_login ?? existing?.account_login ?? null,
    account_email: payload.account_email ?? existing?.account_email ?? null,
    account_name: payload.account_name ?? existing?.account_name ?? null,
    avatar_url: payload.avatar_url ?? existing?.avatar_url ?? null,
    extra_json: payload.extra_json ?? existing?.extra_json ?? null,
    connected_at: existing?.connected_at || new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  });
  const cols = Object.keys(data);
  if (existing) {
    db.prepare(
      `UPDATE connections SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`,
    ).run(data);
  } else {
    db.prepare(
      `INSERT INTO connections (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`,
    ).run(data);
  }
  return get({ tenantId, provider });
}

function disconnect({ tenantId, provider }) {
  dbMod.get().prepare(`DELETE FROM connections WHERE tenant_id = ? AND provider = ?`).run(tenantId, provider);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// GitHub — OAuth Device Flow (best UX for desktop apps)
// The vendor registers a GitHub OAuth App once and bundles the client_id
// (it's public — no secret needed for the Device Flow). The customer
// gets a short 8-character code and visits github.com/login/device in
// their browser to authorise.
// ---------------------------------------------------------------------------
const GITHUB_CLIENT_ID =
  process.env.HORUS_GITHUB_CLIENT_ID ||
  // Placeholder — the vendor replaces this before shipping.
  'Iv1.HORUS_REPLACE_ME';

async function githubStartDeviceFlow() {
  const r = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo workflow user:email',
    }),
  });
  if (!r.ok) throw new Error(`GitHub device flow start failed: ${r.status}`);
  return r.json();   // { device_code, user_code, verification_uri, expires_in, interval }
}

async function githubPollForToken({ tenantId, deviceCode, interval = 5 }) {
  // Polls every `interval` seconds until the user authorises in their
  // browser or the device_code expires.
  const start = Date.now();
  const timeout = 10 * 60 * 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - start > timeout) throw new Error('Device flow timeout');
    await new Promise((r) => setTimeout(r, interval * 1000));
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await resp.json();
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') { interval = Math.min(interval + 5, 30); continue; }
    if (data.error) throw new Error(`GitHub: ${data.error_description || data.error}`);
    if (data.access_token) {
      // Fetch user profile so we can show "Connected as <login>"
      const user = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json' },
      }).then((r) => r.json()).catch(() => null);
      return save({
        tenantId,
        provider: 'github',
        payload: {
          access_token: data.access_token,
          token_type: 'oauth',
          scopes: data.scope,
          account_login: user?.login || null,
          account_email: user?.email || null,
          account_name: user?.name || null,
          avatar_url: user?.avatar_url || null,
        },
      });
    }
  }
}

async function githubTest({ tenantId }) {
  const c = get({ tenantId, provider: 'github' });
  if (!c?.access_token) return { ok: false, error: 'not connected' };
  const r = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${c.access_token}`, Accept: 'application/vnd.github+json' },
  });
  return { ok: r.ok, status: r.status };
}

// ---------------------------------------------------------------------------
// Vercel — Personal Access Token (one-time paste, then forever)
// Vercel's OAuth requires going through "Integrations" review; for a
// self-service flow we ask the customer to create a token at
// https://vercel.com/account/tokens and paste it. We validate against
// /v2/user and store metadata so the UX feels native.
// ---------------------------------------------------------------------------
async function vercelConnect({ tenantId, token }) {
  if (!token) throw new Error('Vercel token required');
  const r = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Vercel: ${r.status} — تأكد أن التوكن صحيح`);
  const data = await r.json();
  const user = data.user || data;
  return save({
    tenantId,
    provider: 'vercel',
    payload: {
      access_token: token,
      token_type: 'pat',
      account_login: user.username,
      account_email: user.email,
      account_name: user.name,
      avatar_url: user.avatar ? `https://vercel.com/api/www/avatar?u=${user.username}&s=64` : null,
    },
  });
}

async function vercelTest({ tenantId }) {
  const c = get({ tenantId, provider: 'vercel' });
  if (!c?.access_token) return { ok: false, error: 'not connected' };
  const r = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${c.access_token}` },
  });
  return { ok: r.ok, status: r.status };
}

// ---------------------------------------------------------------------------
// Netlify — Personal Access Token (same pattern as Vercel).
// https://app.netlify.com/user/applications → New token.
// ---------------------------------------------------------------------------
async function netlifyConnect({ tenantId, token }) {
  if (!token) throw new Error('Netlify token required');
  const r = await fetch('https://api.netlify.com/api/v1/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Netlify: ${r.status} — تأكد أن التوكن صحيح`);
  const user = await r.json();
  return save({
    tenantId,
    provider: 'netlify',
    payload: {
      access_token: token,
      token_type: 'pat',
      account_login: user.slug || user.login,
      account_email: user.email,
      account_name: user.full_name || user.name,
      avatar_url: user.avatar_url,
    },
  });
}

// ---------------------------------------------------------------------------
// Cloudflare — API Token for DNS automation (custom domain setup).
// dash.cloudflare.com/profile/api-tokens → Edit zone DNS template.
// ---------------------------------------------------------------------------
async function cloudflareConnect({ tenantId, token }) {
  if (!token) throw new Error('Cloudflare token required');
  const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`Cloudflare: ${r.status} — تأكد أن التوكن صحيح`);
  const data = await r.json();
  if (!data.success) throw new Error('Cloudflare token invalid');
  return save({
    tenantId,
    provider: 'cloudflare',
    payload: { access_token: token, token_type: 'pat', account_login: 'cloudflare' },
  });
}

// ---------------------------------------------------------------------------
// Registry — exposes one provider catalog to the renderer.
// ---------------------------------------------------------------------------
const REGISTRY = {
  github: {
    id: 'github',
    name: 'GitHub',
    description: 'يخزّن كود متجرك على حسابك في GitHub ويتعمل push تلقائيًا مع كل تعديل.',
    auth_kind: 'device_flow',
    docs_url: 'https://docs.github.com',
    setup_steps: [],
  },
  vercel: {
    id: 'vercel',
    name: 'Vercel',
    description: 'يستضيف موقع متجرك مع HTTPS مجاني و CDN عالمي.',
    auth_kind: 'token',
    docs_url: 'https://vercel.com/account/tokens',
    setup_steps: [
      'افتح https://vercel.com/account/tokens',
      'اضغط "Create" واختر صلاحية Full Account',
      'انسخ التوكن والصقه هنا',
    ],
  },
  netlify: {
    id: 'netlify',
    name: 'Netlify',
    description: 'بديل لـ Vercel — استضافة مجانية بـ HTTPS.',
    auth_kind: 'token',
    docs_url: 'https://app.netlify.com/user/applications',
    setup_steps: [
      'افتح https://app.netlify.com/user/applications',
      'اضغط "New access token"',
      'انسخه والصقه هنا',
    ],
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'إدارة الدومين الخاص بك + DNS تلقائي للمتجر.',
    auth_kind: 'token',
    docs_url: 'https://dash.cloudflare.com/profile/api-tokens',
    setup_steps: [
      'افتح https://dash.cloudflare.com/profile/api-tokens',
      'اضغط "Create Token" → "Edit zone DNS"',
      'الصق التوكن هنا',
    ],
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'نسخة احتياطية يومية تلقائية على Drive الشخصي.',
    auth_kind: 'oauth',
    docs_url: '/gdrive-backup',
    setup_steps: ['افتح شاشة "نسخ Google Drive" واضغط "ربط حساب جوجل"'],
  },
};

function listProviders() {
  return Object.values(REGISTRY);
}

module.exports = {
  // CRUD
  get, listForTenant, save, disconnect,
  // GitHub Device Flow
  githubStartDeviceFlow, githubPollForToken, githubTest,
  // Vercel / Netlify / Cloudflare
  vercelConnect, vercelTest, netlifyConnect, cloudflareConnect,
  // Catalog
  listProviders, REGISTRY,
};
