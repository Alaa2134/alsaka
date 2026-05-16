// WhatsApp integration via whatsapp-web.js (Puppeteer-backed). The session
// is persisted to the Electron userData dir so the user only scans the QR
// once. The QR string itself is forwarded to the renderer which renders it
// as a scannable image.
const path = require('node:path');
const fs = require('node:fs');

let app = null;
let Client = null;
let LocalAuth = null;
let MessageMedia = null;
let client = null;
let lastQr = null;
let state = 'disconnected'; // disconnected | initializing | qr | authenticated | ready | error
let lastError = null;
const listeners = new Set();

function attachApp(electronApp) {
  app = electronApp;
}

function emit(payload) {
  for (const cb of listeners) {
    try {
      cb({ state, qr: lastQr, error: lastError, ...payload });
    } catch (_) {
      /* ignore */
    }
  }
}

function onUpdate(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getState() {
  return { state, qr: lastQr, error: lastError };
}

async function ensureLib() {
  if (Client) return;
  try {
    // Dynamically loaded so the main process still boots if the user hasn't
    // installed the heavy puppeteer/whatsapp-web.js dependencies yet.
    const wa = require('whatsapp-web.js');
    Client = wa.Client;
    LocalAuth = wa.LocalAuth;
    MessageMedia = wa.MessageMedia;
  } catch (err) {
    state = 'error';
    lastError = 'whatsapp-web.js not installed. Run: npm install whatsapp-web.js qrcode';
    throw new Error(lastError);
  }
}

function sessionDir() {
  if (!app) throw new Error('whatsapp module not attached to app');
  return path.join(app.getPath('userData'), 'wa-session');
}

async function initialize() {
  await ensureLib();
  if (client) return getState();
  state = 'initializing';
  lastError = null;
  emit({});

  const dir = sessionDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: dir }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    state = 'qr';
    emit({});
  });
  client.on('authenticated', () => {
    state = 'authenticated';
    lastQr = null;
    emit({});
  });
  client.on('auth_failure', (msg) => {
    state = 'error';
    lastError = String(msg || 'auth_failure');
    emit({});
  });
  client.on('ready', () => {
    state = 'ready';
    lastQr = null;
    lastError = null;
    emit({});
  });
  client.on('disconnected', (reason) => {
    state = 'disconnected';
    lastError = String(reason || '');
    emit({});
    client = null;
  });

  try {
    await client.initialize();
  } catch (err) {
    state = 'error';
    lastError = String(err.message || err);
    emit({});
  }
  return getState();
}

async function logout() {
  if (!client) return;
  try {
    await client.logout();
  } catch (_) {
    /* ignore */
  }
  try {
    await client.destroy();
  } catch (_) {
    /* ignore */
  }
  client = null;
  state = 'disconnected';
  lastQr = null;
  emit({});
}

// Normalize an Arabic/local phone number into the WhatsApp chat id format
// `<digits>@c.us`. Defaults to Egypt (20) when the user provides a local
// 0XXXXXXXXXX number — adjust for your country if needed.
function normalizeChatId(rawPhone, defaultCountry = '20') {
  if (!rawPhone) return null;
  // If already in chatId form, return as-is
  if (String(rawPhone).endsWith('@c.us')) return String(rawPhone);
  // Eastern-Arabic digits -> Latin
  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  let digits = String(rawPhone)
    .split('')
    .map((c) => (c in map ? map[c] : c))
    .join('')
    .replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = defaultCountry + digits.slice(1);
  return `${digits}@c.us`;
}

async function sendText({ to, body }) {
  if (!client || state !== 'ready') throw new Error('whatsapp not ready');
  const chatId = normalizeChatId(to);
  if (!chatId) throw new Error('invalid phone number');
  await client.sendMessage(chatId, String(body || ''));
  return { ok: true, chatId };
}

async function sendImage({ to, dataUrl, caption, filename }) {
  if (!client || state !== 'ready') throw new Error('whatsapp not ready');
  await ensureLib();
  const chatId = normalizeChatId(to);
  if (!chatId) throw new Error('invalid phone number');

  // dataUrl: "data:image/png;base64,XXXX..."
  const match = /^data:(.*?);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('expected base64 data URL');
  const mime = match[1] || 'image/png';
  const data = match[2];
  const media = new MessageMedia(mime, data, filename || 'invoice.png');
  await client.sendMessage(chatId, media, { caption: caption || '' });
  return { ok: true, chatId };
}

module.exports = {
  attachApp,
  initialize,
  logout,
  getState,
  onUpdate,
  sendText,
  sendImage,
  normalizeChatId,
};
