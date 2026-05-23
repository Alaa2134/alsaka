import { ClipboardList } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";
import { arDate } from "@/lib/format";

export function StockCountsScreen() {
  return (
    <SimpleCRUDScreen
      title="جرد مخزون"
      table="stock_counts"
      description="جرد دوري للمخزون — يقارن الكمية الفعلية بالنظامية ويسوّي الفروقات تلقائيًا عند الاعتماد."
      defaults={{ status: "open" }}
      fields={[
        { name: "warehouse_id", label: "المخزن (ID)" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "count_number", label: "الرقم" },
        { field: "created_at", label: "تاريخ البدء", render: (r) => arDate(r.created_at) },
        {
          field: "status", label: "الحالة", render: (r) => {
            const m: any = {
              open: ["مفتوح", "warning"],
              committed: ["معتمد", "success"],
              cancelled: ["ملغي", "destructive"],
            };
            const [l, v] = m[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{l}</Badge>;
          },
        },
      ]}
      emptyIcon={<ClipboardList className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
