import { Link } from "react-router-dom";
import { useStore } from "@/lib/store-context";
import { ProductCard } from "@/components/ProductCard";
import { Sparkles } from "lucide-react";

export function HomePage() {
  const { feed } = useStore();
  if (!feed) return null;
  const { settings, products } = feed;

  const featured = products.filter((p) => p.featured).slice(0, 8);
  const fresh = products.slice(0, 12);

  return (
    <>
      <section
        className="relative overflow-hidden text-primary-foreground"
        style={{
          backgroundImage: settings.hero_image_url
            ? `linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(var(--accent) / 0.85)), url(${settings.hero_image_url})`
            : `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">{settings.name}</h1>
          {settings.tagline && <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">{settings.tagline}</p>}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to={`/${settings.slug}/products`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white text-foreground px-6 font-semibold shadow-soft hover:bg-white/95"
            >
              تسوّق الآن
            </Link>
            {settings.whatsapp_phone && (
              <a
                href={`https://wa.me/${settings.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 text-white px-6 font-semibold hover:bg-white/10"
              >
                تواصل عبر واتساب
              </a>
            )}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> منتجات مميزة
            </h2>
            <Link to={`/${settings.slug}/products`} className="text-primary text-sm font-medium">
              عرض الكل ←
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">أحدث المنتجات</h2>
          <Link to={`/${settings.slug}/products`} className="text-primary text-sm font-medium">
            عرض الكل ←
          </Link>
        </div>
        {fresh.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">لا توجد منتجات حاليًا.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
