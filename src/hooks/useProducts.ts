import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Product {
  id: string;
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  warehouse_id: string | null;
  category: string | null;
  barcode: string | null;
  image_url: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useProducts = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["products", tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .order("item_number");
      
      // Filter by tenant if available
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!tenant?.id,
  });
};

export const useNextProductNumber = () => {
  return useQuery({
    queryKey: ["products", "nextNumber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("item_number")
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].item_number) || 0;
        return String(lastNumber + 1).padStart(4, "0");
      }
      
      return "0001";
    },
  });
};

export const useProductCategories = () => {
  return useQuery({
    queryKey: ["products", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .not("category", "is", null);
      
      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set(data.map(p => p.category).filter(Boolean))] as string[];
      return categories.sort();
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
        .or(`item_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: searchTerm.length > 0,
  });
};

export const useProductByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ["products", "barcode", barcode],
    queryFn: async () => {
      if (!barcode) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcode)
        .maybeSingle();
      
      if (error) throw error;
      return data as Product | null;
    },
    enabled: barcode.length > 0,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at" | "tenant_id">) => {
      if (!tenant?.id) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, tenant_id: tenant.id })
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
