import { AlertTriangle, Package, XCircle } from "lucide-react";
import { useLowStockAlerts } from "@/hooks/useLowStockAlerts";

export const StockAlerts = () => {
  const { lowStockProducts, outOfStockProducts } = useLowStockAlerts();

  if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Out of Stock Alert */}
      {outOfStockProducts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="font-bold text-destructive">
              {outOfStockProducts.length} منتجات نفدت من المخزون
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {outOfStockProducts.slice(0, 5).map((product) => (
              <span
                key={product.id}
                className="bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm"
              >
                {product.name}
              </span>
            ))}
            {outOfStockProducts.length > 5 && (
              <span className="text-destructive text-sm">
                +{outOfStockProducts.length - 5} أخرى
              </span>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="font-bold text-warning">
              {lowStockProducts.length} منتجات قاربت على النفاد
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 5).map((product) => (
              <span
                key={product.id}
                className="bg-warning/20 text-warning px-3 py-1 rounded-full text-sm flex items-center gap-1"
              >
                <Package size={12} />
                {product.name} ({product.stock_quantity})
              </span>
            ))}
            {lowStockProducts.length > 5 && (
              <span className="text-warning text-sm">
                +{lowStockProducts.length - 5} أخرى
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
