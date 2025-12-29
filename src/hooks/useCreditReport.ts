import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClientBalance {
  client_id: string;
  client_name: string;
  client_number: string;
  client_phone: string | null;
  total_sales: number;
  total_paid: number;
  balance_due: number;
  last_invoice_date: string | null;
  invoice_count: number;
}

export interface CreditReport {
  clients: ClientBalance[];
  total_sales: number;
  total_balance_due: number;
  total_clients_with_balance: number;
}

export const useCreditReport = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["credit_report", tenant?.id],
    queryFn: async (): Promise<CreditReport> => {
      // Fetch all clients
      let clientsQuery = supabase
        .from("clients")
        .select("id, name, client_number, phone");
      
      if (tenant?.id) {
        clientsQuery = clientsQuery.eq("tenant_id", tenant.id);
      }
      
      const { data: clients, error: clientsError } = await clientsQuery;
      if (clientsError) throw clientsError;
      
      // Fetch all invoices with client info
      let invoicesQuery = supabase
        .from("invoices")
        .select("id, client_id, total_amount, invoice_date, payment_method, status");
      
      if (tenant?.id) {
        invoicesQuery = invoicesQuery.eq("tenant_id", tenant.id);
      }
      
      const { data: invoices, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;
      
      // Calculate balances per client
      const clientBalances: ClientBalance[] = (clients || []).map(client => {
        const clientInvoices = (invoices || []).filter(inv => inv.client_id === client.id);
        
        // Total sales for this client
        const totalSales = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        // For credit tracking, we consider "آجل" (credit) invoices as unpaid
        const creditInvoices = clientInvoices.filter(inv => inv.payment_method === "آجل");
        const balanceDue = creditInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
        // Total paid = total sales - balance due
        const totalPaid = totalSales - balanceDue;
        
        // Last invoice date
        const sortedInvoices = [...clientInvoices].sort((a, b) => 
          new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
        );
        const lastInvoiceDate = sortedInvoices[0]?.invoice_date || null;
        
        return {
          client_id: client.id,
          client_name: client.name,
          client_number: client.client_number,
          client_phone: client.phone,
          total_sales: totalSales,
          total_paid: totalPaid,
          balance_due: balanceDue,
          last_invoice_date: lastInvoiceDate,
          invoice_count: clientInvoices.length,
        };
      });
      
      // Filter to only clients with invoices or balance
      const activeClients = clientBalances.filter(c => c.invoice_count > 0);
      
      // Sort by balance due (highest first)
      activeClients.sort((a, b) => b.balance_due - a.balance_due);
      
      return {
        clients: activeClients,
        total_sales: activeClients.reduce((sum, c) => sum + c.total_sales, 0),
        total_balance_due: activeClients.reduce((sum, c) => sum + c.balance_due, 0),
        total_clients_with_balance: activeClients.filter(c => c.balance_due > 0).length,
      };
    },
  });
};

export const useClientCreditHistory = (clientId: string | null) => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["client_credit_history", clientId, tenant?.id],
    queryFn: async () => {
      if (!clientId) return [];
      
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, payment_method, status, notes")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!clientId,
  });
};
