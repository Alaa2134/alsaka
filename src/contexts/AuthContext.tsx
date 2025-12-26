import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "cashier" | "viewer";

export interface AppUser {
  id: string;
  name: string;
  access_code: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (requiredRoles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "app_user_session";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      try {
        const parsedUser = JSON.parse(storedSession);
        // Verify user still exists and is active
        verifyUser(parsedUser.id);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      } else {
        setUser(data as AppUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("access_code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        return { success: false, error: "حدث خطأ في الاتصال" };
      }

      if (!data) {
        return { success: false, error: "كود الدخول غير صحيح" };
      }

      const appUser = data as AppUser;
      setUser(appUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser));
      
      return { success: true };
    } catch {
      return { success: false, error: "حدث خطأ غير متوقع" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (requiredRoles: AppRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
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
