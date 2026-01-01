import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateDeviceId } from "@/utils/deviceId";
import { Session, User } from "@supabase/supabase-js";

export type AppRole = "system_manager" | "company_admin" | "admin" | "manager" | "cashier" | "viewer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
}

export interface CompanySettings {
  id: string;
  tenant_id: string;
  subdomain: string | null;
  custom_domain: string | null;
  store_enabled: boolean;
  store_access_blocked: boolean;
  subscription_type: string;
  subscription_expires_at: string | null;
  accounting_enabled: boolean;
  inventory_enabled: boolean;
  payment_cod_enabled: boolean;
  payment_stripe_enabled: boolean;
  payment_bank_enabled: boolean;
  payment_vodafone_enabled: boolean;
  stripe_account_id: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  vodafone_number: string | null;
  tax_percentage: number;
  currency: string;
}

export interface AppUser {
  id: string;
  name: string;
  access_code: string;
  role: AppRole;
  is_active: boolean;
  tenant_id: string | null;
  device_id: string | null;
  device_locked_at: string | null;
  auth_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  authUser: User | null;
  tenant: Tenant | null;
  companySettings: CompanySettings | null;
  isLoading: boolean;
  isSystemManager: boolean;
  login: (code: string, twoFactorCode?: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean; userId?: string }>;
  logout: () => Promise<void>;
  hasPermission: (requiredRoles: AppRole[]) => boolean;
  updateTenantTheme: (colors: { primary_color?: string; secondary_color?: string }) => Promise<void>;
  unlockDevice: (userId: string) => Promise<boolean>;
  refreshCompanySettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "app_user_session";
const TENANT_KEY = "app_tenant_session";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSystemManager = user?.role === "system_manager";

  // Apply tenant theme colors
  useEffect(() => {
    if (tenant) {
      document.documentElement.style.setProperty('--primary', hexToHsl(tenant.primary_color));
      document.documentElement.style.setProperty('--accent', hexToHsl(tenant.secondary_color));
      document.documentElement.style.setProperty('--gradient-start', hexToHsl(tenant.primary_color));
      document.documentElement.style.setProperty('--gradient-end', hexToHsl(tenant.secondary_color));
    }
  }, [tenant]);

  // Set up Supabase Auth listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setAuthUser(newSession?.user ?? null);
        
