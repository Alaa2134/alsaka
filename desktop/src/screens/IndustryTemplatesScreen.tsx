import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Sparkles, Image as ImageIcon, Palette, Eye, X, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_THEMES, INDUSTRIES, type BusinessTheme } from "@/lib/business-themes";

interface CompanySettingRow { id: string; key: string; value: string | null; }

export function IndustryTemplatesScreen() {
  const { user } = useAuth();
  const [activeIndustry, setActiveIndustry] = useState<BusinessTheme["industry"] | "all">("all");
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BusinessTheme | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  // Hydrate from existing tenant + company_settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const tenants = await unwrap(api().db.list<any>("tenants", { where: { id: user.tenant_id }, limit: 1 }));
        if (tenants?.[0]?.name) setBusinessName(tenants[0].name);
      } catch { /* ignore */ }
      try {
        const rows = await unwrap(api().db.list<CompanySettingRow>("company_settings", { tenantId: user.tenant_id, limit: 500 }));
        const kv: Record<string, string | null> = {};
        for (const r of rows || []) kv[r.key] = r.value;
        if (kv.business_logo) setLogoUrl(kv.business_logo);
        if (kv.active_theme_id) setActiveThemeId(kv.active_theme_id);
        if (kv.business_name && !businessName) setBusinessName(kv.business_name);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const themes = useMemo(
    () => activeIndustry === "all" ? BUSINESS_THEMES : BUSINESS_THEMES.filter((t) => t.industry === activeIndustry),
    [activeIndustry],
  );

  // Upsert a key/value row into company_settings
  const setSetting = async (tenantId: string, key: string, value: string) => {
    const existing = await unwrap(api().db.list<CompanySettingRow>("company_settings", {
      tenantId, where: { key }, limit: 1,
    }));
    if (existing && existing.length > 0) {
      await unwrap(api().db.update("company_settings", existing[0].id, { value }));
    } else {
      await unwrap(api().db.insert("company_settings", { tenant_id: tenantId, key, value }));
    }
  };

  const applyTheme = async (t: BusinessTheme) => {
    if (!user) return;
    if (!businessName.trim()) {
      toast.error("اكتب اسم المحل أولًا");
      return;
    }
    setApplying(t.id);
    try {
      // 1) Tenant name
      await unwrap(api().db.update("tenants", user.tenant_id, { name: businessName.trim() }));

      // 2) Persist theme metadata as key/value
      const kv: Record<string, string> = {
        business_name: businessName.trim(),
        business_logo: logoUrl.trim(),
        active_theme_id: t.id,
        theme_palette_json: JSON.stringify(t.palette),
        theme_industry: t.industry,
        pos_layout: t.pos_layout,
        welcome_ar: t.welcome_ar,
        welcome_en: t.welcome_en,
        hero_image: t.hero,
      };
      for (const [k, v] of Object.entries(kv)) {
        try { await setSetting(user.tenant_id, k, v); } catch { /* ignore */ }
      }

      // 3) Mirror palette + branding into store settings (the public storefront)
      try {
        await unwrap(api().store.updateSettings({
          tenantId: user.tenant_id,
          patch: {
            primary_color: t.palette.primary,
            accent_color: t.palette.accent,
            name: businessName.trim(),
            tagline: t.welcome_ar,
            logo_url: logoUrl.trim() || null,
            hero_image_url: t.hero,
          },
        }));
      } catch { /* store settings may not exist yet — fine */ }

      // 4) POS layout preference
      try {
        await unwrap(api().ui.setPrefs({
          tenantId: user.tenant_id, userId: user.id,
          patch: { pos_layout: t.pos_layout },
        }));
      } catch { /* ignore */ }

      // 5) Seed categories (idempotent — conflicts are fine)
      for (const catName of t.seed_categories) {
        try {
          await unwrap(api().db.insert("categories", {
            tenant_id: user.tenant_id, name: catName,
          }));
        } catch { /* dup */ }
      }

      // 6) Seed sample products (only first-run if no products yet)
      if (t.seed_products?.length) {
        try {
          const existing = await unwrap(api().db.list("products", { tenantId: user.tenant_id, limit: 1 }));
          if (!existing || existing.length === 0) {
            for (const p of t.seed_products) {
              try {
                await unwrap(api().db.insert("products", {
                  tenant_id: user.tenant_id,
                  name: p.name,
                  price: p.price,
                  cost: Math.round(p.price * 0.5),
                  stock: 100,
                  min_stock: 10,
                  is_active: 1,
                }));
              } catch { /* dup */ }
            }
          }
        } catch { /* ignore */ }
      }

      // 7) Live-apply palette to the running renderer (CSS vars)
      applyLivePalette(t.palette);

      setActiveThemeId(t.id);
      setPreview(null);
      toast.success(`تم تطبيق "${t.name}" — أهلًا ${businessName} ${t.emoji}`);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* HERO */}
      <Card className="overflow-hidden border-0">
        <div
          className="relative h-44 md:h-52"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
          }}
        >
          <div className="absolute inset-0 flex items-center px-6 md:px-10">
            <div className="text-primary-foreground">
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Sparkles className="h-4 w-4" /> Theme Gallery
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mt-1.5">اختر ثيم نشاطك</h1>
              <p className="opacity-90 mt-1 max-w-md">
                ثيمات جاهزة لكل نوع بزنس — صور، ألوان، تصنيفات، ومنتجات تجريبية. اضغط ثيم لاستعراضه وطبّق في ثانية.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* BUSINESS IDENTITY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> هويّتك التجارية
          </CardTitle>
          <CardDescription>اسم محلك يظهر في الفاتورة + المتجر + كل التطبيقات. اللوجو اختياري.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[2fr_2fr_auto] items-end">
          <div>
            <Label>اسم المحل / النشاط</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="مثلًا: قهوة الفرسان، صيدلية النور..."
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><ImageIcon className="h-3 w-3" /> رابط اللوجو (اختياري)</Label>
            <Input
              dir="ltr"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="h-14 w-14 rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center">
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={logoUrl} className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* INDUSTRY TABS */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveIndustry("all")}
          className={`px-3 h-9 rounded-full text-sm border transition-colors ${
            activeIndustry === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card hover:bg-secondary border-border"
          }`}
        >
          الكل ({BUSINESS_THEMES.length})
        </button>
        {INDUSTRIES.map((ind) => {
          const count = BUSINESS_THEMES.filter((t) => t.industry === ind.id).length;
          if (count === 0) return null;
          return (
            <button
              key={ind.id}
              onClick={() => setActiveIndustry(ind.id)}
              className={`px-3 h-9 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${
                activeIndustry === ind.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-secondary border-border"
              }`}
            >
              <span>{ind.emoji}</span>
              <span>{ind.label_ar}</span>
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* THEME GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => {
          const isActive = activeThemeId === t.id;
          return (
            <Card
              key={t.id}
              className={`overflow-hidden group hover:shadow-elevated transition-all cursor-pointer ${
                isActive ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setPreview(t)}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={t.hero}
                  alt={t.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, transparent 30%, hsl(${t.palette.bg}) 100%)`,
                    opacity: 0.85,
                  }}
                />
                <div className="absolute top-3 right-3 flex gap-1.5">
                  {isActive && (
                    <Badge variant="success" className="shadow-md">
                      <Check className="h-3 w-3 ml-1" /> مفعّل
                    </Badge>
                  )}
                  <div className="h-9 w-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-lg shadow-md">
                    {t.emoji}
                  </div>
                </div>
                {/* palette swatches */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {(["primary", "accent", "foreground"] as const).map((k) => (
                    <span
                      key={k}
                      className="h-4 w-4 rounded-full border-2 border-white/80 shadow"
                      style={{ background: `hsl(${t.palette[k]})` }}
                      title={k}
                    />
                  ))}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.tagline}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{t.pos_layout}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.features.slice(0, 3).map((f) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); setPreview(t); }}
                  >
                    <Eye className="h-3.5 w-3.5 ml-1" /> معاينة
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={applying === t.id}
                    onClick={(e) => { e.stopPropagation(); applyTheme(t); }}
                  >
                    {applying === t.id ? "..." : isActive ? "إعادة تطبيق" : "تطبيق"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PREVIEW MODAL */}
      {preview && (
        <ThemePreviewModal
          theme={preview}
          businessName={businessName || "اسم محلك"}
          logoUrl={logoUrl}
          applying={applying === preview.id}
          onApply={() => applyTheme(preview)}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function ThemePreviewModal({
  theme, businessName, logoUrl, applying, onApply, onClose,
}: {
  theme: BusinessTheme;
  businessName: string;
  logoUrl: string;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: `hsl(${theme.palette.bg})`, color: `hsl(${theme.palette.foreground})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
          title="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero */}
        <div className="relative h-56">
          <img src={theme.hero} alt={theme.name} className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, transparent 0%, hsl(${theme.palette.bg}) 100%)` }}
          />
          <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} className="h-14 w-14 rounded-xl object-cover border-2 border-white shadow-lg" alt="logo" />
              ) : (
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl shadow-lg"
                  style={{ background: `hsl(${theme.palette.primary})` }}
                >
                  {theme.emoji}
                </div>
              )}
              <div className="text-white drop-shadow-lg">
                <div className="text-xs opacity-90">{theme.tagline}</div>
                <h2 className="text-2xl font-bold leading-tight">{businessName}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Welcome strip */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: `hsl(${theme.palette.primary})`, color: "#fff" }}
          >
            <div className="font-semibold">{theme.welcome_ar}</div>
            <div className="text-xs opacity-80" dir="ltr">{theme.welcome_en}</div>
          </div>

          {/* Palette */}
          <div className="rounded-xl p-3 border" style={{ borderColor: `hsl(${theme.palette.foreground} / 0.15)` }}>
            <div className="text-xs opacity-70 mb-2 flex items-center gap-1"><Palette className="h-3 w-3" /> Palette</div>
            <div className="flex flex-wrap gap-2">
              {(["primary", "accent", "bg", "foreground"] as const).map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-6 w-6 rounded-md border"
                    style={{ background: `hsl(${theme.palette[k]})`, borderColor: `hsl(${theme.palette.foreground} / 0.2)` }}
                  />
                  <span className="opacity-70">{k}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Features + categories */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs opacity-70 mb-2">المميزات المضمنة</div>
              <ul className="space-y-1.5">
                {theme.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4" style={{ color: `hsl(${theme.palette.primary})` }} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-2">التصنيفات الافتراضية</div>
              <div className="flex flex-wrap gap-1.5">
                {theme.seed_categories.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: `hsl(${theme.palette.primary} / 0.15)`, color: `hsl(${theme.palette.primary})` }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {theme.seed_products && theme.seed_products.length > 0 && (
            <div>
              <div className="text-xs opacity-70 mb-2">منتجات افتراضية (تجريبية)</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {theme.seed_products.map((p) => (
                  <div
                    key={p.name}
                    className="flex justify-between items-center px-3 py-2 rounded-lg text-sm"
                    style={{ background: `hsl(${theme.palette.foreground} / 0.05)` }}
                  >
                    <span>{p.name}</span>
                    <span className="font-mono font-semibold" style={{ color: `hsl(${theme.palette.primary})` }}>
                      {p.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>إغلاق</Button>
            <Button className="flex-1" disabled={applying} onClick={onApply}>
              {applying ? "جاري التطبيق..." : `تطبيق "${theme.name}"`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live-applies palette CSS variables to the running renderer so the
// merchant sees the change instantly. Persists to localStorage so it
// survives reload.
function applyLivePalette(palette: BusinessTheme["palette"]) {
  const root = document.documentElement;
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--accent", palette.accent);
  try { localStorage.setItem("horus.theme.palette", JSON.stringify(palette)); } catch { /* ignore */ }
}
