import { useRef, useCallback, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";
import { InvoiceTemplateSelector } from "./InvoiceTemplateSelector";
import { ClassicTemplate, ModernTemplate, MinimalTemplate, ThermalTemplate } from "./templates";
import { TemplateType, InvoiceData, InvoiceItemData, TenantData } from "./templates/types";
import { useDefaultTemplate, useInvoiceTemplates, TemplateSettings, defaultTemplateSettings } from "@/hooks/useInvoiceTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, FileText } from "lucide-react";
import { TomAndJerryLoader } from "@/components/shared/TomAndJerryLoader";
import { renderToStaticMarkup } from 'react-dom/server';
import { toast } from "sonner";

interface EmbeddedPrintViewProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceData;
  items: InvoiceItemData[];
  tenant?: TenantData | null;
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

export function EmbeddedPrintView({
  open,
  onClose,
  invoice,
  items,
  tenant,
  selectedTemplate,
  onSelectTemplate,
}: EmbeddedPrintViewProps) {
  const { data: defaultTemplate } = useDefaultTemplate();
  const { data: allTemplates } = useInvoiceTemplates();
  
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string | null>(null);
  const [useCustomTemplate, setUseCustomTemplate] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [printStatus, setPrintStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (defaultTemplate) {
      setUseCustomTemplate(true);
      setSelectedCustomTemplateId(defaultTemplate.id);
    }
  }, [defaultTemplate]);

  const selectedCustomTemplate = allTemplates?.find(t => t.id === selectedCustomTemplateId) || defaultTemplate;
  const templateSettings: TemplateSettings = selectedCustomTemplate?.settings || defaultTemplateSettings;

  // Generate complete HTML document for printing
  const generatePrintHTML = useCallback(() => {
    const props = { invoice, items, tenant };
    
    let templateElement;
    if (useCustomTemplate && templateSettings) {
      templateElement = <CustomTemplateRenderer settings={templateSettings} invoice={invoice} items={items} tenant={tenant} />;
    } else {
      switch (selectedTemplate) {
        case "modern":
          templateElement = <ModernTemplate {...props} />;
          break;
        case "minimal":
          templateElement = <MinimalTemplate {...props} />;
          break;
        case "thermal":
          templateElement = <ThermalTemplate {...props} />;
          break;
        default:
          templateElement = <ClassicTemplate {...props} />;
      }
    }

    const paperWidth = useCustomTemplate ? {
      a4: "210mm",
      a5: "148mm",
      thermal: "80mm",
    }[templateSettings.paperSize] : (selectedTemplate === "thermal" ? "80mm" : "210mm");

    const content = renderToStaticMarkup(templateElement);

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة رقم ${invoice.invoice_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      background: white;
      color: black;
      font-size: 14px;
      line-height: 1.5;
    }
    body {
      padding: 15mm;
    }
    @media print {
      html, body {
        padding: 0;
        margin: 0;
      }
      @page {
        size: ${paperWidth} auto;
        margin: 10mm;
      }
    }
    table { 
      border-collapse: collapse; 
      width: 100%;
      margin: 10px 0;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 10px 8px; 
      text-align: right;
      font-size: 13px;
    }
    th { 
      background-color: #2563eb; 
      color: white;
      font-weight: 700;
    }
    tr:nth-child(even) { 
      background-color: #f9fafb; 
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .text-primary { color: #2563eb; }
    .bg-primary { background-color: #2563eb; }
    .text-white { color: white; }
    .rounded-lg { border-radius: 8px; }
    .p-4 { padding: 16px; }
    .p-6 { padding: 24px; }
    .mb-4 { margin-bottom: 16px; }
    .mt-4 { margin-top: 16px; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .gap-4 { gap: 16px; }
    .gap-8 { gap: 32px; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-b-4 { border-bottom: 4px solid; }
    .pb-4 { padding-bottom: 16px; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-muted { color: #6b7280; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }, [invoice, items, tenant, selectedTemplate, useCustomTemplate, templateSettings]);

  // Update HTML content when dependencies change
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setPrintStatus('preparing');
      
      // Generate HTML content
      const html = generatePrintHTML();
      setHtmlContent(html);
      
      // Small delay to ensure rendering
      const timer = setTimeout(() => {
        setIsLoading(false);
        setPrintStatus('ready');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, generatePrintHTML]);

  // Direct print function - opens new window for reliable printing
  const handlePrint = useCallback(() => {
    if (!htmlContent) {
      toast.error('لا يوجد محتوى للطباعة');
      return;
    }
    
    setIsPrinting(true);
    setPrintStatus('preparing');
    
    try {
      // Method: Open new window and print
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      
      if (!printWindow) {
        toast.error('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
        setIsPrinting(false);
        setPrintStatus('error');
        return;
      }
      
      // Write content to new window
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for fonts and content to load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Close window after print dialog closes
          setTimeout(() => {
            printWindow.close();
            setIsPrinting(false);
            setPrintStatus('ready');
            toast.success('تم إرسال الفاتورة للطباعة');
          }, 500);
        }, 500);
      };
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            if (printWindow && !printWindow.closed) {
              printWindow.close();
            }
            setIsPrinting(false);
            setPrintStatus('ready');
          }, 1000);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('حدث خطأ أثناء الطباعة. جرب مرة أخرى.');
      setIsPrinting(false);
      setPrintStatus('error');
    }
  }, [htmlContent]);

  // Quick print using browser's native print
  const handleQuickPrint = useCallback(() => {
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position:fixed;right:-9999px;bottom:-9999px;width:0;height:0;border:none;';
    printFrame.name = 'printFrame_' + Date.now();
    document.body.appendChild(printFrame);
    
    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      toast.error('تعذر إنشاء إطار الطباعة');
      return;
    }
    
    setIsPrinting(true);
    
    frameWindow.document.open();
    frameWindow.document.write(htmlContent);
    frameWindow.document.close();
    
    // Wait for content to load
    setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (e) {
        console.error('Quick print error:', e);
        // Fallback to main print method
        handlePrint();
      }
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(printFrame);
        setIsPrinting(false);
      }, 1000);
    }, 500);
  }, [htmlContent, handlePrint]);

  const getPaperMaxWidth = () => {
    if (useCustomTemplate) {
      return {
        a4: "210mm",
        a5: "148mm",
        thermal: "80mm",
      }[templateSettings.paperSize];
    }
    return selectedTemplate === "thermal" ? "80mm" : "210mm";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              معاينة وطباعة الفاتورة
              {printStatus === 'ready' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {printStatus === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        {/* Controls */}
        <div className="flex-shrink-0 p-4 border-b bg-background space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={useCustomTemplate ? "custom" : "preset"}
              onValueChange={(v) => setUseCustomTemplate(v === "custom")}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="نوع القالب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset">قوالب جاهزة</SelectItem>
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <FileText size={14} />
                    قوالب مخصصة
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {!useCustomTemplate && (
              <InvoiceTemplateSelector
                selectedTemplate={selectedTemplate}
                onSelectTemplate={onSelectTemplate}
              />
            )}
            
            {useCustomTemplate && allTemplates && allTemplates.length > 0 && (
              <Select
                value={selectedCustomTemplateId || ""}
                onValueChange={(v) => setSelectedCustomTemplateId(v)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="اختر القالب" />
                </SelectTrigger>
                <SelectContent>
                  {allTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && <Star size={12} className="fill-yellow-500 text-yellow-500" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 mr-auto border rounded-lg p-1 bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="h-8 w-8 p-0"
              >
                <ZoomOut size={16} />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="h-8 w-8 p-0"
              >
                <ZoomIn size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(100)}
                className="h-8 w-8 p-0"
              >
                <RotateCcw size={16} />
              </Button>
            </div>
          </div>
          
          {/* Print Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handlePrint} 
              className="flex-1 flex items-center justify-center gap-2 h-12 text-lg"
              disabled={isPrinting || isLoading}
            >
              <Printer size={20} />
              {isPrinting ? 'جاري الطباعة...' : 'طباعة الفاتورة'}
            </Button>
            <Button 
              onClick={handleQuickPrint} 
              variant="outline"
              className="h-12 px-4"
              disabled={isPrinting || isLoading}
              title="طباعة سريعة"
            >
              <Printer size={18} />
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-800 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <TomAndJerryLoader text="جاري تجهيز الفاتورة..." size="md" />
            </div>
          ) : (
            <div 
              className="mx-auto bg-white shadow-2xl rounded-lg overflow-hidden transition-transform duration-200"
              style={{ 
                maxWidth: getPaperMaxWidth(),
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center'
              }}
            >
              {/* Preview using dangerouslySetInnerHTML for accurate representation */}
              <div 
                className="p-0"
                style={{ minHeight: '800px' }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Custom Template Renderer
const CustomTemplateRenderer = ({
  settings,
  invoice,
  items,
  tenant,
}: {
  settings: TemplateSettings;
  invoice: InvoiceData;
  items: InvoiceItemData[];
  tenant?: TenantData | null;
}) => {
  const fontSizeClass = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  }[settings.fontSize];

  const formatDate = (date: string) => new Date(date).toLocaleDateString("ar-EG");
  const formatTime = () => new Date().toLocaleTimeString("ar-EG");

  const renderElement = (element: string) => {
    switch (element) {
      case "header":
        return (
          <div
            key={element}
            className="text-center pb-4 mb-4 border-b-4"
            style={{ borderColor: settings.headerColor }}
          >
            {settings.showLogo && tenant?.logo_url && (
              <img src={tenant.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
            )}
            <h1 className="text-xl font-bold" style={{ color: settings.headerColor }}>
              {settings.companyName}
            </h1>
            <p className="text-muted">{settings.companyAddress}</p>
            <p className="text-muted">هاتف: {settings.companyPhone}</p>
          </div>
        );

      case "invoiceInfo":
        return (
          <div key={element} className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-100 rounded-lg">
            <div>
              <p><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</p>
              <p><strong>التاريخ:</strong> {formatDate(invoice.invoice_date)}</p>
              {settings.showTime && <p><strong>الوقت:</strong> {formatTime()}</p>}
            </div>
            <div>
              {settings.showClientName && invoice.clients?.name && (
                <p><strong>العميل:</strong> {invoice.clients.name}</p>
              )}
              {settings.showPaymentMethod && (
                <p><strong>طريقة الدفع:</strong> {invoice.payment_method}</p>
              )}
            </div>
          </div>
        );

      case "itemsTable":
        return (
          <table key={element} className="w-full mb-4">
            <thead>
              <tr style={{ backgroundColor: settings.headerColor }} className="text-white">
                <th className="p-2 text-right">#</th>
                {settings.showItemNumber && <th className="p-2 text-right">الكود</th>}
                <th className="p-2 text-right">الصنف</th>
                <th className="p-2 text-center">الكمية</th>
                <th className="p-2 text-left">السعر</th>
                <th className="p-2 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border">{index + 1}</td>
                  {settings.showItemNumber && <td className="p-2 border">{item.item_number}</td>}
                  <td className="p-2 border">{item.item_name}</td>
                  <td className="p-2 border text-center">{item.quantity}</td>
                  <td className="p-2 border text-left">{item.price.toFixed(2)}</td>
                  <td className="p-2 border text-left font-bold">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "totals":
        return (
          <div
            key={element}
            className="text-left p-4 rounded-lg mb-4"
            style={{ backgroundColor: settings.accentColor, color: "white" }}
          >
            <p className="text-xl font-bold">الإجمالي: {invoice.total_amount.toFixed(2)} ج.م</p>
          </div>
        );

      case "notes":
        return settings.showNotes && invoice.notes ? (
          <div key={element} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <strong>ملاحظات:</strong>
            <p>{invoice.notes}</p>
          </div>
        ) : null;

      case "signatures":
        return settings.showSignatures ? (
          <div key={element} className="grid grid-cols-2 gap-8 mb-4 mt-8">
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-8">البائع</div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-8">المستلم</div>
            </div>
          </div>
        ) : null;

      case "footer":
        return settings.showFooter ? (
          <div
            key={element}
            className="text-center p-4 mt-4 rounded-lg"
            style={{ backgroundColor: settings.headerColor, color: "white" }}
          >
            <p>{settings.footerText}</p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className={`p-6 ${fontSizeClass}`} dir="rtl">
      {settings.elementsOrder.map(renderElement)}
    </div>
  );
};
