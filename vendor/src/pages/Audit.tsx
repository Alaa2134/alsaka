import { useEffect, useState } from "react";
import { api, arDate } from "@/lib/api";

export function AuditPage() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.audit().then((r) => setList(r.data || [])).catch(() => undefined); }, []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">سجل الإدارة</h1>
        <p className="text-sm text-slate-500">كل عملية إصدار/إلغاء/نشر إصدار من لوحة التحكم.</p>
      </header>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الوقت</th>
              <th className="px-3 py-2.5 text-right">الإدمن</th>
              <th className="px-3 py-2.5 text-right">العملية</th>
              <th className="px-3 py-2.5 text-right">الهدف</th>
              <th className="px-3 py-2.5 text-right">IP</th>
              <th className="px-3 py-2.5 text-right">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">لا توجد سجلات.</td></tr>
            ) : list.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs">{arDate(r.at)}</td>
                <td className="px-3 py-2 text-xs" dir="ltr">{r.admin_email}</td>
                <td className="px-3 py-2"><code className="font-mono text-xs">{r.action}</code></td>
                <td className="px-3 py-2 font-mono text-xs">{r.target || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs" dir="ltr">{r.ip || "—"}</td>
                <td className="px-3 py-2 text-xs max-w-md truncate">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
