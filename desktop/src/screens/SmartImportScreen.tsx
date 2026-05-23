import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Table,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DraftProduct {
  name: string;
  price: number;
  cost: number;
  barcode: string | null;
  unit: string | null;
  category: string | null;
  stock: number;
}

type FileKind = "pdf" | "image" | "text";

function kindOf(file: File): FileKind {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

export function SmartImportScreen() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);

  const readFile = (file: File): Promise<{ dataUrl?: string; text?: string; kind: FileKind }> =>
    new Promise((resolve, reject) => {
      const kind = kindOf(file);
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("تعذّر قراءة الملف"));
      if (kind === "text") {
        reader.onload = () => resolve({ text: String(reader.result || ""), kind });
        reader.readAsText(file);
      } else {
        reader.onload = () => resolve({ dataUrl: String(reader.result || ""), kind });
        reader.readAsDataURL(file);
      }
    });

  const onFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setDone(null);
    setDrafts([]);
    setFileName(file.name);
    const kind = kindOf(file);
    setFileKind(kind);
    setAnalyzing(true);
    try {
      const payload = await readFile(file);
      const res = await unwrap(
        api().smartImport.analyze({ tenantId: user.tenant_id, ...payload }),
      );
      if (!res.ok) {
        toast.error(res.error || "فشل التحليل");
        return;
      }
      if (!res.products || res.products.length === 0) {
        toast.error("مالقيتش منتجات في الملف — جرّب ملف أوضح");
        return;
      }
      setDrafts(res.products as DraftProduct[]);
      toast.success(`الـ AI لقى ${res.count} منتج — راجعهم وعدّل اللي محتاج`);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setAnalyzing(false);
    }
  };

  const patch = (i: number, field: keyof DraftProduct, value: string) => {
    setDrafts((prev) =>
      prev.map((d, idx) =>
        idx === i
          ? { ...d, [field]: field === "price" || field === "cost" || field === "stock" ? Number(value) || 0 : value }
          : d,
      ),
    );
  };

  const removeRow = (i: number) => setDrafts((prev) => prev.filter((_, idx) => idx !== i));

  const commit = async () => {
    if (!user || drafts.length === 0) return;
    setCommitting(true);
    try {
      const res = await unwrap(api().smartImport.commit({ tenantId: user.tenant_id, products: drafts }));
      if (res.ok) {
        setDone({ created: res.created || 0, skipped: res.skipped || 0 });
        setDrafts([]);
        toast.success(`تم إضافة ${res.created} منتج`);
      } else {
        toast.error(res.error || "فشلت الإضافة");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> استيراد ذكي للمنتجات
          </CardTitle>
          <CardDescription className="text-white/90">
            ارفع كتالوج المورّد (PDF)، صورة قائمة أسعار، أو ملف Excel/CSV — والذكاء الاصطناعي
            يقرأه ويستخرج المنتجات بأسعارها وباركودها تلقائيًا. راجعهم وأضفهم دفعة واحدة.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardContent className="p-6">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.txt,.tsv,image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="w-full border-2 border-dashed border-border rounded-xl p-10 hover:border-primary hover:bg-secondary/40 transition-colors flex flex-col items-center gap-3 disabled:opacity-60"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="font-medium">الـ AI بيقرأ الملف…</div>
                <div className="text-xs text-muted-foreground">{fileName}</div>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <div className="font-medium">اضغط لرفع ملف</div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF</span>
                  <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> صورة</span>
                  <span className="flex items-center gap-1"><Table className="h-3.5 w-3.5" /> CSV / Excel</span>
                </div>
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* Success summary */}
      {done && (
        <Card className="border-[hsl(var(--success))]">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
            <div>
              <div className="font-bold">تمت الإضافة بنجاح</div>
              <div className="text-sm text-muted-foreground">
                {done.created} منتج جديد
                {done.skipped > 0 && ` · ${done.skipped} تم تخطيهم (باركود مكرر)`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review table */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">مراجعة ({drafts.length} منتج)</CardTitle>
              <CardDescription>عدّل أي خانة قبل الإضافة. احذف اللي مش عايزه.</CardDescription>
            </div>
            <Button onClick={commit} disabled={committing}>
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              أضف الكل ({drafts.length})
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-right p-2 font-medium">اسم المنتج</th>
                  <th className="text-right p-2 font-medium w-28">سعر البيع</th>
                  <th className="text-right p-2 font-medium w-28">التكلفة</th>
                  <th className="text-right p-2 font-medium w-28">الكمية</th>
                  <th className="text-right p-2 font-medium w-40">باركود</th>
                  <th className="text-right p-2 font-medium w-32">تصنيف</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-1.5">
                      <Input value={d.name} onChange={(e) => patch(i, "name", e.target.value)} className="h-8" />
                    </td>
                    <td className="p-1.5">
                      <Input value={d.price} inputMode="decimal" onChange={(e) => patch(i, "price", e.target.value)} className="h-8 tabular-nums" />
                    </td>
                    <td className="p-1.5">
                      <Input value={d.cost} inputMode="decimal" onChange={(e) => patch(i, "cost", e.target.value)} className="h-8 tabular-nums" />
                    </td>
                    <td className="p-1.5">
                      <Input value={d.stock} inputMode="numeric" onChange={(e) => patch(i, "stock", e.target.value)} className="h-8 tabular-nums" />
                    </td>
                    <td className="p-1.5">
                      <Input dir="ltr" value={d.barcode || ""} onChange={(e) => patch(i, "barcode", e.target.value)} className="h-8 font-mono text-xs" />
                    </td>
                    <td className="p-1.5">
                      <Input value={d.category || ""} onChange={(e) => patch(i, "category", e.target.value)} className="h-8" />
                    </td>
                    <td className="p-1.5">
                      <button onClick={() => removeRow(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <p className="text-xs text-muted-foreground text-center">
        💡 يحتاج مفتاح Anthropic مهيّأ من شاشة "المساعد الذكي". كل ملف يُحلَّل مرة واحدة — راجع النتائج قبل الإضافة دائمًا.
      </p>
    </div>
  );
}
