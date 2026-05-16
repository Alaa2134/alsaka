import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { money } from "@/lib/utils";

export function CartPage() {
  const { feed, cart, subtotal, removeFromCart, updateQty } = useStore();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  if (!feed) return null;
  const sym = feed.settings.currency_symbol;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">سلة المشتريات</h1>

      {cart.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">السلة فارغة</p>
          <Link to={`/${slug}/products`} className="btn-primary mt-4 inline-flex">تسوّق الآن</Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            {cart.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-4"
              >
                <div className="h-24 w-24 rounded-md overflow-hidden bg-muted shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-muted-foreground tabular-nums">{money(product.price, sym)} لكل قطعة</div>
                  <div className="mt-3 flex items-center gap-3 justify-between">
                    <div className="inline-flex items-center rounded-md border border-border">
                      <button
                        onClick={() => updateQty(product.id, quantity - 1)}
                        className="h-9 w-9 hover:bg-muted inline-flex items-center justify-center"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center tabular-nums">{quantity}</span>
                      <button
                        onClick={() => updateQty(product.id, quantity + 1)}
                        disabled={product.stock != null && quantity >= product.stock}
                        className="h-9 w-9 hover:bg-muted inline-flex items-center justify-center disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="font-bold tabular-nums">{money(product.price * quantity, sym)}</div>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-destructive hover:bg-destructive/10 rounded-md p-2"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-card border border-border rounded-lg p-5 h-fit sticky top-20">
            <h2 className="font-semibold mb-3">ملخص الطلب</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="tabular-nums">{money(subtotal, sym)}</span>
              </div>
              <p className="text-xs text-muted-foreground">الشحن والضريبة تُحسب في الخطوة التالية.</p>
            </div>
            <button onClick={() => navigate(`/${slug}/checkout`)} className="btn-primary w-full mt-4">
              متابعة لإتمام الطلب
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
