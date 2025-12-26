import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Client {
  id: string;
  client_number: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useClients = () => {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("client_number");
      
      if (error) throw error;
      return data as Client[];
    },
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

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (client: Omit<Client, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("تم إضافة العميل بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إضافة العميل: ${error.message}`);
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
