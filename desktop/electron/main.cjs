// SystemAlaa Desktop - Electron main process
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  shell,
  nativeImage,
  Notification,
  dialog,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const dbMod = require('./db.cjs');
const repo = require('./repo.cjs');
const auth = require('./auth.cjs');
const accounting = require('./accounting.cjs');
const whatsapp = require('./whatsapp.cjs');
const security = require('./security.cjs');
const licensing = require('./licensing.cjs');
const store = require('./store.cjs');
const shipping = require('./shipping.cjs');
const payments = require('./payments.cjs');
const gdrive = require('./google-drive.cjs');
const shifts = require('./shifts.cjs');
const uiPrefs = require('./ui-prefs.cjs');
const zatca = require('./zatca.cjs');
const waQueue = require('./whatsapp-queue.cjs');
const aiAssistant = require('./ai-assistant.cjs');
const apiServer = require('./api-server.cjs');

const isDev = !app.isPackaged && process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL || 'http://localhost:5173';

let mainWindow = null;
let tray = null;
let isQuitting = false;
let backupTimer = null;

function getDocsDir() {
  return path.join(app.getPath('documents'), 'SystemAlaa');
}
function getBackupsDir() {
  return path.join(getDocsDir(), 'Backups');
}
function getDbPath() {
  return path.join(app.getPath('userData'), 'systemalaa.db');
}
function ensureDirs() {
  for (const d of [getDocsDir(), getBackupsDir()]) {
    try {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    } catch (err) {
      console.warn('[SystemAlaa] mkdir failed', d, err);
    }
  }
}

function resolveIconPath() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(__dirname, '..', 'public', 'icons', 'icon.png'),
    path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}
function getIcon() {
  const p = resolveIconPath();
  return p ? nativeImage.createFromPath(p) : nativeImage.createEmpty();
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    icon: getIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(buildAppMenu());

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.once('did-frame-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch((err) => {
      console.error('[SystemAlaa] load failed', err);
    });
    // Hard-disable DevTools and unsafe navigation in production builds.
    mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools());
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault();
      }
    });
  }

  // Refuse any navigation away from the app's own origin.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? DEV_URL : 'file://';
    if (!url.startsWith(allowed)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const emitMax = () => send('window:maximize-changed', mainWindow.isMaximized());
  mainWindow.on('maximize', emitMax);
  mainWindow.on('unmaximize', emitMax);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: 'حول SystemAlaa' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit', label: 'إنهاء' },
          ],
        }]
      : []),
    {
      label: 'ملف',
      submenu: [
        { label: 'فاتورة جديدة', accelerator: 'CmdOrCtrl+Shift+N', click: () => send('app:navigate', '/invoice') },
        { label: 'الفواتير', click: () => send('app:navigate', '/invoices') },
        { type: 'separator' },
        { label: 'طباعة', accelerator: 'CmdOrCtrl+P', click: () => send('app:print') },
        {
          label: 'فتح مجلد النسخ الاحتياطي',
          click: () => {
            ensureDirs();
            shell.openPath(getBackupsDir());
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'إغلاق' } : { role: 'quit', label: 'إنهاء' },
      ],
    },
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'إخفاء/إظهار القائمة الجانبية', accelerator: 'CmdOrCtrl+B', click: () => send('app:toggle-sidebar') },
        { label: 'تبديل الوضع الليلي', accelerator: 'CmdOrCtrl+Shift+D', click: () => send('app:toggle-theme') },
        { type: 'separator' },
        { role: 'reload', label: 'إعادة تحميل' },
        { role: 'forceReload', label: 'إعادة تحميل قسرية' },
        { role: 'toggleDevTools', label: 'أدوات المطور' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'إعادة ضبط التكبير' },
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' },
      ],
    },
    {
      label: 'أدوات',
      submenu: [
        { label: 'مزامنة الآن', click: () => send('app:sync-now') },
        { label: 'تركيز على الباركود', accelerator: 'CmdOrCtrl+Shift+F', click: () => send('app:focus-barcode') },
        { label: 'نسخة احتياطية الآن', click: () => triggerBackupRequest() },
        { type: 'separator' },
        { label: 'الإعدادات', click: () => send('app:navigate', '/company-settings') },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول SystemAlaa',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول SystemAlaa',
              message: 'SystemAlaa Desktop',
              detail:
                `الإصدار: ${app.getVersion()}\n` +
                `Electron: ${process.versions.electron}\n` +
                `Chromium: ${process.versions.chrome}\n` +
                `Node: ${process.versions.node}`,
              buttons: ['موافق'],
            });
          },
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

