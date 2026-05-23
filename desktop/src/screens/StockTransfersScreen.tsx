import { ArrowRightLeft } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";

export function StockTransfersScreen() {
  return (
    <SimpleCRUDScreen
      title="تحويل مخزني"
      table="stock_transfers"
      description="نقل البضاعة بين المخازن. الأرصدة تتعدل تلقائيًا عند الاستلام."
      defaults={{ status: "pending" }}
      fields={[
        { name: "from_warehouse_id", label: "من مخزن (ID)", required: true },
        { name: "to_warehouse_id", label: "إلى مخزن (ID)", required: true },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "transfer_number", label: "الرقم" },
        { field: "from_warehouse_id", label: "من", render: (r) => <code className="text-xs">{r.from_warehouse_id?.slice(0, 8)}</code> },
        { field: "to_warehouse_id", label: "إلى", render: (r) => <code className="text-xs">{r.to_warehouse_id?.slice(0, 8)}</code> },
        {
          field: "status", label: "الحالة", render: (r) => {
            const m: any = {
              pending: ["معلق", "warning"],
              in_transit: ["في الطريق", "default"],
              received: ["مستلم", "success"],
              cancelled: ["ملغي", "destructive"],
            };
            const [l, v] = m[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{l}</Badge>;
          },
        },
      ]}
      emptyIcon={<ArrowRightLeft className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
