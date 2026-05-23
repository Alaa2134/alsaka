import { Package } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function BundlesScreen() {
  return (
    <SimpleCRUDScreen
      title="عرض مجمّع (Bundle)"
      table="product_bundles"
      description="حزم منتجات بسعر خاص (كومبو) — مثلًا: 'ساندوتش + بطاطس + بيبسي'."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "name", label: "اسم العرض", required: true },
        { name: "bundle_price", label: "سعر العرض", type: "number", required: true },
        { name: "barcode", label: "باركود (اختياري)" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "bundle_price", label: "السعر", render: (r) => <span className="tabular-nums">{money(r.bundle_price)}</span> },
        { field: "barcode", label: "الباركود" },
      ]}
      emptyIcon={<Package className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
