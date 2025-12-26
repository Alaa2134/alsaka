import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useInvoices } from "@/hooks/useInvoices";
import { FileText, Eye, Printer, Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceWithClient {
  id: string;
  invoice_number: string;
  client_id: string | null;
  invoice_date: string;
  payment_method: string;
  total_amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  clients: { name: string } | null;
}

interface InvoiceItemData {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  min_price: number;
  total: number;
}

const InvoicesAdmin = () => {
  const { data: invoices, isLoading } = useInvoices();
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithClient | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const filteredInvoices = (invoices as InvoiceWithClient[] | undefined)?.filter(
    (inv) =>
      inv.invoice_number.includes(search) ||
      inv.clients?.name?.includes(search)
  );

  const handleViewInvoice = async (invoice: InvoiceWithClient) => {
    setSelectedInvoice(invoice);
    setIsLoadingItems(true);
    setIsDialogOpen(true);

    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      if (error) throw error;
      setInvoiceItems(items || []);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <Helmet>
        <title>إدارة الفواتير | نظام الفواتير</title>
        <meta name="description" content="إدارة وطباعة الفواتير" />
      </Helmet>

      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">إدارة الفواتير</h1>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="البحث برقم الفاتورة أو اسم العميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Invoices Table */}
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-invoice-table-header text-invoice-table-header-foreground">
                  <th className="px-4 py-3 text-right font-bold">رقم الفاتورة</th>
                  <th className="px-4 py-3 text-right font-bold">اسم العميل</th>
                  <th className="px-4 py-3 text-center font-bold">التاريخ</th>
                  <th className="px-4 py-3 text-center font-bold">طريقة الدفع</th>
                  <th className="px-4 py-3 text-center font-bold">الإجمالي</th>
                  <th className="px-4 py-3 text-center font-bold">الحالة</th>
                  <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredInvoices?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد فواتير
                    </td>
                  </tr>
                ) : (
                  filteredInvoices?.map((invoice, index) => (
                    <tr
                      key={invoice.id}
                      className={`${
                        index % 2 === 0 ? "bg-invoice-row-even" : "bg-invoice-row-odd"
                      } hover:bg-muted/50 transition-colors`}
                    >
                      <td className="px-4 py-3 font-semibold">{invoice.invoice_number}</td>
                      <td className="px-4 py-3">{invoice.clients?.name || "عميل غير محدد"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Calendar size={14} />
                          {formatDate(invoice.invoice_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{invoice.payment_method}</td>
                      <td className="px-4 py-3 text-center font-bold text-primary">
                        {Number(invoice.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {invoice.status === "completed" ? "مكتملة" : "معلقة"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                            className="text-primary hover:bg-primary/10"
                          >
                            <Eye size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout>

      {/* Print Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>فاتورة رقم {selectedInvoice?.invoice_number}</span>
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer size={18} />
                طباعة
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingItems ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري تحميل البيانات...
            </div>
          ) : selectedInvoice && (
            <InvoicePrintView
              invoice={selectedInvoice}
              items={invoiceItems}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoicesAdmin;
