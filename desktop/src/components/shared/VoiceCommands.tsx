import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { toast } from "sonner";

// Voice POS using the browser's Web Speech API. Listens for Arabic
// commands and routes them to actions. The grammar is intentionally
// liberal — we just look for keywords.
//
//   "افتح المنتجات" → /products
//   "افتح العملاء" → /clients
//   "فاتورة جديدة" → /invoice
//   "تقارير" → /accounting
//   "لوحة" → /
//   "طباعة" → window.electronAPI.print()
//   "حفظ" → emits a 'voice:save' DOM event for the active screen to catch
//   "ركّز الباركود" → focuses the barcode field
//
// Mounted globally inside AppShell; toggle on/off from the titlebar.

const KEYWORDS: Array<{ patterns: RegExp[]; action: string; payload?: string }> = [
  { patterns: [/منتجات/], action: "navigate", payload: "/products" },
  { patterns: [/عملاء/], action: "navigate", payload: "/clients" },
  { patterns: [/موردين|موردون/], action: "navigate", payload: "/suppliers" },
  { patterns: [/(فاتورة|فاتوره).*?(جديدة|جديده|جديد)/, /^فاتورة$/], action: "navigate", payload: "/invoice" },
  { patterns: [/الفواتير|قائمة الفواتير/], action: "navigate", payload: "/invoices" },
  { patterns: [/قيود|دفتر/], action: "navigate", payload: "/journals" },
  { patterns: [/(تقارير|محاسب)/], action: "navigate", payload: "/accounting" },
  { patterns: [/لوحة|الرئيسية|الصفحة الرئيسية/], action: "navigate", payload: "/" },
  { patterns: [/متجر|أونلاين/], action: "navigate", payload: "/store-management" },
  { patterns: [/طاولات|مطعم/], action: "navigate", payload: "/invoice" },
  { patterns: [/طباعة|اطبع/], action: "print" },
  { patterns: [/حفظ|احفظ/], action: "save" },
  { patterns: [/باركود/], action: "focus-barcode" },
  { patterns: [/مزامنة|سينك/], action: "sync" },
  { patterns: [/مساعد|ذكي/], action: "navigate", payload: "/ai-assistant" },
  { patterns: [/الموظفين|موظف/], action: "navigate", payload: "/employees" },
  { patterns: [/الإعدادات|إعدادات/], action: "navigate", payload: "/company-settings" },
];

export function VoiceCommands() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lastHeard, setLastHeard] = useState<string>("");
  const navigate = useNavigate();
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ar-EG";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (!result.isFinal) return;
      const text = result[0].transcript.trim();
      setLastHeard(text);
      handle(text);
    };
    rec.onerror = (e: any) => {
      console.warn("voice err", e.error);
    };
    rec.onend = () => {
      // Keep alive if user still wants it on
      if (listening) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = (text: string) => {
    const lower = text.toLowerCase();
    for (const k of KEYWORDS) {
      if (k.patterns.some((p) => p.test(lower))) {
        switch (k.action) {
          case "navigate":
            if (k.payload) {
              navigate(k.payload);
              toast.success(`تنفيذ: ${text}`);
            }
            return;
          case "print":
            window.electronAPI?.print().catch(() => undefined);
            toast.success("جاري الطباعة...");
            return;
          case "save":
            window.dispatchEvent(new CustomEvent("voice:save"));
            toast.success("حفظ");
            return;
          case "focus-barcode": {
            const el =
              (document.querySelector("[data-barcode-input]") as HTMLInputElement | null) ||
              (document.querySelector('input[name="barcode"]') as HTMLInputElement | null);
            if (el) el.focus();
            return;
          }
          case "sync":
            window.dispatchEvent(new CustomEvent("systemalaa:sync-now"));
            return;
        }
      }
    }
    toast.message(`لم أفهم: "${text}"`, { description: "جرّب: فاتورة جديدة، طباعة، افتح المنتجات..." });
  };

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      try { recRef.current.stop(); } catch { /* ignore */ }
      setListening(false);
    } else {
      try {
        recRef.current.start();
        setListening(true);
        toast.success("الميكروفون شغّال — قول أمر");
      } catch (err) {
        toast.error("تعذر بدء الميكروفون: " + String((err as Error).message || err));
      }
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors no-print ${
        listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-secondary hover:bg-secondary/80 text-foreground"
      }`}
      title={lastHeard ? `آخر أمر: ${lastHeard}` : "أوامر صوتية"}
    >
      {listening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
      <span>{listening ? "يسمعك..." : "أوامر صوتية"}</span>
    </button>
  );
}
