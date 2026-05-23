import { Plug } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";

export function PluginsScreen() {
  return (
    <SimpleCRUDScreen
      title="إضافة (Plugin)"
      table="plugins"
      description="نظام Plugins للتكامل مع مطورين خارجيين. كل إضافة عبارة عن JSON manifest يحدد الوظائف والصلاحيات."
      fields={[
        { name: "name", label: "اسم الإضافة", required: true },
        { name: "vendor", label: "المطوّر" },
        { name: "version", label: "الإصدار" },
        { name: "manifest_url", label: "رابط الـ Manifest (JSON)" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "vendor", label: "المطور" },
        { field: "version", label: "الإصدار", render: (r) => <code className="font-mono text-xs">{r.version || "—"}</code> },
        { field: "is_enabled", label: "الحالة", render: (r) => r.is_enabled ? <Badge variant="success">مفعّل</Badge> : <Badge variant="muted">معطل</Badge> },
      ]}
      emptyIcon={<Plug className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
