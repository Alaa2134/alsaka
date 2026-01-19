import { useRef, useCallback, useEffect, memo, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard3D } from "@/components/store/3d/ProductCard3D";
import { Loader2, Package } from "lucide-react";
import { StoreProduct } from "@/hooks/useInfiniteProducts";

interface VirtualProductGridProps {
  products: StoreProduct[];
  tenantSlug: string;
  primaryColor: string;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  totalCount: number;
  getCategoryName: (id: string | null) => string | null;
}

// Memoized product card to prevent unnecessary re-renders
const MemoizedProductCard = memo(({ 
  product, 
  tenantSlug, 
  primaryColor,
  categoryName 
}: { 
  product: StoreProduct; 
  tenantSlug: string; 
  primaryColor: string;
  categoryName: string | undefined;
}) => (
  <ProductCard3D
    id={product.id}
    name={product.name}
    price={product.price}
    stock={product.stock_quantity}
    category={categoryName}
    imageUrl={product.image_url || undefined}
    tenantSlug={tenantSlug}
    primaryColor={primaryColor}
  />
));

MemoizedProductCard.displayName = "MemoizedProductCard";

export const VirtualProductGrid = ({
  products,
  tenantSlug,
  primaryColor,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  totalCount,
  getCategoryName,
}: VirtualProductGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate columns based on viewport
  const getColumns = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width < 640) return 2;
    if (width < 1024) return 3;
    if (width < 1536) return 4;
    return 5;
  };

  const columns = useMemo(() => getColumns(), []);
  const rowCount = Math.ceil(products.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount + (hasNextPage ? 1 : 0), // +1 for loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: () => 380, // Estimated row height
    overscan: 3,
  });

  // Infinite scroll trigger
  const handleScroll = useCallback(() => {
    const container = parentRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollThreshold = scrollHeight - clientHeight - 500;

    if (scrollTop >= scrollThreshold && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12" style={{ color: primaryColor }} />
        </motion.div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20"
      >
        <Package className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
        <h3 className="text-xl font-semibold mb-2">لا توجد منتجات</h3>
        <p className="text-muted-foreground">جرب تغيير معايير البحث أو الفلترة</p>
      </motion.div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="h-[calc(100vh-280px)] overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <AnimatePresence mode="popLayout">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index >= rowCount;

            if (isLoaderRow) {
              return (
                <div
                  key="loader"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-center justify-center"
                >
                  {isFetchingNextPage && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-muted-foreground"
                    >
                      <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
                      <span>جاري تحميل المزيد...</span>
                    </motion.div>
                  )}
                </div>
              );
            }

            const startIndex = virtualRow.index * columns;
            const rowProducts = products.slice(startIndex, startIndex + columns);

            return (
              <div
                key={virtualRow.index}
                className="grid gap-4 p-2"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {rowProducts.map((product, colIndex) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIndex * 0.05 }}
                    layout
                  >
                    <MemoizedProductCard
                      product={product}
                      tenantSlug={tenantSlug}
                      primaryColor={primaryColor}
                      categoryName={getCategoryName(product.category_id) || product.category || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t py-3 px-4 flex items-center justify-between text-sm"
      >
        <span className="text-muted-foreground">
          عرض {products.length.toLocaleString()} من {totalCount.toLocaleString()} منتج
        </span>
        {hasNextPage && (
          <span className="text-primary text-xs">
            ⬇️ مرر للأسفل لتحميل المزيد
          </span>
        )}
      </motion.div>
    </div>
  );
};
