// AES-256-GCM helpers used to encrypt sensitive columns at rest.
// The key is derived from the local machine fingerprint + a static pepper,
// so dumps of the DB file alone cannot trivially decrypt sensitive fields.
const crypto = require('node:crypto');
const os = require('node:os');

const PEPPER = 'SystemAlaa::v1::do-not-change-without-migration';
const ALGO = 'aes-256-gcm';

function deriveKey() {
  const fingerprint = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.userInfo().username || '',
  ].join('|');
  return crypto.createHash('sha256').update(fingerprint + '|' + PEPPER).digest();
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
    console.error('[SystemAlaa] decrypt failed:', err.message);
    return null;
  }
}

// Stable per-machine fingerprint hash used to bind access codes to a device.
function deviceFingerprint() {
  return crypto
    .createHash('sha256')
    .update(`${os.hostname()}|${os.platform()}|${os.arch()}|${os.userInfo().username}`)
    .digest('hex');
}

module.exports = { encrypt, decrypt, deviceFingerprint };
