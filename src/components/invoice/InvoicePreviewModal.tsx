import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceTemplateSelector } from "./InvoiceTemplateSelector";
import { ClassicTemplate, ModernTemplate, MinimalTemplate, ThermalTemplate } from "./templates";
import { TemplateType, InvoiceData, InvoiceItemData, TenantData } from "./templates/types";
import { Printer, X } from "lucide-react";
import { useRef } from "react";

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

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
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
          <InvoiceTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={onSelectTemplate}
          />
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl font-semibold hover:opacity-90 transition-all"
          >
            <Printer size={18} />
            طباعة
          </button>
        </div>

        <div className="flex-1 overflow-auto border rounded-xl bg-gray-100 p-4 mt-4">
          <div ref={printRef} className="bg-white shadow-lg mx-auto" style={{ maxWidth: selectedTemplate === "thermal" ? "80mm" : "210mm" }}>
            {renderTemplate()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
