import { Store } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";

export function BranchesScreen() {
  return (
    <SimpleCRUDScreen
      title="فرع"
      table="branches"
      description="إدارة فروع متعددة (Multi-branch) — تقارير موحّدة وعمليات مستقلة لكل فرع."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "code", label: "كود الفرع", required: true },
        { name: "name", label: "الاسم", required: true },
        { name: "address", label: "العنوان" },
        { name: "phone", label: "الهاتف" },
        { name: "industry_template", label: "قالب النشاط", type: "select", options: [
          { value: "retail", label: "تجزئة" },
          { value: "restaurant", label: "مطعم/كافيه" },
          { value: "pharmacy", label: "صيدلية" },
          { value: "salon", label: "صالون" },
          { value: "services", label: "خدمات" },
        ]},
      ]}
      columns={[
        { field: "code", label: "الكود", render: (r) => <code className="font-mono">{r.code}</code> },
        { field: "name", label: "الاسم" },
        { field: "address", label: "العنوان" },
        { field: "phone", label: "الهاتف", render: (r) => <span dir="ltr" className="tabular-nums">{r.phone || "—"}</span> },
        { field: "industry_template", label: "النشاط", render: (r) => r.industry_template ? <Badge variant="muted">{r.industry_template}</Badge> : "—" },
      ]}
      emptyIcon={<Store className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
