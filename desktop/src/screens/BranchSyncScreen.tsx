import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GitBranch, Download, Upload, ListChecks, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SyncLogRow {
  id: string;
  direction: "pull" | "push";
  table_name: string;
  row_count: number;
  conflicts: number;
  error: string | null;
  created_at: string;
}

export function BranchSyncScreen() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState("default");
  const [relayUrl, setRelayUrl] = useState("");
  const [relayToken, setRelayToken] = useState("");
  const [state, setState] = useState<any>(null);
  const [log, setLog] = useState<SyncLogRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const s = await unwrap(api().branchSync.state({ branchId }));
    setState(s);
    if (s) {
      setRelayUrl(s.relay_url || "");
    }
    const rows = await unwrap(api().branchSync.recentLog({ limit: 50 }));
    setLog(rows || []);
  }, [user, branchId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const configure = async () => {
    if (!relayUrl) { toast.error("أدخل رابط الـ Relay"); return; }
    try {
      await unwrap(api().branchSync.configure({
        branchId, relayUrl, relayToken: relayToken || undefined, enabled: 1,
      }));
      toast.success("تم الحفظ");
      setRelayToken("");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const pull = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await unwrap(api().branchSync.pull({ tenantId: user.tenant_id, branchId }));
      toast.success(`تم الاستلام: ${r.applied || 0} صف`);
      refresh();
    } catch (err) { toast.error(String((err as Error).message || err)); }
    finally { setBusy(false); }
  };

  const push = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await unwrap(api().branchSync.push({ tenantId: user.tenant_id, branchId }));
      toast.success(`تم الإرسال: ${r.sent || 0} صف`);
      refresh();
    } catch (err) { toast.error(String((err as Error).message || err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> مزامنة الفروع</CardTitle>
          <CardDescription className="text-white/90">
            مزامنة ثنائية الاتجاه بين الفروع — last-writer-wins، تعمل أوفلاين، تتجمّع لما يرجع النت. تشمل المنتجات، العملاء، الموردين، التصنيفات، المخازن، الفواتير.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات الفرع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>معرّف الفرع</Label>
            <Input dir="ltr" value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="main / cairo-1 / alex-branch" />
          </div>
          <div>
            <Label>Relay URL</Label>
            <Input dir="ltr" value={relayUrl} onChange={(e) => setRelayUrl(e.target.value)} placeholder="https://sync.horus.sa" />
          </div>
          <div>
            <Label>Relay Token (اختياري)</Label>
            <Input dir="ltr" type="password" value={relayToken} onChange={(e) => setRelayToken(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={configure}>حفظ</Button>
            <Button variant="outline" onClick={pull} disabled={busy || !state}>
              <Download className="h-4 w-4 ml-1" /> سحب من المركز
            </Button>
            <Button variant="outline" onClick={push} disabled={busy || !state}>
              <Upload className="h-4 w-4 ml-1" /> رفع للمركز
            </Button>
            <Button variant="ghost" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {state?.last_pulled_at && (
            <p className="text-xs text-muted-foreground">آخر سحب: {state.last_pulled_at}</p>
          )}
          {state?.last_pushed_at && (
            <p className="text-xs text-muted-foreground">آخر رفع: {state.last_pushed_at}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> سجل المزامنة</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عمليات بعد.</p>
          ) : (
            <div className="space-y-1">
              {log.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs border-b py-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={l.direction === "pull" ? "info" : "success"}>{l.direction}</Badge>
                    <code className="font-mono">{l.table_name}</code>
                    <span className="text-muted-foreground">{l.row_count} صف</span>
                    {l.conflicts > 0 && <span className="text-amber-500">تعارض: {l.conflicts}</span>}
                  </div>
                  <div className="text-muted-foreground">
                    {l.error ? <span className="text-destructive">{l.error}</span> : l.created_at}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
