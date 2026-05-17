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

  // Accounting
  accounting: {
    trialBalance: (opts) => invoke('acc:trial-balance', opts),
    incomeStatement: (opts) => invoke('acc:income-statement', opts),
    balanceSheet: (opts) => invoke('acc:balance-sheet', opts),
    ledger: (opts) => invoke('acc:ledger', opts),
    arAging: (opts) => invoke('acc:ar-aging', opts),
    postJournal: (payload) => invoke('acc:post-journal', payload),
    savePurchase: (payload) => invoke('acc:save-purchase', payload),
    saveReceipt: (payload) => invoke('acc:save-receipt', payload),
    savePayment: (payload) => invoke('acc:save-payment', payload),
    listSystemAccounts: (payload) => invoke('acc:list-system-accounts', payload),
    setSystemAccount: (payload) => invoke('acc:set-system-account', payload),
    repostSalesInvoice: (payload) => invoke('acc:repost-sales-invoice', payload),
  },

  // Storefront management
  store: {
    getSettings: (tenantId) => invoke('store:get-settings', { tenantId }),
    ensureSettings: (payload) => invoke('store:ensure-settings', payload),
    updateSettings: (payload) => invoke('store:update-settings', payload),
    feed: (slug) => invoke('store:feed', { slug }),
    validateCoupon: (payload) => invoke('store:validate-coupon', payload),
    quoteShipping: (payload) => invoke('store:quote-shipping', payload),
    placeOrder: (payload) => invoke('store:place-order', payload),
    updateOrderStatus: (payload) => invoke('store:update-order-status', payload),
    trackOrder: (payload) => invoke('store:track-order', payload),
    listProviders: () => invoke('store:list-providers'),
    createCheckout: (payload) => invoke('store:create-checkout', payload),
    exportFeed: (payload) => invoke('store:export-feed', payload),
  },

  // UI preferences
  ui: {
    getPrefs: (payload) => invoke('ui:get-prefs', payload),
    setPrefs: (payload) => invoke('ui:set-prefs', payload),
  },

  // Cashier shifts
  shifts: {
    active: (userId) => invoke('shifts:active', { userId }),
    open: (payload) => invoke('shifts:open', payload),
    close: (payload) => invoke('shifts:close', payload),
    xReport: (shiftId) => invoke('shifts:x-report', { shiftId }),
    list: (payload) => invoke('shifts:list', payload),
  },

  // ZATCA / ETA QR
  zatca: {
    qr: (payload) => invoke('zatca:qr', payload),
  },

  // WhatsApp offline queue
  waQueue: {
    enqueue: (payload) => invoke('wa-queue:enqueue', payload),
    pending: (payload) => invoke('wa-queue:pending', payload),
    recent: (payload) => invoke('wa-queue:recent', payload),
    drainNow: () => invoke('wa-queue:drain-now'),
  },

  // QR Menu (table-based ordering by phone scan)
  qrMenu: {
    config: (tenantId) => invoke('qrmenu:config', { tenantId }),
    setConfig: (payload) => invoke('qrmenu:set-config', payload),
    tables: (tenantId) => invoke('qrmenu:tables', { tenantId }),
    general: (tenantId) => invoke('qrmenu:general', { tenantId }),
    feed: (slug) => invoke('qrmenu:feed', { slug }),
  },

  // AI assistant (Claude / Anthropic) + vision + insights
  ai: {
    chat: (payload) => invoke('ai:chat', payload),
    getKey: (tenantId) => invoke('ai:get-key', { tenantId }),
    setKey: (tenantId, apiKey) => invoke('ai:set-key', { tenantId, apiKey }),
    visionSuggest: (payload) => invoke('ai:vision-suggest', payload),
    forecast: (payload) => invoke('ai:forecast', payload),
    anomalies: (payload) => invoke('ai:anomalies', payload),
    explain: (payload) => invoke('ai:explain', payload),
  },

  // Embedded REST API server
  apiServer: {
    state: () => invoke('api:state'),
    start: () => invoke('api:start'),
    stop: () => invoke('api:stop'),
  },

  // Thermal receipt printer (ESC/POS)
  thermal: {
    config: () => invoke('thermal:config'),
    setConfig: (payload) => invoke('thermal:set-config', payload),
    print: (payload) => invoke('thermal:print', payload),
    probe: () => invoke('thermal:probe'),
  },

  // Bulk CSV import
  bulk: {
    importProducts: (payload) => invoke('import:products', payload),
    importClients: (payload) => invoke('import:clients', payload),
  },

  // Scheduler manual triggers
  schedulers: {
    runRecurring: () => invoke('sched:run-recurring'),
    runReminders: () => invoke('sched:run-reminders'),
    runExpiry: () => invoke('sched:run-expiry'),
  },

  // Google Drive backup
  gdrive: {
    state: () => invoke('gdrive:state'),
    connect: () => invoke('gdrive:connect'),
    disconnect: () => invoke('gdrive:disconnect'),
    runNow: () => invoke('gdrive:run-now'),
    setSchedule: (payload) => invoke('gdrive:set-schedule', payload),
    localFallback: () => invoke('gdrive:local-fallback'),
    onStateChanged: (cb) => on('gdrive:state-changed', cb),
  },

  // Licensing (single-device activation)
  licensing: {
    status: () => invoke('lic:status'),
    activate: (key) => invoke('lic:activate', { key }),
    deactivate: () => invoke('lic:deactivate'),
    issue: (payload) => invoke('lic:issue', payload),
  },

  // Security / tamper-evident audit chain
  security: {
    verifyAuditChain: () => invoke('sec:verify-audit-chain'),
    recentAudit: (opts) => invoke('sec:recent-audit', opts || {}),
  },

  // WhatsApp (whatsapp-web.js powered)
  whatsapp: {
    initialize: () => invoke('wa:initialize'),
    logout: () => invoke('wa:logout'),
    state: () => invoke('wa:state'),
    sendText: (payload) => invoke('wa:send-text', payload),
    sendImage: (payload) => invoke('wa:send-image', payload),
    onStateChanged: (cb) => on('wa:state-changed', cb),
  },

  // Auth
  auth: {
    boundUser: () => invoke('auth:bound-user'),
    login: (payload) => invoke('auth:login', payload),
    loginBound: (payload) => invoke('auth:login-bound', payload),
    claimDevice: (payload) => invoke('auth:claim-device', payload),
    releaseDevice: (payload) => invoke('auth:release-device', payload),
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
