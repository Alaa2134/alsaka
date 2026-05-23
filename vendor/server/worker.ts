// Horus Vendor SaaS — Cloudflare Worker backend.
//
// All endpoints live behind `/api/*`. Static assets (the admin SPA)
// are served from `/`. The same Worker binds D1 (for licenses,
// heartbeats, releases) and R2 (for the .exe binaries).
//
// CRITICAL: the HMAC key generation here MUST match the desktop
// `licensing.cjs::signPayload` — same VENDOR_SECRET, same 10-hex
// upper-case slice — or installs will reject server-issued keys.

export interface Env {
  DB: D1Database;
  RELEASES: R2Bucket;
  VENDOR_SECRET: string;
  ADMIN_PASSWORD_HASH: string;   // legacy override — DB admin_users is the real source
  JWT_SECRET: string;
}

const TIER_DEFAULT_VALIDITY_DAYS = 365;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key: string, payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Same format as the desktop: SA-<TIER>-<YYYYMMDD>-<NONCE>-<HMAC10>
async function issueKey(
  env: Env,
  { tier, expiryYmd, nonce }: { tier: string; expiryYmd: string; nonce?: string },
): Promise<string> {
  const n = nonce || Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const sig = (await hmacHex(env.VENDOR_SECRET, `${tier}|${expiryYmd}|${n}`))
    .slice(0, 10)
    .toUpperCase();
  return `SA-${tier}-${expiryYmd}-${n}-${sig}`;
}

function defaultExpiry(days: number = TIER_DEFAULT_VALIDITY_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// ---------------------------------------------------------------------------
// Auth (very small — single admin pool, no signups)
// ---------------------------------------------------------------------------
async function issueJwt(env: Env, email: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    sub: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const sig = (await hmacHex(env.JWT_SECRET, `${header}.${payload}`))
    .replace(/=+$/, '');
  return `${header}.${payload}.${sig}`;
}

async function verifyJwt(env: Env, token: string): Promise<{ sub: string } | null> {
  try {
    const [header, payload, sig] = token.split('.');
    const expected = (await hmacHex(env.JWT_SECRET, `${header}.${payload}`)).replace(/=+$/, '');
    if (expected !== sig) return null;
    const body = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: body.sub };
  } catch {
    return null;
  }
}

