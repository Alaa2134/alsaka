import { useEffect, useState } from "react";
import { X, Phone, Receipt, Wallet, TrendingUp, Clock, Trophy, Loader2 } from "lucide-react";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface Profile {
  client: { id: string; name: string; phone: string | null; email: string | null };
  stats: { invoices: number; lifetime: number; outstanding: number; avgTicket: number; last_at: string | null; first_at: string | null };
  invoices: Array<{ id: string; number: number | null; total: number; remaining: number; payment_method: string | null; created_at: string }>;
  topItems: Array<{ name: string; qty: number; spent: number }>;
}

export function CustomerProfile({ tenantId, clientId, onClose }: { tenantId: string; clientId: string; onClose: () => void }) {
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await unwrap(api().db.clientProfile({ tenantId, clientId }));
        setData(res as Profile);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [tenantId, clientId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !data ? (
          <div className="p-12 text-center text-muted-foreground">تعذّر تحميل ملف العميل</div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-t-2xl relative">
              <button onClick={onClose} className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/40"><X className="h-4 w-4" /></button>
              <div className="text-2xl font-bold">{data.client.name}</div>
              {data.client.phone && (
                <a href={`tel:${data.client.phone}`} className="inline-flex items-center gap-1 text-sm opacity-90 mt-1" dir="ltr">
                  <Phone className="h-3.5 w-3.5" /> {data.client.phone}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
              {[
                { label: "إجمالي الشراء", value: money(data.stats.lifetime), icon: TrendingUp },
                { label: "عدد الفواتير", value: String(data.stats.invoices), icon: Receipt },
                { label: "متوسط الفاتورة", value: money(data.stats.avgTicket), icon: Wallet },
                { label: "متبقٍّ (آجل)", value: money(data.stats.outstanding), icon: Clock },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-card p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-base font-bold tabular-nums">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 space-y-5">
              {data.stats.last_at && (
                <p className="text-xs text-muted-foreground">
                  أول تعامل {arDate(data.stats.first_at!)} · آخر تعامل {arDate(data.stats.last_at)}
                </p>
              )}

              {/* Top items */}
              {data.topItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Trophy className="h-4 w-4 text-amber-500" /> أكثر ما يشتريه</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.topItems.map((it, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary">
                        {it.name} <span className="text-muted-foreground">×{it.qty}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice history */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Receipt className="h-4 w-4" /> سجل الفواتير</h3>
                {data.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد فواتير.</p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg">
                    {data.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">#{inv.number ?? inv.id.slice(0, 6)}</span>
                          <span className="text-xs text-muted-foreground mr-2">{arDate(inv.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-semibold">{money(inv.total)}</span>
                          {inv.remaining > 0
                            ? <Badge variant="warning" className="text-[10px]">باقي {money(inv.remaining)}</Badge>
                            : <Badge variant="success" className="text-[10px]">مدفوعة</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
