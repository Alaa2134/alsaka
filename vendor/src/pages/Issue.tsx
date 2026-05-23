import { useState } from "react";
import { toast } from "sonner";
import { Send, Copy, Download } from "lucide-react";
import { api } from "@/lib/api";

export function IssuePage() {
  const [form, setForm] = useState({
    tier: "PRO",
    days: 365,
    count: 1,
    customer_email: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });
  const [issued, setIssued] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.licenses.issue({
        tier: form.tier,
        days: Number(form.days) || 365,
        count: Math.max(1, Math.min(100, Number(form.count) || 1)),
        customer_email: form.customer_email || undefined,
        customer_name: form.customer_name || undefined,
        customer_phone: form.customer_phone || undefined,
        notes: form.notes || undefined,
      });
      setIssued(r.keys);
      toast.success(`تم إصدار ${r.keys.length} ترخيص`);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    navigator.clipboard.writeText(issued.join("\n")).then(() => toast.success("تم النسخ"));
  };
  const downloadCsv = () => {
    const csv = "key\n" + issued.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horus-keys-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold">إصدار تراخيص</h1>
        <p className="text-sm text-slate-500">ولّد كود (أو عدة أكواد دفعة واحدة) لعميل جديد.</p>
      </header>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-card p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">الباقة</label>
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
              className="input-field mt-1.5"
            >
              <option value="BASIC">BASIC</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">صلاحية بالأيام</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
              className="input-field mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">عدد المفاتيح</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
              min={1}
              max={100}
              className="input-field mt-1.5"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">اسم العميل (اختياري)</label>
            <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">بريد العميل</label>
            <input dir="ltr" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">هاتف العميل</label>
            <input dir="ltr" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input-field mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">ملاحظات</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field mt-1.5" />
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary">
          <Send className="h-4 w-4" /> {busy ? "..." : "إصدار"}
        </button>
      </form>

      {issued.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold">المفاتيح المُصدَرة ({issued.length})</h2>
            <div className="flex gap-2">
              <button onClick={copyAll} className="btn-outline"><Copy className="h-4 w-4" /> نسخ الكل</button>
              <button onClick={downloadCsv} className="btn-outline"><Download className="h-4 w-4" /> CSV</button>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1 max-h-72 overflow-y-auto">
            {issued.map((k) => <div key={k}>{k}</div>)}
          </div>
          <p className="text-xs text-slate-500">انسخ المفتاح للعميل. هيستخدمه من شاشة "الترخيص والتفعيل" في تطبيق Horus.</p>
        </div>
      )}
    </div>
  );
}
