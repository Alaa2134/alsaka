// AES-256-GCM helpers + hardened device fingerprint.
//
// IMPORTANT: The AES key (KEY) keeps deriving from the ORIGINAL weak
// fingerprint to preserve backward compatibility with existing
// encrypted DB rows. The device-binding `deviceFingerprint()` uses a
// much stronger composite, but licensing + auth check both the new
// fingerprint AND the legacy "lite" one for a grace migration.
const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const PEPPER = 'SystemAlaa::v1::do-not-change-without-migration';
const ALGO = 'aes-256-gcm';

// ---------------------------------------------------------------------------
// AES key (LEGACY weak fingerprint — kept for DB backward compatibility)
// ---------------------------------------------------------------------------
function legacyFingerprintComponents() {
  return [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.userInfo().username || '',
  ].join('|');
}

function deriveKey() {
  return crypto.createHash('sha256').update(legacyFingerprintComponents() + '|' + PEPPER).digest();
}

const KEY = deriveKey();

function encrypt(plain) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  if (typeof payload !== 'string' || !payload.startsWith('v1:')) return payload;
  try {
    const [, ivB64, tagB64, ctB64] = payload.split(':');
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const out = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
    return out.toString('utf8');
  } catch (err) {
    console.error('[Horus] decrypt failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hardened fingerprint components (used for device binding only)
// ---------------------------------------------------------------------------
function readMachineGuid() {
  try {
    if (process.platform === 'linux') {
      for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
      }
    } else if (process.platform === 'darwin') {
      try {
        const out = execSync(
          "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '\"'",
          { encoding: 'utf8', timeout: 1500 },
        ).trim();
        if (out) return out;
      } catch (_) { /* fall through */ }
    } else if (process.platform === 'win32') {
      try {
        const out = execSync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
          { encoding: 'utf8', timeout: 1500 },
        );
        const m = /MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i.exec(out);
        if (m) return m[1];
      } catch (_) { /* fall through */ }
    }
  } catch (_) { /* ignore */ }
  return '';
}

function primaryMacAddress() {
  try {
    const ifs = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(ifs)) {
      if (/lo|docker|veth|vbox|vmnet|virbr|wsl|tap|tun/i.test(name)) continue;
      for (const a of addrs || []) {
        if (a.mac && a.mac !== '00:00:00:00:00:00' && !a.internal) return a.mac;
      }
    }
  } catch (_) { /* ignore */ }
  return '';
}

function strongFingerprintComponents() {
  return [
    legacyFingerprintComponents(),
    String(os.cpus().length),
    readMachineGuid(),
    primaryMacAddress(),
  ].join('|');
}

// ---------------------------------------------------------------------------
// Anchor file — per-installation UUID written to userData on first
// boot. Deleting it locks the app (the licensing module checks).
// ---------------------------------------------------------------------------
let cachedAnchor = null;

function anchorPath(userDataDir) {
  return path.join(userDataDir, '.horus-anchor');
}

function ensureAnchor(userDataDir) {
  if (cachedAnchor && cachedAnchor.dir === userDataDir) return cachedAnchor.data;
  const p = anchorPath(userDataDir);
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const decoded = decrypt(raw);
      if (decoded) {
        const data = JSON.parse(decoded);
        if (data?.uuid && data?.created_at) {
          cachedAnchor = { dir: userDataDir, data };
          return data;
        }
      }
    } catch (_) { /* corrupted — recreate */ }
  }
  const data = {
    uuid: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    components_sample: strongFingerprintComponents().slice(0, 80),
  };
  try {
    fs.writeFileSync(p, encrypt(JSON.stringify(data)), { mode: 0o600 });
  } catch (err) {
    console.warn('[Horus] anchor write failed:', err.message);
  }
  cachedAnchor = { dir: userDataDir, data };
  return data;
}

function verifyAnchor(userDataDir) {
  const p = anchorPath(userDataDir);
  if (!fs.existsSync(p)) return { ok: false, reason: 'anchor-missing' };
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const decoded = decrypt(raw);
    if (!decoded) return { ok: false, reason: 'anchor-tampered' };
    const data = JSON.parse(decoded);
    if (!data?.uuid) return { ok: false, reason: 'anchor-invalid' };
    cachedAnchor = { dir: userDataDir, data };
    return { ok: true, anchor: data };
  } catch (_) {
    return { ok: false, reason: 'anchor-decode-failed' };
  }
}

// ---------------------------------------------------------------------------
// Fingerprints used by licensing + auth for device binding.
// `deviceFingerprintLegacy` is the OLD weak hash — kept so existing
// claimed accounts/licenses still validate after the upgrade.
// `deviceFingerprint(userDataDir)` is the new strong hash that includes
// machine GUID + MAC + anchor UUID.
// ---------------------------------------------------------------------------
function deviceFingerprintLegacy() {
  return crypto
    .createHash('sha256')
    .update(`${os.hostname()}|${os.platform()}|${os.arch()}|${os.userInfo().username}`)
    .digest('hex');
}

function deviceFingerprint(userDataDir = null) {
  let anchorUuid = '';
  if (userDataDir) {
    try { anchorUuid = ensureAnchor(userDataDir).uuid; } catch (_) { /* ignore */ }
  }
  return crypto
    .createHash('sha256')
    .update(`${strongFingerprintComponents()}|${PEPPER}|${anchorUuid}`)
    .digest('hex');
}

// Accepts either the legacy or the new fingerprint — used during the
// migration window so existing bound accounts don't get locked out.
function fingerprintMatches(stored, userDataDir = null) {
  if (!stored) return false;
  if (stored === deviceFingerprint(userDataDir)) return true;
  if (stored === deviceFingerprintLegacy()) return true;
  return false;
}

function describeDevice() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model || '',
    cpu_count: os.cpus().length,
    username: os.userInfo().username || '',
    machine_guid_present: Boolean(readMachineGuid()),
    mac_present: Boolean(primaryMacAddress()),
    fingerprint_short: deviceFingerprintLegacy().slice(0, 16),
  };
}

module.exports = {
  encrypt,
  decrypt,
  deviceFingerprint,
  deviceFingerprintLegacy,
  fingerprintMatches,
  describeDevice,
  ensureAnchor,
  verifyAnchor,
};