function createTray() {
  try {
    tray = new Tray(getIcon());
  } catch (err) {
    console.warn('[SystemAlaa] tray unavailable:', err.message);
    return;
  }
  tray.setToolTip('SystemAlaa');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'فتح', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: 'فاتورة جديدة', click: () => { mainWindow?.show(); mainWindow?.focus(); send('app:navigate', '/invoice'); } },
      { label: 'الإعدادات', click: () => { mainWindow?.show(); mainWindow?.focus(); send('app:navigate', '/company-settings'); } },
      { type: 'separator' },
      { label: 'إنهاء', click: () => { isQuitting = true; app.quit(); } },
    ]),
  );
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.focus();
    else mainWindow.show();
  });
}

function registerGlobalShortcuts() {
  const safeSend = (channel, payload) => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    send(channel, payload);
  };
  globalShortcut.register('CommandOrControl+Shift+N', () => safeSend('app:navigate', '/invoice'));
  globalShortcut.register('CommandOrControl+Shift+P', () => safeSend('app:print-last'));
  globalShortcut.register('CommandOrControl+Shift+F', () => safeSend('app:focus-barcode'));
}

function triggerBackupRequest() {
  send('app:backup-request');
}

function scheduleDailyBackup() {
  if (backupTimer) clearInterval(backupTimer);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  backupTimer = setInterval(triggerBackupRequest, ONE_DAY);
  setTimeout(triggerBackupRequest, 30_000);
}

// ---- IPC handlers ----

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize-toggle', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('app:get-info', () => ({
  appName: 'SystemAlaa',
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  documentsDir: getDocsDir(),
  backupsDir: getBackupsDir(),
  dbPath: getDbPath(),
  hostname: os.hostname(),
}));

ipcMain.handle('app:print', async (_e, options = {}) => {
  if (!mainWindow) return false;
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      { silent: false, printBackground: true, ...options },
      (success, failureReason) => {
        if (!success) console.warn('[SystemAlaa] print failed:', failureReason);
        resolve(success);
      },
    );
  });
});

