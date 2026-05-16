// Google Drive backup module.
//
// Goals from the user spec:
//   - One-click OAuth login with the user's Google account.
//   - Daily nightly backup of the SQLite DB at a chosen hour.
//   - Single backup file on Drive — every run UPDATES the existing file
//     (drive.files.update keeps the same fileId, so the user's Drive
//     storage usage stays roughly one DB's worth).
//   - If we're offline at the scheduled hour, write the backup to a
//     fixed local path (overwriting yesterday's local snapshot, so no
//     unbounded growth) and retry every 5 minutes until we win.
//   - Optionally encrypt the payload at rest before upload using the
//     machine-derived AES-256-GCM key so a Drive compromise alone
//     doesn't leak business data.
//
// OAuth uses PKCE (no client_secret needed). The vendor only has to
// register a "Desktop application" OAuth client in Google Cloud and
// drop the client_id into env var SYSTEMALAA_GOOGLE_CLIENT_ID before
// shipping. The first launch reads it from there.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const http = require('node:http');
const { URL, URLSearchParams } = require('node:url');
const { promisify } = require('node:util');
const gzip = promisify(zlib.gzip);
const dbMod = require('./db.cjs');
const sec = require('./crypto.cjs');

let appRef = null;
let scheduler = null;
let inFlight = false;
let lastNotice = null;
const listeners = new Set();

const CLIENT_ID =
  process.env.SYSTEMALAA_GOOGLE_CLIENT_ID ||
  // Placeholder — replace before release. Without a real Google OAuth
  // client_id the "Connect" button will fail at the consent screen with
  // "invalid_client".
  'REPLACE_ME.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function attachApp(electronApp) {
  appRef = electronApp;
}

function onUpdate(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function broadcast() {
  const s = state();
  lastNotice = s;
  for (const cb of listeners) {
    try { cb(s); } catch (_) { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------
function ensureRow() {
  const db = dbMod.get();
  const row = db.prepare(`SELECT * FROM google_drive WHERE id = 1`).get();
  if (row) return row;
  db.prepare(`INSERT INTO google_drive (id) VALUES (1)`).run();
  return db.prepare(`SELECT * FROM google_drive WHERE id = 1`).get();
}

function loadRow() {
  return dbMod.decryptRow('google_drive', ensureRow());
}

function patchRow(patch) {
  const db = dbMod.get();
  ensureRow();
  const enc = dbMod.encryptRow('google_drive', { ...patch });
  const cols = Object.keys(enc);
  if (!cols.length) return loadRow();
  db.prepare(
    `UPDATE google_drive SET ${cols.map((c) => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE id = 1`,
  ).run(enc);
  return loadRow();
}

function state() {
  const r = loadRow();
  return {
    connected: !!r.refresh_token,
    enabled: !!r.enabled,
    account_email: r.account_email,
    account_name: r.account_name,
    schedule_hour: r.schedule_hour,
    encrypt_payload: !!r.encrypt_payload,
    last_success_at: r.last_success_at,
    last_attempt_at: r.last_attempt_at,
    last_size_bytes: r.last_size_bytes,
    last_error: r.last_error,
    backup_file_id: r.backup_file_id,
    backup_file_name: r.backup_file_name,
    in_flight: inFlight,
    client_id_set: CLIENT_ID && !CLIENT_ID.startsWith('REPLACE_ME'),
  };
}

// ---------------------------------------------------------------------------
// OAuth (PKCE, loopback redirect)
// ---------------------------------------------------------------------------
function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

let oauthInFlight = null;

async function startOAuth() {
  if (!CLIENT_ID || CLIENT_ID.startsWith('REPLACE_ME')) {
    throw new Error(
      'Google OAuth client_id غير مهيّأ. اضبط متغير البيئة SYSTEMALAA_GOOGLE_CLIENT_ID قبل الإطلاق.',
    );
  }
  if (oauthInFlight) {
    return oauthInFlight;
  }
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());

  oauthInFlight = new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);
        if (reqUrl.pathname !== '/callback') {
          res.writeHead(404).end('not found');
          return;
        }
        const error = reqUrl.searchParams.get('error');
        const code = reqUrl.searchParams.get('code');
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
            renderOAuthResponse(false, error),
          );
          finish(new Error(`OAuth denied: ${error}`));
          return;
        }
        if (!code) {
          res.writeHead(400).end('missing code');
          return;
        }
        const port = server.address().port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;
        const tokens = await exchangeCodeForTokens({
          code,
          codeVerifier,
          redirectUri,
        });
        await persistTokens(tokens);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
          renderOAuthResponse(true),
        );
        finish(null, state());
      } catch (err) {
        try {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' }).end(
            renderOAuthResponse(false, err.message),
          );
        } catch (_) { /* ignore */ }
        finish(err);
      }
    });

    let finished = false;
    const finish = (err, value) => {
      if (finished) return;
      finished = true;
      setTimeout(() => server.close(), 1500);
      oauthInFlight = null;
      if (err) reject(err);
      else resolve(value);
    };

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      const url = `${AUTH_URL}?${params.toString()}`;
      // Open the system browser — never inside the Electron window so
      // Google's anti-embedded-browser checks pass.
      try {
        const { shell } = require('electron');
        shell.openExternal(url);
      } catch (err) {
        finish(err);
      }
      // Hard timeout 5 min
      setTimeout(() => finish(new Error('OAuth timeout')), 5 * 60 * 1000);
    });
  });

  try {
    return await oauthInFlight;
  } finally {
    oauthInFlight = null;
  }
}

