import { useState } from "react";
import { useParams } from "react-router-dom";
import { Search, CheckCircle2, Clock } from "lucide-react";
import { trackOrder } from "@/lib/api";
import { normalizePhone } from "@/lib/utils";

export function TrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotFound(false);
    try {
      const r = await trackOrder({ slug: slug || "", orderNumber, phone: normalizePhone(phone) });
      if (!r) setNotFound(true);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">تتبع الطلب</h1>
      <p className="text-muted-foreground mb-6">أدخل رقم الطلب ورقم الهاتف لمعرفة حالة طلبك.</p>

      <form onSubmit={search} className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">رقم الطلب</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
            className="input-field mt-1.5 tabular-nums"
          />
        </div>
        <div>
          <label className="text-sm font-medium">رقم الهاتف</label>
          <input
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="input-field mt-1.5"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          <Search className="h-4 w-4" /> {busy ? "..." : "بحث"}
        </button>
      </form>

      {notFound && (
        <p className="mt-6 text-center text-destructive">لم نعثر على طلب بهذه البيانات.</p>
      )}

      {result && (
        <div className="bg-card border border-border rounded-lg p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-muted-foreground">رقم الطلب</div>
              <div className="font-bold text-lg tabular-nums">#{result.order_number}</div>
            </div>
            <div className="text-left">
              <div className="text-sm text-muted-foreground">الحالة الحالية</div>
              <div className="font-bold text-lg text-primary">{result.status}</div>
            </div>
          </div>
          <ol className="space-y-2 mt-4">
            {(result.history || []).map((h: any, i: number) => (
              <li key={i} className="flex gap-3 items-start text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-1" />
                <div>
                  <div className="font-medium">{h.status}</div>
                  <div className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline" /> {h.changed_at}
                  </div>
                  {h.note && <div className="text-xs">{h.note}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
