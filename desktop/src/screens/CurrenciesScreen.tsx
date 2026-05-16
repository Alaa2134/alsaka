import { Coins } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

export function CurrenciesScreen() {
  return (
    <SimpleCRUDScreen
      title="عملة"
      table="currencies"
      description="عرّف العملات وأسعار الصرف. العملة الأساسية: rate = 1."
      defaults={{ is_base: 0 }}
      fields={[
        { name: "code", label: "الكود (USD, EGP...)", required: true },
        { name: "name", label: "الاسم", required: true },
        { name: "symbol", label: "الرمز ($, €, ج.م...)", required: true },
        { name: "rate", label: "سعر مقابل العملة الأساسية", type: "number", required: true, defaultValue: "1" },
      ]}
      columns={[
        { field: "code", label: "الكود", render: (r) => <code className="font-mono">{r.code}</code> },
        { field: "name", label: "الاسم" },
        { field: "symbol", label: "الرمز" },
        { field: "rate", label: "السعر", render: (r) => <span className="tabular-nums">{Number(r.rate).toFixed(4)}</span> },
      ]}
      emptyIcon={<Coins className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
