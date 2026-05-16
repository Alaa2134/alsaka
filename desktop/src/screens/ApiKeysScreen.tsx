import { Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

function generateKey(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return "sa_" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiKeysScreen() {
  return (
    <SimpleCRUDScreen
      title="مفتاح API"
      table="api_keys"
      description="مفاتيح REST API للتكامل مع أنظمة خارجية. السر بيتخزن hashed — احفظه قبل ما تخرج."
      defaults={{ is_active: 1 }}
      beforeInsert={(form) => {
        const key = generateKey();
        toast.message("احفظ المفتاح الآن — ما هيظهر تاني!", {
          description: key,
          duration: 30_000,
        });
        return { ...form, key_hash: key };
      }}
      fields={[
        { name: "name", label: "اسم المفتاح (للتمييز)", required: true },
        { name: "scopes", label: "الصلاحيات", type: "select", defaultValue: "read", options: [
          { value: "read", label: "قراءة فقط" },
          { value: "read,write", label: "قراءة وكتابة" },
          { value: "read,write,admin", label: "إدمن كامل" },
        ]},
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "scopes", label: "الصلاحيات", render: (r) => <code className="font-mono text-xs">{r.scopes}</code> },
        { field: "last_used_at", label: "آخر استخدام", render: (r) => r.last_used_at || "لم يستخدم" },
        { field: "is_active", label: "نشط", render: (r) => r.is_active ? "✓" : "—" },
      ]}
      emptyIcon={<Key className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
