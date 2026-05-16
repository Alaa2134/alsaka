// Renderer-facing API exposed via contextBridge. All DB / auth / window
// operations cross the IPC boundary — the renderer has no Node access.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const on = (channel, handler) => {
  const wrapped = (_event, payload) => {
    try { handler(payload); } catch (err) {
      console.error(`[SystemAlaa] handler for ${channel} threw:`, err);
    }
  };
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,

  getInfo: () => invoke('app:get-info'),

  window: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:maximize-toggle'),
    close: () => invoke('window:close'),
    isMaximized: () => invoke('window:is-maximized'),
    onMaximizeChanged: (cb) => on('window:maximize-changed', cb),
  },

  print: (options) => invoke('app:print', options || {}),
  printToPdf: (filename) => invoke('app:print-to-pdf', filename),
  notify: (payload) => invoke('app:notify', payload),
  writeBackup: (payload) => invoke('app:write-backup', payload),
  openBackupsFolder: () => invoke('app:open-backups-folder'),
  openExternal: (url) => invoke('app:open-external', url),

  // Database CRUD
  db: {
    list: (table, opts) => invoke('db:list', table, opts),
    get: (table, id) => invoke('db:get', table, id),
    insert: (table, row) => invoke('db:insert', table, row),
    update: (table, id, patch) => invoke('db:update', table, id, patch),
    remove: (table, id) => invoke('db:remove', table, id),
    saveInvoice: (payload) => invoke('db:save-invoice', payload),
    searchProducts: (opts) => invoke('db:search-products', opts),
    dashboard: (opts) => invoke('db:dashboard', opts),
  },

  // Auth
  auth: {
    login: (payload) => invoke('auth:login', payload),
    verifyAccessCode: (payload) => invoke('auth:verify-access-code', payload),
    setAccessCode: (payload) => invoke('auth:set-access-code', payload),
    setup2fa: (payload) => invoke('auth:setup-2fa', payload),
    verify2faSetup: (payload) => invoke('auth:verify-2fa-setup', payload),
    check2fa: (payload) => invoke('auth:check-2fa', payload),
    changePassword: (payload) => invoke('auth:change-password', payload),
    listUsers: (payload) => invoke('auth:list-users', payload),
    createUser: (payload) => invoke('auth:create-user', payload),
  },

  // Native events forwarded from menu / tray / shortcuts
  onNavigate: (cb) => on('app:navigate', cb),
  onPrint: (cb) => on('app:print', cb),
  onPrintLast: (cb) => on('app:print-last', cb),
  onToggleSidebar: (cb) => on('app:toggle-sidebar', cb),
  onToggleTheme: (cb) => on('app:toggle-theme', cb),
  onSyncNow: (cb) => on('app:sync-now', cb),
  onFocusBarcode: (cb) => on('app:focus-barcode', cb),
  onBackupRequest: (cb) => on('app:backup-request', cb),
});
