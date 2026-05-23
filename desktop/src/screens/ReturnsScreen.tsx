import { RotateCcw } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";

export function ReturnsScreen() {
  return (
    <SimpleCRUDScreen
      title="مرتجع"
      table="returns"
      description="إرجاع البضاعة المباعة. كل مرتجع مرتبط بفاتورة أصلية ويرجّع البضاعة للمخزون تلقائيًا."
      orderBy="created_at DESC"
      fields={[
        { name: "invoice_id", label: "رقم الفاتورة الأصلية (ID)" },
        { name: "client_id", label: "العميل (ID)" },
        { name: "total", label: "إجمالي المرتجع", type: "number", required: true, defaultValue: "0" },
        { name: "reason", label: "سبب الإرجاع" },
      ]}
      columns={[
        { field: "created_at", label: "التاريخ", render: (r) => arDate(r.created_at) },
        { field: "invoice_id", label: "الفاتورة", render: (r) => r.invoice_id ? <code className="text-xs">{r.invoice_id.slice(0, 8)}</code> : "—" },
        { field: "total", label: "الإجمالي", render: (r) => <span className="tabular-nums font-semibold text-destructive">{money(r.total)}</span> },
        { field: "reason", label: "السبب" },
      ]}
      emptyIcon={<RotateCcw className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
