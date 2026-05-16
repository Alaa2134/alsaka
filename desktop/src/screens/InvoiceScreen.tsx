import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClassicLayout } from "@/components/pos/ClassicLayout";
import { GridLayout } from "@/components/pos/GridLayout";
import { RestaurantLayout } from "@/components/pos/RestaurantLayout";
import { QuickLayout } from "@/components/pos/QuickLayout";
import { DualLayout } from "@/components/pos/DualLayout";
import { Badge } from "@/components/ui/badge";
import {
  POS_LAYOUTS,
  type PosLayoutId,
  type PosLayoutProps,
  type PosProduct,
  type PosRow,
} from "@/components/pos/types";
import { buildInvoiceImage } from "@/components/invoice/InvoiceImageBuilder";

const newRowId = () =>
  globalThis.crypto?.randomUUID?.() ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const LAYOUTS: Record<PosLayoutId, (props: PosLayoutProps) => JSX.Element> = {
  classic: ClassicLayout,
  grid: GridLayout,
  restaurant: RestaurantLayout,
  quick: QuickLayout,
  dual: DualLayout,
};

export function InvoiceScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";

  const [layout, setLayout] = useState<PosLayoutId>("classic");
  const [rows, setRows] = useState<PosRow[]>([]);
  const [client, setClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [busy, setBusy] = useState(false);
  const lastSavedRef = useRef<any>(null);

  // Load preferred layout for this user
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const prefs = await unwrap(api().ui.getPrefs({ tenantId: user.tenant_id, userId: user.id }));
        if (prefs?.pos_layout) setLayout(prefs.pos_layout as PosLayoutId);
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  // Load reference data
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const [c, p, cat] = await Promise.all([
          unwrap(api().db.list<any>("clients", { tenantId, limit: 500 })),
          unwrap(api().db.list<any>("products", { tenantId, limit: 2000, where: { is_active: 1 } })),
          unwrap(api().db.list<any>("categories", { tenantId, limit: 200 })),
        ]);
        setClients(c ?? []);
        setProducts((p ?? []) as PosProduct[]);
        setCategories((cat ?? []).map((x: any) => ({ id: x.id, name: x.name })));
      } catch {
        /* ignore */
      }
    })();
  }, [tenantId]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce((s, r) => s + r.quantity * r.price, 0);
    const remaining = subtotal - discount - paid;
    return { subtotal, discount, paid, remaining };
  }, [rows, discount, paid]);

  // Multi-pricing: pick wholesale/vip when the client has that tier
  const resolvePrice = useCallback(
    (p: PosProduct): number => {
      const tier = (client?.pricing_tier as string) || "retail";
      if (tier === "wholesale" && p.wholesale_price != null) return Number(p.wholesale_price);
      if (tier === "vip" && p.vip_price != null) return Number(p.vip_price);
      return Number(p.price);
    },
    [client],
  );

  const onSave = useCallback(async () => {
    if (!user) return;
    const items = rows
      .filter((r) => r.product_name && r.quantity > 0)
      .map((r) => ({
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.quantity,
        price: r.price,
        total: r.quantity * r.price,
        commission_rate: null,
      }));
    if (items.length === 0) {
      toast.error("أضف منتجًا واحدًا على الأقل");
      return;
    }
    setBusy(true);
    try {
      const result = await unwrap(
        api().db.saveInvoice({
          invoice: {
            tenant_id: user.tenant_id,
            user_id: user.id,
            client_id: client?.id ?? null,
            type: "sales",
            discount,
            paid,
            status: "open",
            notes: null,
          },
          items,
        }),
      );
      lastSavedRef.current = { ...result, clientName: client?.name, clientPhone: client?.phone };
      toast.success(`تم حفظ الفاتورة #${(result.invoice as any).number ?? ""}`);
      setRows([]);
      setDiscount(0);
      setPaid(0);

      // Auto-send to WhatsApp if client has a phone
      if (client?.phone) {
        try {
          const wa = await unwrap(api().whatsapp.state());
          if (wa.state === "ready") {
            const dataUrl = await buildInvoiceImage({
              number: (result.invoice as any).number ?? "",
              date: new Date().toLocaleString("ar-EG"),
              clientName: client.name,
              clientPhone: client.phone,
              items: result.items.map((it: any) => ({
                product_name: it.product_name,
                quantity: it.quantity,
                price: it.price,
                total: it.total,
              })),
              subtotal: (result.invoice as any).total,
              discount: (result.invoice as any).discount,
              paid: (result.invoice as any).paid,
              remaining: (result.invoice as any).remaining,
            });
            await unwrap(api().whatsapp.sendImage({
              to: client.phone,
              dataUrl,
              caption: `فاتورة #${(result.invoice as any).number ?? ""}`,
            }));
            toast.success("تم الإرسال على واتساب ✓");
          }
        } catch {
          /* ignore — invoice is saved regardless */
        }
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  }, [user, rows, discount, paid, client]);

  const onPrint = () => window.electronAPI?.print().catch(() => undefined);
  const onClear = () => {
    setRows([]);
    setDiscount(0);
    setPaid(0);
  };
  const onHold = async () => {
    if (!user || rows.length === 0) return;
    try {
      await unwrap(api().db.insert("held_invoices", {
        tenant_id: user.tenant_id,
        user_id: user.id,
        label: client?.name || `معلقة ${new Date().toLocaleTimeString("ar-EG")}`,
        client_id: client?.id || null,
        data_json: JSON.stringify({ rows, discount, paid, client }),
      }));
      toast.success("تم تعليق الفاتورة — تقدر تستردها لاحقًا");
      onClear();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const changeLayout = async (next: PosLayoutId) => {
    setLayout(next);
    if (user) {
      try {
        await unwrap(api().ui.setPrefs({
          tenantId: user.tenant_id,
          userId: user.id,
          patch: { pos_layout: next },
        }));
      } catch {
        /* ignore */
      }
    }
  };

  const Layout = LAYOUTS[layout];

  return (
    <div className="space-y-3">
      <Card className="p-3 flex flex-wrap items-center gap-2 no-print">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground ml-2">شكل واجهة البيع:</span>
        {POS_LAYOUTS.map((meta) => (
          <button
            key={meta.id}
            onClick={() => changeLayout(meta.id)}
            className={`text-sm rounded-md px-3 py-1.5 transition-colors ${
              layout === meta.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground"
            }`}
            title={meta.description}
          >
            {meta.label}
          </button>
        ))}
        {client?.pricing_tier && client.pricing_tier !== "retail" && (
          <Badge variant="success" className="mr-auto">
            تسعيرة {client.pricing_tier === "wholesale" ? "جملة" : "VIP"}
          </Badge>
        )}
      </Card>

      <Layout
        rows={rows}
        setRows={setRows}
        clients={clients}
        client={client}
        setClient={setClient}
        products={products}
        categories={categories}
        totals={totals}
        discount={discount}
        setDiscount={setDiscount}
        paid={paid}
        setPaid={setPaid}
        onSave={onSave}
        onPrint={onPrint}
        onHold={onHold}
        onClear={onClear}
        resolvePrice={resolvePrice}
        busy={busy}
      />
    </div>
  );
}
