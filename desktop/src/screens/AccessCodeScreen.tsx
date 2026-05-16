import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, unwrap } from "@/lib/ipc";

export function AccessCodeScreen() {
  const { user, verifyAccessCode, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: { pathname?: string }; mode?: "2fa" };
  };
  const mode = location.state?.mode === "2fa" ? "2fa" : "access";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const setDigit = (idx: number, value: string) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = clean;
      return next;
    });
    if (clean && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    } else if (e.key === "Enter") {
      submit();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 0) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async () => {
    const code = digits.join("");
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const result = mode === "2fa" ? await verifyTwoFactor(code) : await verifyAccessCode(code);
      if (result.ok) {
        toast.success("تم التحقق");
        navigate(location.state?.from?.pathname || "/");
      } else if (result.error === "device-mismatch") {
        toast.error("هذا الكود مرتبط بجهاز آخر");
      } else {
        toast.error("الكود غير صحيح");
        setDigits(Array(6).fill(""));
        inputs.current[0]?.focus();
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const setupCode = async () => {
    if (!user || mode === "2fa") return;
    const code = digits.join("");
    if (code.length !== 6) {
      toast.error("اكتب 6 أرقام أولاً");
      return;
    }
    try {
      const res = await unwrap(api().auth.setAccessCode({ userId: user.id, code }));
      if (res.ok) {
        toast.success("تم حفظ الكود وربطه بهذا الجهاز");
        await verifyAccessCode(code);
        navigate("/");
      } else {
        toast.error(res.error || "تعذر الحفظ");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/60">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle>{mode === "2fa" ? "تحقق ثنائي العامل" : "كود الوصول"}</CardTitle>
          <CardDescription>
            {mode === "2fa"
              ? "أدخل الرمز من تطبيق المصادقة"
              : "أدخل كود الوصول المكون من 6 أرقام"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div dir="ltr" className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-12 rounded-md border border-input bg-[hsl(var(--input-field-bg))] text-center text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ))}
          </div>
          <Button className="w-full" onClick={submit} disabled={busy || digits.join("").length !== 6}>
            تحقق
          </Button>
          {mode !== "2fa" && (
            <Button variant="ghost" className="w-full" onClick={setupCode}>
              تعيين هذا الكود لأول مرة
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
