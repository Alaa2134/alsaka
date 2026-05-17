import { useEffect, useState } from "react";
import { api, arDate } from "@/lib/api";
import { Bell } from "lucide-react";

export function NotificationsPage() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    api.notifications().then((r) => setList(r.data || [])).catch(() => undefined);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Bell className="h-7 w-7" /> الإشعارات</h1>
        <p className="text-sm text-slate-500">{list.length} إشعار</p>
      </header>

      <div className="bg-white rounded-xl shadow-card divide-y divide-slate-100">
        {list.length === 0 ? (
          <p className="text-center text-slate-500 py-12">لا توجد إشعارات.</p>
        ) : (
          list.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${n.is_read ? "bg-slate-100 text-slate-400" : "bg-primary text-white"}`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{n.title}</div>
                <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-slate-400 mt-1">{arDate(n.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
