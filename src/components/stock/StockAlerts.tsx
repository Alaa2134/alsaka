import { useState } from "react";
import { AlertTriangle, Package, XCircle, Settings, Bell, BellOff } from "lucide-react";
import { useLowStockAlerts, useStockAlertSettings } from "@/hooks/useLowStockAlerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const StockAlerts = () => {
  const { settings, updateSettings } = useStockAlertSettings();
  const { lowStockProducts, outOfStockProducts, threshold } = useLowStockAlerts();
  const [showSettings, setShowSettings] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(settings.lowStockThreshold);

  const handleSaveSettings = () => {
    updateSettings({ lowStockThreshold: tempThreshold });
    setShowSettings(false);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Settings Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={14} />
          <span>حد التنبيه: {threshold} قطعة</span>
        </div>
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <h4 className="font-semibold">إعدادات التنبيهات</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAlerts">تفعيل التنبيهات</Label>
                <Switch
                  id="enableAlerts"
                  checked={settings.enableAlerts}
                  onCheckedChange={(checked) => updateSettings({ enableAlerts: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="threshold">حد المخزون المنخفض</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">
                  سيتم التنبيه عند وصول المخزون لهذا الحد أو أقل
                </p>
              </div>
              
              <Button onClick={handleSaveSettings} className="w-full" size="sm">
                حفظ الإعدادات
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!settings.enableAlerts && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/50 rounded-lg">
          <BellOff size={16} />
          <span>التنبيهات معطلة</span>
        </div>
      )}

      {settings.enableAlerts && (
        <>
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

          {/* All Good */}
          {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">جميع المنتجات متوفرة بكميات كافية</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
