import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  invoice_date: string;
  payment_method: string;
  total_amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  min_price: number;
  total: number;
  warehouse_id: string | null;
  created_at: string;
}

export const useInvoices = () => {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useInvoiceWithItems = (invoiceId: string) => {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, clients(*)")
        .eq("id", invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);
      
      if (itemsError) throw itemsError;
      
      return { invoice, items };
    },
    enabled: !!invoiceId,
  });
};

export const useNextInvoiceNumber = () => {
  return useQuery({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].invoice_number) || 0;
        return String(lastNumber + 1);
      }
      
      return "1";
    },
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      invoice, 
      items 
    }: { 
      invoice: Omit<Invoice, "id" | "created_at" | "updated_at">; 
      items: Omit<InvoiceItem, "id" | "invoice_id" | "created_at">[] 
    }) => {
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoice)
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Create invoice items
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoice_id: invoiceData.id,
      }));
      
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsWithInvoiceId);
      
      if (itemsError) throw itemsError;
      
      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["nextInvoiceNumber"] });
      toast.success("تم حفظ الفاتورة بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حفظ الفاتورة: ${error.message}`);
    },
  });
};

export const useSalesReport = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["salesReport", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate)
        .order("invoice_date");
      
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!startDate && !!endDate,
  });
};
