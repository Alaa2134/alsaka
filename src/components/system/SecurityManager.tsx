import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldOff, Key, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const SecurityManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Fetch current user's 2FA status
  const { data: securityData, isLoading } = useQuery({
    queryKey: ['security-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('app_users')
        .select('two_factor_enabled, two_factor_verified_at, backup_codes')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const disable2FA = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('app_users')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_verified_at: null,
          backup_codes: null
        })
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-status'] });
      toast.success('تم تعطيل المصادقة الثنائية');
      setShowDisableConfirm(false);
    },
    onError: () => {
      toast.error('فشل في تعطيل المصادقة الثنائية');
    }
  });

  const regenerateCodes = useMutation({
    mutationFn: async () => {
      const newCodes = Array.from({ length: 8 }, () => 
        Math.random().toString().slice(2, 8)
      );
      const { error } = await supabase
        .from('app_users')
        .update({ backup_codes: newCodes })
        .eq('id', user?.id);
      if (error) throw error;
      return newCodes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-status'] });
      toast.success('تم تجديد أكواد الاسترداد');
      setShowRegenConfirm(false);
    },
    onError: () => {
      toast.error('فشل في تجديد الأكواد');
    }
  });

  const is2FAEnabled = securityData?.two_factor_enabled;
  const backupCodesCount = (securityData?.backup_codes as string[] | null)?.length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            المصادقة الثنائية (2FA)
          </CardTitle>
          <CardDescription>
            أضف طبقة حماية إضافية لحسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {is2FAEnabled ? (
                <ShieldCheck className="w-8 h-8 text-green-500" />
              ) : (
                <ShieldOff className="w-8 h-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">حالة المصادقة الثنائية</p>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled 
                    ? `مفعّلة منذ ${new Date(securityData?.two_factor_verified_at).toLocaleDateString('ar-EG')}`
                    : 'غير مفعّلة'
                  }
                </p>
              </div>
            </div>
            <Badge variant={is2FAEnabled ? "default" : "secondary"}>
              {is2FAEnabled ? "مفعّلة" : "معطّلة"}
            </Badge>
          </div>

          {is2FAEnabled ? (
            <div className="space-y-3">
              {/* Backup codes info */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <span>أكواد الاسترداد المتبقية</span>
                </div>
                <Badge variant="outline">{backupCodesCount} أكواد</Badge>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegenConfirm(true)}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  تجديد الأكواد
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDisableConfirm(true)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  تعطيل 2FA
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowSetup(true)} className="w-full">
              <Shield className="w-4 h-4 ml-2" />
              تفعيل المصادقة الثنائية
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>نصائح أمنية</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              استخدم كود دخول قوي وفريد
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              احفظ أكواد الاسترداد في مكان آمن
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              لا تشارك كود الدخول مع أي شخص
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              قم بتسجيل الخروج عند الانتهاء
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup 
        open={showSetup} 
        onOpenChange={setShowSetup}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['security-status'] });
        }}
      />

      {/* Disable Confirmation */}
      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل المصادقة الثنائية؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إزالة الحماية الإضافية من حسابك. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => disable2FA.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تجديد أكواد الاسترداد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء الأكواد القديمة وإنشاء أكواد جديدة. تأكد من حفظ الأكواد الجديدة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerateCodes.mutate()}>
              تجديد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
