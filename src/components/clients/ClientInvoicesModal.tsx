import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClientInvoices } from "@/hooks/useInvoices";
import { ChevronRight, ChevronLeft, FileText, Calendar, DollarSign, Printer } from "lucide-react";
import { Client } from "@/hooks/useClients";

interface ClientInvoicesModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
}

export const ClientInvoicesModal = ({ open, onClose, client }: ClientInvoicesModalProps) => {
  const { data: invoices, isLoading } = useClientInvoices(client?.id || null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentInvoice = invoices?.[currentIndex];
  const totalInvoices = invoices?.length || 0;

  const goNext = () => {
    if (currentIndex < totalInvoices - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePrint = () => {
    if (!currentInvoice) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة رقم ${currentInvoice.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background: #3b82f6; color: white; }
            .header { text-align: center; margin-bottom: 20px; }
            .total { font-size: 1.5em; font-weight: bold; text-align: left; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فاتورة رقم ${currentInvoice.invoice_number}</h1>
            <p>العميل: ${client?.name}</p>
            <p>التاريخ: ${new Date(currentInvoice.invoice_date).toLocaleDateString("ar-EG")}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${currentInvoice.invoice_items?.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.item_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${item.total.toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">الإجمالي: ${currentInvoice.total_amount.toFixed(2)} ج.م</div>
          <script>setTimeout(() => { window.print(); window.close(); }, 300);</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            فواتير العميل: {client?.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : totalInvoices === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">لا توجد فواتير لهذا العميل</p>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={currentIndex === 0}
              >
                <ChevronRight size={18} />
                السابقة
              </Button>
              
              <span className="font-semibold">
                فاتورة {currentIndex + 1} من {totalInvoices}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={currentIndex === totalInvoices - 1}
              >
                التالية
                <ChevronLeft size={18} />
              </Button>
            </div>

            {/* Invoice Details */}
            {currentInvoice && (
              <div className="flex-1 overflow-auto space-y-4">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">رقم الفاتورة</p>
                    <p className="font-bold text-primary">{currentInvoice.invoice_number}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      التاريخ
                    </div>
                    <p className="font-semibold">{new Date(currentInvoice.invoice_date).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                    <p className="font-semibold">{currentInvoice.payment_method}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign size={12} />
                      الإجمالي
                    </div>
                    <p className="font-bold text-green-600">{currentInvoice.total_amount.toFixed(2)} ج.م</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-right font-bold">#</th>
                        <th className="px-3 py-2 text-right font-bold">الكود</th>
                        <th className="px-3 py-2 text-right font-bold">الصنف</th>
                        <th className="px-3 py-2 text-center font-bold">الكمية</th>
                        <th className="px-3 py-2 text-center font-bold">السعر</th>
                        <th className="px-3 py-2 text-center font-bold">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInvoice.invoice_items?.map((item: any, index: number) => (
                        <tr key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{item.item_number}</td>
                          <td className="px-3 py-2">{item.item_name}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-center">{item.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-semibold">{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                {currentInvoice.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                    <p className="text-sm">{currentInvoice.notes}</p>
                  </div>
                )}

                {/* Print Button */}
                <Button onClick={handlePrint} className="w-full">
                  <Printer size={18} className="ml-2" />
                  طباعة هذه الفاتورة
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};