ipcMain.handle('app:print-to-pdf', async (_e, filename) => {
  if (!mainWindow) return { ok: false };
  try {
    const data = await mainWindow.webContents.printToPDF({ printBackground: true });
    ensureDirs();
    const out = path.join(getDocsDir(), `${filename || 'invoice'}.pdf`);
    await fs.promises.writeFile(out, data);
    return { ok: true, path: out };
  } catch (err) {
    console.error(err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('app:notify', (_e, { title, body, silent = false } = {}) => {
  if (!Notification.isSupported()) return false;
  try {
    new Notification({
      title: title || 'SystemAlaa',
      body: body || '',
      silent,
      icon: resolveIconPath() || undefined,
    }).show();
    return true;
  } catch (err) {
    console.warn('[SystemAlaa] notification failed:', err);
    return false;
  }
});

ipcMain.handle('app:write-backup', async (_e, payload) => {
  try {
    ensureDirs();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `systemalaa-backup-${stamp}.json`;
    const fullPath = path.join(getBackupsDir(), filename);
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    await fs.promises.writeFile(fullPath, data, 'utf8');

    // Keep last 30 backups
    const entries = await fs.promises.readdir(getBackupsDir());
    const backups = entries
      .filter((f) => f.startsWith('systemalaa-backup-') && f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(getBackupsDir(), f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const old of backups.slice(30)) {
      try { await fs.promises.unlink(path.join(getBackupsDir(), old.f)); } catch (_) { /* ignore */ }
    }
    return { ok: true, path: fullPath };
  } catch (err) {
    console.error('[SystemAlaa] backup failed:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('app:open-backups-folder', () => {
  ensureDirs();
  return shell.openPath(getBackupsDir());
});

ipcMain.handle('app:open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) return shell.openExternal(url);
  return false;
});

// --- DB IPC ---
const safe = (fn) => async (...args) => {
  try {
    const result = await fn(...args);
    return { ok: true, data: result };
  } catch (err) {
    console.error('[SystemAlaa] IPC error:', err);
    return { ok: false, error: String(err.message || err) };
  }
};

ipcMain.handle('db:list', safe((_e, table, opts) => repo.list(table, opts || {})));
ipcMain.handle('db:get', safe((_e, table, id) => repo.getById(table, id)));
ipcMain.handle('db:insert', safe((_e, table, row) => repo.insert(table, row)));
ipcMain.handle('db:update', safe((_e, table, id, patch) => repo.update(table, id, patch)));
ipcMain.handle('db:remove', safe((_e, table, id) => repo.remove(table, id)));
ipcMain.handle('db:save-invoice', safe((_e, payload) => repo.saveInvoice(payload)));
ipcMain.handle('db:search-products', safe((_e, opts) => repo.searchProducts(opts)));
ipcMain.handle('db:dashboard', safe((_e, opts) => repo.dashboardStats(opts)));

// --- Accounting IPC ---
ipcMain.handle('acc:trial-balance', safe((_e, opts) => accounting.trialBalance(opts)));
ipcMain.handle('acc:income-statement', safe((_e, opts) => accounting.incomeStatement(opts)));
ipcMain.handle('acc:balance-sheet', safe((_e, opts) => accounting.balanceSheet(opts)));
ipcMain.handle('acc:ledger', safe((_e, opts) => accounting.generalLedger(opts)));
ipcMain.handle('acc:ar-aging', safe((_e, opts) => accounting.arAging(opts)));
ipcMain.handle('acc:post-journal', safe((_e, payload) => accounting.postJournalEntry(payload)));
ipcMain.handle('acc:save-purchase', safe((_e, payload) => accounting.savePurchaseInvoice(payload)));
ipcMain.handle('acc:save-receipt', safe((_e, payload) => accounting.saveReceiptVoucher(payload)));
ipcMain.handle('acc:save-payment', safe((_e, payload) => accounting.savePaymentVoucher(payload)));
ipcMain.handle('acc:list-system-accounts', safe((_e, { tenantId }) => accounting.listSystemAccounts(tenantId)));
ipcMain.handle(
  'acc:set-system-account',
  safe((_e, { tenantId, key, accountId }) => {
    accounting.setSystemAccount(tenantId, key, accountId);
    return { ok: true };
  }),
);
ipcMain.handle(
  'acc:repost-sales-invoice',
  safe((_e, { tenantId, invoiceId, userId }) => {
    accounting.postSalesInvoice({ tenantId, invoiceId, userId });
    return { ok: true };
  }),
);

// --- Storefront IPC ---
ipcMain.handle('store:get-settings', safe((_e, { tenantId }) => store.getStoreSettings(tenantId)));
ipcMain.handle('store:ensure-settings', safe((_e, { tenantId, tenantName }) => store.ensureStoreSettings(tenantId, tenantName)));
ipcMain.handle('store:update-settings', safe((_e, payload) => store.updateStoreSettings(payload)));
ipcMain.handle('store:feed', safe((_e, { slug }) => store.buildStorefrontFeed(slug)));
ipcMain.handle('store:validate-coupon', safe((_e, payload) => store.validateCoupon(payload)));
ipcMain.handle('store:quote-shipping', safe((_e, payload) => {
  const db = require('./db.cjs').get();
  const carrier = db
    .prepare(`SELECT * FROM shipping_carriers WHERE id = ? AND tenant_id = ?`)
    .get(payload.carrierId, payload.tenantId);
  if (!carrier) return { fee: 0, etaDays: null };
  return shipping.quoteFor(carrier, { subtotal: payload.subtotal });
}));
ipcMain.handle('store:place-order', safe((_e, payload) => store.placeOrder(payload)));
ipcMain.handle('store:update-order-status', safe((_e, payload) => store.updateOrderStatus(payload)));
ipcMain.handle('store:track-order', safe((_e, payload) => store.trackOrder(payload)));
ipcMain.handle('store:list-providers', safe(() => ({
  shipping: Object.keys(shipping.providers),
  payments: Object.keys(payments.providers),
})));
ipcMain.handle('store:create-checkout', safe((_e, { tenantId, gatewayId, order }) => {
  const db = require('./db.cjs').get();
  const gw = db.prepare(`SELECT * FROM payment_gateways WHERE id = ? AND tenant_id = ?`).get(gatewayId, tenantId);
  if (!gw) throw new Error('gateway not found');
  return payments.createCheckoutFor(gw, order);
}));
ipcMain.handle('store:export-feed', safe(async (_e, { slug, outputPath }) => {
  const feed = store.buildStorefrontFeed(slug);
  if (!feed) throw new Error('store not found');
  const fs = require('node:fs');
  const path = require('node:path');
  const target = outputPath || path.join(getDocsDir(), 'storefront', `${slug}.json`);
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await fs.promises.writeFile(target, JSON.stringify(feed, null, 2), 'utf8');
  return { ok: true, path: target };
}));

// --- UI preferences IPC ---
ipcMain.handle('ui:get-prefs', safe((_e, payload) => uiPrefs.getPrefs(payload)));
ipcMain.handle('ui:set-prefs', safe((_e, payload) => uiPrefs.setPrefs(payload)));

// --- ZATCA/ETA QR IPC ---
ipcMain.handle('zatca:qr', safe((_e, payload) => zatca.buildQrPayload(payload)));

// --- WhatsApp queue IPC ---
ipcMain.handle('wa-queue:enqueue', safe((_e, payload) => waQueue.enqueue(payload)));
ipcMain.handle('wa-queue:pending', safe((_e, payload) => waQueue.listPending(payload)));
ipcMain.handle('wa-queue:recent', safe((_e, payload) => waQueue.listRecent(payload)));
ipcMain.handle('wa-queue:drain-now', safe(() => waQueue.drainOnce()));

// --- AI assistant IPC ---
ipcMain.handle('ai:chat', safe((_e, payload) => aiAssistant.chat(payload)));
ipcMain.handle('ai:get-key', safe((_e, { tenantId }) => ({ has_key: !!aiAssistant.getApiKey(tenantId) })));
ipcMain.handle('ai:set-key', safe((_e, { tenantId, apiKey }) => aiAssistant.setApiKey(tenantId, apiKey)));

// --- REST API server IPC ---
ipcMain.handle('api:state', safe(() => apiServer.getServerState()));
ipcMain.handle('api:start', safe(() => apiServer.start()));
ipcMain.handle('api:stop', safe(() => { apiServer.stop(); return { ok: true }; }));

// --- Cashier shifts IPC ---
ipcMain.handle('shifts:active', safe((_e, { userId }) => shifts.activeShift(userId)));
ipcMain.handle('shifts:open', safe((_e, payload) => shifts.open(payload)));
ipcMain.handle('shifts:close', safe((_e, payload) => shifts.close(payload)));
ipcMain.handle('shifts:x-report', safe((_e, { shiftId }) => shifts.xReport(shiftId)));
ipcMain.handle('shifts:list', safe((_e, payload) => shifts.listRecent(payload)));

// --- Google Drive backup IPC ---
ipcMain.handle('gdrive:state', safe(() => gdrive.state()));
ipcMain.handle('gdrive:connect', safe(() => gdrive.startOAuth()));
ipcMain.handle('gdrive:disconnect', safe(() => gdrive.disconnect()));
ipcMain.handle('gdrive:run-now', safe(() => gdrive.runBackup({ force: true })));
ipcMain.handle('gdrive:set-schedule', safe((_e, payload) => gdrive.setSchedule(payload || {})));
ipcMain.handle('gdrive:local-fallback', safe(() => gdrive.localFallbackInfo()));
gdrive.onUpdate((s) => send('gdrive:state-changed', s));

// --- Licensing IPC ---
ipcMain.handle('lic:status', safe(() => licensing.status()));
ipcMain.handle('lic:activate', safe((_e, { key }) => licensing.activate(key)));
ipcMain.handle('lic:deactivate', safe(() => licensing.deactivate()));
// Vendor-only convenience: issue a key locally for testing. In production
// the issuer runs on a server with the real secret — never ship this UI.
ipcMain.handle('lic:issue', safe((_e, payload) => ({ key: licensing.issue(payload || {}) })));

// --- Security IPC ---
ipcMain.handle('sec:verify-audit-chain', safe(() => security.verifyAuditChain()));
ipcMain.handle('sec:recent-audit', safe((_e, { limit = 100 } = {}) => security.recentAudit(limit)));

// --- WhatsApp IPC ---
ipcMain.handle('wa:initialize', safe(() => whatsapp.initialize()));
ipcMain.handle('wa:logout', safe(() => whatsapp.logout()));
ipcMain.handle('wa:state', safe(() => whatsapp.getState()));
ipcMain.handle('wa:send-text', safe((_e, payload) => whatsapp.sendText(payload)));
ipcMain.handle('wa:send-image', safe((_e, payload) => whatsapp.sendImage(payload)));

// Push state updates from the WA client to the renderer
whatsapp.onUpdate((state) => send('wa:state-changed', state));

// --- Auth IPC ---
ipcMain.handle('auth:bound-user', safe(() => auth.boundUser()));
ipcMain.handle('auth:login', safe((_e, payload) => auth.login(payload)));
ipcMain.handle('auth:login-bound', safe((_e, payload) => auth.loginBound(payload)));
ipcMain.handle('auth:claim-device', safe((_e, payload) => auth.claimDevice(payload)));
ipcMain.handle('auth:release-device', safe((_e, payload) => auth.releaseDevice(payload)));
ipcMain.handle('auth:verify-access-code', safe((_e, payload) => auth.verifyAccessCode(payload)));
ipcMain.handle('auth:set-access-code', safe((_e, payload) => auth.setAccessCode(payload)));
ipcMain.handle('auth:setup-2fa', safe((_e, payload) => auth.setupTwoFactor(payload)));
ipcMain.handle('auth:verify-2fa-setup', safe((_e, payload) => auth.verifyTwoFactor(payload)));
ipcMain.handle('auth:check-2fa', safe((_e, payload) => auth.checkTwoFactor(payload)));
ipcMain.handle('auth:change-password', safe((_e, payload) => auth.changePassword(payload)));
ipcMain.handle('auth:list-users', safe((_e, payload) => auth.listUsers(payload)));
ipcMain.handle('auth:create-user', safe((_e, payload) => auth.createUser(payload)));

// ---- Lifecycle ----

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ensureDirs();
    dbMod.open(getDbPath());
    auth.ensureSeedTenantAndAdmin();
    whatsapp.attachApp(app);
    gdrive.attachApp(app);
    gdrive.start();
    waQueue.startDrainer();
    apiServer.start().catch((err) => console.warn('[SystemAlaa] API server failed to start:', err.message));
    createWindow();
    createTray();
    registerGlobalShortcuts();
    scheduleDailyBackup();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else mainWindow?.show();
    });
  });

  app.on('before-quit', () => { isQuitting = true; });
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (backupTimer) clearInterval(backupTimer);
    try { gdrive.stop(); } catch (_) { /* ignore */ }
    try { waQueue.stopDrainer(); } catch (_) { /* ignore */ }
    try { apiServer.stop(); } catch (_) { /* ignore */ }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) app.quit();
  });
}
