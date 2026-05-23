import { Tag } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function ProductVariantsScreen() {
  return (
    <SimpleCRUDScreen
      title="متغيّر منتج"
      table="product_variants"
      description="مقاسات وألوان وأشكال مختلفة للمنتج الواحد (مثلًا: قميص أحمر مقاس L). كل متغيّر له باركود وسعر ومخزون مستقل."
      defaults={{ is_active: 1, attributes_json: "{}" }}
      fields={[
        { name: "product_id", label: "Product ID (من شاشة المنتجات)", required: true },
        { name: "name", label: "اسم المتغير (أحمر - L)", required: true },
        { name: "sku", label: "كود SKU" },
        { name: "barcode", label: "الباركود" },
        { name: "price", label: "سعر خاص (اختياري)", type: "number" },
        { name: "stock", label: "الكمية", type: "number", defaultValue: "0" },
      ]}
      columns={[
        { field: "name", label: "المتغير" },
        { field: "sku", label: "SKU" },
        { field: "barcode", label: "الباركود" },
        { field: "price", label: "السعر", render: (r) => <span className="tabular-nums">{r.price != null ? money(r.price) : "—"}</span> },
        { field: "stock", label: "المخزون", render: (r) => <span className="tabular-nums">{r.stock}</span> },
      ]}
      emptyIcon={<Tag className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