function renderOAuthResponse(ok, message) {
  const title = ok ? 'تم الربط بنجاح ✓' : 'فشل الربط';
  const color = ok ? '#16a34a' : '#dc2626';
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
  <title>${title}</title>
  <style>
    body{font-family:system-ui,'Segoe UI',sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f8fafc;color:#0f172a}
    .card{background:white;padding:40px;border-radius:16px;box-shadow:0 8px 30px -8px rgba(0,0,0,0.1);text-align:center;max-width:400px}
    h1{color:${color};margin-bottom:8px}
    p{color:#64748b}
  </style></head><body>
  <div class="card">
    <h1>${title}</h1>
    <p>${ok ? 'تقدر تقفل النافذة دي وترجع للتطبيق.' : message || ''}</p>
  </div>
  </body></html>`;
}

async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Token exchange failed: ${r.status} ${text}`);
  }
  return r.json();
}

async function persistTokens(tokens) {
  // tokens: { access_token, refresh_token, expires_in, token_type, scope, id_token? }
  const expiry = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();
  // Try to fetch the email so we can label the connected account.
  let email = null, name = null;
  try {
    const r = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (r.ok) {
      const u = await r.json();
      email = u.email || null;
      name = u.name || null;
    }
  } catch (_) { /* ignore */ }
  patchRow({
    refresh_token: tokens.refresh_token || loadRow().refresh_token,
    access_token: tokens.access_token,
    token_expiry: expiry,
    account_email: email,
    account_name: name,
    enabled: 1,
    last_error: null,
  });
  broadcast();
}

async function ensureAccessToken() {
  const r = loadRow();
  if (!r.refresh_token) throw new Error('not-connected');
  if (r.access_token && r.token_expiry && new Date(r.token_expiry) > new Date()) {
    return r.access_token;
  }
  // Refresh
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    refresh_token: r.refresh_token,
    grant_type: 'refresh_token',
  });
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed: ${resp.status} ${text}`);
  }
  const tokens = await resp.json();
  patchRow({
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
  });
  return tokens.access_token;
}

async function disconnect() {
  const r = loadRow();
  // Best-effort revoke
  if (r.refresh_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(r.refresh_token)}`, {
        method: 'POST',
      });
    } catch (_) { /* ignore */ }
  }
  patchRow({
    refresh_token: null,
    access_token: null,
    token_expiry: null,
    account_email: null,
    account_name: null,
    backup_file_id: null,
    enabled: 0,
  });
  broadcast();
}

// ---------------------------------------------------------------------------
// Drive upload (single-file overwrite via files.update)
// ---------------------------------------------------------------------------
async function uploadOrUpdate(buffer, mimeType, fileName) {
  const token = await ensureAccessToken();
  const r = loadRow();
  if (r.backup_file_id) {
    // Verify it still exists (user may have trashed it)
    const head = await fetch(`https://www.googleapis.com/drive/v3/files/${r.backup_file_id}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (head.ok) {
      const meta = await head.json();
      if (!meta.trashed) {
        return updateFile(token, r.backup_file_id, buffer, mimeType);
      }
    }
    // Fall through — file gone, create a fresh one and rebind.
  }
  return createFile(token, buffer, mimeType, fileName);
}

async function createFile(token, buffer, mimeType, fileName) {
  const boundary = '-------SystemAlaaBoundary-' + crypto.randomBytes(8).toString('hex');
  const metadata = { name: fileName, mimeType };
  const parts = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const r = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: parts,
    },
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Drive create failed: ${r.status} ${text}`);
  }
  return r.json();
}

async function updateFile(token, fileId, buffer, mimeType) {
  const r = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,size,modifiedTime`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: buffer,
    },
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Drive update failed: ${r.status} ${text}`);
  }
  return r.json();
}

// ---------------------------------------------------------------------------
// Build backup payload from SQLite file (gzip + optional AES-256-GCM)
// ---------------------------------------------------------------------------
function getDbPath() {
  return path.join(appRef.getPath('userData'), 'systemalaa.db');
}
function getLocalFallbackPath() {
  return path.join(appRef.getPath('userData'), 'last-backup.bin');
}

