import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const PRODUCT_TEMPLATE = `name,barcode,item_number,price,cost,stock,min_stock,expiry_date
"قهوة تركي 250 جم","6224000000017","COF-001",75,55,100,20,2026-12-31
"شاي ليبتون 200 ظرف","6224000000024","TEA-001",55,35,200,30,
"عسل أبيض 1 كجم","6224000000031","HNY-001",250,180,50,10,2027-06-30
`;
const CLIENT_TEMPLATE = `name,phone,email,address,credit_limit,balance
"محمد علي","201001234567","mohamed@example.com","القاهرة، مصر",5000,0
"شركة النور","201234567890","info@noor.eg","الإسكندرية",20000,0
`;

export function BulkImportScreen() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const upload = async (kind: "products" | "clients", file: File) => {
    if (!user) return;
    setBusy(true);
    setResult(null);
    try {
      const csv = await file.text();
      const fn = kind === "products" ? api().bulk.importProducts : api().bulk.importClients;
      const r = await unwrap(fn({ tenantId: user.tenant_id, csv, replaceExisting }));
      setResult({ kind, ...r });
      if (r.ok) {
        toast.success(`تم: ${r.created || 0} جديد · ${r.updated || 0} تحديث · ${r.failed || 0} خطأ`);
      } else {
        toast.error(r.error || "فشل الاستيراد");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = (kind: "products" | "clients") => {
    const text = kind === "products" ? PRODUCT_TEMPLATE : CLIENT_TEMPLATE;
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePick = (kind: "products" | "clients") => () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) upload(kind, file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> الاستيراد الجماعي (CSV / Excel)</CardTitle>
          <CardDescription>
            استورد آلاف المنتجات أو العملاء من ملف CSV/Excel في خطوة واحدة. حمّل القالب الافتراضي، عبّيه في Excel،
            احفظه بصيغة CSV ثم ارفعه.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
            تحديث السجلات الموجودة (طبقًا للباركود أو الهاتف)
          </label>

          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products">المنتجات</TabsTrigger>
              <TabsTrigger value="clients">العملاء</TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <div className="flex flex-wrap gap-2 mt-3">
                <Button onClick={handlePick("products")} disabled={busy}><Upload className="h-4 w-4" /> رفع ملف CSV</Button>
                <Button variant="outline" onClick={() => downloadTemplate("products")}><Download className="h-4 w-4" /> القالب</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                الأعمدة المتوقعة: <code className="font-mono">name, barcode, item_number, price, cost, stock, min_stock, expiry_date</code>
              </p>
            </TabsContent>

            <TabsContent value="clients">
              <div className="flex flex-wrap gap-2 mt-3">
                <Button onClick={handlePick("clients")} disabled={busy}><Upload className="h-4 w-4" /> رفع ملف CSV</Button>
                <Button variant="outline" onClick={() => downloadTemplate("clients")}><Download className="h-4 w-4" /> القالب</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                الأعمدة المتوقعة: <code className="font-mono">name, phone, email, address, credit_limit, balance</code>
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">نتيجة الاستيراد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> جديد: {result.created || 0}</Badge>
              <Badge variant="default">تحديث: {result.updated || 0}</Badge>
              {result.failed > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> أخطاء: {result.failed}</Badge>}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs space-y-1 max-h-64 overflow-y-auto">
                {result.errors.map((e: string, i: number) => (
                  <div key={i}>• {e}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
