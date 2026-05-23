import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Save, RotateCcw, Palette } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type BlockType =
  | "header"
  | "company"
  | "client"
  | "items"
  | "totals"
  | "qr"
  | "footer"
  | "barcode"
  | "signature";

interface Block {
  id: string;
  type: BlockType;
  visible: boolean;
}

interface Template {
  version: 1;
  paper: "A4" | "A5" | "thermal80" | "thermal58";
  primaryColor: string;     // hsl tuple "221 83% 53%"
  accentColor: string;
  fontFamily: string;       // Cairo (default)
  baseFontSize: number;     // 12..16
  showLogo: boolean;
  showStripes: boolean;
  showQr: boolean;
  showSignature: boolean;
  header: { title: string; subtitle: string };
  footer: { text: string };
  blocks: Block[];
}

const DEFAULT: Template = {
  version: 1,
  paper: "A4",
  primaryColor: "221 83% 53%",
  accentColor: "262 83% 58%",
  fontFamily: "Cairo",
  baseFontSize: 13,
  showLogo: true,
  showStripes: true,
  showQr: false,
  showSignature: true,
  header: { title: "فاتورة مبيعات", subtitle: "" },
  footer: { text: "شكرًا لتعاملكم معنا" },
  blocks: [
    { id: "h-1", type: "header", visible: true },
    { id: "c-1", type: "company", visible: true },
    { id: "k-1", type: "client", visible: true },
    { id: "i-1", type: "items", visible: true },
    { id: "t-1", type: "totals", visible: true },
    { id: "q-1", type: "qr", visible: false },
    { id: "s-1", type: "signature", visible: true },
    { id: "f-1", type: "footer", visible: true },
  ],
};

const BLOCK_LABEL: Record<BlockType, string> = {
  header: "ترويسة الفاتورة",
  company: "بيانات الشركة",
  client: "بيانات العميل",
  items: "جدول الأصناف",
  totals: "الإجماليات",
  qr: "كود QR (فاتورة إلكترونية)",
  footer: "تذييل",
  barcode: "باركود الفاتورة",
  signature: "خانة التوقيع",
};

const PRESETS: Array<{ id: string; label: string; primary: string; accent: string }> = [
  { id: "blue",    label: "أزرق كلاسيك",   primary: "221 83% 53%", accent: "262 83% 58%" },
  { id: "emerald", label: "زمرّدي",         primary: "142 76% 36%", accent: "199 89% 48%" },
  { id: "amber",   label: "كهرماني",        primary: "38 92% 50%",  accent: "0 84% 60%" },
  { id: "rose",    label: "وردي",          primary: "330 81% 60%", accent: "262 83% 58%" },
  { id: "slate",   label: "رمادي",          primary: "220 9% 30%",  accent: "220 9% 50%" },
  { id: "navy",    label: "كحلي",           primary: "221 83% 23%", accent: "199 89% 48%" },
];

