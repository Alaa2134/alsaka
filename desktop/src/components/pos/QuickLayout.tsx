import { useMemo } from "react";
import { Plus, Minus, Save, Printer, Trash2 } from "lucide-react";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PosLayoutProps, PosProduct } from "./types";

// Quick-service: big buttons for the top SKUs. Optimized for one-tap.
// The top 16 products by stock are shown as the "hot" wall; the cart
// sits underneath. Perfect for coffee shops, juice bars, fast food.
export function QuickLayout(p: PosLayoutProps) {
  const hot = useMemo(() => p.products.slice(0, 16), [p.products]);

  const tap = (product: PosProduct) => {
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
    <div className="space-y-3">
      <Card className="p-3">
        <div className="grid gap-2 grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {hot.map((product) => (
            <button
              key={product.id}
              onClick={() => tap(product)}
              className="aspect-square rounded-xl text-primary-foreground p-3 flex flex-col items-center justify-center font-semibold shadow-soft transition-transform hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, hsl(${(hashCode(product.id) % 360)} 70% 45%), hsl(${(hashCode(product.id) % 360 + 30) % 360} 70% 55%))` }}
            >
              <div className="text-sm leading-tight text-center line-clamp-2">{product.name}</div>
              <div className="text-lg tabular-nums mt-1">{money(p.resolvePrice(product))}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <div className="space-y-1 mb-2 max-h-64 overflow-y-auto">
          {p.rows.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">اضغط على المنتج لإضافته</p>
          ) : (
            p.rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 bg-secondary/40 rounded-md p-2">
                <div className="flex-1 font-medium text-sm">{r.product_name}</div>
                <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))} className="h-7 w-7 rounded bg-card inline-flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="w-8 text-center tabular-nums">{r.quantity}</span>
                <button onClick={() => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: x.quantity + 1 } : x))} className="h-7 w-7 rounded bg-card inline-flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                <span className="w-20 text-left tabular-nums font-semibold">{money(r.quantity * r.price)}</span>
                <button onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <div className="text-xs text-muted-foreground">الإجمالي</div>
            <div className="text-2xl font-bold tabular-nums">{money(p.totals.subtotal)}</div>
          </div>
          <div className="flex gap-2">
            <Input className="w-32" inputMode="decimal" placeholder="مدفوع" value={p.paid} onChange={(e) => p.setPaid(Number(e.target.value) || 0)} />
            <Button size="lg" onClick={p.onSave} disabled={p.busy}><Save className="h-4 w-4" /> دفع</Button>
            <Button size="lg" variant="outline" onClick={p.onPrint}><Printer className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}
