import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, RefreshCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function LoginScreen() {
  const { boundUser, boundLoaded, refreshBoundUser, loginBound, claimDevice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };

  // Initial-activation form (only used the very first time on this machine)
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Daily password-only form (after the device is bound)
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  // The user can opt out of the bound-device prompt to claim with different
  // credentials (useful after a vendor "release device" reset).
  const [forceFirstTime, setForceFirstTime] = useState(false);

  const goNext = () => navigate(location.state?.from?.pathname || "/");

  const onClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !tempPassword || !newPassword) {
      toast.error("املأ كل الحقول");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("الباسورد الجديد لازم ٦ أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("الباسورد الجديد وتأكيده مختلفين");
      return;
    }
    if (newPassword === tempPassword) {
      toast.error("اختر باسورد مختلف عن المؤقت");
      return;
    }
    setBusy(true);
    try {
      const res = await claimDevice({
        email: email.trim(),
        currentPassword: tempPassword,
        newPassword,
      });
      if (res.ok) {
        toast.success("تم تفعيل الحساب على هذا الجهاز ✓");
        await refreshBoundUser();
        goNext();
      } else if (res.error === "device-mismatch") {
        toast.error("الحساب مفعّل على جهاز آخر — تواصل مع البائع لإعادة الربط");
      } else if (res.error === "locked-out") {
        toast.error("تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.");
      } else if (res.error === "weak-password") {
        toast.error("الباسورد ضعيف جدًا");
      } else if (res.error === "same-password") {
        toast.error("الباسورد الجديد لازم يختلف عن المؤقت");
      } else {
        toast.error("الإيميل أو الباسورد المؤقت غير صحيح");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const onBoundLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("اكتب كلمة المرور");
      return;
    }
    setBusy(true);
    try {
      const res = await loginBound(password);
      if (res.ok) {
        toast.success("تم تسجيل الدخول ✓");
        setPassword("");
        goNext();
      } else if (res.error === "locked-out") {
        toast.error("تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.");
      } else if (res.error === "not-bound") {
        toast.error("لم يعد هذا الجهاز مربوطًا — يرجى التفعيل من جديد");
        await refreshBoundUser();
      } else {
        toast.error("كلمة المرور غير صحيحة");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  if (!boundLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner label="جارٍ التحقق من الجهاز..." />
      </div>
    );
  }

  const showBound = boundUser && !forceFirstTime;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/60">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mb-2">
            S
          </div>
          <CardTitle className="text-2xl">SystemAlaa</CardTitle>
          {showBound ? (
            <CardDescription className="space-y-1">
              <div>تسجيل دخول</div>
              <div className="text-foreground font-medium">{boundUser!.email}</div>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <ShieldCheck className="h-3 w-3" /> الجهاز مربوط بهذا الحساب
              </div>
            </CardDescription>
          ) : (
            <CardDescription>تفعيل الحساب لأول مرة على هذا الجهاز</CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {showBound ? (
            <form onSubmit={onBoundLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bound-password">كلمة المرور</Label>
                <Input
                  id="bound-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                <KeyRound className="h-4 w-4" />
                {busy ? "..." : "دخول"}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
                onClick={() => setForceFirstTime(true)}
              >
                <RefreshCcw className="h-3 w-3" /> تسجيل دخول بحساب آخر / إعادة تفعيل
              </button>
            </form>
          ) : (
            <form onSubmit={onClaim} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                استخدم البريد الإلكتروني والباسورد المؤقت اللي حصلت عليهم من البائع، وحدد باسورد جديد ستستخدمه بعد كده.
                هذه الخطوة تتم مرة واحدة فقط — بعدها الحساب يعمل على هذا الجهاز فقط.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="temp-password">الباسورد المؤقت</Label>
                <Input
                  id="temp-password"
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">باسورد جديد</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">تأكيد الباسورد</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "..." : "تفعيل وربط الجهاز"}
              </Button>
              {boundUser && (
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setForceFirstTime(false)}
                >
                  العودة لتسجيل دخول {boundUser.email}
                </button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
