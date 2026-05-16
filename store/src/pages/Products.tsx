import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/lib/store-context";
import { ProductCard } from "@/components/ProductCard";
import { Search } from "lucide-react";

export function ProductsPage() {
  const { feed } = useStore();
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") || "";
  const initialCat = params.get("cat") || "";
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState<"default" | "price_asc" | "price_desc" | "name">("default");

  const filtered = useMemo(() => {
    if (!feed) return [];
    let list = [...feed.products];
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(qq) ||
          (p.description || "").toLowerCase().includes(qq) ||
          (p.sku || "").toLowerCase().includes(qq) ||
          (p.barcode || "").includes(qq),
      );
    }
    if (cat) list = list.filter((p) => p.category_id === cat);
    if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return list;
  }, [feed, q, cat, sort]);

  if (!feed) return null;

  const updateUrl = (next: { q?: string; cat?: string }) => {
    const p = new URLSearchParams(params);
    if ("q" in next) (next.q ? p.set("q", next.q) : p.delete("q"));
    if ("cat" in next) (next.cat ? p.set("cat", next.cat) : p.delete("cat"));
    setParams(p, { replace: true });
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="ابحث..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              updateUrl({ q: e.target.value });
            }}
            className="input-field pr-10"
          />
        </div>
        {feed.categories.length > 0 && (
          <select
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              updateUrl({ cat: e.target.value });
            }}
            className="input-field max-w-[200px]"
          >
            <option value="">كل التصنيفات</option>
            {feed.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="input-field max-w-[200px]">
          <option value="default">الترتيب الافتراضي</option>
          <option value="price_asc">السعر: من الأقل للأعلى</option>
          <option value="price_desc">السعر: من الأعلى للأقل</option>
          <option value="name">الأبجدي</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">لا توجد نتائج.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">عدد المنتجات: {filtered.length}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
