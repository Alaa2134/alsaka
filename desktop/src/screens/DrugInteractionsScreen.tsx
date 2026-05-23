import { Pill } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";

export function DrugInteractionsScreen() {
  return (
    <SimpleCRUDScreen
      title="تعارض دوائي"
      table="drug_interactions"
      description="عرّف زوج الأدوية اللي ميصحش تنباع للعميل في نفس الفاتورة. لما اتنينهم في السلة، الكاشير يشوف تنبيه فوري حسب درجة الخطورة."
      fields={[
        { name: "drug_a_id", label: "Drug A (Product ID)", required: true },
        { name: "drug_b_id", label: "Drug B (Product ID)", required: true },
        { name: "severity", label: "الخطورة", type: "select", required: true, defaultValue: "medium", options: [
          { value: "low", label: "منخفضة" },
          { value: "medium", label: "متوسطة" },
          { value: "high", label: "عالية" },
          { value: "contraindicated", label: "ممنوع تمامًا" },
        ]},
        { name: "note", label: "الملاحظات الإكلينيكية" },
        { name: "source", label: "المصدر" },
      ]}
      columns={[
        { field: "drug_a_id", label: "Drug A", render: (r) => <code className="text-xs">{r.drug_a_id?.slice(0, 8)}</code> },
        { field: "drug_b_id", label: "Drug B", render: (r) => <code className="text-xs">{r.drug_b_id?.slice(0, 8)}</code> },
        { field: "severity", label: "الخطورة", render: (r) => {
          const m: any = {
            low: ["منخفضة", "muted"],
            medium: ["متوسطة", "warning"],
            high: ["عالية", "destructive"],
            contraindicated: ["ممنوع تمامًا", "destructive"],
          };
          const [l, v] = m[r.severity] || [r.severity, "muted"];
          return <Badge variant={v}>{l}</Badge>;
        }},
        { field: "note", label: "الملاحظة" },
      ]}
      emptyIcon={<Pill className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
