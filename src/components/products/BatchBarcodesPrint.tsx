import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Printer, Settings, Tag } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";
import { LabelTemplateManager } from "./LabelTemplateManager";
import { useDefaultLabelTemplate, LabelSettings, defaultLabelSettings } from "@/hooks/useLabelTemplates";

interface BatchBarcodesPrintProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

const presetTemplates = {
  small: { labelWidth: 40, labelHeight: 25, fontSize: 8, barcodeHeight: 30, columns: 5 },
  medium: { labelWidth: 50, labelHeight: 30, fontSize: 10, barcodeHeight: 40, columns: 4 },
  large: { labelWidth: 70, labelHeight: 40, fontSize: 12, barcodeHeight: 50, columns: 3 },
  thermal: { labelWidth: 58, labelHeight: 40, fontSize: 11, barcodeHeight: 45, columns: 1 },
};

export const BatchBarcodesPrint = ({ open, onClose, products }: BatchBarcodesPrintProps) => {
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<LabelSettings>(defaultLabelSettings);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Load default template on mount
  const { data: defaultTemplate } = useDefaultLabelTemplate();
  
  useEffect(() => {
    if (defaultTemplate?.settings) {
      setSettings(defaultTemplate.settings);
    }
  }, [defaultTemplate]);

  const updateSetting = <K extends keyof LabelSettings>(key: K, value: LabelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: keyof typeof presetTemplates) => {
    setSettings(prev => ({ ...prev, ...presetTemplates[preset] }));
  };
  
  const handleLoadTemplate = (templateSettings: LabelSettings) => {
    setSettings(templateSettings);
  };
  
  const handleSaveCurrentAsTemplate = (): LabelSettings => {
    return settings;
  };

  const handlePrint = () => {
    if (products.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة");
      return;
    }

    const productsWithBarcode = products.filter(p => p.barcode);
    
    // Generate barcode HTML for all products
    const barcodesHtml = productsWithBarcode
      .flatMap((product, idx) => 
        Array(copiesPerProduct).fill(null).map((_, copyIdx) => `
          <div class="barcode-item" style="width: ${settings.labelWidth}mm; height: ${settings.labelHeight}mm;">
            ${settings.showProductName ? `<div class="product-name" style="font-size: ${settings.fontSize}px;">${product.name}</div>` : ''}
            ${settings.showProductNumber ? `<div class="product-number" style="font-size: ${settings.fontSize - 2}px;">${product.item_number}</div>` : ''}
            ${settings.showPrice ? `<div class="product-price" style="font-size: ${settings.fontSize}px;">${product.price.toFixed(2)}</div>` : ''}
            <div class="barcode-container">
              <svg id="barcode-${idx}-${copyIdx}"></svg>
            </div>
            ${settings.showBarcodeText ? `<div class="barcode-text" style="font-size: ${settings.fontSize - 2}px;">${product.barcode}</div>` : ''}
          </div>
        `)
      )
      .join("");

    const barcodeScripts = productsWithBarcode
      .flatMap((product, idx) =>
        Array(copiesPerProduct).fill(null).map((_, copyIdx) => `
          JsBarcode("#barcode-${idx}-${copyIdx}", "${product.barcode}", {
            format: "CODE128",
            width: ${settings.barcodeWidth},
            height: ${settings.barcodeHeight},
            displayValue: false,
            margin: 2
          });
        `)
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>طباعة ملصقات الباركود</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { margin: 3mm; }
          body { 
            font-family: Arial, sans-serif;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: ${settings.gap}mm;
            padding: 5mm;
          }
          .barcode-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2mm;
            border: 1px dashed #ccc;
            page-break-inside: avoid;
            overflow: hidden;
          }
          .product-name {
            font-weight: bold;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 1px;
          }
          .product-number {
            color: #666;
            margin-bottom: 2px;
          }
          .product-price {
            font-weight: bold;
            color: #333;
            margin-bottom: 2px;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          .barcode-text {
            font-family: monospace;
            margin-top: 1px;
          }
          @media print {
            .barcode-item { border: none; }
          }
        </style>
      </head>
      <body>
        ${barcodesHtml || '<p style="text-align:center;width:100%">لا توجد منتجات تحتوي على باركود</p>'}
        <script>
          ${barcodeScripts}
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const productsWithBarcode = products.filter(p => p.barcode);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer size={20} />
              طباعة ملصقات الباركود ({products.length} منتج)
            </span>
            <div className="flex items-center gap-2">
              <LabelTemplateManager
                currentSettings={settings}
                onLoadTemplate={handleLoadTemplate}
                onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={16} className="ml-1" />
                {showSettings ? "إخفاء" : "إعدادات"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-muted p-3 rounded-lg text-sm grid grid-cols-3 gap-2">
            <p>المحددة: <strong>{products.length}</strong></p>
            <p>بباركود: <strong className="text-primary">{productsWithBarcode.length}</strong></p>
            <p>بدون: <strong className="text-warning">{products.length - productsWithBarcode.length}</strong></p>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              {/* Presets */}
              <div>
                <Label className="text-sm mb-2 block">قوالب جاهزة</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(presetTemplates).map(preset => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset as keyof typeof presetTemplates)}
                    >
                      {preset === 'small' && 'صغير'}
                      {preset === 'medium' && 'متوسط'}
                      {preset === 'large' && 'كبير'}
                      {preset === 'thermal' && 'حراري'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Size Settings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">عرض الملصق (مم)</Label>
                  <Input
                    type="number"
                    min={20}
                    max={100}
                    value={settings.labelWidth}
                    onChange={(e) => updateSetting("labelWidth", parseInt(e.target.value) || 50)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">ارتفاع الملصق (مم)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={80}
                    value={settings.labelHeight}
                    onChange={(e) => updateSetting("labelHeight", parseInt(e.target.value) || 30)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">حجم الخط</Label>
                  <Input
                    type="number"
                    min={6}
                    max={16}
                    value={settings.fontSize}
                    onChange={(e) => updateSetting("fontSize", parseInt(e.target.value) || 10)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">ارتفاع الباركود</Label>
                  <Input
                    type="number"
                    min={20}
                    max={80}
                    value={settings.barcodeHeight}
                    onChange={(e) => updateSetting("barcodeHeight", parseInt(e.target.value) || 40)}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Display Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center justify-between bg-background rounded p-2">
                  <Label className="text-xs">اسم المنتج</Label>
                  <Switch
                    checked={settings.showProductName}
                    onCheckedChange={(checked) => updateSetting("showProductName", checked)}
                  />
                </div>
                <div className="flex items-center justify-between bg-background rounded p-2">
                  <Label className="text-xs">رقم الصنف</Label>
                  <Switch
                    checked={settings.showProductNumber}
                    onCheckedChange={(checked) => updateSetting("showProductNumber", checked)}
                  />
                </div>
                <div className="flex items-center justify-between bg-background rounded p-2">
                  <Label className="text-xs">السعر</Label>
                  <Switch
                    checked={settings.showPrice}
                    onCheckedChange={(checked) => updateSetting("showPrice", checked)}
                  />
                </div>
                <div className="flex items-center justify-between bg-background rounded p-2">
                  <Label className="text-xs">رقم الباركود</Label>
                  <Switch
                    checked={settings.showBarcodeText}
                    onCheckedChange={(checked) => updateSetting("showBarcodeText", checked)}
                  />
                </div>
              </div>

              {/* Layout Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">عدد الأعمدة</Label>
                  <Select
                    value={String(settings.columns)}
                    onValueChange={(v) => updateSetting("columns", parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} أعمدة</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">المسافة بين الملصقات (مم)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={settings.gap}
                    onChange={(e) => updateSetting("gap", parseInt(e.target.value) || 5)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Copies per product */}
          <div>
            <Label>عدد النسخ لكل منتج</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={copiesPerProduct}
              onChange={(e) => setCopiesPerProduct(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Preview */}
          <div ref={previewRef} className="max-h-40 overflow-y-auto border rounded p-2 bg-white">
            <div 
              className="flex flex-wrap justify-center"
              style={{ gap: `${settings.gap}mm` }}
            >
              {productsWithBarcode.slice(0, 4).map(product => (
                <div 
                  key={product.id} 
                  className="text-center p-2 border rounded bg-gray-50"
                  style={{ 
                    width: `${settings.labelWidth}mm`,
                    minHeight: `${settings.labelHeight}mm`,
                    fontSize: `${settings.fontSize}px`
                  }}
                >
                  {settings.showProductName && (
                    <div className="font-bold truncate">{product.name}</div>
                  )}
                  {settings.showProductNumber && (
                    <div className="text-gray-500" style={{ fontSize: `${settings.fontSize - 2}px` }}>
                      {product.item_number}
                    </div>
                  )}
                  {settings.showPrice && (
                    <div className="font-semibold">{product.price.toFixed(2)}</div>
                  )}
                  <div className="bg-gray-200 h-6 my-1 flex items-center justify-center text-xs text-gray-400">
                    [باركود]
                  </div>
                  {settings.showBarcodeText && (
                    <div className="font-mono" style={{ fontSize: `${settings.fontSize - 2}px` }}>
                      {product.barcode}
                    </div>
                  )}
                </div>
              ))}
              {productsWithBarcode.length > 4 && (
                <div className="flex items-center text-muted-foreground text-sm">
                  +{productsWithBarcode.length - 4} المزيد
                </div>
              )}
            </div>
          </div>

          {/* Total labels */}
          <div className="text-center text-sm text-muted-foreground">
            إجمالي الملصقات: <strong>{productsWithBarcode.length * copiesPerProduct}</strong>
            {" | "}
            الحجم: <strong>{settings.labelWidth}×{settings.labelHeight} مم</strong>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1" disabled={productsWithBarcode.length === 0}>
              <Printer size={16} className="ml-2" />
              طباعة الملصقات
            </Button>
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
