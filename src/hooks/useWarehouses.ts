import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export const useWarehouses = () => {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Warehouse[];
    },
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (warehouse: { name: string; address?: string | null }) => {
      const { data, error } = await supabase
        .from("warehouses")
        .insert(warehouse)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("تم إضافة المخزن بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إضافة المخزن: ${error.message}`);
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...warehouse }: Partial<Warehouse> & { id: string }) => {
      const { data, error } = await supabase
        .from("warehouses")
        .update(warehouse)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("تم تحديث المخزن بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث المخزن: ${error.message}`);
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("تم حذف المخزن بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف المخزن: ${error.message}`);
    },
  });
};
