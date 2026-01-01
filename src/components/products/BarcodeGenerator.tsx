import { useState, useRef, useCallback } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, RefreshCw, Copy, Check, Settings2, Maximize2, ZoomIn, ZoomOut, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeForPrint } from "@/utils/sanitizeHtml";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BarcodeGeneratorProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onBarcodeGenerated?: (barcode: string) => void;
}

const generateRandomBarcode = (type: "EAN13" | "CODE128" | "UPC" = "EAN13"): string => {
  if (type === "EAN13") {
    // Generate 12 digits, the 13th is checksum
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    // Calculate EAN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else if (type === "UPC") {
    // Generate 11 digits, 12th is checksum
    let code = "";
    for (let i = 0; i < 11; i++) {
      code += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else {
    // CODE128 - alphanumeric
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
};

// Default barcode settings saved in localStorage
const BARCODE_SETTINGS_KEY = "barcode_default_settings";

// Label size presets
interface LabelSize {
  id: string;
  name: string;
  width: string;
  height: string;
  fontSize: number;
  barcodeScale: number;
}

const LABEL_SIZES: LabelSize[] = [
  { id: "small", name: "صغير (25×15 مم)", width: "25mm", height: "15mm", fontSize: 6, barcodeScale: 0.4 },
  { id: "medium", name: "متوسط (40×25 مم)", width: "40mm", height: "25mm", fontSize: 8, barcodeScale: 0.6 },
  { id: "large", name: "كبير (58×40 مم)", width: "58mm", height: "40mm", fontSize: 10, barcodeScale: 0.8 },
  { id: "xlarge", name: "كبير جداً (70×50 مم)", width: "70mm", height: "50mm", fontSize: 12, barcodeScale: 1 },
  { id: "thermal-small", name: "حراري صغير (30×20 مم)", width: "30mm", height: "20mm", fontSize: 7, barcodeScale: 0.5 },
  { id: "thermal-large", name: "حراري كبير (50×30 مم)", width: "50mm", height: "30mm", fontSize: 9, barcodeScale: 0.7 },
  { id: "a4-grid", name: "ورقة A4 (65 ملصق)", width: "38.1mm", height: "21.2mm", fontSize: 8, barcodeScale: 0.5 },
  { id: "custom", name: "مخصص", width: "50mm", height: "30mm", fontSize: 10, barcodeScale: 0.7 },
];

interface BarcodeStyleSettings {
  barcodeWidth: number;
  barcodeHeight: number;
  barcodeFontSize: number;
  barcodeMargin: number;
  showValue: boolean;
  barcodeBackground: string;
  barcodeLineColor: string;
  labelSizeId: string;
  customLabelWidth: string;
  customLabelHeight: string;
  showProductName: boolean;
  showPrice: boolean;
}

const defaultBarcodeStyle: BarcodeStyleSettings = {
  barcodeWidth: 1.5,
  barcodeHeight: 50,
  barcodeFontSize: 12,
  barcodeMargin: 10,
  showValue: true,
  barcodeBackground: "#ffffff",
  barcodeLineColor: "#000000",
  labelSizeId: "medium",
  customLabelWidth: "50mm",
  customLabelHeight: "30mm",
  showProductName: true,
  showPrice: false,
};

const loadSavedSettings = (): BarcodeStyleSettings => {
  try {
    const saved = localStorage.getItem(BARCODE_SETTINGS_KEY);
    if (saved) {
      return { ...defaultBarcodeStyle, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Error loading barcode settings:", e);
  }
  return defaultBarcodeStyle;
};

export const BarcodeGenerator = ({ 
  open, 
  onClose, 
  product, 
  onBarcodeGenerated 
}: BarcodeGeneratorProps) => {
  const savedSettings = loadSavedSettings();
  
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [barcodeType, setBarcodeType] = useState<"EAN13" | "CODE128" | "UPC">("EAN13");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  
  // Fullscreen and print preview states
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Barcode style settings - load from saved
  const [barcodeWidth, setBarcodeWidth] = useState(savedSettings.barcodeWidth);
  const [barcodeHeight, setBarcodeHeight] = useState(savedSettings.barcodeHeight);
  const [barcodeFontSize, setBarcodeFontSize] = useState(savedSettings.barcodeFontSize);
  const [barcodeMargin, setBarcodeMargin] = useState(savedSettings.barcodeMargin);
  const [showValue, setShowValue] = useState(savedSettings.showValue);
  const [barcodeBackground, setBarcodeBackground] = useState(savedSettings.barcodeBackground);
  const [barcodeLineColor, setBarcodeLineColor] = useState(savedSettings.barcodeLineColor);
  
  // Label settings
  const [labelSizeId, setLabelSizeId] = useState(savedSettings.labelSizeId);
  const [customLabelWidth, setCustomLabelWidth] = useState(savedSettings.customLabelWidth);
  const [customLabelHeight, setCustomLabelHeight] = useState(savedSettings.customLabelHeight);
  const [showProductName, setShowProductName] = useState(savedSettings.showProductName);
  const [showPrice, setShowPrice] = useState(savedSettings.showPrice);

  const currentLabelSize = LABEL_SIZES.find(l => l.id === labelSizeId) || LABEL_SIZES[1];

  // Save current settings as default
  const saveAsDefault = () => {
    const settings: BarcodeStyleSettings = {
      barcodeWidth,
      barcodeHeight,
      barcodeFontSize,
      barcodeMargin,
      showValue,
      barcodeBackground,
      barcodeLineColor,
      labelSizeId,
      customLabelWidth,
      customLabelHeight,
      showProductName,
      showPrice,
    };
    localStorage.setItem(BARCODE_SETTINGS_KEY, JSON.stringify(settings));
    toast.success("تم حفظ الإعدادات كقالب افتراضي");
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setBarcodeWidth(defaultBarcodeStyle.barcodeWidth);
    setBarcodeHeight(defaultBarcodeStyle.barcodeHeight);
    setBarcodeFontSize(defaultBarcodeStyle.barcodeFontSize);
    setBarcodeMargin(defaultBarcodeStyle.barcodeMargin);
    setShowValue(defaultBarcodeStyle.showValue);
    setBarcodeBackground(defaultBarcodeStyle.barcodeBackground);
    setBarcodeLineColor(defaultBarcodeStyle.barcodeLineColor);
    setLabelSizeId(defaultBarcodeStyle.labelSizeId);
    setCustomLabelWidth(defaultBarcodeStyle.customLabelWidth);
    setCustomLabelHeight(defaultBarcodeStyle.customLabelHeight);
    setShowProductName(defaultBarcodeStyle.showProductName);
    setShowPrice(defaultBarcodeStyle.showPrice);
    toast.success("تم إعادة الإعدادات للقيم الافتراضية");
  };

  const handleGenerateNew = () => {
    const newBarcode = generateRandomBarcode(barcodeType);
    setBarcode(newBarcode);
  };

  const handleCopy = async () => {
    if (barcode) {
      await navigator.clipboard.writeText(barcode);
      setCopied(true);
      toast.success("تم نسخ الباركود");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = useCallback(() => {
    if (!barcodeRef.current || !barcode) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة");
      return;
    }

    // Sanitize barcode HTML and product name
    const barcodeHtml = sanitizeForPrint(barcodeRef.current.innerHTML);
    const productName = sanitizeForPrint(product?.name || "");
    const productPrice = product?.price ? `${product.price.toLocaleString()} ج.م` : "";

    const labelWidth = labelSizeId === "custom" ? customLabelWidth : currentLabelSize.width;
    const labelHeight = labelSizeId === "custom" ? customLabelHeight : currentLabelSize.height;
    const labelFontSize = currentLabelSize.fontSize;
    const scale = currentLabelSize.barcodeScale;

    const barcodeItemHtml = `
      <div class="barcode-item">
        ${showProductName ? `<div class="product-name">${productName}</div>` : ""}
        <div class="barcode-container">${barcodeHtml}</div>
        ${showPrice && productPrice ? `<div class="product-price">${productPrice}</div>` : ""}
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>طباعة الباركود - ${productName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            margin: 2mm;
            size: auto;
          }
          body { 
            font-family: Arial, sans-serif;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 2mm;
            padding: 2mm;
          }
          .barcode-item {
            width: ${labelWidth};
            height: ${labelHeight};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            border: 0.5px dashed #ccc;
            page-break-inside: avoid;
            overflow: hidden;
          }
          .product-name {
            font-size: ${labelFontSize}px;
            font-weight: bold;
            margin-bottom: 1mm;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-price {
            font-size: ${labelFontSize - 1}px;
            font-weight: bold;
            margin-top: 1mm;
            color: #333;
          }
          .barcode-container {
            transform: scale(${scale});
            transform-origin: center;
          }
          .barcode-container svg {
            max-width: 100%;
            height: auto;
          }
          @media print {
            .barcode-item { border: none; }
          }
        </style>
      </head>
      <body>
        ${Array(printQuantity).fill(barcodeItemHtml).join("")}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [barcode, product, printQuantity, labelSizeId, customLabelWidth, customLabelHeight, currentLabelSize, showProductName, showPrice]);

  const handleSave = () => {
    if (barcode && onBarcodeGenerated) {
      onBarcodeGenerated(barcode);
      toast.success("تم حفظ الباركود");
    }
    onClose();
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoomLevel(1);

  // Fullscreen Preview Component
  const FullscreenPreview = () => (
    <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الباركود - {product?.name}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOut size={16} />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom}>إعادة</Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center overflow-auto bg-muted/30 rounded-lg p-8">
          <div 
            className="transition-transform duration-200 p-8 rounded-lg shadow-lg"
            style={{ 
              transform: `scale(${zoomLevel})`,
              backgroundColor: barcodeBackground 
            }}
          >
            {barcode && (
              <div className="flex flex-col items-center gap-4">
                {product?.name && (
                  <div className="text-lg font-bold" style={{ color: barcodeLineColor }}>
                    {product.name}
                  </div>
                )}
                <Barcode
                  value={barcode}
                  format={barcodeType}
                  width={barcodeWidth}
                  height={barcodeHeight}
                  fontSize={barcodeFontSize}
                  margin={barcodeMargin}
                  displayValue={showValue}
                  background={barcodeBackground}
                  lineColor={barcodeLineColor}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-4 flex-shrink-0">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer size={16} />
            طباعة
          </Button>
          <Button variant="outline" onClick={() => setShowFullscreen(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Print Preview Component
  const PrintPreview = () => (
    <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الطباعة - {printQuantity} نسخة</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOut size={16} />
              </Button>
              <span className="text-sm min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn size={16} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 border rounded-lg bg-white p-4">
          <div 
            className="flex flex-wrap gap-4 justify-center transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {Array.from({ length: printQuantity }).map((_, index) => (
              <div 
                key={index}
                className="flex flex-col items-center p-3 border border-dashed border-gray-300 rounded"
                style={{ backgroundColor: barcodeBackground }}
              >
                {product?.name && (
                  <div className="text-xs font-bold mb-1 text-center max-w-[150px] truncate">
                    {product.name}
                  </div>
                )}
                <Barcode
                  value={barcode}
                  format={barcodeType}
                  width={barcodeWidth * 0.7}
                  height={barcodeHeight * 0.7}
                  fontSize={barcodeFontSize * 0.8}
                  margin={barcodeMargin * 0.5}
                  displayValue={showValue}
                  background={barcodeBackground}
                  lineColor={barcodeLineColor}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-4 flex-shrink-0">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer size={16} />
            طباعة الآن
          </Button>
          <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <FullscreenPreview />
      <PrintPreview />
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            إنشاء باركود
            {product && <span className="text-muted-foreground text-sm">- {product.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">الأساسي</TabsTrigger>
            <TabsTrigger value="label" className="flex items-center gap-1">
              <Printer size={14} />
              الملصق
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center gap-1">
              <Settings2 size={14} />
              التصميم
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Barcode Type */}
            <div>
              <Label>نوع الباركود</Label>
              <Select value={barcodeType} onValueChange={(v) => setBarcodeType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EAN13">EAN-13 (دولي)</SelectItem>
                  <SelectItem value="CODE128">CODE128 (متعدد)</SelectItem>
                  <SelectItem value="UPC">UPC (أمريكي)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Barcode Input */}
            <div>
              <Label>رقم الباركود</Label>
              <div className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="أدخل أو اضغط توليد"
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleGenerateNew} title="توليد جديد">
                  <RefreshCw size={16} />
                </Button>
                <Button variant="outline" size="icon" onClick={handleCopy} title="نسخ">
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>

            {/* Print Quantity */}
            <div>
              <Label>عدد النسخ للطباعة</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={printQuantity}
                onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </TabsContent>

          <TabsContent value="label" className="space-y-4 mt-4">
            {/* Label Size */}
            <div>
              <Label>حجم الملصق</Label>
              <Select value={labelSizeId} onValueChange={setLabelSizeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Size */}
            {labelSizeId === "custom" && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>العرض (مم)</Label>
                  <Input
                    value={customLabelWidth}
                    onChange={(e) => setCustomLabelWidth(e.target.value)}
                    placeholder="50mm"
                  />
                </div>
                <div>
                  <Label>الارتفاع (مم)</Label>
                  <Input
                    value={customLabelHeight}
                    onChange={(e) => setCustomLabelHeight(e.target.value)}
                    placeholder="30mm"
                  />
                </div>
              </div>
            )}

            {/* Label Content Options */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <Label className="cursor-pointer">إظهار اسم المنتج</Label>
                <Switch
                  checked={showProductName}
                  onCheckedChange={setShowProductName}
                />
              </div>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <Label className="cursor-pointer">إظهار السعر</Label>
                <Switch
                  checked={showPrice}
                  onCheckedChange={setShowPrice}
                />
              </div>
            </div>

            {/* Label Preview */}
            <div className="p-4 border rounded-lg bg-white">
              <Label className="text-xs text-muted-foreground mb-2 block">معاينة الملصق</Label>
              <div 
                className="mx-auto border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center p-2 overflow-hidden"
                style={{ 
                  width: labelSizeId === "custom" ? customLabelWidth : currentLabelSize.width,
                  height: labelSizeId === "custom" ? customLabelHeight : currentLabelSize.height,
                  maxWidth: "100%",
                  transform: "scale(0.9)",
                  transformOrigin: "center",
                }}
              >
                {showProductName && product?.name && (
                  <div 
                    className="font-bold text-center truncate w-full"
                    style={{ fontSize: `${currentLabelSize.fontSize}px` }}
                  >
                    {product.name}
                  </div>
                )}
                {barcode && (
                  <div style={{ transform: `scale(${currentLabelSize.barcodeScale * 0.6})` }}>
                    <Barcode
                      value={barcode}
                      format={barcodeType}
                      width={barcodeWidth}
                      height={barcodeHeight * 0.5}
                      fontSize={barcodeFontSize * 0.7}
                      margin={2}
                      displayValue={showValue}
                      background="transparent"
                      lineColor={barcodeLineColor}
                    />
                  </div>
                )}
                {showPrice && product?.price && (
                  <div 
                    className="font-bold"
                    style={{ fontSize: `${currentLabelSize.fontSize - 1}px` }}
                  >
                    {product.price.toLocaleString()} ج.م
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="style" className="space-y-4 mt-4">
            {/* Width */}
            <div>
              <Label className="flex justify-between">
                <span>عرض الخط</span>
                <span className="text-muted-foreground">{barcodeWidth}</span>
              </Label>
              <Slider
                value={[barcodeWidth]}
                onValueChange={(v) => setBarcodeWidth(v[0])}
                min={0.5}
                max={3}
                step={0.1}
              />
            </div>

            {/* Height */}
            <div>
              <Label className="flex justify-between">
                <span>الارتفاع</span>
                <span className="text-muted-foreground">{barcodeHeight}px</span>
              </Label>
              <Slider
                value={[barcodeHeight]}
                onValueChange={(v) => setBarcodeHeight(v[0])}
                min={20}
                max={100}
                step={5}
              />
            </div>

            {/* Font Size */}
            <div>
              <Label className="flex justify-between">
                <span>حجم الخط</span>
                <span className="text-muted-foreground">{barcodeFontSize}px</span>
              </Label>
              <Slider
                value={[barcodeFontSize]}
                onValueChange={(v) => setBarcodeFontSize(v[0])}
                min={8}
                max={24}
                step={1}
              />
            </div>

            {/* Margin */}
            <div>
              <Label className="flex justify-between">
                <span>الهامش</span>
                <span className="text-muted-foreground">{barcodeMargin}px</span>
              </Label>
              <Slider
                value={[barcodeMargin]}
                onValueChange={(v) => setBarcodeMargin(v[0])}
                min={0}
                max={30}
                step={2}
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>لون الخلفية</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={barcodeBackground}
                    onChange={(e) => setBarcodeBackground(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={barcodeBackground}
                    onChange={(e) => setBarcodeBackground(e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label>لون الخطوط</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={barcodeLineColor}
                    onChange={(e) => setBarcodeLineColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={barcodeLineColor}
                    onChange={(e) => setBarcodeLineColor(e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Show Value */}
            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
              <Label>إظهار الرقم أسفل الباركود</Label>
              <Switch
                checked={showValue}
                onCheckedChange={setShowValue}
              />
            </div>

            {/* Save/Reset Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={saveAsDefault} className="flex-1">
                حفظ كقالب افتراضي
              </Button>
              <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                إعادة تعيين
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Barcode Preview */}
        {barcode && (
          <div 
            className="flex flex-col items-center p-4 rounded-lg border relative group"
            style={{ backgroundColor: barcodeBackground }}
          >
            <div ref={barcodeRef}>
              <Barcode
                value={barcode}
                format={barcodeType}
                width={barcodeWidth}
                height={barcodeHeight}
                fontSize={barcodeFontSize}
                margin={barcodeMargin}
                displayValue={showValue}
                background={barcodeBackground}
                lineColor={barcodeLineColor}
              />
            </div>
            {/* Fullscreen button overlay */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowFullscreen(true)}
              title="ملء الشاشة"
            >
              <Maximize2 size={16} />
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1" disabled={!barcode}>
            حفظ الباركود
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPrintPreview(true)} 
            disabled={!barcode}
            className="flex items-center gap-2"
            title="معاينة الطباعة"
          >
            <Eye size={16} />
            معاينة
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePrint} 
            disabled={!barcode}
            className="flex items-center gap-2"
          >
            <Printer size={16} />
            طباعة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
