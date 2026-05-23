import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Power, LogOut, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface WaState {
  state: string;
  qr?: string | null;
  error?: string | null;
}

const STATE_LABEL: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "muted" }> = {
  disconnected: { label: "غير متصل", variant: "muted" },
  initializing: { label: "جاري التهيئة...", variant: "warning" },
  qr: { label: "بانتظار مسح QR", variant: "warning" },
  authenticated: { label: "تم التحقق...", variant: "warning" },
  ready: { label: "جاهز ✓", variant: "success" },
  error: { label: "خطأ", variant: "destructive" },
};

export function WhatsAppSettingsScreen() {
  const [state, setState] = useState<WaState>({ state: "disconnected", qr: null });
  const [qrSvg, setQrSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testBody, setTestBody] = useState("رسالة تجريبية من Horus ✅");

  const refresh = useCallback(async () => {
    try {
      const s = await unwrap(api().whatsapp.state());
      setState(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = window.electronAPI?.whatsapp.onStateChanged((s) => setState(s));
    return () => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, [refresh]);

  useEffect(() => {
    if (!state.qr) {
      setQrSvg("");
      return;
    }
    QRCode.toString(state.qr, { type: "svg", margin: 1, width: 280 })
      .then(setQrSvg)
      .catch(() => setQrSvg(""));
  }, [state.qr]);

  const connect = async () => {
    setBusy(true);
    try {
      const s = await unwrap(api().whatsapp.initialize());
      setState(s);
      toast.success("جاري التهيئة...");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await unwrap(api().whatsapp.logout());
      toast.success("تم تسجيل الخروج");
      await refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) {
      toast.error("اكتب رقم الهاتف");
      return;
    }
    try {
      await unwrap(api().whatsapp.sendText({ to: testPhone.trim(), body: testBody }));
      toast.success("تم الإرسال");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const meta = STATE_LABEL[state.state] || { label: state.state, variant: "muted" as const };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>إعدادات واتساب</CardTitle>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اضغط "اتصال" ثم امسح QR من تطبيق واتساب على هاتفك (الإعدادات ⇦ الأجهزة المرتبطة ⇦ ربط جهاز).
            بعد الربط هيتم إرسال الفواتير تلقائيًا للعملاء (لمن لديه رقم هاتف مسجل).
          </p>
          {state.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={connect} disabled={busy || state.state === "ready" || state.state === "initializing"}>
              <Power className="h-4 w-4" /> اتصال
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
            <Button
              variant="destructive"
              onClick={disconnect}
              disabled={busy || state.state === "disconnected"}
            >
              <LogOut className="h-4 w-4" /> تسجيل خروج
            </Button>
          </div>

          {state.state === "qr" && (
            <Card className="p-6 flex flex-col items-center gap-3 bg-white">
              <p className="text-sm font-medium text-slate-800">امسح هذا الكود من تطبيق واتساب</p>
              {qrSvg ? (
                <div className="bg-white p-3 rounded" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              ) : (
                <p className="text-sm text-muted-foreground">جاري توليد QR...</p>
              )}
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">رسالة تجريبية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>رقم الهاتف (مع كود الدولة، مثلاً 201XXXXXXXXX)</Label>
            <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>الرسالة</Label>
            <Input value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </div>
          <Button onClick={sendTest} disabled={state.state !== "ready"}>
            <Send className="h-4 w-4" /> إرسال
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
