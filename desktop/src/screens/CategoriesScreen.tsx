import { Layers } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

export function CategoriesScreen() {
  return (
    <SimpleCRUDScreen
      title="تصنيف"
      table="categories"
      description="التصنيفات بتنظم المنتجات داخل المتجر والكاشير. ممكن تكون هرمية (تصنيف رئيسي وتصنيفات فرعية)."
      fields={[
        { name: "name", label: "اسم التصنيف", required: true },
        { name: "parent_id", label: "Parent ID (اختياري — لتصنيف فرعي)" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "parent_id", label: "الأب", render: (r) => r.parent_id ? <code className="text-xs">{r.parent_id.slice(0, 8)}</code> : "—" },
      ]}
      emptyIcon={<Layers className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
