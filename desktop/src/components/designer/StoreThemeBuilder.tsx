import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Palette, Eye, Monitor, Smartphone, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Theme {
  layout: "hero-big" | "hero-side" | "minimal" | "boutique";
  primary: string;
  accent: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta: string;
  show_featured: boolean;
  show_categories: boolean;
  show_testimonials: boolean;
  product_card_style: "card" | "minimal" | "shadow";
  cta_style: "rounded" | "pill" | "square";
  bg_pattern: "none" | "dots" | "grid";
}

const DEFAULT: Theme = {
  layout: "hero-big",
  primary: "221 83% 53%",
  accent: "262 83% 58%",
  hero_title: "أحدث المنتجات بأفضل الأسعار",
  hero_subtitle: "توصيل سريع لكل المحافظات · ضمان الجودة · دفع آمن",
  hero_cta: "تسوّق الآن",
  show_featured: true,
  show_categories: true,
  show_testimonials: false,
  product_card_style: "card",
  cta_style: "rounded",
  bg_pattern: "none",
};

const PALETTES = [
  { id: "classic-blue", primary: "221 83% 53%", accent: "262 83% 58%", label: "أزرق كلاسيك" },
  { id: "emerald", primary: "142 76% 36%", accent: "199 89% 48%", label: "زمرّدي" },
  { id: "amber", primary: "38 92% 50%", accent: "0 84% 60%", label: "كهرماني" },
  { id: "rose", primary: "330 81% 60%", accent: "262 83% 58%", label: "وردي" },
  { id: "dark", primary: "0 0% 12%", accent: "0 84% 60%", label: "أسود راقي" },
  { id: "navy", primary: "221 83% 23%", accent: "199 89% 48%", label: "كحلي" },
];

