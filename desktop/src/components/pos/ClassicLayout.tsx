import { Printer, Save, Trash2, Pause, Plus } from "lucide-react";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PosLayoutProps } from "./types";

export function ClassicLayout(p: PosLayoutProps) {
  const isPaidInFull = p.totals.remaining <= 0 && p.totals.subtotal > 0;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>العميل</Label>
            <Input
              value={p.client?.name || ""}
              onChange={() => undefined}
              placeholder="اختر عميل أو ابدأ بدون"
              readOnly
            />
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
                <td><input value={r.barcode} readOnly className="text-right" /></td>
                <td><input value={r.product_name} readOnly /></td>
                <td>
                  <input
                    inputMode="numeric"
                    value={r.quantity}
                    onChange={(e) => p.setRows(p.rows.map((x) => x.id === r.id ? { ...x, quantity: Math.max(0, Number(e.target.value) || 0) } : x))}
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
                    onClick={() => p.setRows(p.rows.filter((x) => x.id !== r.id))}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              className={`text-right tabular-nums font-bold ${isPaidInFull ? "text-[hsl(var(--success))]" : p.totals.remaining > 0 ? "text-destructive" : ""}`}
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
