import { Webhook } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

function randomSecret(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function WebhooksScreen() {
  return (
    <SimpleCRUDScreen
      title="Webhook"
      table="webhooks"
      description="استقبل أحداث النظام (فاتورة جديدة، طلب متجر، انخفاض مخزون...) على endpoint بتاعك. كل request بيتوقع بـ HMAC SHA-256 باستخدام السر."
      defaults={{ is_active: 1 }}
      beforeInsert={(form) => ({ ...form, secret: form.secret || randomSecret() })}
      fields={[
        { name: "url", label: "URL الخاص بك", required: true },
        { name: "events", label: "الأحداث (مفصولة بفاصلة)", required: true, defaultValue: "invoice.created,order.created,stock.low" },
        { name: "secret", label: "السر (اتركه فارغ للتوليد)" },
      ]}
      columns={[
        { field: "url", label: "URL", render: (r) => <code className="font-mono text-xs">{r.url}</code> },
        { field: "events", label: "الأحداث", render: (r) => <span className="text-xs">{r.events}</span> },
        { field: "is_active", label: "نشط", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      emptyIcon={<Webhook className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
