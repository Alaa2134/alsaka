import { Link } from "react-router-dom";
import { ShoppingCart, Package } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { money } from "@/lib/utils";
import type { StoreProduct } from "@/lib/types";

export function ProductCard({ product }: { product: StoreProduct }) {
  const { feed, addToCart } = useStore();
  if (!feed) return null;
  const sym = feed.settings.currency_symbol;

  return (
    <div className="product-card group">
      <Link to={`/${feed.settings.slug}/p/${product.id}`} className="block">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12" />
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute top-3 right-3 bg-destructive text-white text-xs font-semibold rounded-full px-2 py-1">
              نفد
            </div>
          )}
          {product.featured && product.in_stock && (
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-1">
              مميز
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums">{money(product.price, sym)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xs text-muted-foreground line-through tabular-nums">{money(product.original_price)}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <button
          onClick={() => addToCart(product, 1)}
          disabled={!product.purchasable}
          className="btn-primary w-full"
        >
          <ShoppingCart className="h-4 w-4" />
          {product.purchasable ? "أضف للسلة" : "غير متاح"}
        </button>
      </div>
    </div>
  );
}
