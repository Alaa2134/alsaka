import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SecEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  city: string | null;
  country: string | null;
  metadata: string | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, { label: string; tone: "danger" | "warn" | "ok" | "info" }> = {
  "login.failed": { label: "محاولة دخول فاشلة", tone: "warn" },
  "login.locked": { label: "قفل بعد محاولات متكررة", tone: "danger" },
  "login.success": { label: "دخول ناجح", tone: "ok" },
  "device.bound": { label: "ربط جهاز جديد", tone: "info" },
  "device.released": { label: "فك ربط جهاز", tone: "warn" },
  "license.activated": { label: "تفعيل ترخيص", tone: "ok" },
};

export function SecurityEventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [chain, setChain] = useState<{ ok: boolean; total: number; brokenAt?: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await unwrap(
        api().db.list<SecEvent>("security_events", { tenantId: user.tenant_id, limit: 200, orderBy: "created_at DESC" }),
      );
      setEvents(rows || []);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const verifyChain = async () => {
    try {
      const res = await unwrap(api().security.verifyAuditChain());
      setChain(res);
      if (res.ok) toast.success(`سلسلة السجل سليمة (${res.total} حدث) — لم يتم العبث بها`);
      else toast.error(`تم اكتشاف تلاعب عند الحدث رقم ${res.brokenAt}`);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-slate-700 to-slate-900 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> أحداث الأمان</CardTitle>
          <CardDescription className="text-white/80">
            سجل كل محاولات الدخول، قفل الحسابات، وربط الأجهزة. السجل محمي بسلسلة HMAC — أي تلاعب يُكتشف فورًا.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tamper-evident chain check */}
      <Card>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {chain ? (
              chain.ok ? <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" /> : <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <div className="font-semibold">سلامة سجل التدقيق (HMAC chain)</div>
              <div className="text-sm text-muted-foreground">
                {chain
                  ? chain.ok
                    ? `سليم — ${chain.total} حدث متسلسل بدون تلاعب`
                    : `تم اكتشاف تلاعب عند الحدث #${chain.brokenAt}`
                  : "اضغط للتحقق من أن السجل لم يُعبث به"}
              </div>
            </div>
          </div>
          <Button onClick={verifyChain} variant="outline">
            <ShieldCheck className="h-4 w-4" /> تحقّق الآن
          </Button>
        </CardContent>
      </Card>

      {/* Events table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">آخر الأحداث ({events.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">لا توجد أحداث مسجّلة بعد.</p>
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => {
                const meta = EVENT_LABEL[e.event_type] || { label: e.event_type, tone: "info" as const };
                const variant = meta.tone === "danger" ? "destructive" : meta.tone === "warn" ? "warning" : meta.tone === "ok" ? "success" : "secondary";
                return (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={variant as any}>{meta.label}</Badge>
                      {(e.city || e.country || e.ip_address) && (
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {[e.city, e.country].filter(Boolean).join(", ")} {e.ip_address ? `· ${e.ip_address}` : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{e.created_at}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
