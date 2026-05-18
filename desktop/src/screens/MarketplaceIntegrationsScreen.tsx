import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Plus, Trash2, Check, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Integration {
  id: string;
  provider: string;
  is_enabled: number;
  api_credentials_json: string | null;
}

const CATALOG = [
  { id: "talabat", name: "Talabat", region: "Egypt/UAE/KSA", category: "Food delivery", color: "bg-orange-500" },
  { id: "mrsool", name: "Mrsool", region: "KSA", category: "Delivery", color: "bg-emerald-500" },
  { id: "jahez", name: "Jahez", region: "KSA", category: "Food delivery", color: "bg-amber-500" },
  { id: "uber_eats", name: "Uber Eats", region: "Global", category: "Food delivery", color: "bg-black" },
  { id: "deliveroo", name: "Deliveroo", region: "Global", category: "Food delivery", color: "bg-cyan-500" },
  { id: "jumia", name: "Jumia", region: "Africa", category: "Marketplace", color: "bg-orange-600" },
  { id: "noon", name: "Noon", region: "MENA", category: "Marketplace", color: "bg-yellow-400" },
  { id: "amazon", name: "Amazon", region: "Global", category: "Marketplace", color: "bg-amber-700" },
  { id: "shopify", name: "Shopify", region: "Global", category: "E-commerce", color: "bg-green-600" },
  { id: "woocommerce", name: "WooCommerce", region: "Global", category: "E-commerce", color: "bg-purple-600" },
  { id: "salla", name: "Salla", region: "KSA", category: "E-commerce", color: "bg-rose-500" },
  { id: "zid", name: "Zid", region: "KSA", category: "E-commerce", color: "bg-indigo-500" },
];

export function MarketplaceIntegrationsScreen() {
  const { user } = useAuth();
  const [installed, setInstalled] = useState<Integration[]>([]);
  const [active, setActive] = useState<typeof CATALOG[0] | null>(null);
  const [creds, setCreds] = useState<string>("{}");

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(api().db.list<Integration>("marketplace_integrations", {
      tenantId: user.tenant_id, limit: 100,
    }));
    setInstalled(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const isInstalled = (id: string) => installed.find((x) => x.provider === id);

  const connect = async () => {
    if (!user || !active) return;
    try {
      JSON.parse(creds);
    } catch {
      toast.error("بيانات الـ API يجب أن تكون JSON صحيح");
      return;
    }
    try {
      await unwrap(api().db.insert("marketplace_integrations", {
        tenant_id: user.tenant_id,
        provider: active.id,
        api_credentials_json: creds,
        is_enabled: 1,
      }));
      toast.success(`تم ربط ${active.name}`);
      setActive(null);
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm("فك الربط؟")) return;
    await unwrap(api().db.remove("marketplace_integrations", id));
    refresh();
  };

  const LIVE_PROVIDERS = new Set(["salla", "shopify", "talabat"]);

  const syncNow = async (provider: string) => {
    if (!user) return;
    try {
      const res = await unwrap(
        api().marketplace.syncCatalog({ provider, tenantId: user.tenant_id })
      );
      if (res?.ok) toast.success(`تم رفع ${res.pushed || 0} منتج إلى ${provider}`);
      else toast.error(res?.error || "فشل التزامن");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Marketplace Integrations</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            استقبل طلبات من تطبيقات التوصيل والمتاجر العالمية مباشرة في نظامك. كل طلب يدخل تلقائيًا كطلب جديد.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {CATALOG.map((p) => {
          const inst = isInstalled(p.id);
          return (
            <Card key={p.id} className="overflow-hidden">
              <div className={`h-1 ${p.color}`} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.category} · {p.region}</p>
                  </div>
                  {inst && <Badge variant="success"><Check className="h-3 w-3 ml-1" /> مربوط</Badge>}
                </div>
                <div className="mt-4 flex gap-1">
                  {inst ? (
                    <>
                      {LIVE_PROVIDERS.has(p.id) && (
                        <Button size="sm" variant="outline" onClick={() => syncNow(p.id)} title="رفع منتجات النظام للمنصة">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => disconnect(inst.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> فك الربط
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="flex-1" onClick={() => { setActive(p); setCreds("{}"); }}>
                      <Plus className="h-3.5 w-3.5" /> ربط
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>ربط {active.name}</CardTitle>
            <CardDescription>أدخل بيانات الـ API من حسابك في {active.name}. تُحفظ مشفّرة AES-256-GCM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>API Credentials (JSON)</Label>
              <textarea
                dir="ltr"
                rows={5}
                value={creds}
                onChange={(e) => setCreds(e.target.value)}
                className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono mt-1.5"
                placeholder='{"api_key":"...","store_id":"..."}'
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={connect}>ربط</Button>
              <Button variant="ghost" onClick={() => setActive(null)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
