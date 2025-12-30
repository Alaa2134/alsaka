import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Payment {
  id: string;
  client_id: string;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  client_id: string;
  invoice_id?: string | null;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string | null;
}

export const usePayments = (clientId?: string) => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["payments", clientId, tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false });
      
      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  
  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...payment,
          tenant_id: tenant?.id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["credit_report"] });
      toast.success("تم تسجيل الدفعة بنجاح");
    },
    onError: (error) => {
      console.error("Failed to create payment:", error);
      toast.error("فشل في تسجيل الدفعة");
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["credit_report"] });
      toast.success("تم حذف الدفعة");
    },
    onError: (error) => {
      console.error("Failed to delete payment:", error);
      toast.error("فشل في حذف الدفعة");
    },
  });
};

export const useClientPaymentsTotal = (clientId: string | null) => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["client_payments_total", clientId, tenant?.id],
    queryFn: async () => {
      if (!clientId) return 0;
      
      let query = supabase
        .from("payments")
        .select("amount")
        .eq("client_id", clientId);
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
    },
    enabled: !!clientId,
  });
};
