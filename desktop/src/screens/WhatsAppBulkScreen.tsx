import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Send,
  Users,
  ListPlus,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  StopCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ClientRow { id: string; name: string; phone: string | null; }
interface Recipient { phone: string; name?: string | null; }

type Source = "clients" | "manual";

export function WhatsAppBulkScreen() {
  const { user } = useAuth();
  const [source, setSource] = useState<Source>("clients");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("مرحبًا {الاسم} 👋\n\n");
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [batchSize, setBatchSize] = useState(40);
  const [batchPause, setBatchPause] = useState(4);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [waReady, setWaReady] = useState(false);

  const loadClients = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await unwrap(api().db.list<ClientRow>("clients", { tenantId: user.tenant_id, limit: 5000 }));
      setClients((rows || []).filter((c) => c.phone));
    } catch { /* ignore */ }
  }, [user]);

  const loadCampaigns = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await unwrap(api().waBulk.list({ tenantId: user.tenant_id, limit: 20 }));
      setCampaigns(rows || []);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { loadClients(); loadCampaigns(); }, [loadClients, loadCampaigns]);
  useEffect(() => {
    api().whatsapp.state().then((r) => setWaReady(r.ok && r.data?.state === "ready")).catch(() => undefined);
  }, []);

  // Poll campaign progress while any is running.
  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === "running");
    if (!hasRunning) return;
    const t = setInterval(loadCampaigns, 5000);
    return () => clearInterval(t);
  }, [campaigns, loadCampaigns]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => c.name?.toLowerCase().includes(q) || (c.phone || "").includes(q)) : clients;
  }, [clients, search]);

  const recipients: Recipient[] = useMemo(() => {
    if (source === "clients") {
      return clients.filter((c) => picked.has(c.id)).map((c) => ({ phone: c.phone!, name: c.name }));
    }
    return manual
      .split(/[\n,،;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6)
      .map((phone) => ({ phone }));
  }, [source, clients, picked, manual]);

  const toggleAll = () => {
    if (picked.size === filteredClients.length) setPicked(new Set());
    else setPicked(new Set(filteredClients.map((c) => c.id)));
  };

  const estMinutes = useMemo(() => {
    const n = recipients.length;
    if (n <= 1) return 0;
    const avgGap = (minDelay + maxDelay) / 2;
    const batches = Math.floor(n / batchSize);
    return Math.ceil((n * avgGap + batches * batchPause * 60) / 60);
  }, [recipients.length, minDelay, maxDelay, batchSize, batchPause]);

  const send = async () => {
    if (!user) return;
    if (recipients.length === 0) { toast.error("اختر أرقام أو عملاء أولًا"); return; }
    if (!body.trim()) { toast.error("اكتب نص الرسالة"); return; }
    if (!confirm(`إرسال إلى ${recipients.length} رقم؟\nهيتم التوزيع على حوالي ${estMinutes} دقيقة لتجنّب الحظر.`)) return;
    setSending(true);
    try {
      const res = await unwrap(api().waBulk.create({
        tenantId: user.tenant_id,
        name: name || `حملة ${new Date().toLocaleDateString("ar-EG")}`,
        body,
        recipients,
        minDelaySec: minDelay,
        maxDelaySec: maxDelay,
        batchSize,
        batchPauseMin: batchPause,
      }));
      toast.success(`بدأت الحملة — ${res.total} رسالة على مدى ~${res.etaMinutes} دقيقة`);
      setPicked(new Set());
      setManual("");
      loadCampaigns();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setSending(false);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm("إيقاف الحملة؟ الرسائل اللي اتبعتت مش هترجع.")) return;
    await unwrap(api().waBulk.cancel({ campaignId: id }));
    loadCampaigns();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> إرسال واتساب جماعي</CardTitle>
          <CardDescription className="text-white/90">
            ابعت عروض وتنبيهات لكل عملائك — مع توزيع زمني ذكي يحمي رقمك من الحظر. اكتب <code>{"{الاسم}"}</code> ليتم استبداله باسم كل عميل.
          </CardDescription>
        </CardHeader>
      </Card>

      {!waReady && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-700 flex items-center gap-2">
            <Clock className="h-4 w-4" /> واتساب مش متصل دلوقتي — الرسائل هتتجدول وتتبعت أول ما تتصل من شاشة "واتساب".
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recipients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">المستلمون ({recipients.length})</CardTitle>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSource("clients")} className={`text-sm px-3 h-8 rounded-md flex items-center gap-1 ${source === "clients" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                <Users className="h-3.5 w-3.5" /> من العملاء
              </button>
              <button onClick={() => setSource("manual")} className={`text-sm px-3 h-8 rounded-md flex items-center gap-1 ${source === "manual" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                <ListPlus className="h-3.5 w-3.5" /> أرقام يدوية
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {source === "clients" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن عميل..." className="h-9" />
                  <Button variant="outline" size="sm" onClick={toggleAll} className="shrink-0">
                    {picked.size === filteredClients.length && filteredClients.length > 0 ? "إلغاء الكل" : "تحديد الكل"}
                  </Button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">لا يوجد عملاء بأرقام موبايل</p>
                  ) : filteredClients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={picked.has(c.id)}
                        onChange={() => {
                          setPicked((prev) => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          });
                        }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>أرقام الموبايل (رقم في كل سطر، أو مفصولة بفاصلة)</Label>
                <textarea
                  dir="ltr"
                  rows={10}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder={"201001234567\n201007654321\n..."}
                  className="w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message + anti-ban */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> الرسالة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>اسم الحملة (اختياري)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="عرض رمضان" className="h-9" />
            </div>
            <div>
              <Label>نص الرسالة</Label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm"
                placeholder="مرحبًا {الاسم}، عندنا عروض جديدة..."
              />
              <p className="text-[11px] text-muted-foreground mt-1">المتغيرات: <code>{"{الاسم}"}</code> · <code>{"{الرقم}"}</code></p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" /> حماية من الحظر</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label>تأخير أدنى (ث)<Input type="number" value={minDelay} onChange={(e) => setMinDelay(Number(e.target.value) || 0)} className="h-8 mt-1" /></label>
                <label>تأخير أقصى (ث)<Input type="number" value={maxDelay} onChange={(e) => setMaxDelay(Number(e.target.value) || 0)} className="h-8 mt-1" /></label>
                <label>حجم الدفعة<Input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) || 1)} className="h-8 mt-1" /></label>
                <label>راحة بين الدفعات (د)<Input type="number" value={batchPause} onChange={(e) => setBatchPause(Number(e.target.value) || 0)} className="h-8 mt-1" /></label>
              </div>
              {recipients.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  ⏱️ {recipients.length} رسالة هتتوزّع على حوالي <b>{estMinutes}</b> دقيقة لحماية الرقم.
                </p>
              )}
            </div>

            <Button onClick={send} disabled={sending || recipients.length === 0} className="w-full" size="lg">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال إلى {recipients.length} رقم
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Campaign history + live progress */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">الحملات</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {campaigns.map((c) => {
              const pct = c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
              return (
                <div key={c.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.name || "حملة"}</span>
                      {c.status === "running" && <Badge variant="warning"><Loader2 className="h-3 w-3 ml-1 animate-spin" /> جارية</Badge>}
                      {c.status === "done" && <Badge variant="success"><CheckCircle2 className="h-3 w-3 ml-1" /> اكتملت</Badge>}
                      {c.status === "paused" && <Badge variant="secondary">موقوفة</Badge>}
                    </div>
                    {c.status === "running" && (
                      <button onClick={() => cancel(c.id)} className="text-destructive hover:bg-destructive/10 rounded p-1" title="إيقاف">
                        <StopCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden mt-2">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5 tabular-nums">
                    <span className="text-[hsl(var(--success))]">تم: {c.sent}</span>
                    {c.failed > 0 && <span className="text-destructive">فشل: {c.failed}</span>}
                    <span>الإجمالي: {c.total}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
