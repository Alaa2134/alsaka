import { useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

const LOW_STOCK_THRESHOLD = 10;

export const useLowStockAlerts = () => {
  const { data: products } = useProducts();

  useEffect(() => {
    if (!products) return;

    const lowStockProducts = products.filter(p => p.stock_quantity <= LOW_STOCK_THRESHOLD && p.stock_quantity > 0);
    const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

    // Show alerts for out of stock products
    if (outOfStockProducts.length > 0) {
      toast.error(`${outOfStockProducts.length} منتجات نفدت من المخزون`, {
        description: outOfStockProducts.slice(0, 3).map(p => p.name).join("، "),
        duration: 8000,
      });
    }

    // Show alerts for low stock products
    if (lowStockProducts.length > 0) {
      toast.warning(`${lowStockProducts.length} منتجات قاربت على النفاد`, {
        description: lowStockProducts.slice(0, 3).map(p => `${p.name} (${p.stock_quantity})`).join("، "),
        duration: 6000,
      });
    }
  }, [products]);

  return {
    lowStockProducts: products?.filter(p => p.stock_quantity <= LOW_STOCK_THRESHOLD && p.stock_quantity > 0) || [],
    outOfStockProducts: products?.filter(p => p.stock_quantity === 0) || [],
  };
};