export function InvoiceDesignerScreen() {
  const { user } = useAuth();
  const [tpl, setTpl] = useState<Template>(DEFAULT);
  const [busy, setBusy] = useState(false);

  // Load saved template
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const prefs = await unwrap(api().ui.getPrefs({ tenantId: user.tenant_id, userId: user.id }));
        if (prefs?.invoice_template_json) {
          try {
            setTpl({ ...DEFAULT, ...JSON.parse(prefs.invoice_template_json) });
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();
  }, [user]);

  const move = (id: string, dir: -1 | 1) => {
    setTpl((t) => {
      const idx = t.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return t;
      const next = [...t.blocks];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return t;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...t, blocks: next };
    });
  };
  const toggleBlock = (id: string) => {
    setTpl((t) => ({
      ...t,
      blocks: t.blocks.map((b) => b.id === id ? { ...b, visible: !b.visible } : b),
    }));
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await unwrap(api().ui.setPrefs({
        tenantId: user.tenant_id,
        userId: user.id,
        patch: { invoice_template_json: JSON.stringify(tpl) },
      }));
      toast.success("تم حفظ التصميم ✓");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (!confirm("هل تريد إرجاع التصميم للوضع الافتراضي؟")) return;
    setTpl(DEFAULT);
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "320px 1fr" }}>
      {/* Tools panel */}
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" /> الألوان والثيم
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">ثيم سريع</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTpl((t) => ({ ...t, primaryColor: p.primary, accentColor: p.accent }))}
                    className="rounded-md border border-border text-[10px] py-1.5 px-1 hover:border-foreground transition-colors"
                    title={p.label}
                  >
                    <div className="flex justify-center gap-0.5 mb-1">
                      <span className="h-3 w-3 rounded" style={{ background: `hsl(${p.primary})` }} />
                      <span className="h-3 w-3 rounded" style={{ background: `hsl(${p.accent})` }} />
                    </div>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">حجم الورق</Label>
              <select
                value={tpl.paper}
                onChange={(e) => setTpl((t) => ({ ...t, paper: e.target.value as Template["paper"] }))}
                className="input-field mt-1.5 flex h-9 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm"
              >
                <option value="A4">A4 — كامل</option>
                <option value="A5">A5 — نصف</option>
                <option value="thermal80">حراري 80 مم</option>
                <option value="thermal58">حراري 58 مم</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">حجم الخط ({tpl.baseFontSize}px)</Label>
              <input
                type="range"
                min={10}
                max={18}
                value={tpl.baseFontSize}
                onChange={(e) => setTpl((t) => ({ ...t, baseFontSize: Number(e.target.value) }))}
                className="w-full mt-1.5"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Toggle label="شعار" value={tpl.showLogo} onChange={(v) => setTpl((t) => ({ ...t, showLogo: v }))} />
              <Toggle label="خطوط" value={tpl.showStripes} onChange={(v) => setTpl((t) => ({ ...t, showStripes: v }))} />
              <Toggle label="QR" value={tpl.showQr} onChange={(v) => setTpl((t) => ({ ...t, showQr: v }))} />
              <Toggle label="توقيع" value={tpl.showSignature} onChange={(v) => setTpl((t) => ({ ...t, showSignature: v }))} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">العناوين</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">العنوان الرئيسي</Label>
              <Input value={tpl.header.title} onChange={(e) => setTpl((t) => ({ ...t, header: { ...t.header, title: e.target.value } }))} className="mt-1.5 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">سطر إضافي</Label>
              <Input value={tpl.header.subtitle} onChange={(e) => setTpl((t) => ({ ...t, header: { ...t.header, subtitle: e.target.value } }))} className="mt-1.5 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">تذييل</Label>
              <Input value={tpl.footer.text} onChange={(e) => setTpl((t) => ({ ...t, footer: { text: e.target.value } }))} className="mt-1.5 h-9 text-sm" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">ترتيب الأقسام (اسحب لأعلى/أسفل)</h3>
          <div className="space-y-1">
            {tpl.blocks.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="flex flex-col">
                  <button onClick={() => move(b.id, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-30 hover:bg-secondary rounded"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => move(b.id, 1)} disabled={i === tpl.blocks.length - 1} className="p-0.5 disabled:opacity-30 hover:bg-secondary rounded"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <div className="flex-1 text-sm">{BLOCK_LABEL[b.type]}</div>
                <button onClick={() => toggleBlock(b.id)} className="p-1 hover:bg-secondary rounded" title={b.visible ? "إخفاء" : "إظهار"}>
                  {b.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1"><Save className="h-4 w-4" /> حفظ</Button>
          <Button onClick={reset} variant="outline"><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Live preview */}
      <Card className="p-6 overflow-auto bg-muted/30">
        <Badge variant="muted" className="mb-3">معاينة حية — {tpl.paper}</Badge>
        <InvoicePreview tpl={tpl} />
      </Card>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`rounded-md px-2.5 py-1 ${value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
    >
      {label}
    </button>
  );
}

function InvoicePreview({ tpl }: { tpl: Template }) {
  const widthClass =
    tpl.paper === "thermal80" ? "w-[320px]" :
    tpl.paper === "thermal58" ? "w-[240px]" :
    tpl.paper === "A5" ? "w-[400px]" : "w-[640px]";

  const items = [
    { name: "منتج تجريبي 1", qty: 2, price: 150 },
    { name: "منتج تجريبي 2", qty: 1, price: 350 },
    { name: "منتج تجريبي 3", qty: 3, price: 80 },
  ];
  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const discount = 50;
  const paid = subtotal - discount;

  const render = (b: Block) => {
    if (!b.visible) return null;
    switch (b.type) {
      case "header":
        return (
          <div className="text-center pb-3 mb-3" style={{ borderBottom: tpl.showStripes ? `3px solid hsl(${tpl.primaryColor})` : undefined }}>
            <div className="font-bold text-xl" style={{ color: `hsl(${tpl.primaryColor})` }}>{tpl.header.title}</div>
            {tpl.header.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{tpl.header.subtitle}</div>}
          </div>
        );
      case "company":
        return (
          <div className="flex items-start justify-between mb-4">
            <div>
              {tpl.showLogo && (
                <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-2" style={{ background: `linear-gradient(135deg, hsl(${tpl.primaryColor}), hsl(${tpl.accentColor}))` }}>
                  S
                </div>
              )}
              <div className="font-bold">شركتي للتجارة</div>
              <div className="text-xs text-muted-foreground">القاهرة، مصر</div>
              <div className="text-xs text-muted-foreground" dir="ltr">+201234567890</div>
            </div>
            <div className="text-left text-xs">
              <div>رقم: <span className="font-bold text-base">#1024</span></div>
              <div className="text-muted-foreground">{new Date().toLocaleDateString("ar-EG-u-nu-latn")}</div>
            </div>
          </div>
        );
      case "client":
        return (
          <div className="rounded-md p-2 mb-3" style={{ background: `hsl(${tpl.primaryColor} / 0.08)` }}>
            <div className="text-xs text-muted-foreground">العميل</div>
            <div className="font-semibold">عميل تجريبي</div>
            <div className="text-xs text-muted-foreground" dir="ltr">+201234567891</div>
          </div>
        );
      case "items":
        return (
          <table className="w-full text-sm mb-3" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `hsl(${tpl.primaryColor})`, color: "white" }}>
                <th className="p-2 text-right">المنتج</th>
                <th className="p-2 w-16 text-center">الكمية</th>
                <th className="p-2 w-20 text-left">السعر</th>
                <th className="p-2 w-24 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ background: i % 2 ? "#f8fafc" : "white" }}>
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-center">{it.qty}</td>
                  <td className="p-2 text-left tabular-nums">{money(it.price)}</td>
                  <td className="p-2 text-left tabular-nums font-semibold">{money(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "totals":
        return (
          <div className="flex justify-end mb-3">
            <table className="text-sm" style={{ minWidth: "240px" }}>
              <tbody>
                <tr><td className="px-2 py-1 text-muted-foreground">الإجمالي</td><td className="px-2 py-1 text-left tabular-nums">{money(subtotal)}</td></tr>
                <tr><td className="px-2 py-1 text-muted-foreground">خصم</td><td className="px-2 py-1 text-left tabular-nums">{money(discount)}</td></tr>
                <tr><td className="px-2 py-1 text-muted-foreground">المدفوع</td><td className="px-2 py-1 text-left tabular-nums">{money(paid)}</td></tr>
                <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                  <td className="px-2 py-1.5 font-bold">المتبقي</td>
                  <td className="px-2 py-1.5 text-left tabular-nums font-bold" style={{ color: "#16a34a" }}>{money(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case "qr":
        return tpl.showQr ? (
          <div className="flex justify-center my-4">
            <div className="h-24 w-24 bg-foreground/10 grid place-items-center text-xs text-muted-foreground">QR</div>
          </div>
        ) : null;
      case "signature":
        return tpl.showSignature ? (
          <div className="flex justify-between mt-8 pt-4 text-xs">
            <div className="text-center">
              <div className="border-b border-border w-32 pb-1 mb-1">&nbsp;</div>
              <div className="text-muted-foreground">المحاسب</div>
            </div>
            <div className="text-center">
              <div className="border-b border-border w-32 pb-1 mb-1">&nbsp;</div>
              <div className="text-muted-foreground">العميل</div>
            </div>
          </div>
        ) : null;
      case "footer":
        return (
          <div className="text-center text-xs mt-4 pt-3" style={{ borderTop: tpl.showStripes ? `2px solid hsl(${tpl.primaryColor})` : undefined, color: "#94a3b8" }}>
            {tpl.footer.text}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`${widthClass} mx-auto bg-white text-slate-900 shadow-elevated rounded-md p-6`}
      style={{ fontSize: `${tpl.baseFontSize}px`, fontFamily: tpl.fontFamily }}
      dir="rtl"
    >
      {tpl.blocks.map((b) => <div key={b.id}>{render(b)}</div>)}
    </div>
  );
}
