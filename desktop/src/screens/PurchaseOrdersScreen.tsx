import { FileSignature } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function PurchaseOrdersScreen() {
  return (
    <SimpleCRUDScreen
      title="أمر شراء"
      table="purchase_orders"
      description="أوامر شراء (PO) للموردين قبل الاستلام الفعلي — تتحول لفاتورة مشتريات عند الاستلام."
      defaults={{ status: "draft" }}
      fields={[
        { name: "supplier_id", label: "المورد (ID)", required: true },
        { name: "expected_at", label: "متوقع الاستلام", type: "date" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "order_number", label: "الرقم" },
        { field: "supplier_id", label: "المورد", render: (r) => <code className="text-xs">{r.supplier_id?.slice(0, 8) || "—"}</code> },
        { field: "expected_at", label: "متوقع", render: (r) => r.expected_at ? arDate(r.expected_at) : "—" },
        { field: "total", label: "الإجمالي", render: (r) => <span className="tabular-nums">{money(r.total)}</span> },
        {
          field: "status", label: "الحالة", render: (r) => {
            const m: any = {
              draft: ["مسوّدة", "muted"],
              sent: ["مُرسل", "default"],
              partial: ["جزئي", "warning"],
              received: ["مستلم", "success"],
              cancelled: ["ملغي", "destructive"],
            };
            const [l, v] = m[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{l}</Badge>;
          },
        },
      ]}
      emptyIcon={<FileSignature className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
