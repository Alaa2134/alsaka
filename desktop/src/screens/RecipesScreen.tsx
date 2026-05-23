import { Soup } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function RecipesScreen() {
  return (
    <SimpleCRUDScreen
      title="وصفة طعام"
      table="recipes"
      description="كل وجبة مرتبطة بمنتج (Product). لما تتباع الوجبة، النظام بيخصم المكونات تلقائيًا من المخزن (cost-of-goods الحقيقي)."
      defaults={{ total_cost: 0 }}
      fields={[
        { name: "product_id", label: "المنتج الأساسي (Product ID)", required: true },
        { name: "name", label: "اسم الوصفة (مثال: بيتزا مارجريتا)", required: true },
        { name: "serves", label: "عدد الحصص (Servings)", type: "number", defaultValue: "1" },
        { name: "total_cost", label: "تكلفة الوصفة الكاملة", type: "number" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "serves", label: "الحصص" },
        { field: "total_cost", label: "التكلفة", render: (r) => <span className="tabular-nums">{money(r.total_cost)}</span> },
        { field: "product_id", label: "المنتج", render: (r) => <code className="text-xs">{r.product_id?.slice(0, 8)}</code> },
      ]}
      emptyIcon={<Soup className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
