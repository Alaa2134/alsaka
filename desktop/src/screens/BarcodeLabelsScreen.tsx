import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Barcode, Printer, Search, Plus, Minus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { barcodeSvg } from "@/lib/barcode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  item_number: string | null;
}
interface LabelJob { product: Product; qty: number; }

export function BarcodeLabelsScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<LabelJob[]>([]);
  const [company, setCompany] = useState<string>("");
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const rows = await unwrap(api().db.list<Product>("products", { tenantId: user.tenant_id, limit: 5000, where: { is_active: 1 } }));
        setProducts(rows || []);
      } catch { /* ignore */ }
      try {
        const cs = await unwrap(api().db.list<any>("company_settings", { tenantId: user.tenant_id, limit: 500 }));
        const nm = (cs || []).find((r: any) => r.key === "business_name");
        if (nm?.value) setCompany(nm.value);
      } catch { /* ignore */ }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (n ? products.filter((p) => p.name.toLowerCase().includes(n) || (p.barcode || "").includes(n) || (p.item_number || "").includes(n)) : products).slice(0, 50);
  }, [products, q]);

  const add = (p: Product) => {
    setJobs((prev) => {
      const ex = prev.find((j) => j.product.id === p.id);
      if (ex) return prev.map((j) => j === ex ? { ...j, qty: j.qty + 1 } : j);
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) => setJobs((prev) => prev.map((j) => j.product.id === id ? { ...j, qty: Math.max(1, qty) } : j));
  const removeJob = (id: string) => setJobs((prev) => prev.filter((j) => j.product.id !== id));

  const totalLabels = jobs.reduce((s, j) => s + j.qty, 0);

  // Build a print window with all labels and trigger the print dialog.
  const print = () => {
    if (jobs.length === 0) { toast.error("اختر منتجات أولًا"); return; }
    const cells: string[] = [];
    for (const j of jobs) {
      const code = j.product.barcode || j.product.item_number || j.product.id.slice(0, 12);
      const svg = barcodeSvg(code, { height: 40, moduleWidth: 1.4, showText: true });
      for (let i = 0; i < j.qty; i++) {
        cells.push(`
          <div class="label">
            ${company ? `<div class="shop">${esc(company)}</div>` : ""}
            ${showName ? `<div class="nm">${esc(j.product.name)}</div>` : ""}
            <div class="bc">${svg}</div>
            ${showPrice ? `<div class="pr">${money(j.product.price)}</div>` : ""}
          </div>`);
      }
    }
    const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>طباعة ملصقات</title>
      <style>
        @page { size: auto; margin: 6mm; }
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; margin: 0; }
        .sheet { display: flex; flex-wrap: wrap; gap: 3mm; }
        .label { width: 40mm; border: 1px dashed #bbb; padding: 2mm; text-align: center; page-break-inside: avoid; }
        .shop { font-size: 8px; color: #555; }
        .nm { font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bc svg { max-width: 100%; height: auto; }
        .pr { font-size: 12px; font-weight: 800; }
        @media print { .label { border-color: transparent; } }
      </style></head><body>
      <div class="sheet">${cells.join("")}</div>
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
    </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("تعذّر فتح نافذة الطباعة"); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-slate-700 to-slate-900 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" /> طباعة ملصقات الباركود</CardTitle>
          <CardDescription className="text-white/85">
            اختر المنتجات وعدد الملصقات لكل واحد، واطبع شيت ملصقات جاهز للصق على المنتجات أو الرفوف.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Product picker */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">المنتجات</CardTitle></CardHeader>
          <CardContent>
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج..." className="pr-9" />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-lg">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => add(p)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary text-sm text-right">
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 mr-2">{money(p.price)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected + options */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">الملصقات ({totalLabels})</CardTitle>
            <Button onClick={print} disabled={jobs.length === 0}><Printer className="h-4 w-4" /> طباعة</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> الاسم</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> السعر</label>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">اضغط على منتج لإضافته</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((j) => (
                  <div key={j.product.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{j.product.name}</span>
                    <button onClick={() => setQty(j.product.id, j.qty - 1)} className="h-7 w-7 rounded bg-secondary"><Minus className="h-3 w-3 m-auto" /></button>
                    <Input value={j.qty} onChange={(e) => setQty(j.product.id, Number(e.target.value) || 1)} className="w-14 h-7 text-center tabular-nums" />
                    <button onClick={() => setQty(j.product.id, j.qty + 1)} className="h-7 w-7 rounded bg-secondary"><Plus className="h-3 w-3 m-auto" /></button>
                    <button onClick={() => removeJob(j.product.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview of one label */}
            {jobs[0] && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">معاينة</div>
                <div className="inline-block border border-dashed border-border p-2 text-center bg-white text-black rounded">
                  {company && <div className="text-[8px] text-gray-500">{company}</div>}
                  {showName && <div className="text-[10px] font-semibold">{jobs[0].product.name}</div>}
                  <div dangerouslySetInnerHTML={{ __html: barcodeSvg(jobs[0].product.barcode || jobs[0].product.item_number || jobs[0].product.id.slice(0, 12), { height: 40, moduleWidth: 1.4 }) }} />
                  {showPrice && <div className="text-xs font-bold">{money(jobs[0].product.price)}</div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
