import { useEffect, useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const ALERT_STORAGE_KEY = "stock_alert_settings";

interface StockAlertSettings {
  lowStockThreshold: number;
  enableAlerts: boolean;
  lastShownAt?: string;
}

export const useStockAlertSettings = () => {
  const [settings, setSettings] = useState<StockAlertSettings>(() => {
    const saved = localStorage.getItem(ALERT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD, enableAlerts: true };
  });

  const updateSettings = (newSettings: Partial<StockAlertSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(updated));
  };

  return { settings, updateSettings };
};

export const useLowStockAlerts = (customThreshold?: number) => {
  const { data: products } = useProducts();
  const { settings } = useStockAlertSettings();
  
  const threshold = customThreshold ?? settings.lowStockThreshold;

  useEffect(() => {
    if (!products || !settings.enableAlerts) return;

    // Check if we've shown alerts recently (within 5 minutes)
    const lastShown = settings.lastShownAt ? new Date(settings.lastShownAt) : null;
    const now = new Date();
    if (lastShown && (now.getTime() - lastShown.getTime()) < 5 * 60 * 1000) {
      return;
    }

    const lowStockProducts = products.filter(p => p.stock_quantity <= threshold && p.stock_quantity > 0);
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
      toast.warning(`${lowStockProducts.length} منتجات قاربت على النفاد (أقل من ${threshold})`, {
        description: lowStockProducts.slice(0, 3).map(p => `${p.name} (${p.stock_quantity})`).join("، "),
        duration: 6000,
      });
    }

    // Update last shown time
    if (outOfStockProducts.length > 0 || lowStockProducts.length > 0) {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify({ ...settings, lastShownAt: now.toISOString() }));
    }
  }, [products, threshold, settings]);

  return {
    lowStockProducts: products?.filter(p => p.stock_quantity <= threshold && p.stock_quantity > 0) || [],
    outOfStockProducts: products?.filter(p => p.stock_quantity === 0) || [],
    threshold,
  };
};
