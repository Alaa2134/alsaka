import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Printer, Save, Trash2, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  AutoSuggestInput,
  type Suggestion,
  type AutoSuggestHandle,
} from "@/components/shared/AutoSuggestInput";
import { buildInvoiceImage } from "@/components/invoice/InvoiceImageBuilder";

interface ProductRow {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode: string;
  quantity: number;
  price: number;
}

interface ClientLite {
  id: string;
  name: string;
  phone: string | null;
}

interface SavedInvoiceSnapshot {
  invoice: any;
  items: any[];
  clientName: string;
  clientPhone: string | null;
}

const newRowId = () =>
  globalThis.crypto?.randomUUID?.() ?? `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blankRow = (): ProductRow => ({
  id: newRowId(),
  product_id: null,
  product_name: "",
  barcode: "",
  quantity: 1,
  price: 0,
});

export function InvoiceScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";

  const [rows, setRows] = useState<ProductRow[]>([blankRow()]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [productResults, setProductResults] = useState<Suggestion[]>([]);
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSaved, setLastSaved] = useState<SavedInvoiceSnapshot | null>(null);
  const [sendingWa, setSendingWa] = useState(false);

  const barcodeRef = useRef<AutoSuggestHandle | null>(null);

  // Load clients once
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const list = await unwrap(api().db.list<any>("clients", { tenantId, limit: 500 }));
        setClients((list ?? []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })));
      } catch {
        /* ignore */
      }
    })();
  }, [tenantId]);

  // Debounced product search for the barcode/name field
  useEffect(() => {
    if (!tenantId || !barcodeQuery.trim()) {
      setProductResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const list = await unwrap(
          api().db.searchProducts({ tenantId, query: barcodeQuery.trim(), limit: 8 }),
        );
        setProductResults(
          (list ?? []).map((p: any) => ({
            id: p.id,
            label: p.name,
            hint: `${p.barcode || p.item_number || ""} · ${money(p.price)} · المتاح ${p.stock}`,
            payload: p,
          })),
        );
      } catch {
        /* ignore */
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [barcodeQuery, tenantId]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce((s, r) => s + r.quantity * r.price, 0);
    const remaining = subtotal - discount - paid;
    return { subtotal, remaining };
  }, [rows, discount, paid]);

  const addProductSuggestion = useCallback((s: Suggestion) => {
    const p = s.payload as any;
    setRows((prev) => {
      // If the last row is blank, replace it; otherwise append.
      const isBlank = (r: ProductRow) =>
        !r.product_id && !r.product_name && !r.barcode;
      const lastBlank = prev.length > 0 && isBlank(prev[prev.length - 1]!);
      const newRow: ProductRow = {
        id: newRowId(),
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode || p.item_number || "",
        quantity: 1,
        price: Number(p.price) || 0,
      };
      const base = lastBlank ? prev.slice(0, -1) : prev;
      return [...base, newRow, blankRow()];
    });
    setBarcodeQuery("");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  }, []);

  const onEnter = useCallback(
    async (v: string) => {
      if (!v.trim() || !tenantId) return;
      // Try exact barcode lookup first
      try {
        const list = await unwrap(
          api().db.searchProducts({ tenantId, query: v.trim(), limit: 1 }),
        );
        if (list && list.length > 0) {
          const p = list[0] as any;
          addProductSuggestion({
            id: p.id,
            label: p.name,
            payload: p,
          });
          return;
        }
      } catch {
        /* ignore */
      }
      toast.error("لم يتم العثور على المنتج");
    },
    [addProductSuggestion, tenantId],
  );

  const updateRow = (id: string, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => {
    setRows((prev) => (prev.length === 1 ? [blankRow()] : prev.filter((r) => r.id !== id)));
  };

  const reset = useCallback(() => {
    setRows([blankRow()]);
    setDiscount(0);
    setPaid(0);
    setClientId(null);
    setClientName("");
    setBarcodeQuery("");
    setTimeout(() => barcodeRef.current?.focus(), 0);
  }, []);

  // Auto-save draft to localStorage every 30s while typing
  useEffect(() => {
    const interval = window.setInterval(() => {
      try {
        localStorage.setItem(
          "systemalaa.invoice-draft",
          JSON.stringify({ rows, discount, paid, clientId, clientName }),
        );
      } catch {
        /* ignore */
      }
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [rows, discount, paid, clientId, clientName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("systemalaa.invoice-draft");
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.rows?.length) setRows(draft.rows);
        if (draft.discount) setDiscount(draft.discount);
        if (draft.paid) setPaid(draft.paid);
        if (draft.clientId) setClientId(draft.clientId);
        if (draft.clientName) setClientName(draft.clientName);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
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
            client_id: clientId,
            type: "sales",
            discount,
            paid,
            status: "open",
            notes: null,
          },
          items,
        }),
      );
      const savedClient = clients.find((c) => c.id === clientId);
      const snapshot: SavedInvoiceSnapshot = {
        invoice: result.invoice,
        items: result.items,
        clientName: savedClient?.name || clientName,
        clientPhone: savedClient?.phone || null,
      };
      setLastSaved(snapshot);

      toast.success(`تم حفظ الفاتورة #${(result.invoice as any).number ?? (result.invoice as any).id.slice(0, 6)}`);
      try {
        await window.electronAPI?.notify({
          title: "تم الحفظ",
          body: `الإجمالي ${money(totals.subtotal)}`,
        });
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem("systemalaa.invoice-draft");
      } catch {
        /* ignore */
      }

      // If WhatsApp is connected AND the client has a phone, auto-send the
      // invoice image. Failure is non-fatal — the invoice itself is saved.
      if (snapshot.clientPhone) {
        sendInvoiceToWhatsApp(snapshot).catch(() => undefined);
      }

      reset();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const sendInvoiceToWhatsApp = useCallback(async (snapshot: SavedInvoiceSnapshot) => {
    if (!snapshot.clientPhone) {
      toast.error("لا يوجد رقم هاتف للعميل");
      return;
    }
    setSendingWa(true);
    try {
      const wa = await unwrap(api().whatsapp.state());
      if (wa.state !== "ready") {
        toast.error("واتساب غير متصل — اذهب لإعدادات واتساب");
        return;
      }
      const dataUrl = await buildInvoiceImage({
        number: snapshot.invoice.number ?? snapshot.invoice.id.slice(0, 6),
        date: new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(snapshot.invoice.created_at || Date.now())),
        clientName: snapshot.clientName,
        clientPhone: snapshot.clientPhone || undefined,
        items: snapshot.items.map((it: any) => ({
          product_name: it.product_name,
          quantity: it.quantity,
          price: it.price,
          total: it.total,
        })),
        subtotal: snapshot.invoice.total,
        discount: snapshot.invoice.discount,
        paid: snapshot.invoice.paid,
        remaining: snapshot.invoice.remaining,
      });
      await unwrap(
        api().whatsapp.sendImage({
          to: snapshot.clientPhone,
          dataUrl,
          caption: `فاتورة رقم ${snapshot.invoice.number ?? ""}\nالإجمالي: ${money(snapshot.invoice.total)}`,
          filename: `invoice-${snapshot.invoice.number || snapshot.invoice.id.slice(0, 6)}.png`,
        }),
      );
      toast.success("تم إرسال الفاتورة على واتساب ✓");
    } catch (err) {
      toast.error("تعذر إرسال الفاتورة على واتساب: " + String((err as Error).message || err));
    } finally {
      setSendingWa(false);
    }
  }, []);

  // Global keyboard shortcuts: F2 new row, F9 print, Ctrl+S save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setRows((prev) => [...prev, blankRow()]);
        setTimeout(() => barcodeRef.current?.focus(), 0);
      } else if (e.key === "F9") {
        e.preventDefault();
        window.electronAPI?.print().catch(() => undefined);
      } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const clientSuggestions: Suggestion[] = useMemo(
    () =>
      clients.map((c) => ({
        id: c.id,
        label: c.name,
        hint: c.phone || "",
        payload: c,
      })),
    [clients],
  );

  const isPaidInFull = totals.remaining <= 0 && totals.subtotal > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>العميل</Label>
            <AutoSuggestInput
              value={clientName}
              onChange={(v) => {
                setClientName(v);
                if (!v) setClientId(null);
              }}
              onPick={(s) => {
                setClientId(s.id);
                setClientName(s.label);
              }}
              suggestions={clientSuggestions}
              placeholder="اسم العميل أو الهاتف"
            />
          </div>
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input
              value={new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date())}
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label>نوع الفاتورة</Label>
            <Input value="مبيعات" readOnly />
          </div>
        </div>
      </Card>

      {/* Items table */}
      <Card className="p-0 overflow-hidden">
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="w-44">باركود</th>
              <th>اسم المنتج</th>
              <th className="w-24">الكمية</th>
              <th className="w-32">السعر</th>
              <th className="w-32">الإجمالي</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isLast = idx === rows.length - 1;
              return (
                <tr key={r.id}>
                  <td>
                    {isLast ? (
                      <AutoSuggestInput
                        ref={barcodeRef}
                        value={barcodeQuery}
                        onChange={setBarcodeQuery}
                        onPick={addProductSuggestion}
                        onEnter={onEnter}
                        suggestions={productResults}
                        placeholder="امسح أو اكتب باركود/اسم"
                        dataAttr="data-barcode-input"
                      />
                    ) : (
                      <input value={r.barcode} readOnly className="text-right" />
                    )}
                  </td>
                  <td>
                    <input
                      value={r.product_name}
                      onChange={(e) => updateRow(r.id, { product_name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={r.quantity}
                      onChange={(e) =>
                        updateRow(r.id, { quantity: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      value={r.price}
                      onChange={(e) => updateRow(r.id, { price: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="tabular-nums text-right pr-3">
                    {money(r.quantity * r.price)}
                  </td>
                  <td>
                    {!(isLast && !r.product_id) && (
                      <button
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        onClick={() => removeRow(r.id)}
                        aria-label="حذف الصف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-3 border-t border-border bg-card">
          <span className="text-xs text-muted-foreground">
            اضغط Enter في الباركود لإضافة منتج · F2 صف جديد · F9 طباعة · Ctrl+S حفظ
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRows((p) => [...p, blankRow()]);
              setTimeout(() => barcodeRef.current?.focus(), 0);
            }}
          >
            <Plus className="h-4 w-4" /> صف جديد
          </Button>
        </div>
      </Card>

      {/* Footer totals */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>إجمالي</Label>
            <Input value={money(totals.subtotal)} readOnly className="text-right tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>خصم</Label>
            <Input
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>المدفوع</Label>
            <Input
              inputMode="decimal"
              value={paid}
              onChange={(e) => setPaid(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>المتبقي</Label>
            <Input
              value={money(totals.remaining)}
              readOnly
              className={`text-right tabular-nums font-bold ${
                isPaidInFull
                  ? "text-[hsl(var(--success))]"
                  : totals.remaining > 0
                  ? "text-destructive"
                  : ""
              }`}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-row-reverse gap-2 flex-wrap">
          <Button onClick={() => save()} disabled={busy}>
            <Save className="h-4 w-4" /> حفظ (Ctrl+S)
          </Button>
          <Button variant="outline" onClick={() => window.electronAPI?.print().catch(() => undefined)}>
            <Printer className="h-4 w-4" /> طباعة (F9)
          </Button>
          {lastSaved && lastSaved.clientPhone && (
            <Button
              variant="success"
              onClick={() => sendInvoiceToWhatsApp(lastSaved)}
              disabled={sendingWa}
            >
              <Send className="h-4 w-4" /> إرسال آخر فاتورة على واتساب
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            تفريغ
          </Button>
        </div>
      </Card>
    </div>
  );
}
