import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart, ChevronLeft, Package, Truck, Shield } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { money } from "@/lib/utils";

export function ProductDetailPage() {
  const { productId, slug } = useParams<{ productId: string; slug: string }>();
  const { feed, addToCart } = useStore();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const product = useMemo(
    () => feed?.products.find((p) => p.id === productId) || null,
    [feed, productId],
  );

  if (!feed) return null;
  if (!product) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">المنتج غير موجود</h1>
        <button className="btn-outline mt-4" onClick={() => navigate(`/${slug}/products`)}>
          عودة للمنتجات
        </button>
      </div>
    );
  }

  const sym = feed.settings.currency_symbol;
  const gallery = [product.image_url, ...product.gallery].filter(Boolean) as string[];
  const maxQty = product.stock != null ? product.stock : 999;

  const onAdd = () => {
    addToCart(product, qty);
    toast.success(`أُضيف "${product.name}" إلى السلة`);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" />
        رجوع
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-muted relative">
            {gallery[activeImage] ? (
              <img src={gallery[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Package className="h-20 w-20" />
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square rounded-md overflow-hidden border-2 ${
                    i === activeImage ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">{money(product.price, sym)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-lg text-muted-foreground line-through tabular-nums">{money(product.original_price)}</span>
            )}
          </div>

          {product.in_stock ? (
            <p className="text-sm text-success font-medium">✓ متاح في المخزون{product.stock != null ? ` (${product.stock})` : ""}</p>
          ) : (
            <p className="text-sm text-destructive font-medium">نفد من المخزون</p>
          )}

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="inline-flex items-center rounded-lg border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted"
                aria-label="أنقص"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted"
                aria-label="زِد"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button onClick={onAdd} disabled={!product.purchasable} className="btn-primary flex-1">
              <ShoppingCart className="h-4 w-4" />
              أضف للسلة
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4 text-primary" /> توصيل لكل المحافظات
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" /> ضمان الجودة
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4 text-primary" /> دفع آمن
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
