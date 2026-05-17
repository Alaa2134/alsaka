import { useState } from "react";
import { toast } from "sonner";
import {
  Store,
  Utensils,
  Pill,
  Scissors,
  Briefcase,
  ShoppingCart,
  Coffee,
  Car,
  Check,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  industry: string;
  icon: any;
  description: string;
  pos_layout: "classic" | "grid" | "restaurant" | "quick" | "dual";
  features: string[];
  seed_categories: string[];
  seed_products?: Array<{ name: string; price: number; category: string }>;
  primary_color: string;
}

const TEMPLATES: Template[] = [
  {
    id: "retail-shop",
    name: "محل بيع تقسيم",
    industry: "retail",
    icon: Store,
    description: "ملابس، إكسسوارات، أحذية، عطور — أي تجزئة عادية.",
    pos_layout: "grid",
    features: ["متغيرات منتج (مقاس + لون)", "عملاء وبرنامج نقاط", "متجر إلكتروني جاهز", "كوبونات خصم"],
    seed_categories: ["ملابس", "أحذية", "إكسسوارات", "عطور"],
    primary_color: "221 83% 53%",
  },
  {
    id: "supermarket",
    name: "سوبرماركت / بقالة",
    industry: "retail",
    icon: ShoppingCart,
    description: "سرعة في المسح + باركود + ورديات كاشير + جرد دوري.",
    pos_layout: "grid",
    features: ["باركود فوري", "ورديات X/Z", "موردين متعددين", "تنبيهات الصلاحية"],
    seed_categories: ["مواد غذائية", "مشروبات", "منظفات", "ألبان", "حلويات", "أدوات منزل"],
    primary_color: "142 76% 36%",
  },
  {
    id: "restaurant",
    name: "مطعم / كافيه",
    industry: "restaurant",
    icon: Utensils,
    description: "طاولات + KOT للمطبخ + قائمة طعام بصور + Split Bill.",
    pos_layout: "restaurant",
    features: ["طاولات مع Floor Plan", "إرسال للمطبخ تلقائيًا", "Kitchen Display", "حجوزات", "رسوم خدمة"],
    seed_categories: ["مقبلات", "أطباق رئيسية", "حلويات", "مشروبات ساخنة", "مشروبات باردة"],
    primary_color: "0 84% 60%",
  },
  {
    id: "coffee",
    name: "قهوة / عصير / آيس كريم",
    industry: "restaurant",
    icon: Coffee,
    description: "أزرار كبيرة للمنتجات الأكثر طلبًا، نقرة واحدة.",
    pos_layout: "quick",
    features: ["شاشة Quick Service", "تخصيص الطلب (سكر، حجم...)", "تيك أواي + دلڤري"],
    seed_categories: ["قهوة", "مشروبات باردة", "عصائر", "كيك ومخبوزات"],
    primary_color: "25 47% 35%",
  },
  {
    id: "pharmacy",
    name: "صيدلية",
    industry: "retail",
    icon: Pill,
    description: "تتبع صلاحية + Batch numbers + أنواع متعددة من المنتج الواحد.",
    pos_layout: "classic",
    features: ["تواريخ صلاحية + تنبيهات", "Batch / Serial", "خصومات تأمين", "وصفات طبية"],
    seed_categories: ["أدوية بوصفة", "أدوية بدون وصفة", "فيتامينات", "مستلزمات طبية", "تجميل"],
    primary_color: "199 89% 48%",
  },
  {
    id: "salon",
    name: "صالون / كوافير / سبا",
    industry: "services",
    icon: Scissors,
    description: "حجوزات بالوقت + عمولة موظف لكل خدمة.",
    pos_layout: "classic",
    features: ["حجوزات بالوقت", "عمولات للموظفين", "خدمات مع مدة زمنية", "اشتراكات شهرية"],
    seed_categories: ["قص شعر", "صبغ", "مكياج", "بشرة", "أظافر", "مساج"],
    primary_color: "330 81% 60%",
  },
  {
    id: "services",
    name: "خدمات احترافية",
    industry: "services",
    icon: Briefcase,
    description: "مكاتب محاسبة، استشارات، قانون، تصميم — فواتير على الساعة أو على المشروع.",
    pos_layout: "classic",
    features: ["فواتير زمنية (Hours)", "عروض أسعار", "اشتراكات متكررة", "مراكز تكلفة"],
    seed_categories: ["استشارة", "تصميم", "تنفيذ", "متابعة"],
    primary_color: "221 83% 23%",
  },
  {
    id: "auto",
    name: "ورشة / مركز خدمة سيارات",
    industry: "services",
    icon: Car,
    description: "Job Cards + قطع غيار + عمالة + ضمان.",
    pos_layout: "dual",
    features: ["Job Cards", "قطع غيار", "عمالة بالساعة", "ضمان وصيانة دورية"],
    seed_categories: ["قطع غيار", "عمالة", "زيوت", "إطارات"],
    primary_color: "0 0% 12%",
  },
];

export function IndustryTemplatesScreen() {
  const { user } = useAuth();
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const apply = async (t: Template) => {
    if (!user) return;
    if (!confirm(`تطبيق قالب "${t.name}"؟\nهيتم إنشاء التصنيفات والإعدادات الأساسية.`)) return;
    setApplying(t.id);
    try {
      // 1. Set POS layout
      await unwrap(api().ui.setPrefs({
        tenantId: user.tenant_id,
        userId: user.id,
        patch: { pos_layout: t.pos_layout },
      }));
      // 2. Apply primary color to store
      try {
        await unwrap(api().store.updateSettings({
          tenantId: user.tenant_id,
          patch: { primary_color: t.primary_color },
        }));
      } catch { /* ignore */ }
      // 3. Seed categories
      for (const catName of t.seed_categories) {
        try {
          await unwrap(api().db.insert("categories", {
            tenant_id: user.tenant_id,
            name: catName,
          }));
        } catch { /* dup */ }
      }
      toast.success(`تم تطبيق قالب ${t.name} ✓`);
      setApplied(t.id);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> اختر قالب يناسب نشاطك
          </CardTitle>
          <CardDescription className="text-primary-foreground/90">
            كل قالب بيضبط واجهة البيع + التصنيفات الافتراضية + الألوان + المميزات المخصصة لنشاطك في ثانية واحدة.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const isApplied = applied === t.id;
          return (
            <Card
              key={t.id}
              className={`overflow-hidden hover:shadow-elevated transition-all cursor-pointer ${isApplied ? "ring-2 ring-primary" : ""}`}
              onClick={() => apply(t)}
            >
              <div className="h-2" style={{ background: `linear-gradient(90deg, hsl(${t.primary_color}), hsl(${t.primary_color} / 0.5))` }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
                    style={{ background: `hsl(${t.primary_color})` }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {isApplied && <Badge variant="success"><Check className="h-3 w-3 ml-1" /> مطبَّق</Badge>}
                </div>
                <h3 className="font-bold mt-3">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <ul className="mt-3 space-y-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs">
                      <Check className="h-3 w-3 text-[hsl(var(--success))]" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isApplied ? "outline" : "default"}
                  className="w-full mt-4"
                  disabled={applying === t.id}
                  onClick={(e) => { e.stopPropagation(); apply(t); }}
                >
                  {applying === t.id ? "جاري التطبيق..." : isApplied ? "إعادة التطبيق" : "تطبيق القالب"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
