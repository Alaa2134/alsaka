import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  tenant_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export const useSecurityEvents = (filters?: {
  eventType?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { tenant, isSystemManager } = useAuth();

  return useQuery({
    queryKey: ["security-events", tenant?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!isSystemManager && tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }

      if (filters?.eventType) {
        query = query.eq("event_type", filters.eventType);
      }

      if (filters?.severity) {
        query = query.eq("severity", filters.severity);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SecurityEvent[];
    },
    enabled: !!tenant?.id || isSystemManager,
  });
};

export const useSecurityAlertsSubscription = () => {
  const { tenant, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.id || !hasPermission(["admin", "company_admin", "system_manager"])) {
      return;
    }

    const channel = supabase
      .channel("security-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_events",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        (payload) => {
          const event = payload.new as SecurityEvent;

          // Show notification for critical events
          if (event.severity === "critical") {
            toast.error(`تنبيه أمني: ${getEventLabel(event.event_type)}`, {
              description: event.details?.ip_address
                ? `IP: ${event.details.ip_address}`
                : undefined,
              duration: 10000,
            });
          } else if (event.severity === "warning") {
            toast.warning(`تحذير: ${getEventLabel(event.event_type)}`, {
              duration: 5000,
            });
          }

          // Refresh the security events list
          queryClient.invalidateQueries({ queryKey: ["security-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, hasPermission, queryClient]);
};

export const useLogSecurityEvent = () => {
  return useMutation({
    mutationFn: async ({
      eventType,
      severity = "info",
      details = {},
    }: {
      eventType: string;
      severity?: string;
      details?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc("log_security_event", {
        _event_type: eventType,
        _severity: severity,
        _details: details as unknown as Record<string, never>,
      });

      if (error) throw error;
      return data;
    },
  });
};

export const getEventLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "تسجيل دخول ناجح",
    FAILED_LOGIN: "محاولة دخول فاشلة",
    FAILED_LOGIN_UNKNOWN_USER: "محاولة دخول بكود غير معروف",
    ACCOUNT_LOCKED: "تم قفل الحساب",
    LOGOUT: "تسجيل خروج",
    SESSION_EXPIRED: "انتهاء الجلسة",
    PASSWORD_CHANGE: "تغيير كلمة المرور",
    TWO_FACTOR_ENABLED: "تفعيل المصادقة الثنائية",
    TWO_FACTOR_DISABLED: "إلغاء المصادقة الثنائية",
    DEVICE_UNLOCKED: "فك قفل الجهاز",
    PERMISSION_DENIED: "رفض صلاحية",
    SUSPICIOUS_ACTIVITY: "نشاط مشبوه",
  };
  return labels[eventType] || eventType;
};

export const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    info: "معلومات",
    warning: "تحذير",
    critical: "حرج",
  };
  return labels[severity] || severity;
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };
  return colors[severity] || "bg-gray-500";
};
