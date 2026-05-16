import { useMemo, useState } from "react";
import { Package, Search, Save, Printer, Trash2, Plus, Minus } from "lucide-react";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PosLayoutProps, PosProduct } from "./types";

// Dual-screen workflow: product picker on the right, full table editor
// + payment on the left. Designed for large stores with dual monitors.
export function DualLayout(p: PosLayoutProps) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    if (!search.trim()) return p.products.slice(0, 30);
    const q = search.trim().toLowerCase();
    return p.products
      .filter((x) =>
        x.name.toLowerCase().includes(q) ||
        (x.barcode || "").includes(q) ||
        (x.item_number || "").includes(q),
      )
      .slice(0, 30);
  }, [p.products, search]);

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

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
      {/* Left: full invoice editor */}
      <Card className="p-0 overflow-hidden">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th className="w-24">الكمية</th>
              <th className="w-32">السعر</th>
              <th className="w-32">الإجمالي</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {p.rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground py-8">السلة فارغة — اختر من اليسار</td></tr>
            ) : p.rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.product_name}</td>
                <td>
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))} className="h-6 w-6 rounded bg-secondary inline-flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm tabular-nums">{r.quantity}</span>
                    <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: x.quantity + 1 } : x))} className="h-6 w-6 rounded bg-secondary inline-flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                </td>
                <td>
                  <input inputMode="decimal" value={r.price} onChange={(e) => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, price: Number(e.target.value) || 0 } : x))} />
                </td>
                <td className="tabular-nums">{money(r.quantity * r.price)}</td>
                <td>
                  <button onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">خصم</div>
              <Input inputMode="decimal" value={p.discount} onChange={(e) => p.setDiscount(Number(e.target.value) || 0)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">مدفوع</div>
              <Input inputMode="decimal" value={p.paid} onChange={(e) => p.setPaid(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-2xl font-bold tabular-nums">{money(p.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المتبقي</span>
            <span className={`text-lg font-bold tabular-nums ${p.totals.remaining > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
              {money(p.totals.remaining)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={p.onSave} disabled={p.busy}><Save className="h-4 w-4" /> حفظ</Button>
            <Button size="lg" variant="outline" onClick={p.onPrint}><Printer className="h-4 w-4" /> طباعة</Button>
          </div>
        </div>
      </Card>

      {/* Right: product picker */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="باركود أو اسم..." className="pr-10" data-barcode-input />
        </div>
        <Card className="p-3">
          <div className="grid gap-2 grid-cols-3">
            {visible.map((product) => (
              <button
                key={product.id}
                onClick={() => addProduct(product)}
                className="aspect-square rounded-lg border border-border bg-card p-2 flex flex-col items-center justify-between hover:border-primary hover:shadow-soft transition-all"
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="max-h-16 object-contain" />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-center w-full">
                  <div className="text-xs font-medium line-clamp-1">{product.name}</div>
                  <div className="text-sm font-bold tabular-nums">{money(p.resolvePrice(product))}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
