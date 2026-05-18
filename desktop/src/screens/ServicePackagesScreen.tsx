import { Package } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function ServicePackagesScreen() {
  return (
    <SimpleCRUDScreen
      title="باقة خدمات"
      table="service_packages"
      description="باقات الخدمات اللي بيشتريها العميل دفعة واحدة (مثلًا: 10 جلسات حمام مغربي بـ X جنيه)."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "name", label: "اسم الباقة", required: true },
        { name: "sessions_count", label: "عدد الجلسات", type: "number", required: true },
        { name: "price", label: "السعر الإجمالي", type: "number", required: true },
        { name: "valid_days", label: "صالحة لـ كم يوم", type: "number", defaultValue: "365" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "sessions_count", label: "الجلسات" },
        { field: "price", label: "السعر", render: (r) => <span className="tabular-nums font-semibold">{money(r.price)}</span> },
        { field: "valid_days", label: "الصلاحية", render: (r) => `${r.valid_days} يوم` },
      ]}
      emptyIcon={<Package className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
