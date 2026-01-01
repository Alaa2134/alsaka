import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceTemplateSelector } from "./InvoiceTemplateSelector";
import { ClassicTemplate, ModernTemplate, MinimalTemplate, ThermalTemplate } from "./templates";
import { TemplateType, InvoiceData, InvoiceItemData, TenantData } from "./templates/types";
import { Printer, X, FileText } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useDefaultTemplate, TemplateSettings, defaultTemplateSettings } from "@/hooks/useInvoiceTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface InvoicePreviewModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceData;
  items: InvoiceItemData[];
  tenant?: TenantData | null;
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

export const InvoicePreviewModal = ({
  open,
  onClose,
  invoice,
  items,
  tenant,
  selectedTemplate,
  onSelectTemplate,
}: InvoicePreviewModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: defaultTemplate } = useDefaultTemplate();
  
  // Automatically use custom template if there's a default template saved
  const [useCustomTemplate, setUseCustomTemplate] = useState(true);
  
  // Update state when defaultTemplate loads
  useEffect(() => {
    if (defaultTemplate) {
      setUseCustomTemplate(true);
    }
  }, [defaultTemplate]);

  const templateSettings: TemplateSettings = defaultTemplate?.settings || defaultTemplateSettings;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const paperWidth = useCustomTemplate ? {
          a4: "210mm",
          a5: "148mm",
          thermal: "80mm",
        }[templateSettings.paperSize] : (selectedTemplate === "thermal" ? "80mm" : "210mm");
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>فاتورة رقم ${invoice.invoice_number}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
              body { font-family: 'Cairo', sans-serif; }
              @page { size: ${paperWidth} auto; margin: 10mm; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const renderTemplate = () => {
    const props = { invoice, items, tenant };
    
    if (useCustomTemplate && templateSettings) {
      return <CustomTemplateRenderer settings={templateSettings} invoice={invoice} items={items} tenant={tenant} />;
    }
    
    switch (selectedTemplate) {
      case "modern":
        return <ModernTemplate {...props} />;
      case "minimal":
        return <MinimalTemplate {...props} />;
      case "thermal":
        return <ThermalTemplate {...props} />;
      default:
        return <ClassicTemplate {...props} />;
    }
  };

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>معاينة الفاتورة</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <Select
              value={useCustomTemplate ? "custom" : "preset"}
              onValueChange={(v) => setUseCustomTemplate(v === "custom")}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع القالب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset">قوالب جاهزة</SelectItem>
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <FileText size={14} />
                    القالب المخصص
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
            
            {useCustomTemplate && defaultTemplate && (
              <span className="text-sm text-muted-foreground">
                القالب: {defaultTemplate.name}
              </span>
            )}
          </div>
          
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer size={18} />
            طباعة
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-xl bg-gray-100 p-4 mt-4">
          <div ref={printRef} className="bg-white shadow-lg mx-auto" style={{ maxWidth: getPaperMaxWidth() }}>
            {renderTemplate()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
            <p className="text-muted-foreground">{settings.companyAddress}</p>
            <p className="text-muted-foreground">هاتف: {settings.companyPhone}</p>
          </div>
        );

      case "invoiceInfo":
        return (
          <div key={element} className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-100 rounded-lg">
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
          <table key={element} className="w-full border-collapse mb-4">
            <thead>
              <tr style={{ backgroundColor: settings.headerColor }} className="text-white">
                <th className="border p-2 text-right">#</th>
                {settings.showItemNumber && <th className="border p-2 text-right">الكود</th>}
                <th className="border p-2 text-right">الصنف</th>
                <th className="border p-2 text-center">الكمية</th>
                <th className="border p-2 text-left">السعر</th>
                <th className="border p-2 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border p-2">{index + 1}</td>
                  {settings.showItemNumber && <td className="border p-2">{item.item_number}</td>}
                  <td className="border p-2">{item.item_name}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-left">{item.price.toFixed(2)}</td>
                  <td className="border p-2 text-left">{item.total.toFixed(2)}</td>
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
          <div key={element} className="mb-4 p-3 bg-gray-50 rounded-lg">
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
            className="text-center py-3 mt-4"
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
