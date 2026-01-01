import { useState, useRef, useCallback } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, RefreshCw, Copy, Check, Settings2, Maximize2, ZoomIn, ZoomOut, Eye, Save, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sanitizeForPrint } from "@/utils/sanitizeHtml";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLabelTemplates, useCreateLabelTemplate, useDeleteLabelTemplate, LabelSettings, LabelTemplate } from "@/hooks/useLabelTemplates";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

// Label design templates (local presets)
interface LabelDesignTemplate {
  id: string;
  name: string;
  description: string;
  style: {
    background: string;
    borderStyle: string;
    borderColor: string;
    borderWidth: string;
    borderRadius: string;
    textColor: string;
    fontWeight: string;
    textAlign: string;
    padding: string;
    shadow: string;
    gradient?: string;
  };
  showProductName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  priceStyle?: string;
}

const LABEL_DESIGN_TEMPLATES: LabelDesignTemplate[] = [
  {
    id: "classic",
    name: "كلاسيكي",
    description: "تصميم بسيط وأنيق",
    style: {
      background: "#ffffff",
      borderStyle: "solid",
      borderColor: "#000000",
      borderWidth: "1px",
      borderRadius: "0",
      textColor: "#000000",
      fontWeight: "bold",
      textAlign: "center",
      padding: "4px",
      shadow: "none",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
  },
  {
    id: "modern",
    name: "عصري",
    description: "تصميم حديث بزوايا مستديرة",
    style: {
      background: "#f8fafc",
      borderStyle: "solid",
      borderColor: "#e2e8f0",
      borderWidth: "2px",
      borderRadius: "8px",
      textColor: "#1e293b",
      fontWeight: "600",
      textAlign: "center",
      padding: "6px",
      shadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
  },
  {
    id: "minimal",
    name: "بسيط",
    description: "باركود فقط بدون إطار",
    style: {
      background: "#ffffff",
      borderStyle: "none",
      borderColor: "transparent",
      borderWidth: "0",
      borderRadius: "0",
      textColor: "#374151",
      fontWeight: "normal",
      textAlign: "center",
      padding: "2px",
      shadow: "none",
    },
    showProductName: false,
    showPrice: false,
    showBarcode: true,
  },
  {
    id: "elegant",
    name: "أنيق",
    description: "تصميم فاخر مع ظل",
    style: {
      background: "#fffbeb",
      borderStyle: "double",
      borderColor: "#d97706",
      borderWidth: "3px",
      borderRadius: "4px",
      textColor: "#92400e",
      fontWeight: "bold",
      textAlign: "center",
      padding: "8px",
      shadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
    priceStyle: "background: #fef3c7; padding: 2px 6px; border-radius: 4px;",
  },
  {
    id: "bold",
    name: "جريء",
    description: "تصميم بارز مع خلفية داكنة",
    style: {
      background: "#1f2937",
      borderStyle: "solid",
      borderColor: "#374151",
      borderWidth: "2px",
      borderRadius: "6px",
      textColor: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      padding: "6px",
      shadow: "0 2px 4px rgba(0,0,0,0.2)",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
  },
  {
    id: "retail",
    name: "تجاري",
    description: "مثالي للمتاجر مع سعر بارز",
    style: {
      background: "#ffffff",
      borderStyle: "solid",
      borderColor: "#dc2626",
      borderWidth: "2px",
      borderRadius: "0",
      textColor: "#111827",
      fontWeight: "bold",
      textAlign: "center",
      padding: "4px",
      shadow: "none",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
    priceStyle: "background: #dc2626; color: white; padding: 2px 8px; font-size: 110%;",
  },
  {
    id: "eco",
    name: "صديق للبيئة",
    description: "تصميم طبيعي بألوان خضراء",
    style: {
      background: "#f0fdf4",
      borderStyle: "dashed",
      borderColor: "#22c55e",
      borderWidth: "2px",
      borderRadius: "8px",
      textColor: "#166534",
      fontWeight: "600",
      textAlign: "center",
      padding: "6px",
      shadow: "none",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
  },
  {
    id: "premium",
    name: "فاخر",
    description: "تصميم ذهبي للمنتجات الفاخرة",
    style: {
      background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
      borderStyle: "solid",
      borderColor: "#ca8a04",
      borderWidth: "2px",
      borderRadius: "4px",
      textColor: "#713f12",
      fontWeight: "bold",
      textAlign: "center",
      padding: "8px",
      shadow: "0 4px 12px rgba(202, 138, 4, 0.2)",
      gradient: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
    },
    showProductName: true,
    showPrice: true,
    showBarcode: true,
    priceStyle: "background: linear-gradient(135deg, #ca8a04, #eab308); color: white; padding: 3px 10px; border-radius: 4px; font-weight: bold;",
  },
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
  labelTemplateId: string;
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
  labelTemplateId: "classic",
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
  
  // Database templates
  const { data: dbTemplates = [], isLoading: isLoadingTemplates } = useLabelTemplates();
  const createTemplate = useCreateLabelTemplate();
  const deleteTemplate = useDeleteLabelTemplate();
  
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [barcodeType, setBarcodeType] = useState<"EAN13" | "CODE128" | "UPC">("EAN13");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  
  // Fullscreen and print preview states
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Save template dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  
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
  const [labelTemplateId, setLabelTemplateId] = useState(savedSettings.labelTemplateId);

  const currentLabelSize = LABEL_SIZES.find(l => l.id === labelSizeId) || LABEL_SIZES[1];
  const currentTemplate = LABEL_DESIGN_TEMPLATES.find(t => t.id === labelTemplateId) || LABEL_DESIGN_TEMPLATES[0];

  // Save template to database
  const handleSaveTemplateToDb = () => {
    if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }
    
    const templateSettings: LabelSettings = {
      labelWidth: parseInt(customLabelWidth) || 50,
      labelHeight: parseInt(customLabelHeight) || 30,
      fontSize: currentLabelSize.fontSize,
      barcodeHeight,
      barcodeWidth,
      showProductName,
      showProductNumber: true,
      showPrice,
      showBarcodeText: showValue,
      columns: 4,
      gap: 5,
      templateStyle: currentTemplate.style,
      labelSizeId,
      customLabelWidth,
      customLabelHeight,
      barcodeMargin,
      barcodeFontSize,
      barcodeBackground,
      barcodeLineColor,
      showValue,
    };
    
    createTemplate.mutate({
      name: newTemplateName.trim(),
      settings: templateSettings,
      is_default: false,
    });
    
    setShowSaveDialog(false);
    setNewTemplateName("");
  };

  // Load template from database
  const handleLoadDbTemplate = (template: LabelTemplate) => {
    const s = template.settings;
    if (s.barcodeWidth) setBarcodeWidth(s.barcodeWidth);
    if (s.barcodeHeight) setBarcodeHeight(s.barcodeHeight);
    if (s.barcodeFontSize) setBarcodeFontSize(s.barcodeFontSize);
    if (s.barcodeMargin) setBarcodeMargin(s.barcodeMargin);
    if (s.showValue !== undefined) setShowValue(s.showValue);
    if (s.barcodeBackground) setBarcodeBackground(s.barcodeBackground);
    if (s.barcodeLineColor) setBarcodeLineColor(s.barcodeLineColor);
    if (s.labelSizeId) setLabelSizeId(s.labelSizeId);
    if (s.customLabelWidth) setCustomLabelWidth(s.customLabelWidth);
    if (s.customLabelHeight) setCustomLabelHeight(s.customLabelHeight);
    if (s.showProductName !== undefined) setShowProductName(s.showProductName);
    if (s.showPrice !== undefined) setShowPrice(s.showPrice);
    toast.success(`تم تحميل القالب: ${template.name}`);
  };

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
      labelTemplateId,
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
    setLabelTemplateId(defaultBarcodeStyle.labelTemplateId);
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
    const template = currentTemplate;

    const barcodeItemHtml = `
      <div class="barcode-item">
        ${currentTemplate.showProductName && showProductName ? `<div class="product-name">${productName}</div>` : ""}
        ${currentTemplate.showBarcode ? `<div class="barcode-container">${barcodeHtml}</div>` : ""}
        ${currentTemplate.showPrice && showPrice && productPrice ? `<div class="product-price" ${template.priceStyle ? `style="${template.priceStyle}"` : ""}>${productPrice}</div>` : ""}
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
            padding: ${template.style.padding};
            background: ${template.style.gradient || template.style.background};
            border: ${template.style.borderWidth} ${template.style.borderStyle} ${template.style.borderColor};
            border-radius: ${template.style.borderRadius};
            box-shadow: ${template.style.shadow};
            page-break-inside: avoid;
            overflow: hidden;
          }
          .product-name {
            font-size: ${labelFontSize}px;
            font-weight: ${template.style.fontWeight};
            color: ${template.style.textColor};
            margin-bottom: 1mm;
            text-align: ${template.style.textAlign};
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-price {
            font-size: ${labelFontSize - 1}px;
            font-weight: ${template.style.fontWeight};
            margin-top: 1mm;
            color: ${template.style.textColor};
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
            body { gap: 0; padding: 0; }
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
  }, [barcode, product, printQuantity, labelSizeId, customLabelWidth, customLabelHeight, currentLabelSize, showProductName, showPrice, currentTemplate]);

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
            {/* Label Template Selection */}
            <div>
              <Label className="mb-2 block">قالب التصميم</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                {LABEL_DESIGN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setLabelTemplateId(template.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-right ${
                      labelTemplateId === template.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    style={{
                      background: template.style.gradient || template.style.background,
                    }}
                  >
                    <div 
                      className="text-sm font-bold truncate"
                      style={{ color: template.style.textColor }}
                    >
                      {template.name}
                    </div>
                    <div 
                      className="text-xs opacity-75 truncate"
                      style={{ color: template.style.textColor }}
                    >
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
            <div className="space-y-3">
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

            {/* Saved Templates from Database */}
            {dbTemplates.length > 0 && (
              <div className="border-t pt-4">
                <Label className="mb-2 block flex items-center gap-2">
                  <FolderOpen size={16} />
                  قوالبك المحفوظة
                </Label>
                <div className="space-y-2 max-h-[120px] overflow-y-auto">
                  {dbTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadDbTemplate(template)}
                        className="flex-1 text-right text-sm font-medium hover:text-primary transition-colors"
                      >
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="mr-2 text-xs">افتراضي</Badge>
                        )}
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف القالب "{template.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate.mutate(template.id)}>
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Template Button */}
            <div className="border-t pt-4">
              {showSaveDialog ? (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <Label>اسم القالب الجديد</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="مثال: قالب المتجر"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveTemplateToDb}
                      disabled={createTemplate.isPending || !newTemplateName.trim()}
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <Save size={14} />
                      حفظ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSaveDialog(false);
                        setNewTemplateName("");
                      }}
                      size="sm"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full gap-2"
                >
                  <Save size={16} />
                  حفظ كقالب جديد
                </Button>
              )}
            </div>

            {/* Label Preview with Template */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label className="text-xs text-muted-foreground mb-3 block">معاينة الملصق</Label>
              <div className="flex justify-center">
                <div 
                  className="flex flex-col items-center justify-center overflow-hidden"
                  style={{ 
                    width: labelSizeId === "custom" ? customLabelWidth : currentLabelSize.width,
                    height: labelSizeId === "custom" ? customLabelHeight : currentLabelSize.height,
                    maxWidth: "100%",
                    background: currentTemplate.style.gradient || currentTemplate.style.background,
                    border: `${currentTemplate.style.borderWidth} ${currentTemplate.style.borderStyle} ${currentTemplate.style.borderColor}`,
                    borderRadius: currentTemplate.style.borderRadius,
                    boxShadow: currentTemplate.style.shadow,
                    padding: currentTemplate.style.padding,
                    transform: "scale(0.85)",
                    transformOrigin: "center",
                  }}
                >
                  {showProductName && currentTemplate.showProductName && product?.name && (
                    <div 
                      className="text-center truncate w-full"
                      style={{ 
                        fontSize: `${currentLabelSize.fontSize}px`,
                        fontWeight: currentTemplate.style.fontWeight,
                        color: currentTemplate.style.textColor,
                      }}
                    >
                      {product.name}
                    </div>
                  )}
                  {barcode && currentTemplate.showBarcode && (
                    <div style={{ transform: `scale(${currentLabelSize.barcodeScale * 0.5})` }}>
                      <Barcode
                        value={barcode}
                        format={barcodeType}
                        width={barcodeWidth}
                        height={barcodeHeight * 0.4}
                        fontSize={barcodeFontSize * 0.6}
                        margin={1}
                        displayValue={showValue}
                        background="transparent"
                        lineColor={currentTemplate.id === "bold" ? "#ffffff" : barcodeLineColor}
                      />
                    </div>
                  )}
                  {showPrice && currentTemplate.showPrice && product?.price && (
                    <div 
                      style={{ 
                        fontSize: `${currentLabelSize.fontSize - 1}px`,
                        fontWeight: currentTemplate.style.fontWeight,
                        color: currentTemplate.style.textColor,
                        ...(currentTemplate.priceStyle ? {} : {}),
                      }}
                    >
                      <span 
                        dangerouslySetInnerHTML={{ 
                          __html: currentTemplate.priceStyle 
                            ? `<span style="${currentTemplate.priceStyle}">${product.price.toLocaleString()} ج.م</span>` 
                            : `${product.price.toLocaleString()} ج.م` 
                        }} 
                      />
                    </div>
                  )}
                </div>
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
