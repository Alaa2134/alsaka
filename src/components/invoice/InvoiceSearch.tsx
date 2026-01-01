import { useState, forwardRef } from "react";
import { Search, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { TemplateType } from "./templates/types";
import { useAuth } from "@/contexts/AuthContext";

interface InvoiceSearchProps {
  open: boolean;
  onClose: () => void;
  onLoadInvoice?: (invoice: InvoiceResult, items: InvoiceItemResult[]) => void;
}

interface InvoiceResult {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  payment_method: string;
  notes: string | null;
  clients: { name: string } | null;
}

interface InvoiceItemResult {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  min_price: number;
  total: number;
}

export const InvoiceSearch = forwardRef<HTMLDivElement, InvoiceSearchProps>(({ open, onClose, onLoadInvoice }, ref) => {
  const { tenant } = useAuth();
  const [searchNumber, setSearchNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<InvoiceResult[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResult | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("classic");

  const handleSearch = async () => {
    if (!searchNumber.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, payment_method, notes, clients(name)")
        .ilike("invoice_number", `%${searchNumber}%`)
        .order("invoice_date", { ascending: false })
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (data?.length === 0) {
        // No results found message handled in UI
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewInvoice = async (invoice: InvoiceResult) => {
    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("id, item_number, item_name, quantity, price, min_price, total")
        .eq("invoice_id", invoice.id);

      if (error) throw error;

      setSelectedInvoice(invoice);
      setInvoiceItems(items || []);
      setShowPreview(true);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
    }
  };

  const tenantData = tenant ? {
    id: tenant.id,
    name: tenant.name,
    logo_url: tenant.logo_url,
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
  } : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              البحث عن فاتورة برقمها
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="أدخل رقم الفاتورة..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10"
                  autoFocus
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "بحث"
                )}
              </Button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto max-h-[400px]">
              {isSearching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                  جاري البحث...
                </div>
              ) : searchResults.length === 0 && searchNumber ? (
                <div className="text-center py-8 text-muted-foreground">
                  لم يتم العثور على فواتير
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <div className="bg-primary/10 text-primary font-bold px-2 py-1 rounded text-sm">
                          #{invoice.invoice_number}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {invoice.clients?.name || "بدون عميل"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString("ar-EG")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left">
                          <div className="font-bold text-sm">
                            {invoice.total_amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {invoice.payment_method}
                          </div>
                        </div>
                        {onLoadInvoice && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { data: items } = await supabase
                                .from("invoice_items")
                                .select("id, item_number, item_name, quantity, price, min_price, total")
                                .eq("invoice_id", invoice.id);
                              onLoadInvoice(invoice, items || []);
                              onClose();
                            }}
                          >
                            تحميل
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview */}
      {selectedInvoice && (
        <InvoicePreviewModal
          open={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedInvoice(null);
          }}
          invoice={{
            id: selectedInvoice.id,
            invoice_number: selectedInvoice.invoice_number,
            invoice_date: selectedInvoice.invoice_date,
            payment_method: selectedInvoice.payment_method,
            total_amount: selectedInvoice.total_amount,
            notes: selectedInvoice.notes,
            clients: selectedInvoice.clients,
          }}
          items={invoiceItems}
          tenant={tenantData}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />
      )}
    </>
  );
});

InvoiceSearch.displayName = "InvoiceSearch";
