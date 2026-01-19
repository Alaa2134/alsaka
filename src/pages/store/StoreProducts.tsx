import { useState, useMemo, useCallback, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GradientBackground } from "@/components/store/3d/Backgrounds";
import { GlassCard } from "@/components/store/3d/GlassCard";
import { VirtualProductGrid } from "@/components/store/VirtualProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Sparkles, FolderTree, X, TrendingUp, Zap, LayoutGrid, List } from "lucide-react";
import { useInfiniteProducts, useStoreCategoriesWithCounts, ProductFilters } from "@/hooks/useInfiniteProducts";
import type { StoreContextData } from "./StoreLayout";
import { useDebounce } from "@/hooks/useDebounce";

export const StoreProducts = () => {
  const { tenant } = useOutletContext<StoreContextData>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filter states
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [availability, setAvailability] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<ProductFilters["sortBy"]>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce search for performance
  const debouncedSearch = useDebounce(search, 300);

  // Build filters object
  const filters: ProductFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 100000 ? priceRange[1] : undefined,
    availability,
    sortBy,
  }), [debouncedSearch, selectedCategory, priceRange, availability, sortBy]);

  // Fetch products with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts(tenant.id, filters);

  // Fetch categories
  const { data: categoriesData } = useStoreCategoriesWithCounts(tenant.id);
  const categories = categoriesData?.pages[0] || [];

  // Flatten products from all pages
  const products = useMemo(() => {
    return data?.pages.flatMap(page => page.products) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount || 0;

  // Get category name helper
  const getCategoryName = useCallback((categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || null;
  }, [categories]);

  // URL sync for category
  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", value);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCategory("all");
    setPriceRange([0, 100000]);
    setAvailability("all");
    setSortBy("newest");
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = selectedCategory !== "all" || search || availability !== "all" || priceRange[0] > 0 || priceRange[1] < 100000;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: tenant.primary_color }}>
            {totalCount.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">إجمالي المنتجات</div>
        </div>
        <div className="bg-success/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-success">
            {categories.length}
          </div>
          <div className="text-xs text-muted-foreground">الفئات</div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          الفئات
        </Label>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/80 transition-all"
            onClick={() => handleCategoryChange("all")}
          >
            الكل
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80 transition-all gap-1"
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
              <span className="text-xs opacity-70">({cat.products_count})</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          نطاق السعر
        </Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={100000}
          step={100}
          className="mt-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{priceRange[0].toLocaleString()} ج.م</span>
          <span>{priceRange[1].toLocaleString()} ج.م</span>
        </div>
      </div>

      {/* Availability */}
      <div className="space-y-2">
        <Label>التوفر</Label>
        <Select value={availability} onValueChange={(v) => setAvailability(v as any)}>
          <SelectTrigger className="bg-background/50 backdrop-blur-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="in_stock">✅ متوفر</SelectItem>
            <SelectItem value="out_of_stock">❌ غير متوفر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
        >
          <X className="h-4 w-4 ml-2" />
          مسح جميع الفلاتر
        </Button>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <GradientBackground 
        primaryColor={tenant.primary_color} 
        secondaryColor={tenant.secondary_color} 
      />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring" }}
            >
              <GlassCard className="sticky top-24 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <SlidersHorizontal className="h-5 w-5" style={{ color: tenant.primary_color }} />
                  <h2 className="text-lg font-semibold">الفلترة</h2>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="mr-auto">
                      نشط
                    </Badge>
                  )}
                </div>
                <FilterContent />
              </GlassCard>
            </motion.div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4 mb-6"
            >
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في ملايين المنتجات..."
                  className="pr-12 h-12 text-lg bg-background/50 backdrop-blur-sm border-2 rounded-xl"
                  style={{ borderColor: `${tenant.primary_color}30` }}
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearch("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {/* Mobile Filter */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden gap-2 h-12 backdrop-blur-sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      {hasActiveFilters && <Badge className="h-5 w-5 p-0 text-xs">!</Badge>}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>الفلترة والترتيب</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* View Toggle */}
                <div className="hidden sm:flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none h-12"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none h-12"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-44 h-12 bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">🆕 الأحدث</SelectItem>
                    <SelectItem value="price_low">💰 السعر: الأقل</SelectItem>
                    <SelectItem value="price_high">💎 السعر: الأعلى</SelectItem>
                    <SelectItem value="popular">🔥 الأكثر شعبية</SelectItem>
                    <SelectItem value="name">🔤 الاسم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Results Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" style={{ color: tenant.primary_color }} />
                <p className="text-muted-foreground">
                  {isLoading ? "جاري التحميل..." : `${products.length.toLocaleString()} من ${totalCount.toLocaleString()} منتج`}
                </p>
              </div>

              {/* Active Filters Display */}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 px-3 py-1">
                  <FolderTree className="h-3 w-3" />
                  {getCategoryName(selectedCategory)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleCategoryChange("all")}
                  />
                </Badge>
              )}

              {debouncedSearch && (
                <Badge variant="secondary" className="gap-1 px-3 py-1">
                  <Search className="h-3 w-3" />
                  "{debouncedSearch}"
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearch("")}
                  />
                </Badge>
              )}
            </motion.div>

            {/* Products Grid */}
            <VirtualProductGrid
              products={products}
              tenantSlug={tenant.slug}
              primaryColor={tenant.primary_color}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage ?? false}
              fetchNextPage={fetchNextPage}
              totalCount={totalCount}
              getCategoryName={getCategoryName}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
