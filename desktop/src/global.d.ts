// Renderer-side ambient types for the contextBridge API.
export {};

declare global {
  type Role =
    | "system_manager"
    | "company_admin"
    | "admin"
    | "manager"
    | "cashier"
    | "viewer";

  interface AppInfo {
    appName: string;
    version: string;
    platform: string;
    arch: string;
    electron: string;
    documentsDir: string;
    backupsDir: string;
    dbPath: string;
    hostname: string;
  }

  interface IpcResult<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
  }

  interface AuthUser {
    id: string;
    tenant_id: string;
    email: string;
    name: string | null;
    role: Role;
    is_active: boolean;
    two_factor_enabled: boolean;
    last_login: string | null;
    device_bound: boolean;
  }

  interface LoginResult {
    ok: boolean;
    error?: string;
    user?: AuthUser;
    needsTwoFactor?: boolean;
    needsAccessCode?: boolean;
  }

  interface BoundUserResult {
    bound: boolean;
    user?: AuthUser;
  }

  interface DesktopAPI {
    isDesktop: true;
    platform: string;

    getInfo(): Promise<AppInfo>;
    window: {
      minimize(): Promise<void>;
      toggleMaximize(): Promise<boolean>;
      close(): Promise<void>;
      isMaximized(): Promise<boolean>;
      onMaximizeChanged(cb: (m: boolean) => void): () => void;
    };

    print(options?: Record<string, unknown>): Promise<boolean>;
    printToPdf(filename?: string): Promise<{ ok: boolean; path?: string; error?: string }>;
    notify(payload: { title?: string; body?: string; silent?: boolean }): Promise<boolean>;
    writeBackup(payload: unknown): Promise<{ ok: boolean; path?: string; error?: string }>;
    openBackupsFolder(): Promise<string>;
    openExternal(url: string): Promise<unknown>;

    db: {
      list<T = any>(table: string, opts?: Record<string, unknown>): Promise<IpcResult<T[]>>;
      get<T = any>(table: string, id: string): Promise<IpcResult<T>>;
      insert<T = any>(table: string, row: Record<string, unknown>): Promise<IpcResult<T>>;
      update<T = any>(
        table: string,
        id: string,
        patch: Record<string, unknown>,
      ): Promise<IpcResult<T>>;
      remove(table: string, id: string): Promise<IpcResult<{ ok: true }>>;
      saveInvoice(payload: {
        invoice: Record<string, unknown>;
        items: Array<Record<string, unknown>>;
      }): Promise<IpcResult<{ invoice: any; items: any[] }>>;
      searchProducts(opts: {
        tenantId: string;
        query: string;
        limit?: number;
      }): Promise<IpcResult<any[]>>;
      dashboard(opts: { tenantId: string }): Promise<IpcResult<any>>;
    };

    accounting: {
      trialBalance(opts: { tenantId: string; from?: string | null; to?: string | null }): Promise<IpcResult<any>>;
      incomeStatement(opts: { tenantId: string; from?: string | null; to?: string | null }): Promise<IpcResult<any>>;
      balanceSheet(opts: { tenantId: string; asOf?: string | null }): Promise<IpcResult<any>>;
      ledger(opts: { tenantId: string; accountId: string; from?: string | null; to?: string | null }): Promise<IpcResult<any>>;
      arAging(opts: { tenantId: string; asOf?: string | null }): Promise<IpcResult<any[]>>;
      postJournal(payload: any): Promise<IpcResult<string>>;
      savePurchase(payload: { invoice: any; items: any[]; autoPost?: boolean }): Promise<IpcResult<any>>;
      saveReceipt(payload: any): Promise<IpcResult<any>>;
      savePayment(payload: any): Promise<IpcResult<any>>;
      listSystemAccounts(payload: { tenantId: string }): Promise<IpcResult<Record<string, string>>>;
      setSystemAccount(payload: { tenantId: string; key: string; accountId: string }): Promise<IpcResult<{ ok: boolean }>>;
      repostSalesInvoice(payload: { tenantId: string; invoiceId: string; userId?: string }): Promise<IpcResult<{ ok: boolean }>>;
    };

    store: {
      getSettings(tenantId: string): Promise<IpcResult<any>>;
      ensureSettings(payload: { tenantId: string; tenantName: string }): Promise<IpcResult<any>>;
      updateSettings(payload: { tenantId: string; patch: Record<string, unknown> }): Promise<IpcResult<any>>;
      feed(slug: string): Promise<IpcResult<any>>;
      validateCoupon(payload: { tenantId: string; code: string; subtotal: number }): Promise<IpcResult<any>>;
      quoteShipping(payload: { tenantId: string; carrierId: string; subtotal: number }): Promise<IpcResult<{ fee: number; etaDays: number | null }>>;
      placeOrder(payload: any): Promise<IpcResult<{ ok: boolean; order: any }>>;
      updateOrderStatus(payload: { tenantId: string; orderId: string; status: string; note?: string; userId?: string }): Promise<IpcResult<any>>;
      trackOrder(payload: { orderNumber: number | string; phone?: string }): Promise<IpcResult<any>>;
      listProviders(): Promise<IpcResult<{ shipping: string[]; payments: string[] }>>;
      createCheckout(payload: { tenantId: string; gatewayId: string; order: any }): Promise<IpcResult<any>>;
      exportFeed(payload: { slug: string; outputPath?: string }): Promise<IpcResult<{ ok: boolean; path: string }>>;
    };

    ui: {
      getPrefs(payload: { tenantId: string; userId: string }): Promise<IpcResult<{
        pos_layout: string;
        invoice_template_json: string | null;
        store_theme_json: string | null;
        language: string;
        density: string;
      }>>;
      setPrefs(payload: { tenantId: string; userId: string; patch: Record<string, unknown> }): Promise<IpcResult<any>>;
    };

    shifts: {
      active(userId: string): Promise<IpcResult<any>>;
      open(payload: { tenantId: string; userId: string; openingCash?: number; notes?: string }): Promise<IpcResult<{ ok: boolean; error?: string; shift?: any }>>;
      close(payload: { shiftId: string; closingCash?: number; cashOut?: number; notes?: string }): Promise<IpcResult<{ ok: boolean; error?: string; shift?: any }>>;
      xReport(shiftId: string): Promise<IpcResult<any>>;
      list(payload: { tenantId: string; limit?: number }): Promise<IpcResult<any[]>>;
    };

    zatca: {
      qr(payload: { sellerName: string; vatNumber: string; timestamp?: string; totalWithVat: number; vatTotal: number }): Promise<IpcResult<string>>;
    };

    waQueue: {
      enqueue(payload: { tenantId: string; to: string; body?: string; dataUrl?: string; caption?: string; kind?: string }): Promise<IpcResult<{ ok: boolean; id: string }>>;
      pending(payload: { tenantId: string }): Promise<IpcResult<any[]>>;
      recent(payload: { tenantId: string; limit?: number }): Promise<IpcResult<any[]>>;
      drainNow(): Promise<IpcResult<void>>;
    };

    qrMenu: {
      config(tenantId: string): Promise<IpcResult<any>>;
      setConfig(payload: { tenantId: string; patch: Record<string, unknown> }): Promise<IpcResult<any>>;
      tables(tenantId: string): Promise<IpcResult<Array<{ id: string; name: string; zone: string | null; seats: number; status: string; url: string; qr: string }>>>;
      general(tenantId: string): Promise<IpcResult<{ url: string; qr: string }>>;
      feed(slug: string): Promise<IpcResult<any>>;
    };

    ai: {
      chat(payload: { tenantId: string; messages: Array<{ role: string; content: string }> }): Promise<IpcResult<{ ok: boolean; text: string; usage?: any }>>;
      getKey(tenantId: string): Promise<IpcResult<{ has_key: boolean }>>;
      setKey(tenantId: string, apiKey: string): Promise<IpcResult<{ ok: boolean }>>;
      visionSuggest(payload: { tenantId: string; imageDataUrl: string }): Promise<IpcResult<{ ok: boolean; suggestion?: any; raw?: string; error?: string }>>;
      forecast(payload: { tenantId: string; horizonDays?: number }): Promise<IpcResult<any[]>>;
      anomalies(payload: { tenantId: string; lookbackDays?: number }): Promise<IpcResult<any[]>>;
      explain(payload: { tenantId: string; findings: any[]; forecast: any[] }): Promise<IpcResult<{ explanation: string | null }>>;
    };

    apiServer: {
      state(): Promise<IpcResult<{ listening: boolean; port: number }>>;
      start(): Promise<IpcResult<{ ok: boolean; port: number }>>;
      stop(): Promise<IpcResult<{ ok: boolean }>>;
    };

    thermal: {
      config(): Promise<IpcResult<any>>;
      setConfig(payload: { tenantId: string; patch: Record<string, unknown> }): Promise<IpcResult<any>>;
      print(payload: any): Promise<IpcResult<{ ok: boolean }>>;
      probe(): Promise<IpcResult<{ available: boolean; connected?: boolean; reason?: string; error?: string }>>;
    };

    bulk: {
      importProducts(payload: { tenantId: string; csv: string; replaceExisting?: boolean }): Promise<IpcResult<{ ok: boolean; created?: number; updated?: number; failed?: number; errors?: string[]; error?: string }>>;
      importClients(payload: { tenantId: string; csv: string; replaceExisting?: boolean }): Promise<IpcResult<{ ok: boolean; created?: number; updated?: number; failed?: number; errors?: string[]; error?: string }>>;
    };

    schedulers: {
      runRecurring(): Promise<IpcResult<{ ok: boolean }>>;
      runReminders(): Promise<IpcResult<{ ok: boolean }>>;
      runExpiry(): Promise<IpcResult<{ ok: boolean }>>;
    };

    gdrive: {
      state(): Promise<IpcResult<{
        connected: boolean;
        enabled: boolean;
        account_email: string | null;
        account_name: string | null;
        schedule_hour: number;
        encrypt_payload: boolean;
        last_success_at: string | null;
        last_attempt_at: string | null;
        last_size_bytes: number | null;
        last_error: string | null;
        backup_file_id: string | null;
        backup_file_name: string | null;
        in_flight: boolean;
        client_id_set: boolean;
      }>>;
      connect(): Promise<IpcResult<any>>;
      disconnect(): Promise<IpcResult<void>>;
      runNow(): Promise<IpcResult<any>>;
      setSchedule(payload: { scheduleHour?: number; encryptPayload?: boolean; enabled?: boolean }): Promise<IpcResult<any>>;
      localFallback(): Promise<IpcResult<{ path: string; exists: boolean; size?: number; mtime?: string }>>;
      onStateChanged(cb: (s: any) => void): () => void;
    };

    licensing: {
      status(): Promise<IpcResult<{
        active: boolean;
        reason: string;
        tier?: string;
        expiry?: string;
        key_masked?: string;
        trialRemainingDays?: number;
        trialStartedAt?: string;
        message?: string;
      }>>;
      activate(key: string): Promise<IpcResult<{
        ok: boolean;
        error?: string;
        tier?: string;
        expiry?: string;
        alreadyActivated?: boolean;
        rebound?: boolean;
      }>>;
      deactivate(): Promise<IpcResult<{ ok: boolean }>>;
      issue(payload?: { tier?: string; expiry?: string; nonce?: string }): Promise<IpcResult<{ key: string }>>;
      heartbeatNow(): Promise<IpcResult<{ ok?: boolean; verdict?: string; skipped?: boolean; reason?: string; error?: string }>>;
    };

    updater: {
      status(): Promise<IpcResult<{
        vendor_url: string;
        channel: string;
        current_version: string;
        downloading: boolean;
        pending_install: boolean;
      }>>;
      check(): Promise<IpcResult<{
        available?: boolean;
        downloaded?: boolean;
        skipped?: boolean;
        reason?: string;
        version?: string;
        error?: string;
      }>>;
      installRestart(): Promise<IpcResult<{ ok: boolean; error?: string }>>;
      onDownloaded(cb: (payload: { version: string; notes: string | null }) => void): () => void;
    };

    security: {
      verifyAuditChain(): Promise<IpcResult<{ ok: boolean; total: number; brokenAt?: number }>>;
      recentAudit(opts?: { limit?: number }): Promise<IpcResult<Array<{
        id: number;
        tenant_id: string | null;
        user_id: string | null;
        action: string;
        data: string | null;
        timestamp: string;
      }>>>;
    };

    whatsapp: {
      initialize(): Promise<IpcResult<{ state: string; qr?: string | null; error?: string | null }>>;
      logout(): Promise<IpcResult<void>>;
      state(): Promise<IpcResult<{ state: string; qr?: string | null; error?: string | null }>>;
      sendText(payload: { to: string; body: string }): Promise<IpcResult<{ ok: boolean; chatId: string }>>;
      sendImage(payload: { to: string; dataUrl: string; caption?: string; filename?: string }): Promise<IpcResult<{ ok: boolean; chatId: string }>>;
      onStateChanged(cb: (state: { state: string; qr?: string | null; error?: string | null }) => void): () => void;
    };

    whatsappCloud: {
      saveConfig(payload: { tenantId: string; token?: string; phoneId?: string; verifyToken?: string }): Promise<IpcResult<{ token?: string; phoneId?: string; verifyToken?: string; enabled: boolean }>>;
      loadConfig(payload: { tenantId: string }): Promise<IpcResult<{ token: string | null; phoneId: string | null; verifyToken: string | null; enabled: boolean } | null>>;
      sendText(payload: { tenantId: string; to: string; text: string }): Promise<IpcResult<any>>;
      sendImage(payload: { tenantId: string; to: string; link: string; caption?: string }): Promise<IpcResult<any>>;
      sendDocument(payload: { tenantId: string; to: string; link: string; filename: string; caption?: string }): Promise<IpcResult<any>>;
    };

    marketplace: {
      listProviders(): Promise<IpcResult<Array<{ id: string; name: string; region: string; description: string }>>>;
      syncCatalog(payload: { provider: string; tenantId: string }): Promise<IpcResult<{ ok: boolean; pushed?: number; failed?: number; error?: string }>>;
      updateStatus(payload: { provider: string; tenantId: string; externalOrderId: string; status: string; callbackUrl?: string }): Promise<IpcResult<any>>;
      receiveWebhook(payload: { provider: string; tenantId: string; payload: any; topic?: string; signature?: string; rawBody?: string }): Promise<IpcResult<any>>;
    };

    smartImport: {
      analyze(payload: { tenantId: string; dataUrl?: string; text?: string; kind: "pdf" | "image" | "text" }): Promise<IpcResult<{ ok: boolean; products?: Array<{ name: string; price: number; cost: number; barcode: string | null; unit: string | null; category: string | null; stock: number }>; count?: number; error?: string; raw?: string }>>;
      commit(payload: { tenantId: string; products: Array<Record<string, unknown>> }): Promise<IpcResult<{ ok: boolean; created?: number; skipped?: number; error?: string }>>;
    };

    branchSync: {
      configure(payload: { branchId: string; relayUrl: string; relayToken?: string; enabled?: number }): Promise<IpcResult<any>>;
      state(payload: { branchId: string }): Promise<IpcResult<any>>;
      pull(payload: { tenantId: string; branchId: string }): Promise<IpcResult<{ ok: boolean; applied?: number; skipped?: boolean }>>;
      push(payload: { tenantId: string; branchId: string }): Promise<IpcResult<{ ok: boolean; sent?: number; skipped?: boolean }>>;
      recentLog(payload?: { limit?: number }): Promise<IpcResult<any[]>>;
    };

    pharmacy: {
      checkBasket(payload: { tenantId: string; productIds: string[] }): Promise<IpcResult<any[]>>;
      logControlled(payload: any): Promise<IpcResult<{ ok: boolean }>>;
    };

    restaurant: {
      logWaste(payload: any): Promise<IpcResult<{ ok: boolean; cost: number }>>;
      analytics(payload: { tenantId: string; days?: number }): Promise<IpcResult<{ wasteByItem: any[]; dishMargin: any[] }>>;
    };

    salon: {
      setSchedule(payload: { tenantId: string; employeeId: string; weekly: any[] }): Promise<IpcResult<{ ok: boolean }>>;
      availableSlots(payload: { tenantId: string; employeeId: string; date: string; serviceDurationMinutes?: number }): Promise<IpcResult<string[]>>;
      redeemPackage(payload: any): Promise<IpcResult<any>>;
    };

    auto: {
      decodeVin(vin: string): Promise<IpcResult<{ ok: boolean; make?: string; model?: string; year?: string; body?: string; engine?: string; country?: string; error?: string }>>;
      openJob(payload: any): Promise<IpcResult<{ ok: boolean; id: string; job_number: number }>>;
      closeJob(payload: any): Promise<IpcResult<{ ok: boolean }>>;
      findParts(payload: { tenantId: string; oemPart: string }): Promise<IpcResult<any[]>>;
    };

    auth: {
      boundUser(): Promise<IpcResult<BoundUserResult>>;
      login(payload: { email: string; password: string }): Promise<IpcResult<LoginResult>>;
      loginBound(payload: { password: string }): Promise<IpcResult<LoginResult>>;
      claimDevice(payload: {
        email: string;
        currentPassword: string;
        newPassword: string;
      }): Promise<IpcResult<{ ok: boolean; error?: string; user?: AuthUser }>>;
      releaseDevice(payload: {
        userId: string;
        newTemporaryPassword?: string | null;
      }): Promise<IpcResult<{ ok: boolean; error?: string }>>;
      verifyAccessCode(payload: { userId: string; code: string }): Promise<IpcResult<{ ok: boolean; error?: string }>>;
      setAccessCode(payload: { userId: string; code: string }): Promise<IpcResult<{ ok: boolean; error?: string }>>;
      setup2fa(payload: { userId: string }): Promise<IpcResult<{ ok: boolean; secret?: string; otpauth?: string; error?: string }>>;
      verify2faSetup(payload: { userId: string; secret: string; code: string }): Promise<IpcResult<{ ok: boolean; backupCodes?: string[]; error?: string }>>;
      check2fa(payload: { userId: string; code: string }): Promise<IpcResult<{ ok: boolean; backupUsed?: boolean; error?: string }>>;
      changePassword(payload: { userId: string; currentPassword: string; newPassword: string }): Promise<IpcResult<{ ok: boolean; error?: string }>>;
      listUsers(payload: { tenantId: string }): Promise<IpcResult<AuthUser[]>>;
      createUser(payload: { tenantId: string; email: string; name?: string; password: string; role?: Role }): Promise<IpcResult<{ ok: boolean; id?: string }>>;
    };

    onNavigate(cb: (path: string) => void): () => void;
    onPrint(cb: () => void): () => void;
    onPrintLast(cb: () => void): () => void;
    onToggleSidebar(cb: () => void): () => void;
    onToggleTheme(cb: () => void): () => void;
    onSyncNow(cb: () => void): () => void;
    onFocusBarcode(cb: () => void): () => void;
    onBackupRequest(cb: () => void): () => void;
  }

  interface Window {
    electronAPI?: DesktopAPI;
  }
}
