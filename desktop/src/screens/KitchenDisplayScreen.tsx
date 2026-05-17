import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, ChefHat, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KOTItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  kot_status: "new" | "sent" | "preparing" | "ready" | "served" | "cancelled";
  sent_to_kitchen_at: string | null;
  created_at: string;
}

const COL_DEF: Array<{ status: KOTItem["kot_status"]; label: string; color: string }> = [
  { status: "sent", label: "🆕 طلبات جديدة", color: "from-warning/30 to-warning/5" },
  { status: "preparing", label: "👨‍🍳 جاري التجهيز", color: "from-primary/30 to-primary/5" },
  { status: "ready", label: "✅ جاهز للتقديم", color: "from-success/30 to-success/5" },
];

export function KitchenDisplayScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<KOTItem[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await unwrap(api().db.list<KOTItem>("restaurant_order_items", {
        tenantId: user.tenant_id,
        limit: 200,
        orderBy: "created_at ASC",
      }));
      // Server returns ALL items; the kitchen screen only cares about the
      // ones already sent and not yet served.
      setItems((data ?? []).filter((i) => ["sent", "preparing", "ready"].includes(i.kot_status)));
    } catch (err) {
      console.warn(err);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const t1 = setInterval(refresh, 30_000);  // poll every 30s
    const t2 = setInterval(() => setTick((x) => x + 1), 30_000); // re-render timers
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh]);

  const move = async (item: KOTItem, next: KOTItem["kot_status"]) => {
    try {
      await unwrap(api().db.update("restaurant_order_items", item.id, { kot_status: next }));
      toast.success(`تم النقل: ${item.product_name}`);
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const minutesAgo = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / 60_000));
  };

  return (
    <div className="space-y-3 h-[calc(100vh-8rem)]">
      <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            <div>
              <h2 className="font-bold text-lg">شاشة المطبخ (Kitchen Display)</h2>
              <p className="text-sm opacity-90">{items.length} صنف نشط · تحديث تلقائي كل 30 ثانية</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0" style={{ height: "calc(100% - 6rem)" }}>
        {COL_DEF.map((col) => {
          const colItems = items.filter((i) => i.kot_status === col.status);
          return (
            <Card key={col.status} className="flex flex-col overflow-hidden">
              <CardHeader className={`bg-gradient-to-b ${col.color} border-b`}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{col.label}</span>
                  <Badge variant="muted">{colItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                {colItems.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">— فارغ —</p>
                ) : (
                  colItems.map((item) => {
                    const age = minutesAgo(item.sent_to_kitchen_at || item.created_at);
                    const isOld = age > 10;
                    return (
                      <Card key={item.id} className={`p-3 ${isOld ? "ring-2 ring-destructive" : ""}`}>
                        <div className="flex items-start justify-between">
                          <div className="font-semibold">{item.product_name} × {item.quantity}</div>
                          <Badge variant={isOld ? "destructive" : "muted"} className="text-xs gap-1">
                            <Clock className="h-3 w-3" /> {age} د
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">📝 {item.notes}</p>
                        )}
                        {isOld && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> تأخر — يحتاج اهتمام
                          </p>
                        )}
                        <div className="flex gap-1 mt-2">
                          {col.status === "sent" && (
                            <Button size="sm" className="flex-1" onClick={() => move(item, "preparing")}>
                              بدء التجهيز
                            </Button>
                          )}
                          {col.status === "preparing" && (
                            <Button size="sm" variant="success" className="flex-1" onClick={() => move(item, "ready")}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> جاهز
                            </Button>
                          )}
                          {col.status === "ready" && (
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => move(item, "served")}>
                              تم التقديم
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
