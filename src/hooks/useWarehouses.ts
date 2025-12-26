import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
