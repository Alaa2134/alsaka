import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  User,
  Lock,
  Check,
  AlertTriangle
} from "lucide-react";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";

const AccountSettings = () => {
  const { user, logout } = useAuth();
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingCode, setIsChangingCode] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Fetch 2FA status
  useEffect(() => {
    const fetch2FAStatus = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('app_users')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .single();
      if (data) {
        setIs2FAEnabled(data.two_factor_enabled || false);
      }
    };
    fetch2FAStatus();
  }, [user?.id]);

  const validateNewCode = (code: string): string | null => {
    if (code.length < 4) {
      return "كود الدخول يجب أن يكون 4 أحرف على الأقل";
    }
    if (code.length > 20) {
      return "كود الدخول يجب أن يكون أقل من 20 حرف";
    }
    if (!/^[A-Za-z0-9]+$/.test(code)) {
      return "كود الدخول يجب أن يحتوي على أحرف وأرقام فقط";
    }
    return null;
  };

  const handleChangeCode = async () => {
    if (!currentCode.trim()) {
      toast.error("يرجى إدخال كود الدخول الحالي");
      return;
    }

    if (!newCode.trim()) {
      toast.error("يرجى إدخال كود الدخول الجديد");
      return;
    }

    const validationError = validateNewCode(newCode);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (newCode !== confirmCode) {
      toast.error("كود الدخول الجديد غير متطابق");
      return;
    }

    if (newCode === currentCode) {
      toast.error("كود الدخول الجديد يجب أن يكون مختلفاً عن الحالي");
      return;
    }

    setIsChangingCode(true);

    try {
      // Verify current code using the secure function
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc('verify_user_login', { p_access_code: currentCode.trim() });

      if (verifyError || !verifyResult?.[0]?.is_active) {
        toast.error("كود الدخول الحالي غير صحيح");
        setIsChangingCode(false);
        return;
      }

      // Make sure verified user matches logged in user
      if (verifyResult[0].user_id !== user?.id) {
        toast.error("كود الدخول الحالي غير صحيح");
        setIsChangingCode(false);
        return;
      }

      // Hash and update the new code
      const { data: hashedCode, error: hashError } = await supabase
        .rpc('hash_access_code', { plain_code: newCode.trim().toUpperCase() });

      if (hashError || !hashedCode) {
        toast.error("فشل في تشفير كود الدخول الجديد");
        setIsChangingCode(false);
        return;
      }

      // Update access code
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ 
          access_code_hash: hashedCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Update Supabase Auth password to match
      const email = `${newCode.trim().toUpperCase()}@app.internal`;
      
      // Call edge function to update auth user
      const { error: authUpdateError } = await supabase.functions.invoke('create-auth-user', {
        body: { 
          accessCode: newCode.trim().toUpperCase(),
          updateExisting: true,
          userId: user?.id
        }
      });

      if (authUpdateError) {
        console.error("Auth update error:", authUpdateError);
        // Continue anyway - access code was updated
      }

      toast.success("تم تغيير كود الدخول بنجاح! سيتم تسجيل خروجك الآن");
      
      // Clear form
      setCurrentCode("");
      setNewCode("");
      setConfirmCode("");

      // Logout user to re-login with new code
      setTimeout(() => {
        logout();
      }, 2000);

    } catch (error: any) {
      console.error("Error changing code:", error);
      toast.error(`فشل في تغيير كود الدخول: ${error?.message || "خطأ غير معروف"}`);
    } finally {
      setIsChangingCode(false);
    }
  };

  const handle2FASuccess = () => {
    setIs2FAEnabled(true);
    toast.success("تم تفعيل المصادقة الثنائية بنجاح!");
  };

  const handleDisable2FA = async () => {
    if (!confirm("هل أنت متأكد من إلغاء المصادقة الثنائية؟ سيقلل هذا من أمان حسابك.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ 
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          two_factor_verified_at: null
        })
        .eq('id', user?.id);

      if (error) throw error;

      setIs2FAEnabled(false);
      toast.success("تم إلغاء المصادقة الثنائية");
    } catch (error: any) {
      toast.error(`فشل في إلغاء المصادقة الثنائية: ${error?.message}`);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-lg text-muted-foreground">يرجى تسجيل الدخول أولاً</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>إعدادات الحساب | نظام الفواتير</title>
        <meta name="description" content="إدارة إعدادات حسابك الشخصي" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">إعدادات الحساب</h1>
            <p className="text-muted-foreground mt-1">إدارة كود الدخول والأمان</p>
          </div>

          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.role === 'system_manager' ? 'مدير النظام' : 
                     user.role === 'admin' ? 'مدير' : 
                     user.role === 'company_admin' ? 'مدير الشركة' :
                     user.role === 'manager' ? 'مشرف' :
                     user.role === 'cashier' ? 'كاشير' : 'مشاهد'}
                  </p>
                </div>
                <Badge variant={user.is_active ? "default" : "destructive"}>
                  {user.is_active ? "نشط" : "معطل"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Change Access Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                تغيير كود الدخول
              </CardTitle>
              <CardDescription>
                قم بتغيير كود الدخول الخاص بك لتسجيل الدخول
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Code */}
              <div className="space-y-2">
                <Label htmlFor="currentCode">كود الدخول الحالي</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentCode"
                    type={showCurrent ? "text" : "password"}
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value.toUpperCase())}
                    placeholder="أدخل الكود الحالي"
                    className="pr-10 pl-10 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Separator />

              {/* New Code */}
              <div className="space-y-2">
                <Label htmlFor="newCode">كود الدخول الجديد</Label>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newCode"
                    type={showNew ? "text" : "password"}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="أدخل الكود الجديد"
                    className="pr-10 pl-10 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  يجب أن يكون 4-20 حرف/رقم (أحرف إنجليزية وأرقام فقط)
                </p>
              </div>

              {/* Confirm New Code */}
              <div className="space-y-2">
                <Label htmlFor="confirmCode">تأكيد كود الدخول الجديد</Label>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmCode"
                    type={showConfirm ? "text" : "password"}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                    placeholder="أعد إدخال الكود الجديد"
                    className="pr-10 pl-10 font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmCode && newCode !== confirmCode && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    الكود غير متطابق
                  </p>
                )}
                {confirmCode && newCode === confirmCode && newCode.length >= 4 && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    الكود متطابق
                  </p>
                )}
              </div>

              <Button 
                onClick={handleChangeCode} 
                disabled={isChangingCode || !currentCode || !newCode || newCode !== confirmCode}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                {isChangingCode ? "جاري التغيير..." : "تغيير كود الدخول"}
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                المصادقة الثنائية (2FA)
              </CardTitle>
              <CardDescription>
                أضف طبقة حماية إضافية لحسابك باستخدام أكواد الاسترداد
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    is2FAEnabled ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                  }`}>
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {is2FAEnabled ? "المصادقة الثنائية مفعلة" : "المصادقة الثنائية غير مفعلة"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {is2FAEnabled 
                        ? "حسابك محمي بأكواد الاسترداد" 
                        : "فعّل المصادقة الثنائية لحماية إضافية"
                      }
                    </p>
                  </div>
                </div>
                <Badge variant={is2FAEnabled ? "default" : "secondary"}>
                  {is2FAEnabled ? "مفعل" : "غير مفعل"}
                </Badge>
              </div>

              {is2FAEnabled ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="font-medium text-green-700 mb-1">✓ حسابك محمي</p>
                    <p className="text-green-600">
                      عند نسيان كود الدخول، يمكنك استخدام أكواد الاسترداد لتسجيل الدخول
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleDisable2FA}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    إلغاء المصادقة الثنائية
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <p className="font-medium text-yellow-700 mb-1">⚠️ حسابك غير محمي بالكامل</p>
                    <p className="text-yellow-600">
                      فعّل المصادقة الثنائية للحصول على أكواد استرداد تستخدمها عند نسيان كود الدخول
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShow2FASetup(true)}
                    className="w-full gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    تفعيل المصادقة الثنائية
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup
        open={show2FASetup}
        onOpenChange={setShow2FASetup}
        onSuccess={handle2FASuccess}
      />
    </>
  );
};

export default AccountSettings;