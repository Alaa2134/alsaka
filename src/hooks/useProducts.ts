import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Product {
  id: string;
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  warehouse_id: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("item_number");
      
      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useProductSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: ["products", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`item_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: searchTerm.length > 0,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم إضافة المنتج بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إضافة المنتج: ${error.message}`);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(product)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم تحديث المنتج بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث المنتج: ${error.message}`);
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم حذف المنتج بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف المنتج: ${error.message}`);
    },
  });
};
