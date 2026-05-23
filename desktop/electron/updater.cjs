// Auto-updater backed by the vendor SaaS release feed. Checks for new
// .exe versions on boot and every 24h, downloads in the background,
// and prompts the user to install on next quit.
//
// The feed format matches the JSON returned by the vendor Worker:
//   { version, notes, url, sha256, size, published_at }
//
// We deliberately avoid electron-builder's default GitHub provider so
// every customer pulls from the same vendor server (single source of
// truth for releases + auditability).
const { app, dialog, Notification } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');

const VENDOR_URL = process.env.HORUS_VENDOR_URL || '';
const CHANNEL = process.env.HORUS_CHANNEL || 'stable';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

let timer = null;
let downloading = false;
let pendingInstaller = null; // path to downloaded .exe

function semverGt(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    lib.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlink(dest, () => undefined);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => undefined);
      reject(err);
    });
  });
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (d) => h.update(d))
      .on('end', () => resolve(h.digest('hex')))
      .on('error', reject);
  });
}

async function checkOnce(mainWindow) {
  if (downloading) return { skipped: true, reason: 'in-flight' };
  if (!VENDOR_URL) return { skipped: true, reason: 'vendor-url-missing' };
  try {
    const feed = await fetchJson(`${VENDOR_URL}/api/releases/latest?channel=${CHANNEL}`);
    const current = app.getVersion();
    if (!feed?.version || !semverGt(feed.version, current)) {
      return { available: false, current, latest: feed?.version };
    }
    console.log(`[Horus] update available: ${current} → ${feed.version}`);
    downloading = true;
    try {
      const tmp = path.join(app.getPath('temp'), `horus-${feed.version}.exe`);
      await downloadFile(feed.url, tmp);
      if (feed.sha256) {
        const got = await sha256File(tmp);
        if (got !== feed.sha256) {
          fs.unlinkSync(tmp);
          console.warn('[Horus] checksum mismatch — refusing to install', got, 'vs', feed.sha256);
          return { available: true, error: 'checksum-mismatch' };
        }
      }
      pendingInstaller = tmp;
      console.log('[Horus] update downloaded:', tmp);
      // Surface to the user — non-blocking notification
      try {
        if (Notification.isSupported()) {
          new Notification({
            title: `Horus ${feed.version} جاهز للتركيب`,
            body: feed.notes ? String(feed.notes).slice(0, 120) : 'إعادة التشغيل لتطبيق التحديث',
          }).show();
        }
      } catch { /* ignore */ }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:downloaded', { version: feed.version, notes: feed.notes });
      }
      return { available: true, downloaded: true, version: feed.version };
    } finally {
      downloading = false;
    }
  } catch (err) {
    console.warn('[Horus] update check failed:', err.message);
    return { error: String(err.message || err) };
  }
}

function start(mainWindow) {
  if (timer) clearInterval(timer);
  timer = setInterval(() => checkOnce(mainWindow).catch(() => undefined), CHECK_INTERVAL);
  // First check 60 seconds after launch
  setTimeout(() => checkOnce(mainWindow).catch(() => undefined), 60_000);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

// Called from the app's "Install update and restart" button. Spawns
// the installer detached so it can run after we quit.
async function installAndRestart() {
  if (!pendingInstaller || !fs.existsSync(pendingInstaller)) {
    return { ok: false, error: 'no-pending-installer' };
  }
  const installer = pendingInstaller;
  pendingInstaller = null;
  try {
    if (process.platform === 'win32') {
      const child = spawn(installer, ['/S', '--updated'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      // macOS/Linux fall back to opening the file
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
      spawn(opener, [installer], { detached: true, stdio: 'ignore' }).unref();
    }
    setTimeout(() => app.quit(), 1500);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function status() {
  return {
    vendor_url: VENDOR_URL,
    channel: CHANNEL,
    current_version: app.getVersion(),
    downloading,
    pending_install: !!pendingInstaller,
  };
}

module.exports = { start, stop, checkOnce, installAndRestart, status };
