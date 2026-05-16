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
  }

  interface LoginResult {
    ok: boolean;
    error?: string;
    user?: AuthUser;
    needsTwoFactor?: boolean;
    needsAccessCode?: boolean;
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

    auth: {
      login(payload: { email: string; password: string }): Promise<IpcResult<LoginResult>>;
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