export function StoreThemeBuilderScreen() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(DEFAULT);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const prefs = await unwrap(api().ui.getPrefs({ tenantId: user.tenant_id, userId: user.id }));
        if (prefs?.store_theme_json) {
          try { setTheme({ ...DEFAULT, ...JSON.parse(prefs.store_theme_json) }); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      // Save to ui_preferences for the designer state
      await unwrap(api().ui.setPrefs({
        tenantId: user.tenant_id,
        userId: user.id,
        patch: { store_theme_json: JSON.stringify(theme) },
      }));
      // Also apply primary/accent to the live store settings
      await unwrap(api().store.updateSettings({
        tenantId: user.tenant_id,
        patch: { primary_color: theme.primary, accent_color: theme.accent },
      }));
      toast.success("تم حفظ التصميم ✓ — جدّد المتجر لرؤية اللون الجديد");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (confirm("إرجاع التصميم للوضع الافتراضي؟")) setTheme(DEFAULT);
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "340px 1fr" }}>
      {/* Controls */}
      <div className="space-y-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> الثيم</h3>
          <Tabs defaultValue="palette">
            <TabsList className="w-full">
              <TabsTrigger value="palette" className="flex-1">ألوان</TabsTrigger>
              <TabsTrigger value="layout" className="flex-1">تخطيط</TabsTrigger>
              <TabsTrigger value="content" className="flex-1">محتوى</TabsTrigger>
            </TabsList>

            <TabsContent value="palette">
              <div className="grid grid-cols-2 gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTheme((t) => ({ ...t, primary: p.primary, accent: p.accent }))}
                    className={`p-3 rounded-md border text-right ${theme.primary === p.primary ? "border-foreground" : "border-border"}`}
                  >
                    <div className="flex gap-1 mb-1">
                      <span className="h-4 w-4 rounded" style={{ background: `hsl(${p.primary})` }} />
                      <span className="h-4 w-4 rounded" style={{ background: `hsl(${p.accent})` }} />
                    </div>
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-3">
              <div>
                <Label className="text-xs">تخطيط الواجهة</Label>
                <select value={theme.layout} onChange={(e) => setTheme((t) => ({ ...t, layout: e.target.value as Theme["layout"] }))} className="input-field mt-1.5 flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm">
                  <option value="hero-big">Hero كبير (افتراضي)</option>
                  <option value="hero-side">Hero جانبي + صورة</option>
                  <option value="minimal">بسيط (بدون hero)</option>
                  <option value="boutique">بوتيك (شبكة منتجات بارزة)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">شكل بطاقات المنتج</Label>
                <select value={theme.product_card_style} onChange={(e) => setTheme((t) => ({ ...t, product_card_style: e.target.value as Theme["product_card_style"] }))} className="input-field mt-1.5 flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm">
                  <option value="card">كرت بحدود</option>
                  <option value="shadow">كرت بظل خفيف</option>
                  <option value="minimal">بسيط بدون حدود</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">شكل أزرار CTA</Label>
                <select value={theme.cta_style} onChange={(e) => setTheme((t) => ({ ...t, cta_style: e.target.value as Theme["cta_style"] }))} className="input-field mt-1.5 flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm">
                  <option value="rounded">دائري</option>
                  <option value="pill">بيضاوي</option>
                  <option value="square">مربع</option>
                </select>
              </div>
              <div className="space-y-2">
                <ToggleRow label="منتجات مميزة على الرئيسية" value={theme.show_featured} onChange={(v) => setTheme((t) => ({ ...t, show_featured: v }))} />
                <ToggleRow label="عرض التصنيفات" value={theme.show_categories} onChange={(v) => setTheme((t) => ({ ...t, show_categories: v }))} />
                <ToggleRow label="آراء العملاء" value={theme.show_testimonials} onChange={(v) => setTheme((t) => ({ ...t, show_testimonials: v }))} />
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-3">
              <div>
                <Label className="text-xs">عنوان رئيسي</Label>
                <Input value={theme.hero_title} onChange={(e) => setTheme((t) => ({ ...t, hero_title: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">عنوان فرعي</Label>
                <Input value={theme.hero_subtitle} onChange={(e) => setTheme((t) => ({ ...t, hero_subtitle: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">نص زرار CTA</Label>
                <Input value={theme.hero_cta} onChange={(e) => setTheme((t) => ({ ...t, hero_cta: e.target.value }))} className="mt-1.5" />
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1"><Save className="h-4 w-4" /> حفظ ونشر</Button>
          <Button onClick={reset} variant="outline"><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Live preview */}
      <Card className="p-3 overflow-hidden bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="muted" className="gap-1.5"><Eye className="h-3 w-3" /> معاينة حية</Badge>
          <div className="inline-flex gap-1 rounded-md bg-secondary p-1">
            <button onClick={() => setViewport("desktop")} className={`p-1.5 rounded ${viewport === "desktop" ? "bg-card shadow-soft" : ""}`} aria-label="ديسكتوب"><Monitor className="h-4 w-4" /></button>
            <button onClick={() => setViewport("mobile")} className={`p-1.5 rounded ${viewport === "mobile" ? "bg-card shadow-soft" : ""}`} aria-label="موبايل"><Smartphone className="h-4 w-4" /></button>
          </div>
        </div>
        <div className={`mx-auto bg-white text-slate-900 rounded-lg overflow-hidden shadow-elevated ${viewport === "mobile" ? "max-w-sm" : "max-w-3xl"}`}>
          <StoreThemePreview theme={theme} />
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/40 cursor-pointer text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function StoreThemePreview({ theme }: { theme: Theme }) {
  const radius = theme.cta_style === "pill" ? "9999px" : theme.cta_style === "square" ? "4px" : "8px";
  const cardClass =
    theme.product_card_style === "shadow" ? "bg-white shadow-md" :
    theme.product_card_style === "minimal" ? "bg-white" :
    "bg-white border border-slate-200";

  const fakeProducts = [
    { name: "منتج 1", price: "150 ج.م" },
    { name: "منتج 2", price: "299 ج.م" },
    { name: "منتج 3", price: "85 ج.م" },
    { name: "منتج 4", price: "1,250 ج.م" },
  ];
  const fakeCats = ["ملابس", "أحذية", "إكسسوارات", "الأطفال"];

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif" }}>
      {/* Mock header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))` }} />
          <span className="font-bold">متجري</span>
        </div>
        <div className="text-sm text-slate-500">🛒</div>
      </div>

      {/* Hero variants */}
      {theme.layout === "hero-big" && (
        <div className="text-white p-8 text-center" style={{ background: `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))` }}>
          <h1 className="text-2xl font-bold">{theme.hero_title}</h1>
          <p className="text-sm opacity-90 mt-2">{theme.hero_subtitle}</p>
          <button className="mt-4 bg-white text-slate-900 px-5 py-2 font-semibold text-sm" style={{ borderRadius: radius }}>
            {theme.hero_cta}
          </button>
        </div>
      )}
      {theme.layout === "hero-side" && (
        <div className="grid grid-cols-2 gap-4 p-6" style={{ background: `hsl(${theme.primary} / 0.06)` }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: `hsl(${theme.primary})` }}>{theme.hero_title}</h1>
            <p className="text-xs text-slate-600 mt-2">{theme.hero_subtitle}</p>
            <button className="mt-3 text-white px-4 py-1.5 text-sm font-semibold" style={{ background: `hsl(${theme.primary})`, borderRadius: radius }}>
              {theme.hero_cta}
            </button>
          </div>
          <div className="h-24 rounded-lg" style={{ background: `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))` }} />
        </div>
      )}
      {theme.layout === "minimal" && (
        <div className="text-center py-6 border-b">
          <h1 className="text-lg font-bold">{theme.hero_title}</h1>
        </div>
      )}
      {theme.layout === "boutique" && (
        <div className="grid grid-cols-2 gap-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-24" style={{ background: i === 1 ? `hsl(${theme.primary})` : `hsl(${theme.accent})` }} />
          ))}
        </div>
      )}

      {theme.show_categories && (
        <div className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            {fakeCats.map((c) => (
              <button key={c} className="text-xs px-3 py-1.5 whitespace-nowrap border border-slate-200" style={{ borderRadius: radius }}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {theme.show_featured && (
        <div className="p-4">
          <h3 className="font-semibold mb-2 text-sm" style={{ color: `hsl(${theme.primary})` }}>✨ منتجات مميزة</h3>
          <div className="grid grid-cols-2 gap-2">
            {fakeProducts.slice(0, 2).map((p) => (
              <div key={p.name} className={`${cardClass} p-3`} style={{ borderRadius: radius }}>
                <div className="aspect-square bg-slate-100 mb-2" style={{ borderRadius: radius }} />
                <div className="text-sm font-medium">{p.name}</div>
                <div className="font-bold text-sm">{p.price}</div>
                <button className="mt-2 w-full text-white py-1.5 text-xs font-semibold" style={{ background: `hsl(${theme.primary})`, borderRadius: radius }}>
                  أضف للسلة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold mb-2 text-sm">المنتجات</h3>
        <div className="grid grid-cols-2 gap-2">
          {fakeProducts.map((p) => (
            <div key={p.name} className={`${cardClass} p-3`} style={{ borderRadius: radius }}>
              <div className="aspect-square bg-slate-100 mb-2" style={{ borderRadius: radius }} />
              <div className="text-sm">{p.name}</div>
              <div className="font-bold text-sm">{p.price}</div>
            </div>
          ))}
        </div>
      </div>

      {theme.show_testimonials && (
        <div className="p-4 bg-slate-50">
          <h3 className="font-semibold mb-2 text-sm">آراء العملاء</h3>
          <div className="bg-white p-3 rounded-lg text-xs text-slate-600">"خدمة ممتازة وتوصيل سريع — هتعاملت أكتر من مرة"</div>
        </div>
      )}

      <div className="p-3 text-center text-xs text-slate-400 border-t">© متجري · 2024</div>
    </div>
  );
}
