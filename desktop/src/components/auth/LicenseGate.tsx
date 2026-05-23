import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent } from "@/components/ui/card";

interface Status {
  active: boolean;
  reason: string;
  tier?: string;
  expiry?: string;
  trialRemainingDays?: number;
  message?: string;
}

/**
 * Gates the entire app behind a license check. Renders one of three
 * things based on the current license status:
 *   - if the route is /activation or /login → render children unchanged
 *     (so the user can always get back to the activation screen).
 *   - if the license is active → render children.
 *   - if the license is INACTIVE → render a hard lock screen that
 *     redirects to /activation and shows the reason.
 *
 * Re-checks every 5 minutes so a clock-rewind / device-tamper that
 * happens mid-session also locks the running app.
 */
export function LicenseGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await unwrap(api().licensing.status());
      setStatus(s as Status);
    } catch (err) {
      setStatus({ active: false, reason: "boot-error", message: String((err as Error).message || err) });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [refresh]);

  // Allow activation/login screens to always render so the user can
  // recover. The license routes themselves don't need a gate.
  const isAllowedWhileLocked =
    location.pathname === "/activation" ||
    location.pathname === "/login" ||
    location.pathname === "/access-code";

  if (!loaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-sm text-muted-foreground">جاري التحقق من الترخيص...</div>
      </div>
    );
  }

  if (status?.active || isAllowedWhileLocked) {
    return <>{children}</>;
  }

  return <LockScreen status={status!} />;
}

function LockScreen({ status }: { status: Status }) {
  const reasonText = (() => {
    switch (status.reason) {
      case "expired": return "انتهت صلاحية الترخيص.";
      case "trial-expired": return "انتهت فترة التجربة المجانية.";
      case "device-mismatch": return "هذا الترخيص مفعّل على جهاز آخر.";
      case "anchor-missing": return "ملف ربط الجهاز محذوف — يبدو أن البيانات نُقلت من جهاز آخر.";
      case "anchor-tampered":
      case "anchor-decode-failed":
      case "anchor-invalid": return "ملف ربط الجهاز تالف.";
      case "tamper-detected": return "تم اكتشاف تعديل على بيانات الترخيص.";
      case "clock-rewind": return "تم اكتشاف تعديل في توقيت النظام.";
      case "boot-error": return "تعذر التحقق من الترخيص — أعد تشغيل التطبيق.";
      default: return status.message || "الترخيص غير صالح.";
    }
  })();

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-destructive/10 to-warning/10 p-6">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 text-destructive grid place-items-center">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">التطبيق مقفل</h1>
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-start gap-2 text-right">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">{reasonText}</div>
              {status.message && status.message !== reasonText && (
                <div className="text-xs mt-1 opacity-80">{status.message}</div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            عشان تشغّل التطبيق، تواصل مع البائع وأعطه بيانات الجهاز من شاشة التفعيل.
          </p>
          <a
            href="#/activation"
            className="inline-flex w-full items-center justify-center gap-2 h-11 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90"
          >
            <AlertTriangle className="h-4 w-4" />
            فتح شاشة التفعيل
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
