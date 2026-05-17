import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { arDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: number;
  created_at: string;
}

export function NotificationsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Notification>("notifications", {
        tenantId: user.tenant_id,
        limit: 200,
        orderBy: "created_at DESC",
      }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const markRead = async (id: string) => {
    try {
      await unwrap(api().db.update("notifications", id, { is_read: 1 }));
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    try {
      await unwrap(api().db.remove("notifications", id));
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const markAll = async () => {
    try {
      await Promise.all(list.filter((n) => !n.is_read).map((n) => api().db.update("notifications", n.id, { is_read: 1 })));
      toast.success("تم تعليم كل الإشعارات كمقروءة");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const unread = list.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> الإشعارات</h2>
          <p className="text-sm text-muted-foreground">{list.length} إشعار · {unread} غير مقروء</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> تعليم الكل كمقروء
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <CardContent className="text-center py-12 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto opacity-50 mb-2" />
            لا توجد إشعارات.
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {list.map((n) => (
              <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-secondary/40 transition-colors">
                <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${n.is_read ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${n.is_read ? "text-muted-foreground" : ""}`}>{n.title}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{arDate(n.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="p-1 hover:bg-primary/10 rounded text-primary" title="تعليم كمقروء">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive" title="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
