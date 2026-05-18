import { Trash2 } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";

export function WasteLogScreen() {
  return (
    <SimpleCRUDScreen
      title="فاقد / هالك"
      table="waste_log"
      description="سجل المنتجات اللي بتتلف أو بتنتهي صلاحيتها قبل البيع. النظام بيحسب تكلفتها ويخصمها من المخزن."
      orderBy="created_at DESC"
      fields={[
        { name: "product_id", label: "Product ID", required: true },
        { name: "quantity", label: "الكمية الفاقدة", type: "number", required: true },
        { name: "reason", label: "السبب (انتهاء صلاحية / كسر / غيره)" },
      ]}
      columns={[
        { field: "created_at", label: "التاريخ", render: (r) => arDate(r.created_at) },
        { field: "product_id", label: "المنتج", render: (r) => <code className="text-xs">{r.product_id?.slice(0, 8)}</code> },
        { field: "quantity", label: "الكمية", render: (r) => <span className="tabular-nums">{r.quantity}</span> },
        { field: "cost", label: "التكلفة", render: (r) => <span className="tabular-nums text-destructive">{money(r.cost)}</span> },
        { field: "reason", label: "السبب" },
      ]}
      emptyIcon={<Trash2 className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
