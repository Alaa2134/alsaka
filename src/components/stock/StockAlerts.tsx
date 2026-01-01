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
    <div className="space-y-2 mb-4">
      {/* Compact Settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Bell size={12} />
          <span>حد: {threshold}</span>
        </div>
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings size={12} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">إعدادات التنبيهات</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAlerts" className="text-xs">تفعيل</Label>
                <Switch
                  id="enableAlerts"
                  checked={settings.enableAlerts}
                  onCheckedChange={(checked) => updateSettings({ enableAlerts: checked })}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="threshold" className="text-xs">حد المخزون</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(parseInt(e.target.value) || 10)}
                  className="h-8 text-sm"
                />
              </div>
              
              <Button onClick={handleSaveSettings} className="w-full h-7 text-xs">
                حفظ
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {!settings.enableAlerts && (
        <div className="flex items-center gap-1 text-muted-foreground text-xs px-2 py-1 bg-muted/50 rounded">
          <BellOff size={12} />
          <span>التنبيهات معطلة</span>
        </div>
      )}

      {settings.enableAlerts && (
        <div className="flex flex-wrap gap-2">
          {/* Out of Stock - Compact */}
          {outOfStockProducts.length > 0 && (
            <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/30 rounded-lg px-2 py-1 text-xs">
              <XCircle className="w-3 h-3 text-destructive" />
              <span className="font-medium text-destructive">
                {outOfStockProducts.length} نفدت
              </span>
            </div>
          )}

          {/* Low Stock - Compact */}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-1 bg-warning/10 border border-warning/30 rounded-lg px-2 py-1 text-xs">
              <AlertTriangle className="w-3 h-3 text-warning" />
              <span className="font-medium text-warning">
                {lowStockProducts.length} قاربت
              </span>
            </div>
          )}

          {/* All Good - Compact */}
          {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
            <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1 text-xs">
              <Package className="w-3 h-3 text-green-600" />
              <span className="text-green-700">مخزون كافي</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
