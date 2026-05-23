import { Lock } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";
import { arDate } from "@/lib/format";

export function ControlledSubstancesScreen() {
  return (
    <SimpleCRUDScreen
      title="حركة مادة مخدرة"
      table="controlled_substance_log"
      description="سجل المواد المخدرة والمؤثرات النفسية كما تتطلب وزارة الصحة. كل حركة استلام أو صرف لازم تكون مسجلة."
      orderBy="created_at DESC"
      fields={[
        { name: "product_id", label: "Product ID", required: true },
        { name: "action", label: "نوع الحركة", type: "select", required: true, options: [
          { value: "receive", label: "استلام" },
          { value: "dispense", label: "صرف" },
          { value: "adjust", label: "تسوية" },
        ]},
        { name: "quantity", label: "الكمية", type: "number", required: true },
        { name: "prescription_id", label: "رقم الوصفة (إن وُجد)" },
        { name: "patient_id_number", label: "رقم هوية المريض" },
        { name: "witness_signature", label: "توقيع الشاهد" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "created_at", label: "التاريخ", render: (r) => arDate(r.created_at) },
        { field: "action", label: "الحركة", render: (r) => {
          const m: any = {
            receive: ["استلام", "success"],
            dispense: ["صرف", "destructive"],
            adjust: ["تسوية", "warning"],
          };
          const [l, v] = m[r.action] || [r.action, "muted"];
          return <Badge variant={v}>{l}</Badge>;
        }},
        { field: "quantity", label: "الكمية", render: (r) => <span className="tabular-nums">{r.quantity}</span> },
        { field: "patient_id_number", label: "هوية المريض" },
        { field: "prescription_id", label: "وصفة" },
      ]}
      emptyIcon={<Lock className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
