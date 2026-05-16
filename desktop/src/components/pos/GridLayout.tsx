import { useMemo, useState } from "react";
import { Package, Plus, Minus, Trash2, Save, Printer, Pause, Search } from "lucide-react";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PosLayoutProps, PosProduct } from "./types";

// Touch-grid POS: categories on the right (RTL), product tiles in the
// middle, cart sticky on the left. Suited for supermarkets / pharmacies
// / apparel where the cashier is more "tap" than "type".
export function GridLayout(p: PosLayoutProps) {
  const [activeCat, setActiveCat] = useState<string>("");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    let list = p.products;
    if (activeCat) list = list.filter((x) => x.category_id === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) =>
        x.name.toLowerCase().includes(q) ||
        (x.barcode || "").includes(q) ||
        (x.item_number || "").includes(q),
      );
    }
    return list.slice(0, 60);
  }, [p.products, activeCat, search]);

  const addProduct = (product: PosProduct) => {
    const existing = p.rows.find((r) => r.product_id === product.id);
    if (existing) {
      p.setRows(p.rows.map((r) => r.id === existing.id ? { ...r, quantity: r.quantity + 1 } : r));
    } else {
      const price = p.resolvePrice(product);
      p.setRows([
        ...p.rows,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random()}`,
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode || product.item_number || "",
          quantity: 1,
          price,
        },
      ]);
    }
  };

  return (
    <div className="grid h-[calc(100vh-12rem)] gap-3" style={{ gridTemplateColumns: "180px 1fr 380px" }}>
      {/* Categories */}
      <Card className="p-2 overflow-y-auto">
        <button
          onClick={() => setActiveCat("")}
          className={`w-full p-3 rounded-md text-sm font-medium mb-1 ${activeCat === "" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
        >
          الكل
        </button>
        {p.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`w-full p-3 rounded-md text-sm font-medium mb-1 ${activeCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            {c.name}
          </button>
        ))}
      </Card>

      {/* Products grid */}
      <div className="flex flex-col gap-2 min-h-0">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث أو امسح باركود..." className="pr-10" data-barcode-input />
        </div>
        <Card className="p-2 flex-1 overflow-y-auto">
          <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
            {visible.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground py-8">لا توجد منتجات</p>
            ) : (
              visible.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  disabled={!product.is_service && product.stock <= 0}
                  className="aspect-square rounded-lg border border-border bg-card p-2 flex flex-col items-center justify-between hover:border-primary hover:shadow-soft transition-all disabled:opacity-40"
                >
                  <div className="flex-1 w-full flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="max-h-16 object-contain" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-center w-full">
                    <div className="text-xs font-medium line-clamp-1">{product.name}</div>
                    <div className="text-sm font-bold tabular-nums">{money(p.resolvePrice(product))}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Cart */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <Input value={p.client?.name || ""} placeholder="عميل عابر" readOnly />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {p.rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">السلة فارغة</p>
          ) : (
            p.rows.map((r) => (
              <div key={r.id} className="bg-secondary/40 rounded-md p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{r.product_name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{money(r.price)}</div>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))} className="h-7 w-7 rounded bg-card hover:bg-muted inline-flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center tabular-nums text-sm">{r.quantity}</span>
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: x.quantity + 1 } : x))} className="h-7 w-7 rounded bg-card hover:bg-muted inline-flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))} className="p-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="text-left text-sm font-bold tabular-nums mt-1">{money(r.quantity * r.price)}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          <Row label="الإجمالي" value={money(p.totals.subtotal)} />
          <div className="grid grid-cols-2 gap-2">
            <Input inputMode="decimal" value={p.discount} onChange={(e) => p.setDiscount(Number(e.target.value) || 0)} placeholder="خصم" />
            <Input inputMode="decimal" value={p.paid} onChange={(e) => p.setPaid(Number(e.target.value) || 0)} placeholder="مدفوع" />
          </div>
          <Row label="المتبقي" value={money(p.totals.remaining)} className={p.totals.remaining > 0 ? "text-destructive" : "text-[hsl(var(--success))]"} />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button size="lg" onClick={p.onSave} disabled={p.busy}><Save className="h-4 w-4" /> حفظ</Button>
            <Button size="lg" variant="outline" onClick={p.onPrint}><Printer className="h-4 w-4" /> طباعة</Button>
            <Button size="sm" variant="ghost" onClick={p.onHold}><Pause className="h-3.5 w-3.5" /> تعليق</Button>
            <Button size="sm" variant="ghost" onClick={p.onClear}>تفريغ</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold tabular-nums ${className}`}>{value}</span>
    </div>
  );
}
