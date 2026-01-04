import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

export const useAuditLogs = (filters?: {
  action?: string;
  tableName?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { tenant, isSystemManager } = useAuth();

  return useQuery({
    queryKey: ["audit-logs", tenant?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select(`
          *,
          app_users!audit_logs_user_id_fkey (name)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      // Filter by tenant if not system manager
      if (!isSystemManager && tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }

      if (filters?.action) {
        query = query.ilike("action", `%${filters.action}%`);
      }

      if (filters?.tableName) {
        query = query.eq("table_name", filters.tableName);
      }

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((log) => ({
        ...log,
        user_name: log.app_users?.name || "غير معروف",
      })) as AuditLog[];
    },
    enabled: !!tenant?.id || isSystemManager,
  });
};

export const useLogActivity = () => {
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      tableName,
      recordId,
      oldData,
      newData,
    }: {
      action: string;
      tableName: string;
      recordId?: string;
      oldData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
    }) => {
      const insertData: {
        user_id?: string;
        tenant_id?: string;
        action: string;
        table_name: string;
        record_id?: string;
        old_data?: Json;
        new_data?: Json;
      } = {
        user_id: user?.id,
        tenant_id: tenant?.id,
        action,
        table_name: tableName,
        record_id: recordId,
      };
      
      if (oldData) {
        insertData.old_data = oldData as Json;
      }
      if (newData) {
        insertData.new_data = newData as Json;
      }
      
      const { error } = await supabase.from("audit_logs").insert([insertData]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Helper to get action label in Arabic
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    INSERT: "إضافة",
    UPDATE: "تعديل",
    DELETE: "حذف",
    LOGIN: "تسجيل دخول",
    LOGOUT: "تسجيل خروج",
    VIEW: "عرض",
    EXPORT: "تصدير",
    IMPORT: "استيراد",
    PRINT: "طباعة",
  };
  
  if (action.startsWith("SECURITY:")) {
    return "حدث أمني";
  }
  
  return labels[action] || action;
};

// Helper to get table label in Arabic
export const getTableLabel = (tableName: string): string => {
  const labels: Record<string, string> = {
    products: "المنتجات",
    invoices: "الفواتير",
    invoice_items: "بنود الفواتير",
    clients: "العملاء",
    payments: "المدفوعات",
    returns: "المرتجعات",
    return_items: "بنود المرتجعات",
    app_users: "المستخدمين",
    tenants: "الشركات",
    company_settings: "إعدادات الشركة",
    warehouses: "المخازن",
    store_orders: "طلبات المتجر",
    store_order_items: "بنود الطلبات",
    store_links: "روابط المتجر",
    accounts: "الحسابات",
    journal_entries: "القيود المحاسبية",
    security_events: "أحداث أمنية",
  };
  return labels[tableName] || tableName;
};
