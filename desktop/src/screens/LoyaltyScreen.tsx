import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Settings2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  client_id: string;
  points: number;
  tier: string;
  total_earned: number;
  total_redeemed: number;
}
interface LoyaltyCfg {
  enabled: boolean;
  earn_per_currency: number;
  redeem_value: number;
  tier_silver: number;
  tier_gold: number;
  tier_platinum: number;
}

const TIER_VARIANT: Record<string, "muted" | "success" | "warning" | "default"> = {
  standard: "muted",
  silver: "default",
  gold: "warning",
  platinum: "success",
};
const TIER_AR: Record<string, string> = {
  standard: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

export function LoyaltyScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Account[]>([]);
  const [clients, setClients] = useState<Record<string, { name: string; phone: string | null }>>({});
  const [cfg, setCfg] = useState<LoyaltyCfg | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [accs, cs, c] = await Promise.all([
      unwrap(api().db.list<Account>("loyalty_accounts", { tenantId: user.tenant_id, limit: 1000, orderBy: "points DESC" })),
      unwrap(api().db.list<any>("clients", { tenantId: user.tenant_id, limit: 2000 })),
      unwrap(api().loyalty.config({ tenantId: user.tenant_id })).catch(() => null),
    ]);
    setList(accs ?? []);
    const idx: Record<string, { name: string; phone: string | null }> = {};
    for (const cl of cs || []) idx[cl.id] = { name: cl.name, phone: cl.phone };
    setClients(idx);
    if (c) setCfg(c as LoyaltyCfg);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const saveCfg = async () => {
    if (!user || !cfg) return;
    setSavingCfg(true);
    try {
      await unwrap(api().loyalty.setConfig({ tenantId: user.tenant_id, patch: cfg as any }));
      toast.success("تم حفظ قواعد الولاء");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setSavingCfg(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-bold">برنامج نقاط العملاء</h2>
            <p className="text-sm opacity-90">العميل يكسب نقاط مع كل شراء — تتحول لخصم في الفواتير الجاية.</p>
          </div>
        </div>
      </Card>

      {/* Rules config */}
      {cfg && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> قواعد البرنامج</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>نقاط لكل 1 ج.م مبيعات</Label>
              <Input type="number" step="0.01" value={cfg.earn_per_currency} onChange={(e) => setCfg({ ...cfg, earn_per_currency: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>قيمة النقطة عند الاستبدال (ج.م)</Label>
              <Input type="number" step="0.01" value={cfg.redeem_value} onChange={(e) => setCfg({ ...cfg, redeem_value: Number(e.target.value) || 0 })} />
            </div>
            <div className="flex items-end">
              <Button onClick={saveCfg} disabled={savingCfg} className="w-full">
                <Save className="h-4 w-4" /> حفظ القواعد
              </Button>
            </div>
            <div>
              <Label>حد المستوى الفضي (نقطة)</Label>
              <Input type="number" value={cfg.tier_silver} onChange={(e) => setCfg({ ...cfg, tier_silver: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>حد المستوى الذهبي</Label>
              <Input type="number" value={cfg.tier_gold} onChange={(e) => setCfg({ ...cfg, tier_gold: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>حد المستوى البلاتيني</Label>
              <Input type="number" value={cfg.tier_platinum} onChange={(e) => setCfg({ ...cfg, tier_platinum: Number(e.target.value) || 0 })} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">حسابات النقاط</h3>
          <p className="text-xs text-muted-foreground mt-1">النقاط تُكتسب تلقائيًا مع كل فاتورة لعميل مسجّل.</p>
        </div>
        <DataTable>
          <THead>
            <TR>
              <TH>العميل</TH>
              <TH>الهاتف</TH>
              <TH>المستوى</TH>
              <TH>الرصيد الحالي</TH>
              <TH>إجمالي مكتسب</TH>
              <TH>مستخدم</TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR><TD colSpan={6} className="text-center text-muted-foreground py-8">
                <Award className="h-6 w-6 mx-auto opacity-50 mb-2" />
                لا توجد حسابات بعد — أنشئ فاتورة لعميل عشان نبدأ.
              </TD></TR>
            ) : (
              list.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{clients[a.client_id]?.name || "—"}</TD>
                  <TD className="tabular-nums" dir="ltr">{clients[a.client_id]?.phone || "—"}</TD>
                  <TD><Badge variant={TIER_VARIANT[a.tier] || "muted"}>{TIER_AR[a.tier] || a.tier}</Badge></TD>
                  <TD className="tabular-nums font-bold text-[hsl(var(--success))]">{a.points}</TD>
                  <TD className="tabular-nums">{a.total_earned}</TD>
                  <TD className="tabular-nums">{a.total_redeemed}</TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
