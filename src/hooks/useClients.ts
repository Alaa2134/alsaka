import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Client {
  id: string;
  client_number: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useClients = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["clients", tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .order("client_number");
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!tenant?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
};

export const useClientSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: ["clients", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .or(`client_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Client[];
    },
    enabled: searchTerm.length > 0,
  });
};

export const useNextClientNumber = () => {
  return useQuery({
    queryKey: ["clients", "nextNumber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("client_number")
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].client_number) || 0;
        return String(lastNumber + 1).padStart(4, "0");
      }
      
      return "0001";
    },
  });
};

export const useCreateClient = (options?: { showToast?: boolean }) => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  const showToast = options?.showToast ?? true;
  
  return useMutation({
    mutationFn: async (client: Omit<Client, "id" | "created_at" | "updated_at" | "tenant_id">) => {
      if (!tenant?.id) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, tenant_id: tenant.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (showToast) {
        toast.success("تم إضافة العميل بنجاح");
      }
    },
    onError: (error: Error) => {
      if (showToast) {
        toast.error(`خطأ في إضافة العميل: ${error.message}`);
      }
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...client }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(client)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("تم تحديث العميل بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث العميل: ${error.message}`);
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("تم حذف العميل بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف العميل: ${error.message}`);
    },
  });
};
