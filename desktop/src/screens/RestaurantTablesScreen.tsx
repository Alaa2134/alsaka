import { Users } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";

export function RestaurantTablesScreen() {
  return (
    <SimpleCRUDScreen
      title="طاولة"
      table="restaurant_tables"
      description="الطاولات بتظهر في وضع المطعم. اضبط المنطقة وعدد الكراسي."
      fields={[
        { name: "name", label: "اسم الطاولة (T1, VIP-3...)", required: true },
        { name: "zone", label: "المنطقة", type: "select", defaultValue: "داخلي", options: [
          { value: "داخلي", label: "داخلي" },
          { value: "تراس", label: "تراس" },
          { value: "حديقة", label: "حديقة" },
          { value: "روف", label: "روف" },
        ]},
        { name: "seats", label: "عدد الكراسي", type: "number", required: true, defaultValue: "4" },
        { name: "status", label: "الحالة", type: "select", defaultValue: "free", options: [
          { value: "free", label: "متاحة" },
          { value: "occupied", label: "محجوزة" },
          { value: "reserved", label: "بحجز مسبق" },
          { value: "cleaning", label: "تنظيف" },
        ]},
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "zone", label: "المنطقة" },
        { field: "seats", label: "الكراسي" },
        {
          field: "status", label: "الحالة", render: (r) => {
            const map: any = {
              free: ["متاحة", "success"],
              occupied: ["مشغولة", "destructive"],
              reserved: ["محجوزة", "warning"],
              cleaning: ["تنظيف", "muted"],
            };
            const [lbl, v] = map[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{lbl}</Badge>;
          },
        },
      ]}
      emptyIcon={<Users className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
