import { useEffect, useMemo, useState, useCallback } from "react";
import { Utensils, Send, Plus, Minus, Save, Printer, Users } from "lucide-react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import type { PosLayoutProps, PosProduct } from "./types";

interface Table {
  id: string;
  name: string;
  zone: string | null;
  seats: number;
  status: "free" | "occupied" | "reserved" | "cleaning";
}

export function RestaurantLayout(p: PosLayoutProps) {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeCat, setActiveCat] = useState<string>("");

  const refreshTables = useCallback(async () => {
    if (!user) return;
    try {
      const data = await unwrap(
        api().db.list<Table>("restaurant_tables", { tenantId: user.tenant_id, limit: 200, orderBy: "name ASC" }),
      );
      setTables(data ?? []);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  const seedTables = async () => {
    if (!user) return;
    if (!confirm("هل تريد إنشاء 12 طاولة افتراضية (T1..T12)؟")) return;
    for (let i = 1; i <= 12; i++) {
      try {
        await unwrap(api().db.insert("restaurant_tables", {
          tenant_id: user.tenant_id,
          name: `T${i}`,
          seats: 4,
          zone: i <= 8 ? "داخلي" : "تراس",
          status: "free",
        }));
      } catch (_) { /* ignore dups */ }
    }
    toast.success("تم إضافة 12 طاولة");
    refreshTables();
  };

  const filtered = useMemo(() => {
    let list = p.products;
    if (activeCat) list = list.filter((x) => x.category_id === activeCat);
    return list.slice(0, 60);
  }, [p.products, activeCat]);

  const addProduct = (product: PosProduct) => {
    const existing = p.rows.find((r) => r.product_id === product.id);
    if (existing) {
      p.setRows(p.rows.map((r) => r.id === existing.id ? { ...r, quantity: r.quantity + 1 } : r));
    } else {
      const price = p.resolvePrice(product);
      p.setRows([
        ...p.rows,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode || "",
          quantity: 1,
          price,
        },
      ]);
    }
  };

  const sendToKitchen = () => {
    if (p.rows.length === 0) return;
    toast.success(`تم إرسال ${p.rows.length} صنف للمطبخ (KOT)`);
    // In a real impl this would insert into restaurant_order_items with kot_status=sent
  };

  return (
    <div className="grid h-[calc(100vh-12rem)] gap-3" style={{ gridTemplateColumns: "260px 1fr 360px" }}>
      {/* Tables */}
      <Card className="p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">الطاولات</h3>
          {tables.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedTables}>إضافة افتراضية</Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tables.map((t) => {
            const isSel = selectedTable?.id === t.id;
            const color =
              t.status === "free" ? "bg-[hsl(var(--success))]/15 border-[hsl(var(--success))]/40"
              : t.status === "occupied" ? "bg-destructive/15 border-destructive/40"
              : t.status === "reserved" ? "bg-[hsl(var(--warning))]/15 border-[hsl(var(--warning))]/40"
              : "bg-secondary border-border";
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTable(t)}
                className={`rounded-lg border-2 p-3 text-center transition-all ${color} ${isSel ? "ring-2 ring-primary" : ""}`}
              >
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" /> {t.seats}
                </div>
                {t.zone && <div className="text-[10px] text-muted-foreground mt-0.5">{t.zone}</div>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Menu grid */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b border-border p-2 flex flex-wrap gap-1">
          <button onClick={() => setActiveCat("")} className={`px-3 py-1.5 rounded-md text-sm ${activeCat === "" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>الكل</button>
          {p.categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1.5 rounded-md text-sm ${activeCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{c.name}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => addProduct(product)}
                className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary hover:shadow-soft transition-all text-right"
              >
                <div className="aspect-[4/3] bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Utensils className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                  <div className="text-primary font-bold tabular-nums mt-0.5">{money(p.resolvePrice(product))}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Order ticket */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">طاولة</div>
            <div className="font-bold">{selectedTable?.name || "—"}</div>
          </div>
          <Badge variant="muted">{p.rows.length} صنف</Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {p.rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">اختر منتجات من المنيو</p>
          ) : (
            p.rows.map((r) => (
              <div key={r.id} className="bg-secondary/40 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm flex-1">{r.product_name}</div>
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))} className="h-7 w-7 rounded bg-card inline-flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm tabular-nums">{r.quantity}</span>
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: x.quantity + 1 } : x))} className="h-7 w-7 rounded bg-card inline-flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{money(r.price)}</span>
                  <span className="font-bold tabular-nums text-foreground">{money(r.price * r.quantity)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">الإجمالي</span>
            <span className="font-bold text-lg tabular-nums">{money(p.totals.subtotal)}</span>
          </div>
          <Button onClick={sendToKitchen} className="w-full" variant="outline" disabled={p.rows.length === 0}>
            <Send className="h-4 w-4" /> إرسال للمطبخ (KOT)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={p.onSave} disabled={p.busy || !selectedTable}><Save className="h-4 w-4" /> فاتورة الطاولة</Button>
            <Button variant="outline" onClick={p.onPrint}><Printer className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
