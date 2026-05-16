import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const [email, setEmail] = useState("admin@systemalaa.app");
  const [password, setPassword] = useState("admin");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.ok) {
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }
      toast.success(`أهلاً ${res.user?.name || res.user?.email}`);
      if (res.needsTwoFactor) {
        navigate("/access-code", { state: { mode: "2fa" } });
      } else if (res.needsAccessCode) {
        navigate("/access-code");
      } else {
        navigate(location.state?.from?.pathname || "/");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/60">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mb-2">
            S
          </div>
          <CardTitle className="text-2xl">SystemAlaa</CardTitle>
          <CardDescription>نظام إدارة الفواتير والمخزون</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : "دخول"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              المستخدم الافتراضي: <span className="font-mono ltr-text">admin@systemalaa.app / admin</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