async function buildPayload(encrypt) {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) throw new Error(`DB file not found: ${dbPath}`);
  const raw = await fs.promises.readFile(dbPath);
  const gz = await gzip(raw);
  if (!encrypt) return { buffer: gz, mimeType: 'application/gzip', suffix: '.db.gz' };
  // Re-use the same AES-GCM helper used for column encryption. We
  // concatenate iv|tag|ciphertext and ship as application/octet-stream.
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(`${require('node:os').hostname()}|SystemAlaa::v1::do-not-change-without-migration`).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(gz), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([Buffer.from('SAv1'), iv, tag, ct]);
  return { buffer: out, mimeType: 'application/octet-stream', suffix: '.db.enc' };
}

// ---------------------------------------------------------------------------
// Run a backup: upload to Drive if online, otherwise overwrite the local
// fallback file in-place (so disk usage doesn't grow).
// ---------------------------------------------------------------------------
async function runBackup({ force = false } = {}) {
  if (inFlight) return { ok: false, skipped: true, reason: 'in-flight' };
  const r = loadRow();
  if (!r.enabled) return { ok: false, skipped: true, reason: 'disabled' };
  if (!r.refresh_token) return { ok: false, skipped: true, reason: 'not-connected' };

  inFlight = true;
  patchRow({ last_attempt_at: new Date().toISOString() });
  broadcast();

  let result;
  try {
    const { buffer, mimeType, suffix } = await buildPayload(!!r.encrypt_payload);
    const fileName = (r.backup_file_name || 'systemalaa-backup') .replace(/\.(db|bin|gz|enc)(\.[^.]+)?$/i, '') + suffix;

    // Always refresh the local fallback first so we ALWAYS have the
    // most recent snapshot on disk — overwriting yesterday's local
    // file rather than creating new ones (keeps disk usage flat).
    try {
      await fs.promises.writeFile(getLocalFallbackPath(), buffer);
    } catch (err) {
      console.warn('[SystemAlaa] local fallback write failed:', err.message);
    }

    if (!force && !await isOnline()) {
      patchRow({ last_error: 'offline — kept local snapshot only', last_size_bytes: buffer.length });
      result = { ok: false, skipped: false, offline: true, bytes: buffer.length };
    } else {
      try {
        const meta = await uploadOrUpdate(buffer, mimeType, fileName);
        patchRow({
          backup_file_id: meta.id,
          backup_file_name: fileName,
          last_success_at: new Date().toISOString(),
          last_error: null,
          last_size_bytes: Number(meta.size) || buffer.length,
        });
        result = { ok: true, file: meta, bytes: buffer.length };
      } catch (err) {
        patchRow({ last_error: String(err.message || err), last_size_bytes: buffer.length });
        result = { ok: false, error: String(err.message || err), bytes: buffer.length };
      }
    }
  } finally {
    inFlight = false;
    broadcast();
  }
  return result;
}

async function isOnline() {
  // Quick connectivity probe — favors fast failure over thoroughness.
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('https://www.googleapis.com/discovery/v1/apis', { signal: ctl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scheduler — runs every 5 min, fires once per day after the configured
// hour, plus retries on the next tick if the previous run failed.
// ---------------------------------------------------------------------------
function start() {
  stop();
  scheduler = setInterval(maybeRun, 5 * 60 * 1000);
  // Run once 30s after start so a fresh install gets its first snapshot
  setTimeout(maybeRun, 30_000);
}

function stop() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
}

async function maybeRun() {
  try {
    const r = loadRow();
    if (!r.enabled || !r.refresh_token) return;
    const now = new Date();
    if (now.getHours() < (r.schedule_hour || 2)) return;
    if (r.last_success_at) {
      const last = new Date(r.last_success_at);
      const sameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
      if (sameDay) return; // Already backed up today
    }
    await runBackup();
  } catch (err) {
    console.warn('[SystemAlaa] scheduler tick error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Settings setters
// ---------------------------------------------------------------------------
function setSchedule({ scheduleHour, encryptPayload, enabled }) {
  const patch = {};
  if (typeof scheduleHour === 'number') patch.schedule_hour = Math.max(0, Math.min(23, scheduleHour));
  if (typeof encryptPayload === 'boolean') patch.encrypt_payload = encryptPayload ? 1 : 0;
  if (typeof enabled === 'boolean') patch.enabled = enabled ? 1 : 0;
  patchRow(patch);
  broadcast();
  return state();
}

function localFallbackInfo() {
  const p = getLocalFallbackPath();
  if (!fs.existsSync(p)) return { path: p, exists: false };
  const st = fs.statSync(p);
  return { path: p, exists: true, size: st.size, mtime: st.mtime.toISOString() };
}

module.exports = {
  attachApp,
  state,
  startOAuth,
  disconnect,
  runBackup,
  setSchedule,
  start,
  stop,
  onUpdate,
  localFallbackInfo,
};