async function requireAdmin(env: Env, req: Request): Promise<{ email: string } | Response> {
  const auth = req.headers.get('Authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!m) return json({ error: 'unauthorized' }, { status: 401 });
  const verified = await verifyJwt(env, m[1]);
  if (!verified) return json({ error: 'unauthorized' }, { status: 401 });
  return { email: verified.sub };
}

async function audit(env: Env, email: string | null, action: string, target: string | null, details: unknown, ip: string | null) {
  await env.DB.prepare(
    `INSERT INTO audit_log (admin_email, action, target, details, ip) VALUES (?, ?, ?, ?, ?)`,
  ).bind(email, action, target, JSON.stringify(details || null), ip).run();
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
async function handleLogin(env: Env, req: Request): Promise<Response> {
  const { email, password } = await req.json<{ email: string; password: string }>();
  if (!email || !password) return json({ error: 'missing-fields' }, { status: 400 });

  const hash = await sha256Hex(password);
  const row = await env.DB.prepare(
    `SELECT email, password_hash, display_name FROM admin_users WHERE email = ?`,
  ).bind(email.toLowerCase()).first<{ email: string; password_hash: string; display_name: string }>();

  if (!row || row.password_hash !== hash) {
    // legacy single-env-var admin fallback
    if (env.ADMIN_PASSWORD_HASH && hash === env.ADMIN_PASSWORD_HASH && email === 'admin@horus.app') {
      const token = await issueJwt(env, email);
      return json({ ok: true, token, user: { email, name: 'Admin' } });
    }
    return json({ error: 'invalid-credentials' }, { status: 401 });
  }
  await env.DB.prepare(`UPDATE admin_users SET last_login_at = datetime('now') WHERE email = ?`)
    .bind(row.email).run();
  const token = await issueJwt(env, row.email);
  return json({ ok: true, token, user: { email: row.email, name: row.display_name } });
}

async function handleIssueLicense(env: Env, req: Request, admin: { email: string }, ip: string | null) {
  const body = await req.json<{
    tier?: string;
    expiry?: string;
    days?: number;
    customer_email?: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    count?: number;
  }>();
  const tier = (body.tier || 'PRO').toUpperCase();
  const expiryYmd = body.expiry?.replace(/-/g, '') || defaultExpiry(body.days || TIER_DEFAULT_VALIDITY_DAYS);
  const count = Math.max(1, Math.min(100, body.count || 1));

  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = await issueKey(env, { tier, expiryYmd });
    keys.push(key);
    const expiryIso = `${expiryYmd.slice(0, 4)}-${expiryYmd.slice(4, 6)}-${expiryYmd.slice(6, 8)}`;
    await env.DB.prepare(
      `INSERT INTO licenses (key, tier, expiry, customer_email, customer_name, customer_phone, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      key, tier, expiryIso,
      body.customer_email || null, body.customer_name || null, body.customer_phone || null,
      body.notes || null, admin.email,
    ).run();
  }
  await audit(env, admin.email, 'license.issued', null, { count, tier, expiryYmd }, ip);
  return json({ ok: true, keys });
}

async function handleListLicenses(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT l.*,
            h.fingerprint_short, h.version, h.ip AS last_ip, h.country AS last_country,
            h.received_at AS last_seen
       FROM licenses l
       LEFT JOIN last_heartbeat h ON h.license_key = l.key
       ORDER BY l.created_at DESC LIMIT 1000`,
  ).all();
  return json({ data: results });
}

async function handleRevokeLicense(env: Env, key: string, admin: { email: string }, ip: string | null, reason: string | null) {
  await env.DB.prepare(
    `UPDATE licenses SET is_revoked = 1, revoked_at = datetime('now'), revoked_reason = ? WHERE key = ?`,
  ).bind(reason, key).run();
  await audit(env, admin.email, 'license.revoked', key, { reason }, ip);
  return json({ ok: true });
}

async function handleHeartbeat(env: Env, req: Request, ip: string | null, country: string | null, city: string | null) {
  const body = await req.json<{
    key: string;
    fingerprint_short?: string;
    version?: string;
    install_count?: number;
    metadata?: unknown;
  }>();
  if (!body.key) return json({ error: 'missing-key' }, { status: 400 });

  const license = await env.DB.prepare(
    `SELECT key, tier, expiry, is_revoked FROM licenses WHERE key = ?`,
  ).bind(body.key).first<{ key: string; tier: string; expiry: string; is_revoked: number }>();

  // Record the heartbeat regardless so we can see attempts at revoked keys.
  await env.DB.prepare(
    `INSERT INTO heartbeats (license_key, fingerprint_short, version, ip, country, city, user_agent, install_count, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    body.key, body.fingerprint_short || null, body.version || null,
    ip, country, city, req.headers.get('User-Agent') || null,
    body.install_count || 1, JSON.stringify(body.metadata || null),
  ).run();

  // Refresh the last-heartbeat materialised row
  await env.DB.prepare(
    `INSERT INTO last_heartbeat (license_key, fingerprint_short, version, ip, country, city, received_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(license_key) DO UPDATE SET
       fingerprint_short = excluded.fingerprint_short,
       version = excluded.version,
       ip = excluded.ip,
       country = excluded.country,
       city = excluded.city,
       received_at = excluded.received_at`,
  ).bind(
    body.key, body.fingerprint_short || null, body.version || null,
    ip, country, city,
  ).run();

  if (!license) {
    return json({ verdict: 'unknown', message: 'license not issued' });
  }
  if (license.is_revoked) {
    return json({ verdict: 'revoked', message: 'License revoked by vendor' });
  }
  if (new Date(license.expiry) < new Date()) {
    return json({ verdict: 'expired', expiry: license.expiry });
  }
  return json({ verdict: 'ok', tier: license.tier, expiry: license.expiry });
}

async function handleLatestRelease(env: Env, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const channel = url.searchParams.get('channel') || 'stable';
  const row = await env.DB.prepare(
    `SELECT * FROM releases WHERE channel = ? AND is_active = 1 ORDER BY published_at DESC LIMIT 1`,
  ).bind(channel).first();
  if (!row) return json({ error: 'no-release' }, { status: 404 });
  // electron-updater expects this shape (latest.yml-equivalent JSON)
  return json({
    version: row.version,
    notes: row.notes,
    url: row.exe_url,
    sha256: row.exe_sha256,
    size: row.exe_size_bytes,
    published_at: row.published_at,
  });
}

async function handleUploadRelease(env: Env, req: Request, admin: { email: string }, ip: string | null) {
  // multipart upload — the SPA sends FormData with `version`, `notes`,
  // `channel`, and the .exe file. The Worker stores the binary in R2
  // and writes the metadata to D1.
  const form = await req.formData();
  const version = String(form.get('version') || '').trim();
  const channel = String(form.get('channel') || 'stable');
  const notes = String(form.get('notes') || '');
  const file = form.get('file') as File | null;
  if (!version || !file) return json({ error: 'missing-fields' }, { status: 400 });

  const key = `releases/horus-${version}.exe`;
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(new TextDecoder('latin1').decode(buf));
  await env.RELEASES.put(key, buf, {
    httpMetadata: { contentType: 'application/octet-stream' },
  });
  // Public URL pattern: customise based on your R2 bucket public access
  const publicUrl = `${new URL(req.url).origin}/api/releases/${version}/download`;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO releases (version, channel, notes, exe_url, exe_size_bytes, exe_sha256, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  ).bind(version, channel, notes, publicUrl, buf.byteLength, sha256).run();
  await audit(env, admin.email, 'release.uploaded', version, { channel, size: buf.byteLength }, ip);
  return json({ ok: true, version, url: publicUrl, size: buf.byteLength, sha256 });
}

async function handleDownloadRelease(env: Env, version: string) {
  const key = `releases/horus-${version}.exe`;
  const obj = await env.RELEASES.get(key);
  if (!obj) return json({ error: 'not-found' }, { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="horus-${version}.exe"`,
      ...CORS_HEADERS,
    },
  });
}

async function handleAnalytics(env: Env) {
  const [totals, recent] = await Promise.all([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM licenses WHERE is_revoked = 0 AND date(expiry) >= date('now')) AS active,
      (SELECT COUNT(*) FROM licenses WHERE is_revoked = 1) AS revoked,
      (SELECT COUNT(*) FROM licenses WHERE date(expiry) < date('now')) AS expired,
      (SELECT COUNT(DISTINCT license_key) FROM last_heartbeat WHERE received_at >= datetime('now', '-7 days')) AS active_7d,
      (SELECT COUNT(DISTINCT license_key) FROM last_heartbeat WHERE received_at >= datetime('now', '-24 hours')) AS active_24h
    `).first(),
    env.DB.prepare(`SELECT date(received_at) AS d, COUNT(DISTINCT license_key) AS c
                    FROM heartbeats WHERE received_at >= datetime('now', '-30 days')
                    GROUP BY d ORDER BY d`).all(),
  ]);
  return json({ totals, recent: recent.results });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(req.url);
    const path = url.pathname;
    const ip = req.headers.get('CF-Connecting-IP');
    // Cloudflare populates these on the Request object
    const cf = (req as any).cf || {};
    const country = cf.country || null;
    const city = cf.city || null;

    try {
      // Public endpoints
      if (path === '/api/health') {
        return json({ ok: true, service: 'horus-vendor' });
      }
      if (path === '/api/login' && req.method === 'POST') {
        return handleLogin(env, req);
      }
      if (path === '/api/hb' && req.method === 'POST') {
        return handleHeartbeat(env, req, ip, country, city);
      }
      if (path === '/api/releases/latest' && req.method === 'GET') {
        return handleLatestRelease(env, req);
      }
      const dl = path.match(/^\/api\/releases\/([^/]+)\/download$/);
      if (dl && req.method === 'GET') {
        return handleDownloadRelease(env, decodeURIComponent(dl[1]));
      }

      // Admin endpoints
      const admin = await requireAdmin(env, req);
      if (admin instanceof Response) return admin;

      if (path === '/api/licenses' && req.method === 'POST') {
        return handleIssueLicense(env, req, admin, ip);
      }
      if (path === '/api/licenses' && req.method === 'GET') {
        return handleListLicenses(env);
      }
      const rev = path.match(/^\/api\/licenses\/([^/]+)\/revoke$/);
      if (rev && req.method === 'POST') {
        const body = await req.json<{ reason?: string }>().catch(() => ({}));
        return handleRevokeLicense(env, decodeURIComponent(rev[1]), admin, ip, body.reason || null);
      }
      if (path === '/api/releases' && req.method === 'POST') {
        return handleUploadRelease(env, req, admin, ip);
      }
      if (path === '/api/releases' && req.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM releases ORDER BY published_at DESC LIMIT 50`,
        ).all();
        return json({ data: results });
      }
      if (path === '/api/analytics' && req.method === 'GET') {
        return handleAnalytics(env);
      }
      if (path === '/api/audit' && req.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM audit_log ORDER BY at DESC LIMIT 200`,
        ).all();
        return json({ data: results });
      }

      return json({ error: 'not-found' }, { status: 404 });
    } catch (err) {
      console.error('worker error', err);
      return json({ error: String((err as Error).message || err) }, { status: 500 });
    }
  },
};
