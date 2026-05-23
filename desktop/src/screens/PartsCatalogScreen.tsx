import { Cog } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

export function PartsCatalogScreen() {
  return (
    <SimpleCRUDScreen
      title="مرجع قطع غيار"
      table="parts_cross_ref"
      description="ربط أرقام قطع الغيار الأصلية (OEM) ببدائلها — Aftermarket، أو ماركات تانية. يبحث الميكانيكي بأي رقم."
      fields={[
        { name: "oem_part", label: "OEM Part Number", required: true },
        { name: "alt_part", label: "Alternative Part Number", required: true },
        { name: "manufacturer", label: "الصانع البديل" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "oem_part", label: "OEM", render: (r) => <code className="font-mono">{r.oem_part}</code> },
        { field: "alt_part", label: "البديل", render: (r) => <code className="font-mono">{r.alt_part}</code> },
        { field: "manufacturer", label: "الصانع" },
        { field: "notes", label: "ملاحظات" },
      ]}
      emptyIcon={<Cog className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
