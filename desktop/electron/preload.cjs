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

  // Per-tenant connectors (GitHub, Vercel, Netlify, Cloudflare...)
  connectors: {
    providers: () => invoke('conn:providers'),
    list: (tenantId) => invoke('conn:list', { tenantId }),
    disconnect: (payload) => invoke('conn:disconnect', payload),
    githubStart: () => invoke('conn:gh-start'),
    githubPoll: (payload) => invoke('conn:gh-poll', payload),
    githubTest: (payload) => invoke('conn:gh-test', payload),
    vercel: (payload) => invoke('conn:vercel', payload),
    vercelTest: (payload) => invoke('conn:vercel-test', payload),
    netlify: (payload) => invoke('conn:netlify', payload),
    cloudflare: (payload) => invoke('conn:cloudflare', payload),
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
    heartbeatNow: () => invoke('lic:heartbeat-now'),
  },

  updater: {
    status: () => invoke('upd:status'),
    check: () => invoke('upd:check'),
    installRestart: () => invoke('upd:install-restart'),
    onDownloaded: (cb) => on('updater:downloaded', cb),
  },

  zatcaPhase2: {
    clear: (payload) => invoke('zatca2:clear', payload),
    list: (payload) => invoke('zatca2:list', payload),
    setSetting: (payload) => invoke('zatca2:set', payload),
    getSetting: (payload) => invoke('zatca2:get', payload),
  },

  eta: {
    submit: (payload) => invoke('eta:submit', payload),
    list: (payload) => invoke('eta:list', payload),
  },

  hardware: {
    list: (payload) => invoke('hw:list', payload),
    save: (payload) => invoke('hw:save', payload),
    remove: (payload) => invoke('hw:remove', payload),
    openDrawer: (payload) => invoke('hw:open-drawer', payload),
    chargeCard: (payload) => invoke('hw:charge-card', payload),
    readWeight: (payload) => invoke('hw:read-weight', payload),
    printLabel: (payload) => invoke('hw:print-label', payload),
    buildZpl: (payload) => invoke('hw:build-zpl', payload),
  },

  gdpr: {
    exportTenant: (payload) => invoke('gdpr:export-tenant', payload),
    exportClient: (payload) => invoke('gdpr:export-client', payload),
    eraseClient: (payload) => invoke('gdpr:erase-client', payload),
    listExports: () => invoke('gdpr:list-exports'),
  },

  // Industry-specific (verticals)
  pharmacy: {
    checkBasket: (payload) => invoke('pharm:check-basket', payload),
    logControlled: (payload) => invoke('pharm:log-controlled', payload),
  },
  restaurant: {
    logWaste: (payload) => invoke('rest:log-waste', payload),
    analytics: (payload) => invoke('rest:analytics', payload),
  },
  salon: {
    setSchedule: (payload) => invoke('salon:set-schedule', payload),
    availableSlots: (payload) => invoke('salon:available-slots', payload),
    redeemPackage: (payload) => invoke('salon:redeem-package', payload),
  },
  auto: {
    decodeVin: (vin) => invoke('auto:decode-vin', { vin }),
    openJob: (payload) => invoke('auto:open-job', payload),
    closeJob: (payload) => invoke('auto:close-job', payload),
    findParts: (payload) => invoke('auto:find-parts', payload),
  },

  // WhatsApp Business Cloud API (official, no Puppeteer)
  whatsappCloud: {
    saveConfig: (payload) => invoke('wa-cloud:save-config', payload),
    loadConfig: (payload) => invoke('wa-cloud:load-config', payload),
    sendText: (payload) => invoke('wa-cloud:send-text', payload),
    sendImage: (payload) => invoke('wa-cloud:send-image', payload),
    sendDocument: (payload) => invoke('wa-cloud:send-document', payload),
  },

  // Marketplace connectors (Salla, Shopify, Talabat)
  marketplace: {
    listProviders: () => invoke('mkt:list-providers'),
    syncCatalog: (payload) => invoke('mkt:sync-catalog', payload),
    updateStatus: (payload) => invoke('mkt:update-status', payload),
    receiveWebhook: (payload) => invoke('mkt:receive-webhook', payload),
  },

  // Smart product import (PDF / image / spreadsheet → AI → products)
  smartImport: {
    analyze: (payload) => invoke('smart-import:analyze', payload),
    commit: (payload) => invoke('smart-import:commit', payload),
  },

  // Branch sync (multi-location LWW replication)
  branchSync: {
    configure: (payload) => invoke('sync:configure', payload),
    state: (payload) => invoke('sync:state', payload),
    pull: (payload) => invoke('sync:pull', payload),
    push: (payload) => invoke('sync:push', payload),
    recentLog: (payload) => invoke('sync:recent-log', payload),
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
