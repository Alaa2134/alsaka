import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Status {
  active: boolean;
  reason: string;
  tier?: string;
  expiry?: string;
  key_masked?: string;
  trialRemainingDays?: number;
  message?: string;
}

export function ActivationScreen() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await unwrap(api().licensing.status());
      setStatus(s as Status);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activate = async () => {
    if (!key.trim()) {
      toast.error("الصق كود التفعيل");
      return;
    }
    setBusy(true);
    try {
      const res = await unwrap(api().licensing.activate(key.trim()));
      if (res.ok) {
        toast.success("تم تفعيل الترخيص ✓");
        setKey("");
        refresh();
      } else if (res.error === "device-mismatch") {
        toast.error("هذا الكود مفعّل على جهاز آخر");
      } else if (res.error === "expired") {
        toast.error("الكود منتهي الصلاحية");
      } else {
        toast.error("كود غير صحيح");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!confirm("إلغاء الترخيص الحالي؟ هتحتاج كود تاني لتفعيل التطبيق.")) return;
    try {
      await unwrap(api().licensing.deactivate());
      toast.success("تم إلغاء الترخيص");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const generateTestKey = async () => {
    try {
      const res = await unwrap(api().licensing.issue({ tier: "PRO" }));
      setKey(res.key);
      toast.success("تم توليد كود تجريبي — اضغط تفعيل");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> الترخيص والتفعيل
            </CardTitle>
            {status?.active ? (
              <Badge variant="success">مفعّل</Badge>
            ) : (
              <Badge variant="warning">غير مفعّل</Badge>
            )}
          </div>
          <CardDescription>
            كل كود ترخيص يعمل على جهاز واحد فقط. عند التفعيل لأول مرة يتم ربط الكود بـ "بصمة" الجهاز
            (CPU + النظام + اسم المستخدم) ولا ينفع نقله لجهاز آخر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && (
            <div className="rounded-md border border-border bg-secondary/40 p-4 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الحالة</span>
                <span className="font-semibold">{statusLabel(status)}</span>
              </div>
              {status.tier && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الباقة</span>
                  <Badge>{status.tier}</Badge>
                </div>
              )}
              {status.expiry && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">تنتهي في</span>
                  <span className="tabular-nums">{status.expiry}</span>
                </div>
              )}
              {status.key_masked && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الكود</span>
                  <code className="font-mono text-xs">{status.key_masked}</code>
                </div>
              )}
              {status.trialRemainingDays != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">أيام التجربة المتبقية</span>
                  <span
                    className={`font-bold tabular-nums ${
                      status.trialRemainingDays <= 7 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {status.trialRemainingDays}
                  </span>
                </div>
              )}
              {status.message && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {status.message}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>كود التفعيل</Label>
            <Input
              dir="ltr"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="SA-PRO-20271231-XXXX-XXXXXXXXXX"
              className="font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={activate} disabled={busy}>
              <KeyRound className="h-4 w-4" /> تفعيل
            </Button>
            <Button variant="outline" onClick={generateTestKey}>
              <Sparkles className="h-4 w-4" /> توليد كود تجريبي (للاختبار فقط)
            </Button>
            {status?.active && status.tier !== "TRIAL" && (
              <Button variant="destructive" onClick={deactivate}>
                إلغاء التفعيل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function statusLabel(s: Status): string {
  switch (s.reason) {
    case "ok":
      return "مفعّل ✓";
    case "trial":
      return "نسخة تجريبية";
    case "trial-expired":
      return "انتهت التجربة";
    case "expired":
      return "الترخيص منتهي";
    case "device-mismatch":
      return "مرتبط بجهاز آخر";
    default:
      return s.reason;
  }
}
