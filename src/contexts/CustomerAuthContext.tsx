import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  client_number: string;
  address: string | null;
  tenant_id: string | null;
}

interface CustomerAuthContextType {
  customer: CustomerData | null;
  isLoading: boolean;
  login: (phone: string, clientNumber: string, tenantId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
};

interface CustomerAuthProviderProps {
  children: ReactNode;
  tenantId?: string;
}

export const CustomerAuthProvider = ({ children, tenantId }: CustomerAuthProviderProps) => {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved customer session
    const savedCustomer = localStorage.getItem(`customer_session_${tenantId}`);
    if (savedCustomer) {
      try {
        setCustomer(JSON.parse(savedCustomer));
      } catch {
        localStorage.removeItem(`customer_session_${tenantId}`);
      }
    }
    setIsLoading(false);
  }, [tenantId]);

  const login = async (phone: string, clientNumber: string, tenantId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate inputs
      if (!phone || phone.length < 10) {
        return { success: false, error: "رقم الهاتف غير صالح" };
      }
      if (!clientNumber || clientNumber.length < 1) {
        return { success: false, error: "رقم العميل مطلوب" };
      }

      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedPhone = phone.replace(/[\s\-()]/g, '');

      // Look up customer in clients table
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("client_number", clientNumber)
        .maybeSingle();

      if (error) {
        console.error("Login error:", error);
        return { success: false, error: "حدث خطأ في النظام" };
      }

      if (!data) {
        return { success: false, error: "رقم العميل غير موجود" };
      }

      // Check phone number matches
      const customerPhone = data.phone?.replace(/[\s\-()]/g, '') || '';
      if (customerPhone !== normalizedPhone && !customerPhone.endsWith(normalizedPhone) && !normalizedPhone.endsWith(customerPhone)) {
        return { success: false, error: "رقم الهاتف غير مطابق" };
      }

      // Success - save customer session
      const customerData: CustomerData = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        client_number: data.client_number,
        address: data.address,
        tenant_id: data.tenant_id,
      };

      setCustomer(customerData);
      localStorage.setItem(`customer_session_${tenantId}`, JSON.stringify(customerData));
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "حدث خطأ غير متوقع" };
    }
  };

  const logout = () => {
    setCustomer(null);
    if (tenantId) {
      localStorage.removeItem(`customer_session_${tenantId}`);
    }
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, isLoading, login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
