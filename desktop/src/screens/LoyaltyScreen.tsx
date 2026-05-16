import { useCallback, useEffect, useState } from "react";
import { Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
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

const TIER_VARIANT: Record<string, "muted" | "success" | "warning" | "default"> = {
  standard: "muted",
  silver: "default",
  gold: "warning",
  platinum: "success",
};

export function LoyaltyScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Account[]>([]);
  const [clients, setClients] = useState<Record<string, { name: string; phone: string | null }>>({});

  const refresh = useCallback(async () => {
    if (!user) return;
    const [accs, cs] = await Promise.all([
      unwrap(api().db.list<Account>("loyalty_accounts", { tenantId: user.tenant_id, limit: 1000, orderBy: "points DESC" })),
      unwrap(api().db.list<any>("clients", { tenantId: user.tenant_id, limit: 2000 })),
    ]);
    setList(accs ?? []);
    const idx: Record<string, { name: string; phone: string | null }> = {};
    for (const c of cs || []) idx[c.id] = { name: c.name, phone: c.phone };
    setClients(idx);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

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

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">حسابات النقاط</h3>
          <p className="text-xs text-muted-foreground mt-1">القاعدة الافتراضية: 1 نقطة لكل 10 ج.م من المبيعات.</p>
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
                  <TD><Badge variant={TIER_VARIANT[a.tier] || "muted"}>{a.tier}</Badge></TD>
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
