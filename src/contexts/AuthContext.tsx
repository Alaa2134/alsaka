import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateDeviceId } from "@/utils/deviceId";

export type AppRole = "admin" | "manager" | "cashier" | "viewer";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
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
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AppUser | null;
  tenant: Tenant | null;
  isLoading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (requiredRoles: AppRole[]) => boolean;
  updateTenantTheme: (colors: { primary_color?: string; secondary_color?: string }) => Promise<void>;
  unlockDevice: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "app_user_session";
const TENANT_KEY = "app_tenant_session";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Apply tenant theme colors
  useEffect(() => {
    if (tenant) {
      document.documentElement.style.setProperty('--primary', hexToHsl(tenant.primary_color));
      document.documentElement.style.setProperty('--accent', hexToHsl(tenant.secondary_color));
      document.documentElement.style.setProperty('--gradient-start', hexToHsl(tenant.primary_color));
      document.documentElement.style.setProperty('--gradient-end', hexToHsl(tenant.secondary_color));
    }
  }, [tenant]);

  // Auto logout on browser/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sessionStorage to track if this is a page reload vs close
      sessionStorage.setItem('isReloading', 'true');
    };

    const handleLoad = () => {
      const isReloading = sessionStorage.getItem('isReloading');
      if (!isReloading) {
        // Browser was closed and reopened - logout
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
      }
      sessionStorage.removeItem('isReloading');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handleLoad);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    const storedTenant = localStorage.getItem(TENANT_KEY);
    
    if (storedSession) {
      try {
        const parsedUser = JSON.parse(storedSession);
        const parsedTenant = storedTenant ? JSON.parse(storedTenant) : null;
        verifyUser(parsedUser.id, parsedTenant);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyUser = async (userId: string, cachedTenant: Tenant | null) => {
    try {
      const currentDeviceId = generateDeviceId();
      
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TENANT_KEY);
        setUser(null);
        setTenant(null);
      } else {
        const appUser = data as AppUser;
        
        // Check device lock
        if (appUser.device_id && appUser.device_id !== currentDeviceId) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TENANT_KEY);
          setUser(null);
          setTenant(null);
          setIsLoading(false);
          return;
        }
        
        setUser(appUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // Fetch tenant if user has one
        if (appUser.tenant_id) {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", appUser.tenant_id)
            .maybeSingle();
          
          if (tenantData) {
            setTenant(tenantData as Tenant);
            localStorage.setItem(TENANT_KEY, JSON.stringify(tenantData));
          }
        } else if (cachedTenant) {
          setTenant(cachedTenant);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TENANT_KEY);
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentDeviceId = generateDeviceId();
      
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("access_code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Login error:", error);
        return { success: false, error: "حدث خطأ في الاتصال" };
      }

      if (!data) {
        return { success: false, error: "كود الدخول غير صحيح" };
      }

      const appUser = data as AppUser;
      
      // Check if already locked to another device
      if (appUser.device_id && appUser.device_id !== currentDeviceId) {
        return { 
          success: false, 
          error: "هذا الكود مستخدم على جهاز آخر. تواصل مع المدير لفك القفل." 
        };
      }
      
      // Lock to this device if not already locked
      if (!appUser.device_id) {
        const { error: updateError } = await supabase
          .from("app_users")
          .update({ 
            device_id: currentDeviceId,
            device_locked_at: new Date().toISOString()
          })
          .eq("id", appUser.id);
        
        if (updateError) {
          console.error("Device lock error:", updateError);
        } else {
          appUser.device_id = currentDeviceId;
          appUser.device_locked_at = new Date().toISOString();
        }
      }

      setUser(appUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));

      // Fetch tenant if user has one
      if (appUser.tenant_id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", appUser.tenant_id)
          .maybeSingle();
        
        if (tenantData) {
          setTenant(tenantData as Tenant);
          localStorage.setItem(TENANT_KEY, JSON.stringify(tenantData));
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error("Unexpected login error:", err);
      return { success: false, error: "حدث خطأ غير متوقع" };
    }
  };

  const logout = () => {
    setUser(null);
    setTenant(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TENANT_KEY);
    // Reset theme colors
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--gradient-start');
    document.documentElement.style.removeProperty('--gradient-end');
  };

  const hasPermission = (requiredRoles: AppRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  const updateTenantTheme = async (colors: { primary_color?: string; secondary_color?: string }) => {
    if (!tenant || !user || user.role !== 'admin') return;
    
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

  // Admin function to unlock a device for a user
  const unlockDevice = async (userId: string): Promise<boolean> => {
    if (!user || user.role !== 'admin') return false;
    
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
    <AuthContext.Provider value={{ user, tenant, isLoading, login, logout, hasPermission, updateTenantTheme, unlockDevice }}>
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
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
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
  admin: 4,
  manager: 3,
  cashier: 2,
  viewer: 1,
};

export const roleLabels: Record<AppRole, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  cashier: "كاشير",
  viewer: "مشاهد",
};
