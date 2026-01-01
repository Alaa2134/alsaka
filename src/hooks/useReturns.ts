import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Return {
  id: string;
  return_number: string;
  invoice_id: string | null;
  client_id: string | null;
  tenant_id: string | null;
  return_date: string;
  total_amount: number;
  reason: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string | null;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export const useReturns = () => {
  return useQuery({
    queryKey: ["returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("*, clients(name), return_items(*)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useReturnWithItems = (returnId: string) => {
  return useQuery({
    queryKey: ["return", returnId],
    queryFn: async () => {
      const { data: returnData, error: returnError } = await supabase
        .from("returns")
        .select("*, clients(*)")
        .eq("id", returnId)
        .single();
      
      if (returnError) throw returnError;
      
      const { data: items, error: itemsError } = await supabase
        .from("return_items")
        .select("*")
        .eq("return_id", returnId);
      
      if (itemsError) throw itemsError;
      
      return { returnData, items };
    },
    enabled: !!returnId,
  });
};

export const useNextReturnNumber = () => {
  return useQuery({
    queryKey: ["nextReturnNumber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("return_number")
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].return_number.replace("R", "")) || 0;
        return `R${String(lastNumber + 1).padStart(4, "0")}`;
      }
      
      return "R0001";
    },
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      returnData, 
      items 
    }: { 
      returnData: Omit<Return, "id" | "created_at" | "updated_at">; 
      items: Omit<ReturnItem, "id" | "return_id" | "created_at">[] 
    }) => {
      // Create return
      const { data: createdReturn, error: returnError } = await supabase
        .from("returns")
        .insert(returnData)
        .select()
        .single();
      
      if (returnError) throw returnError;
      
      // Create return items
      const itemsWithReturnId = items.map(item => ({
        ...item,
        return_id: createdReturn.id,
      }));
      
      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(itemsWithReturnId);
      
      if (itemsError) throw itemsError;
      
      // Update product stock (increase quantity)
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from("products")
              .update({ stock_quantity: product.stock_quantity + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }
      
      return createdReturn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["nextReturnNumber"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم حفظ فاتورة المرتجعات بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حفظ فاتورة المرتجعات: ${error.message}`);
    },
  });
};
