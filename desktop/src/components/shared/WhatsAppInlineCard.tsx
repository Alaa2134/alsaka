import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Send, Power, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Compact, embeddable WhatsApp connection widget. Lives on the dashboard
// (and anywhere else) so the cashier can see live status and scan the QR
// inline without leaving their current screen. All of the heavy lifting
// (Puppeteer-backed whatsapp-web.js client) runs in the main process —
// the renderer never opens an external browser.
interface State {
  state: string;
  qr?: string | null;
  error?: string | null;
}

const STATE_LABEL: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
  disconnected: { label: "غير متصل", variant: "muted" },
  initializing: { label: "جاري التهيئة...", variant: "warning" },
  qr: { label: "بانتظار مسح QR", variant: "warning" },
  authenticated: { label: "تم التحقق...", variant: "warning" },
  ready: { label: "متصل ✓", variant: "success" },
  error: { label: "خطأ", variant: "destructive" },
};

export function WhatsAppInlineCard({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>({ state: "disconnected", qr: null });
  const [qrSvg, setQrSvg] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await unwrap(api().whatsapp.state()));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = window.electronAPI?.whatsapp.onStateChanged((s) => setState(s as State));
    return () => { try { unsub?.(); } catch { /* ignore */ } };
  }, [refresh]);

  useEffect(() => {
    if (!state.qr) { setQrSvg(""); return; }
    QRCode.toString(state.qr, { type: "svg", margin: 1, width: 220 })
      .then(setQrSvg).catch(() => setQrSvg(""));
  }, [state.qr]);

  const connect = async () => {
    setBusy(true);
    try {
      await unwrap(api().whatsapp.initialize());
      toast.success("جاري ربط واتساب — امسح الـ QR من تطبيق الواتساب");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  // Already connected and compact mode — show a tiny pill, no card.
  if (compact && state.state === "ready") {
    return (
      <Badge variant="success" className="gap-1">
        <Send className="h-3 w-3" /> واتساب متصل
      </Badge>
    );
  }
  // Connected + not compact + user dismissed → hide entirely.
  if (state.state === "ready" && dismissed) return null;

  const meta = STATE_LABEL[state.state] || { label: state.state, variant: "muted" as const };

  // Connected + not compact → green confirmation card with link to settings
  if (state.state === "ready") {
    return (
      <Card className="p-4 bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/30 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 left-2 text-muted-foreground hover:text-foreground"
          aria-label="إخفاء"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
          <div className="flex-1">
            <div className="font-semibold">واتساب مربوط — الفواتير هتترسل تلقائيًا</div>
            <p className="text-xs text-muted-foreground">
              أي عميل عنده رقم تليفون مسجل، هيستلم فاتورته كصورة على واتساب بعد الحفظ.
            </p>
          </div>
          <Link to="/whatsapp-settings" className="text-sm text-primary">إعدادات</Link>
        </div>
      </Card>
    );
  }

  // QR state — show the scannable code inline
  if (state.state === "qr" && qrSvg) {
    return (
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[220px_1fr] items-center">
          <div className="bg-white p-3 rounded-lg mx-auto" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="gap-1">{meta.label}</Badge>
            </div>
            <h3 className="font-bold mt-2">امسح هذا الكود من تطبيق واتساب</h3>
            <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal mr-5">
              <li>افتح تطبيق واتساب على هاتفك</li>
              <li>الإعدادات ⇦ الأجهزة المرتبطة ⇦ <strong>ربط جهاز</strong></li>
              <li>وجّه الكاميرا على الكود المعروض هنا</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              الربط يحصل لمرة واحدة — بعدها كل الفواتير تتبعت تلقائيًا للعملاء.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Initializing / authenticated states
  if (state.state === "initializing" || state.state === "authenticated") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--warning))] animate-pulse" />
          <div className="flex-1">
            <div className="font-semibold text-sm">{meta.label}</div>
            <p className="text-xs text-muted-foreground">جاري إعداد الاتصال بواتساب...</p>
          </div>
        </div>
      </Card>
    );
  }

  // Disconnected (default) — one-click connect prompt
  return (
    <Card className="p-4 bg-gradient-to-r from-[#25d366]/10 to-primary/5 border-[#25d366]/30">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#25d366] text-white flex items-center justify-center">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">اربط واتساب لإرسال الفواتير تلقائيًا</div>
          <p className="text-xs text-muted-foreground">
            مرة واحدة فقط — كل فاتورة بتتباع لعميل عنده رقم تليفون هتوصله كصورة على واتساب.
          </p>
          {state.error && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {state.error}
            </p>
          )}
        </div>
        <Button onClick={connect} disabled={busy}>
          <Power className="h-4 w-4" /> {busy ? "..." : "ربط الآن"}
        </Button>
      </div>
    </Card>
  );
}