        // Defer data fetching to avoid deadlock
        if (newSession?.user) {
          setTimeout(() => {
            loadAppUserFromAuth(newSession.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setTenant(null);
          setCompanySettings(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TENANT_KEY);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setAuthUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        loadAppUserFromAuth(existingSession.user.id);
      } else {
        // Fall back to localStorage check for backward compatibility
        const storedSession = localStorage.getItem(STORAGE_KEY);
        if (storedSession) {
          try {
            const parsedUser = JSON.parse(storedSession);
            // Try to login with stored access code
            if (parsedUser.access_code) {
              migrateAndLogin(parsedUser.access_code);
            } else {
              setIsLoading(false);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TENANT_KEY);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAppUserFromAuth = async (authId: string) => {
    try {
      const { data: appUser, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("auth_id", authId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !appUser) {
        console.error("Failed to load app user:", error);
        setIsLoading(false);
        return;
      }

      setUser(appUser as AppUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));

      // Load tenant
      if (appUser.tenant_id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", appUser.tenant_id)
          .maybeSingle();
        
        if (tenantData) {
          setTenant(tenantData as Tenant);
          localStorage.setItem(TENANT_KEY, JSON.stringify(tenantData));
          await fetchCompanySettings(tenantData.id);
        }
      }
    } catch (err) {
      console.error("Error loading app user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateAndLogin = async (accessCode: string) => {
    // Create auth user if doesn't exist
    try {
      const response = await supabase.functions.invoke('create-auth-user', {
        body: { accessCode }
      });

      if (response.error) {
        console.error("Migration error:", response.error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
        setIsLoading(false);
        return;
      }

      // Now login with Supabase Auth
      const email = `${accessCode}@app.internal`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: accessCode
      });

      if (signInError) {
        console.error("Sign in after migration failed:", signInError);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
      }
    } catch (err) {
      console.error("Migration error:", err);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TENANT_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanySettings = async (tenantId: string) => {
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    
    if (data) {
      setCompanySettings(data as CompanySettings);
    }
  };

  const refreshCompanySettings = async () => {
    if (tenant?.id) {
      await fetchCompanySettings(tenant.id);
    }
  };

  const login = async (code: string, twoFactorCode?: string): Promise<{ success: boolean; error?: string; requires2FA?: boolean; userId?: string }> => {
    try {
      const trimmedCode = code.trim().toUpperCase();
      const currentDeviceId = generateDeviceId();
      
      // First check if user exists and validate device lock
      const { data: appUser, error: findError } = await supabase
        .from("app_users")
        .select("*")
        .eq("access_code", trimmedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (findError) {
        console.error("Login error:", findError);
        return { success: false, error: "حدث خطأ في الاتصال" };
      }

      if (!appUser) {
        return { success: false, error: "كود الدخول غير صحيح" };
      }

      // Check if 2FA is enabled and not yet verified (unless bypassing after verification)
      if (appUser.two_factor_enabled && !twoFactorCode) {
        return { 
          success: false, 
          requires2FA: true, 
          userId: appUser.id,
          error: "يرجى إدخال كود المصادقة الثنائية" 
        };
      }

      // Verify 2FA code if required (skip if "bypass" is passed - user already verified in modal)
      if (appUser.two_factor_enabled && twoFactorCode && twoFactorCode !== "bypass") {
        const backupCodes = appUser.backup_codes as string[] || [];
        if (!backupCodes.includes(twoFactorCode)) {
          return { success: false, error: "كود المصادقة الثنائية غير صحيح" };
        }
      }

      // Check device lock (except for system managers)
      if (appUser.role !== 'system_manager') {
        if (appUser.device_id && appUser.device_id !== currentDeviceId) {
          return { 
            success: false, 
            error: "هذا الكود مستخدم على جهاز آخر. تواصل مع المدير لفك القفل." 
          };
        }
      }

      // Create auth user if doesn't exist
      if (!appUser.auth_id) {
        const response = await supabase.functions.invoke('create-auth-user', {
          body: { accessCode: trimmedCode }
        });

        if (response.error) {
          console.error("Auth user creation error:", response.error);
          return { success: false, error: "فشل في إنشاء حساب المصادقة" };
        }
      }

      // Login with Supabase Auth
      const email = `${trimmedCode}@app.internal`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: trimmedCode
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        return { success: false, error: "فشل في تسجيل الدخول" };
      }

      // Update device lock if needed
      if (appUser.role !== 'system_manager' && !appUser.device_id) {
        await supabase
          .from("app_users")
          .update({ 
            device_id: currentDeviceId,
            device_locked_at: new Date().toISOString()
          })
          .eq("id", appUser.id);
      }
      
      return { success: true };
    } catch (err) {
      console.error("Unexpected login error:", err);
      return { success: false, error: "حدث خطأ غير متوقع" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthUser(null);
    setTenant(null);
    setCompanySettings(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TENANT_KEY);
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--gradient-start');
    document.documentElement.style.removeProperty('--gradient-end');
  };

  const hasPermission = (requiredRoles: AppRole[]): boolean => {
    if (!user) return false;
    // System manager has all permissions
    if (user.role === 'system_manager') return true;
    return requiredRoles.includes(user.role);
  };

  const updateTenantTheme = async (colors: { primary_color?: string; secondary_color?: string }) => {
    if (!tenant || !user || !['admin', 'company_admin', 'system_manager'].includes(user.role)) return;
    
    const { error } = await supabase
      .from("tenants")
      .update(colors)
      .eq("id", tenant.id);
    
    if (!error) {
      const updatedTenant = { ...tenant, ...colors };
      setTenant(updatedTenant);
      localStorage.setItem(TENANT_KEY, JSON.stringify(updatedTenant));
    }
  };

  const unlockDevice = async (userId: string): Promise<boolean> => {
    if (!user || !['admin', 'company_admin', 'system_manager'].includes(user.role)) return false;
    
    const { error } = await supabase
      .from("app_users")
      .update({ 
        device_id: null,
        device_locked_at: null
      })
      .eq("id", userId);
    
    return !error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      authUser,
      tenant, 
      companySettings,
      isLoading, 
      isSystemManager,
      login, 
      logout, 
      hasPermission, 
      updateTenantTheme, 
      unlockDevice,
      refreshCompanySettings
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string {
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Role hierarchy for permission checks
export const roleHierarchy: Record<AppRole, number> = {
  system_manager: 6,
  company_admin: 5,
  admin: 4,
  manager: 3,
  cashier: 2,
  viewer: 1,
};

export const roleLabels: Record<AppRole, string> = {
  system_manager: "مدير النظام العام",
  company_admin: "مدير الشركة",
  admin: "مدير",
  manager: "مشرف",
  cashier: "كاشير",
  viewer: "مشاهد",
};
