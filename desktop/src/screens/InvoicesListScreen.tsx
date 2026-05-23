import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Send, Printer, Banknote, CreditCard, Wallet, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Invoice {
  id: string;
  number: number | null;
  client_id: string | null;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  payment_method: string | null;
  created_at: string;
}
interface Client { id: string; name: string; phone: string | null; }

const PAY_META: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: "كاش", icon: Banknote },
  card: { label: "فيزا", icon: CreditCard },
  wallet: { label: "محفظة", icon: Wallet },
  credit: { label: "آجل", icon: Clock },
};

export function InvoicesListScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");

  const refresh = useCallback(async () => {
    if (!user) return;
    const [inv, cli] = await Promise.all([
      unwrap(api().db.list<Invoice>("invoices", { tenantId: user.tenant_id, limit: 1000 })),
      unwrap(api().db.list<Client>("clients", { tenantId: user.tenant_id, limit: 5000 })),
    ]);
    setList(inv ?? []);
    const map: Record<string, Client> = {};
    for (const c of cli ?? []) map[c.id] = c;
    setClients(map);
  }, [user]);

  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((inv) => {
      if (filter === "open" && inv.remaining <= 0) return false;
      if (filter === "paid" && inv.remaining > 0) return false;
      if (!needle) return true;
      const client = inv.client_id ? clients[inv.client_id] : null;
      return (
        String(inv.number ?? "").includes(needle) ||
        (client?.name || "").toLowerCase().includes(needle) ||
        (client?.phone || "").includes(needle)
      );
    });
  }, [list, clients, q, filter]);

  const totals = useMemo(() => ({
    count: filtered.length,
    sales: filtered.reduce((s, i) => s + i.total, 0),
    outstanding: filtered.reduce((s, i) => s + i.remaining, 0),
  }), [filtered]);

  // Send a payment reminder for an unpaid invoice via the throttled queue.
  const remind = async (inv: Invoice) => {
    if (!user) return;
    const client = inv.client_id ? clients[inv.client_id] : null;
    if (!client?.phone) { toast.error("الفاتورة دي مش مربوطة بعميل له رقم موبايل"); return; }
    try {
      await unwrap(api().waQueue.enqueue({
        tenantId: user.tenant_id,
        to: client.phone,
        body: `مرحبًا ${client.name} 👋\nنذكّرك بفاتورة #${inv.number ?? ""} بمبلغ متبقٍّ ${money(inv.remaining)}.\nشكرًا لتعاملك معنا 🙏`,
      }));
      toast.success("تم جدولة التذكير على واتساب ✓");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم/موبايل العميل" className="pr-9" />
        </div>
        <div className="flex gap-1">
          {([["all", "الكل"], ["open", "مفتوحة"], ["paid", "مدفوعة"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 h-10 rounded-md text-sm border ${filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">عدد الفواتير</div><div className="text-lg font-bold tabular-nums">{totals.count}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">إجمالي المبيعات</div><div className="text-lg font-bold tabular-nums">{money(totals.sales)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">المتبقي (آجل)</div><div className="text-lg font-bold tabular-nums text-destructive">{money(totals.outstanding)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>الرقم</TH>
              <TH>التاريخ</TH>
              <TH>العميل</TH>
              <TH>الدفع</TH>
              <TH>الإجمالي</TH>
              <TH>المتبقي</TH>
              <TH>الحالة</TH>
              <TH>إجراءات</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={8} className="text-center text-muted-foreground py-8">لا توجد فواتير مطابقة.</TD>
              </TR>
            ) : (
              filtered.map((inv) => {
                const client = inv.client_id ? clients[inv.client_id] : null;
                const pay = PAY_META[inv.payment_method || "cash"] || PAY_META.cash;
                const PayIcon = pay.icon;
                return (
                  <TR key={inv.id}>
                    <TD className="font-medium">#{inv.number ?? inv.id.slice(0, 6)}</TD>
                    <TD>{arDate(inv.created_at)}</TD>
                    <TD>{client?.name || <span className="text-muted-foreground">عميل عابر</span>}</TD>
                    <TD><span className="inline-flex items-center gap-1 text-xs"><PayIcon className="h-3 w-3" /> {pay.label}</span></TD>
                    <TD className="tabular-nums">{money(inv.total)}</TD>
                    <TD className={`tabular-nums ${inv.remaining > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>{money(inv.remaining)}</TD>
                    <TD>{inv.remaining <= 0 ? <Badge variant="success">مدفوعة</Badge> : <Badge variant="warning">مفتوحة</Badge>}</TD>
                    <TD>
                      {inv.remaining > 0 && client?.phone && (
                        <button onClick={() => remind(inv)} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-500/10" title="تذكير واتساب">
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </TD>
                  </TR>
                );
              })
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
