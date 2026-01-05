import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Plus,
  Trash2,
  Save,
  Bell,
  AlertTriangle,
  Lock,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EmailNotificationSetting {
  id: string;
  tenant_id: string;
  user_id: string | null;
  email_address: string;
  notify_on_critical_events: boolean;
  notify_on_failed_logins: boolean;
  notify_on_account_lock: boolean;
  weekly_report_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const EmailNotificationSettings = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ["email-notification-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("email_notification_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailNotificationSetting[];
    },
    enabled: !!tenant?.id,
  });

  const addEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!tenant?.id) throw new Error("No tenant");

      const { error } = await supabase.from("email_notification_settings").insert({
        tenant_id: tenant.id,
        email_address: email,
        notify_on_critical_events: true,
        notify_on_failed_logins: true,
        notify_on_account_lock: true,
        weekly_report_enabled: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إضافة البريد الإلكتروني بنجاح");
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["email-notification-settings"] });
    },
    onError: () => {
      toast.error("فشل في إضافة البريد الإلكتروني");
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<EmailNotificationSetting>;
    }) => {
      const { error } = await supabase
        .from("email_notification_settings")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      queryClient.invalidateQueries({ queryKey: ["email-notification-settings"] });
    },
    onError: () => {
      toast.error("فشل في تحديث الإعدادات");
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_notification_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف البريد الإلكتروني");
      queryClient.invalidateQueries({ queryKey: ["email-notification-settings"] });
    },
    onError: () => {
      toast.error("فشل في حذف البريد الإلكتروني");
    },
  });

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast.error("أدخل البريد الإلكتروني");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }
    addEmailMutation.mutate(newEmail);
  };

  const handleToggle = (
    id: string,
    field: keyof EmailNotificationSetting,
    currentValue: boolean
  ) => {
    updateSettingMutation.mutate({
      id,
      updates: { [field]: !currentValue },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          إعدادات إشعارات البريد الإلكتروني
        </CardTitle>
        <CardDescription>
          إدارة عناوين البريد الإلكتروني لاستقبال التنبيهات الأمنية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Email */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="example@domain.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            dir="ltr"
            className="flex-1"
          />
          <Button onClick={handleAddEmail} disabled={addEmailMutation.isPending}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة
          </Button>
        </div>

        {/* Email List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : settings?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد بريد إلكتروني مسجل</p>
                <p className="text-sm">أضف بريداً إلكترونياً لاستقبال التنبيهات</p>
              </div>
            ) : (
              settings?.map((setting) => (
                <div
                  key={setting.id}
                  className="p-4 bg-muted rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <span className="font-medium" dir="ltr">
                        {setting.email_address}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteSettingMutation.mutate(setting.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">الأحداث الحرجة</span>
                      </div>
                      <Switch
                        checked={setting.notify_on_critical_events}
                        onCheckedChange={() =>
                          handleToggle(
                            setting.id,
                            "notify_on_critical_events",
                            setting.notify_on_critical_events
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">محاولات الدخول الفاشلة</span>
                      </div>
                      <Switch
                        checked={setting.notify_on_failed_logins}
                        onCheckedChange={() =>
                          handleToggle(
                            setting.id,
                            "notify_on_failed_logins",
                            setting.notify_on_failed_logins
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">قفل الحسابات</span>
                      </div>
                      <Switch
                        checked={setting.notify_on_account_lock}
                        onCheckedChange={() =>
                          handleToggle(
                            setting.id,
                            "notify_on_account_lock",
                            setting.notify_on_account_lock
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">التقرير الأسبوعي</span>
                      </div>
                      <Switch
                        checked={setting.weekly_report_enabled}
                        onCheckedChange={() =>
                          handleToggle(
                            setting.id,
                            "weekly_report_enabled",
                            setting.weekly_report_enabled
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            ℹ️ معلومات عن الإشعارات
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• الأحداث الحرجة: قفل الحسابات، نشاط مشبوه</li>
            <li>• محاولات الدخول الفاشلة: 3 محاولات أو أكثر</li>
            <li>• التقرير الأسبوعي: يُرسل كل يوم أحد</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
