import { Layers } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

export function CostCentersScreen() {
  return (
    <SimpleCRUDScreen
      title="مركز تكلفة"
      table="cost_centers"
      description="مراكز التكلفة بتفصّل المصروفات حسب الفرع/القسم/المشروع."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "code", label: "الكود", required: true },
        { name: "name", label: "الاسم", required: true },
      ]}
      columns={[
        { field: "code", label: "الكود", render: (r) => <code className="font-mono">{r.code}</code> },
        { field: "name", label: "الاسم" },
      ]}
      emptyIcon={<Layers className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
