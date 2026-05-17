import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Save, Trash2, Pause, Plus } from "lucide-react";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoSuggestInput, type Suggestion } from "@/components/shared/AutoSuggestInput";
import type { PosLayoutProps, PosRow, PosProduct } from "./types";

const newRowId = () =>
  globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Classic layout — keyboard-driven wholesale-style invoice. Every row
// gets an inline autocomplete on BOTH the barcode and the product-name
// columns: as the cashier types, the rest of the matching product name
// previews as ghost text and a floating dropdown lists every other
// match starting with the same letters.
export function ClassicLayout(p: PosLayoutProps) {
  const [activeField, setActiveField] = useState<{ rowId: string; col: "barcode" | "name" } | null>(null);
  const lastRowBarcodeRef = useRef<HTMLDivElement | null>(null);
  const isPaidInFull = p.totals.remaining <= 0 && p.totals.subtotal > 0;

  // Make sure there's always at least one blank trailing row to type into.
  useEffect(() => {
    if (p.rows.length === 0 || isBlank(p.rows[p.rows.length - 1])) return;
    p.setRows([...p.rows, blankRow()]);
  }, [p.rows.length]);

  function blankRow(): PosRow {
    return { id: newRowId(), product_id: null, product_name: "", barcode: "", quantity: 1, price: 0 };
  }
  function isBlank(r: PosRow) {
    return !r.product_id && !r.product_name && !r.barcode;
  }

  const productSuggestions = useMemo<Suggestion[]>(
    () => p.products.slice(0, 200).map((prod) => ({
      id: prod.id,
      label: prod.name,
      hint: `${prod.barcode || prod.item_number || ""} · ${money(p.resolvePrice(prod))} · المتاح ${prod.stock}`,
      payload: prod,
    })),
    [p.products, p.resolvePrice],
  );

  const matchByBarcode = (q: string): Suggestion[] => {
    const qq = q.trim();
    if (!qq) return [];
    return p.products
      .filter((prod) =>
        (prod.barcode || "").startsWith(qq) ||
        (prod.item_number || "").toLowerCase().startsWith(qq.toLowerCase()),
      )
      .slice(0, 8)
      .map((prod) => ({
        id: prod.id,
        label: prod.name,
        hint: `${prod.barcode || prod.item_number || ""} · ${money(p.resolvePrice(prod))}`,
        payload: prod,
      }));
  };

  const applyProduct = (row: PosRow, prod: PosProduct, currentRowId: string) => {
    const next = p.rows.map((r) =>
      r.id === currentRowId
        ? {
            ...r,
            product_id: prod.id,
            product_name: prod.name,
            barcode: prod.barcode || prod.item_number || "",
            price: p.resolvePrice(prod),
            quantity: r.quantity || 1,
          }
        : r,
    );
    // If we just filled the last row, append a fresh blank.
    if (next[next.length - 1].id === currentRowId) next.push(blankRow());
    p.setRows(next);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>العميل</Label>
            <Input value={p.client?.name || ""} onChange={() => undefined} placeholder="عميل عابر" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input
              value={new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label>نوع الفاتورة</Label>
            <Input value="مبيعات" readOnly />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="w-44">باركود</th>
              <th>اسم المنتج</th>
              <th className="w-24">الكمية</th>
              <th className="w-32">السعر</th>
              <th className="w-32">الإجمالي</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <AutoSuggestInput
                    value={r.barcode}
                    onChange={(v) => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, barcode: v } : x))}
                    onPick={(s) => applyProduct(r, s.payload as PosProduct, r.id)}
                    onEnter={(v) => {
                      // Exact-barcode match → add row; otherwise no-op
                      const exact = p.products.find((prod) => prod.barcode === v.trim());
                      if (exact) applyProduct(r, exact, r.id);
                    }}
                    suggestions={matchByBarcode(r.barcode)}
                    placeholder="باركود"
                    dataAttr="data-barcode-input"
                  />
                </td>
                <td>
                  {/*
                    Ghost-text + floating dropdown on the product NAME
                    column. This is the main typing experience cashiers
                    use when the barcode is unknown.
                  */}
                  <AutoSuggestInput
                    value={r.product_name}
                    onChange={(v) => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, product_name: v } : x))}
                    onPick={(s) => applyProduct(r, s.payload as PosProduct, r.id)}
                    suggestions={productSuggestions}
                    placeholder="اسم المنتج (اقتراح تلقائي)"
                  />
                </td>
                <td>
                  <input
                    inputMode="numeric"
                    value={r.quantity}
                    onChange={(e) =>
                      p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, Number(e.target.value) || 0) } : x))
                    }
                  />
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    value={r.price}
                    onChange={(e) => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, price: Number(e.target.value) || 0 } : x))}
                  />
                </td>
                <td className="tabular-nums text-right pr-3">{money(r.quantity * r.price)}</td>
                <td>
                  <button
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    onClick={() => {
                      const next = p.rows.filter((x) => x.id !== r.id);
                      p.setRows(next.length ? next : [blankRow()]);
                    }}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-3 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground">
            اكتب أول حرف من اسم المنتج (أو الباركود) — هيظهر لك تكملة فورية + قائمة باقي الأسماء المطابقة.
          </span>
          <Button variant="ghost" size="sm" onClick={() => p.setRows([...p.rows, blankRow()])}>
            <Plus className="h-4 w-4" /> صف جديد
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>إجمالي</Label>
            <Input value={money(p.totals.subtotal)} readOnly className="text-right tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>خصم</Label>
            <Input inputMode="decimal" value={p.discount} onChange={(e) => p.setDiscount(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>المدفوع</Label>
            <Input inputMode="decimal" value={p.paid} onChange={(e) => p.setPaid(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>المتبقي</Label>
            <Input
              value={money(p.totals.remaining)}
              readOnly
              className={`text-right tabular-nums font-bold ${
                isPaidInFull ? "text-[hsl(var(--success))]" : p.totals.remaining > 0 ? "text-destructive" : ""
              }`}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-row-reverse gap-2 flex-wrap">
          <Button onClick={p.onSave} disabled={p.busy}><Save className="h-4 w-4" /> حفظ</Button>
          <Button variant="outline" onClick={p.onPrint}><Printer className="h-4 w-4" /> طباعة</Button>
          <Button variant="ghost" onClick={p.onHold}><Pause className="h-4 w-4" /> تعليق</Button>
          <Button variant="ghost" onClick={p.onClear}>تفريغ</Button>
        </div>
      </Card>
    </div>
  );
}
