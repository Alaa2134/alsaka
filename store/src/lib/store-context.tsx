import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, StoreFeed, StoreProduct } from "./types";
import { fetchStoreFeed } from "./api";

const CART_KEY = "systemalaa.store.cart";

interface StoreCtx {
  feed: StoreFeed | null;
  loading: boolean;
  error: string | null;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  addToCart: (product: StoreProduct, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [feed, setFeed] = useState<StoreFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStoreFeed(slug)
      .then((f) => {
        if (cancelled) return;
        if (!f) {
          setError("لم يتم العثور على هذا المتجر");
        } else if (!f.published) {
          setError("المتجر غير منشور حاليًا");
        } else {
          setFeed(f);
          // Apply brand color to the entire page
          document.documentElement.style.setProperty("--primary", f.settings.primary_color);
          document.documentElement.style.setProperty("--accent", f.settings.accent_color);
          document.title = f.settings.name;
        }
      })
      .catch((e) => !cancelled && setError(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addToCart = useCallback((product: StoreProduct, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + quantity } : it,
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((it) => it.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((it) =>
        it.product.id === productId
          ? {
              ...it,
              // Respect stock if tracked
              quantity:
                it.product.stock != null ? Math.min(quantity, it.product.stock) : quantity,
            }
          : it,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.product.price * it.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(() => cart.reduce((s, it) => s + it.quantity, 0), [cart]);

  const value = useMemo<StoreCtx>(
    () => ({ feed, loading, error, cart, cartCount, subtotal, addToCart, removeFromCart, updateQty, clearCart }),
    [feed, loading, error, cart, cartCount, subtotal, addToCart, removeFromCart, updateQty, clearCart],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}
