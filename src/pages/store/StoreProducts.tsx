import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard3D } from "@/components/store/3d/ProductCard3D";
import { GradientBackground } from "@/components/store/3d/Backgrounds";
import { GlassCard } from "@/components/store/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Package, Loader2, Sparkles, FolderTree, X } from "lucide-react";
import type { StoreContextData } from "./StoreLayout";

interface Product {
  id: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  category_id: string | null;
  barcode: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  products_count?: number;
}

export const StoreProducts = () => {
  const { tenant } = useOutletContext<StoreContextData>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState(10000);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch categories from the new categories table
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, [tenant.id]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenant.id);

        if (search) {
          query = query.ilike("name", `%${search}%`);
        }

        // Filter by category_id from the new categories table
        if (selectedCategory && selectedCategory !== "all") {
          query = query.eq("category_id", selectedCategory);
        }

        query = query.gte("price", priceRange[0]).lte("price", priceRange[1]);

        if (availability === "in_stock") {
          query = query.gt("stock_quantity", 0);
        } else if (availability === "out_of_stock") {
          query = query.eq("stock_quantity", 0);
        }

        switch (sortBy) {
          case "newest":
            query = query.order("created_at", { ascending: false });
            break;
          case "price_low":
            query = query.order("price", { ascending: true });
            break;
          case "price_high":
            query = query.order("price", { ascending: false });
            break;
          case "name":
            query = query.order("name", { ascending: true });
            break;
        }

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);

        if (data && data.length > 0) {
          const max = Math.max(...data.map((p) => p.price));
          setMaxPrice(max > 0 ? max : 10000);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [tenant.id, search, selectedCategory, priceRange, availability, sortBy]);

  // Get category name by id
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || null;
  };

  // Handle category selection with URL update
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", value);
    }
    setSearchParams(searchParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setPriceRange([0, maxPrice]);
    setAvailability("all");
    setSortBy("newest");
    setSearchParams({});
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category Filter with chips */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          الفئات
        </Label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/80 transition-colors"
            onClick={() => handleCategoryChange("all")}
          >
            جميع الفئات
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>القسم</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="bg-background/50 backdrop-blur-sm">
            <SelectValue placeholder="جميع الأقسام" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <Label>السعر</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={maxPrice}
          step={10}
          className="mt-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{priceRange[0].toLocaleString()} ج.م</span>
          <span>{priceRange[1].toLocaleString()} ج.م</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>التوفر</Label>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="bg-background/50 backdrop-blur-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="in_stock">متوفر</SelectItem>
            <SelectItem value="out_of_stock">غير متوفر</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 100 }
    },
  };

  return (
    <div className="relative min-h-screen">
      <GradientBackground 
        primaryColor={tenant.primary_color} 
        secondaryColor={tenant.secondary_color} 
      />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filters */}
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
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="pr-12 h-12 text-lg bg-background/50 backdrop-blur-sm border-2 rounded-xl"
                  style={{ borderColor: `${tenant.primary_color}30` }}
                />
              </div>

              <div className="flex gap-2">
                {/* Mobile Filter */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden gap-2 h-12 backdrop-blur-sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      الفلترة
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>الفلترة</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 h-12 bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="price_low">السعر: الأقل</SelectItem>
                    <SelectItem value="price_high">السعر: الأعلى</SelectItem>
                    <SelectItem value="name">الاسم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Active filters & Results info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: tenant.primary_color }} />
                <p className="text-muted-foreground">
                  {isLoading ? "جاري التحميل..." : `${products.length} منتج`}
                </p>
              </div>

              {/* Show active category filter */}
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

              {/* Clear all filters button */}
              {(selectedCategory !== "all" || search || availability !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 ml-1" />
                  مسح الفلاتر
                </Button>
              )}
            </motion.div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-12 w-12" style={{ color: tenant.primary_color }} />
                </motion.div>
              </div>
            ) : products.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <ProductCard3D
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        stock={product.stock_quantity}
                        category={getCategoryName(product.category_id) || product.category || undefined}
                        tenantSlug={tenant.slug}
                        primaryColor={tenant.primary_color}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <Package className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">لا توجد منتجات</h3>
                <p className="text-muted-foreground">جرب تغيير معايير البحث أو الفلترة</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
