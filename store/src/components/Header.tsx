import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store-context";
import { cn } from "@/lib/utils";

export function Header() {
  const { feed, cartCount } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (!feed) return null;
  const { settings } = feed;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/${settings.slug}/products?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center gap-3">
        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="القائمة">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to={`/${settings.slug}`} className="flex items-center gap-2 shrink-0">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              {settings.name.slice(0, 1)}
            </div>
          )}
          <span className="font-bold truncate">{settings.name}</span>
        </Link>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="ابحث في المتجر..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pr-10"
          />
        </form>

        <nav className="hidden md:flex items-center gap-1">
          <Link to={`/${settings.slug}`} className="px-3 py-2 text-sm hover:bg-muted rounded-md">
            الرئيسية
          </Link>
          <Link to={`/${settings.slug}/products`} className="px-3 py-2 text-sm hover:bg-muted rounded-md">
            المنتجات
          </Link>
          <Link to={`/${settings.slug}/track`} className="px-3 py-2 text-sm hover:bg-muted rounded-md">
            تتبع الطلب
          </Link>
        </nav>

        <Link
          to={`/${settings.slug}/cart`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="سلة المشتريات"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -left-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card">
          <form onSubmit={submitSearch} className="p-3">
            <input
              type="search"
              placeholder="ابحث..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
            />
          </form>
          <nav className="p-3 grid gap-1">
            {[
              { to: `/${settings.slug}`, label: "الرئيسية" },
              { to: `/${settings.slug}/products`, label: "المنتجات" },
              { to: `/${settings.slug}/track`, label: "تتبع الطلب" },
            ].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn("rounded-md px-3 py-2 text-sm hover:bg-muted")}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
