import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, Sparkles, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Suggestion {
  name: string;
  description: string;
  category: string;
  price_suggestion: number;
  barcode_hint: string | null;
  confidence: "high" | "medium" | "low";
}

export function VisualCatalogScreen() {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const blob = item.getAsFile();
      if (blob) toBase64(blob).then(setImageUrl);
    }
  };

  const pickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) toBase64(f).then(setImageUrl);
  };

  const analyze = async () => {
    if (!user || !imageUrl) return;
    setBusy(true);
    setSuggestion(null);
    try {
      const r = await unwrap(api().ai.visionSuggest({ tenantId: user.tenant_id, imageDataUrl: imageUrl }));
      if (r.ok && r.suggestion) {
        setSuggestion(r.suggestion as Suggestion);
      } else {
        toast.error(r.error || "تعذر التحليل");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!user || !suggestion) return;
    try {
      await unwrap(api().db.insert("products", {
        tenant_id: user.tenant_id,
        name: suggestion.name,
        description: suggestion.description,
        price: suggestion.price_suggestion,
        barcode: suggestion.barcode_hint || null,
        stock: 0,
        min_stock: 0,
        image_url: imageUrl,
        is_active: 1,
      }));
      toast.success("تم إضافة المنتج ✓");
      setImageUrl(null);
      setSuggestion(null);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4" onPaste={onPaste}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> إضافة منتج بصورة (Visual Catalog)</CardTitle>
          <CardDescription>
            ارفع صورة منتج أو الصق Screenshot — Claude يقترح الاسم والوصف والتصنيف والسعر بناءً على كتالوجك.
            دوّس Ctrl+V للصق صورة من الـ clipboard مباشرة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

          {!imageUrl ? (
            <button
              onClick={pickFile}
              className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              <Camera className="h-10 w-10" />
              <span>اضغط لاختيار صورة، أو الصق صورة من الـ clipboard (Ctrl+V)</span>
            </button>
          ) : (
            <div className="relative">
              <img src={imageUrl} alt="" className="w-full max-h-96 object-contain rounded-lg bg-muted" />
              <button
                onClick={() => { setImageUrl(null); setSuggestion(null); }}
                className="absolute top-2 left-2 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={pickFile}><Upload className="h-4 w-4" /> رفع صورة</Button>
            <Button onClick={analyze} disabled={!imageUrl || busy} variant={imageUrl ? "default" : "outline"}>
              <Sparkles className="h-4 w-4" /> {busy ? "تحليل..." : "تحليل بالذكاء الاصطناعي"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestion && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Check className="h-5 w-5 text-[hsl(var(--success))]" /> اقتراح الذكاء الاصطناعي</CardTitle>
              <Badge variant={suggestion.confidence === "high" ? "success" : suggestion.confidence === "medium" ? "warning" : "muted"}>
                ثقة: {suggestion.confidence}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">الاسم</Label>
                <Input value={suggestion.name} onChange={(e) => setSuggestion({ ...suggestion, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">السعر المقترح</Label>
                <Input type="number" value={suggestion.price_suggestion} onChange={(e) => setSuggestion({ ...suggestion, price_suggestion: Number(e.target.value) })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">التصنيف</Label>
                <Input value={suggestion.category} onChange={(e) => setSuggestion({ ...suggestion, category: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">باركود (إن وُجد)</Label>
                <Input dir="ltr" value={suggestion.barcode_hint || ""} onChange={(e) => setSuggestion({ ...suggestion, barcode_hint: e.target.value })} className="mt-1.5 font-mono" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">الوصف</Label>
                <textarea
                  rows={2}
                  value={suggestion.description}
                  onChange={(e) => setSuggestion({ ...suggestion, description: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm mt-1.5"
                />
              </div>
            </div>
            <Button onClick={saveProduct} className="w-full">
              <Check className="h-4 w-4" /> حفظ كمنتج جديد
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
