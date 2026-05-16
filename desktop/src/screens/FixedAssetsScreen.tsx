import { Building } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";

export function FixedAssetsScreen() {
  return (
    <SimpleCRUDScreen
      title="أصل ثابت"
      table="fixed_assets"
      description="أصول الشركة (سيارات، أجهزة، أثاث...) مع جدول إهلاك سنوي."
      fields={[
        { name: "name", label: "الاسم", required: true },
        { name: "category", label: "التصنيف", type: "select", options: [
          { value: "vehicles", label: "سيارات" },
          { value: "equipment", label: "أجهزة ومعدات" },
          { value: "furniture", label: "أثاث" },
          { value: "buildings", label: "مباني" },
          { value: "other", label: "أخرى" },
        ]},
        { name: "acquisition_date", label: "تاريخ الشراء", type: "date", required: true },
        { name: "cost", label: "التكلفة", type: "number", required: true },
        { name: "salvage_value", label: "القيمة المتبقية", type: "number", defaultValue: "0" },
        { name: "useful_life_years", label: "العمر الافتراضي (سنوات)", type: "number", defaultValue: "5" },
        { name: "depreciation_method", label: "طريقة الإهلاك", type: "select", defaultValue: "straight_line", options: [
          { value: "straight_line", label: "قسط ثابت" },
          { value: "declining", label: "متناقص" },
        ]},
      ]}
      columns={[
        { field: "name", label: "الأصل" },
        { field: "category", label: "التصنيف" },
        { field: "acquisition_date", label: "تاريخ الشراء", render: (r) => arDate(r.acquisition_date) },
        { field: "cost", label: "التكلفة", render: (r) => <span className="tabular-nums">{money(r.cost)}</span> },
        {
          field: "annual_depreciation",
          label: "الإهلاك السنوي",
          render: (r) => {
            const years = r.useful_life_years || 1;
            const annual = ((r.cost || 0) - (r.salvage_value || 0)) / years;
            return <span className="tabular-nums">{money(annual)}</span>;
          },
        },
        { field: "useful_life_years", label: "العمر", render: (r) => `${r.useful_life_years} سنة` },
      ]}
      emptyIcon={<Building className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
