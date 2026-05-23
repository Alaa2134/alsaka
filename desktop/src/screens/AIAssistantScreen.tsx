import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Bot, User, KeyRound, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "إيه أكتر منتج بيعته الشهر ده؟",
  "كم فاتورة عملت النهارده؟",
  "اعملي تنبؤ مبيعات الأسبوع القادم.",
  "إيه المنتجات اللي قاربت تخلص؟",
  "اقترح خصومات لتنشيط البيع.",
];

export function AIAssistantScreen() {
  const { user } = useAuth();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const r = await unwrap(api().ai.getKey(user.tenant_id));
      setHasKey(r.has_key);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const saveKey = async () => {
    if (!user || !apiKey.trim()) return;
    try {
      await unwrap(api().ai.setKey(user.tenant_id, apiKey.trim()));
      toast.success("تم حفظ المفتاح");
      setApiKey("");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const send = async (text?: string) => {
    if (!user) return;
    const content = (text ?? input).trim();
    if (!content) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await unwrap(api().ai.chat({
        tenantId: user.tenant_id,
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      }));
      setMessages([...next, { role: "assistant", content: r.text }]);
    } catch (err) {
      toast.error(String((err as Error).message || err));
      setMessages([...next, { role: "assistant", content: "حصل خطأ: " + String((err as Error).message || err) }]);
    } finally {
      setBusy(false);
    }
  };

  if (hasKey === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> المساعد الذكي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            مساعد ذكي عربي يجاوبك على أسئلة عن بياناتك بشكل مباشر — مبني على Claude. لاستخدامه احتاج مفتاح Anthropic API
            (سجّل في <code className="bg-secondary px-1 rounded">console.anthropic.com</code>).
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Anthropic API Key</Label>
              <Input dir="ltr" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." className="mt-1.5 font-mono" />
            </div>
            <Button onClick={saveKey} disabled={!apiKey.trim()}>حفظ المفتاح</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> المساعد الذكي</CardTitle>
          <Badge variant="success">جاهز</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div ref={scroller} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-right p-3 rounded-lg border border-border hover:border-primary hover:bg-secondary/40 transition-colors text-sm">
                  {s}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Bot className="h-4 w-4" /></div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>
                )}
              </div>
            ))
          )}
          {busy && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Bot className="h-4 w-4" /></div>
              <div className="bg-secondary rounded-2xl p-3 text-sm">جاري التفكير...</div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل عن مبيعاتك، مخزونك، عملاءك..."
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
