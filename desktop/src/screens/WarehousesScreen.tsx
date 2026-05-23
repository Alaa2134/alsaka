import { Warehouse } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

export function WarehousesScreen() {
  return (
    <SimpleCRUDScreen
      title="مخزن"
      table="warehouses"
      description="المخازن بتفصل البضاعة على أكثر من موقع. كل منتج مرتبط بمخزن وكميته بتنقص من مخزنه عند البيع."
      fields={[
        { name: "name", label: "اسم المخزن", required: true },
        { name: "location", label: "الموقع / العنوان" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "location", label: "الموقع" },
      ]}
      emptyIcon={<Warehouse className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
