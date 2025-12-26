import { Plus, FileText, Printer, Eye, BarChart3, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Save } from "lucide-react";

interface InvoiceFooterProps {
  totalAmount: number;
  onNewInvoice: () => void;
  onAddItem: () => void;
  onPrint: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
}

export const InvoiceFooter = ({
  totalAmount,
  onNewInvoice,
  onAddItem,
  onPrint,
  onSave,
  isSaving,
  notes,
  onNotesChange,
}: InvoiceFooterProps) => {
  return (
    <div className="mt-6 space-y-4 animate-fade-in">
      {/* Total and Add Button Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Total Amount */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-foreground">اجمالي الفاتورة</span>
          <div className="bg-invoice-input-field border-2 border-primary rounded-md px-6 py-2 min-w-[150px] text-center">
            <span className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={onAddItem}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={20} />
          إضافة صنف
        </button>
      </div>

      {/* Notes Section */}
      <div className="flex items-start gap-3">
        <label className="font-semibold text-foreground pt-2 min-w-[80px]">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="أضف ملاحظاتك هنا..."
          className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground min-h-[80px] resize-none focus:ring-2 focus:ring-primary focus:outline-none transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </button>
          )}

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:bg-primary/90 transition-all shadow-md"
          >
            <FileText size={18} />
            فاتورة جديدة
          </button>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1 bg-invoice-nav-btn rounded-md overflow-hidden">
            <button className="p-2 hover:bg-invoice-nav-btn-hover transition-colors">
              <ChevronsRight size={18} />
            </button>
            <button className="p-2 hover:bg-invoice-nav-btn-hover transition-colors border-r border-border/30">
              <ChevronRight size={18} />
            </button>
            <button className="p-2 hover:bg-invoice-nav-btn-hover transition-colors border-r border-border/30">
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 hover:bg-invoice-nav-btn-hover transition-colors border-r border-border/30">
              <ChevronsLeft size={18} />
            </button>
          </div>
        </div>

        {/* Print and View Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 bg-invoice-nav-btn text-foreground px-4 py-2 rounded-md font-semibold hover:bg-invoice-nav-btn-hover transition-all"
          >
            <Printer size={18} />
            طباعة
          </button>
          <button className="flex flex-col items-center gap-1 bg-invoice-nav-btn text-foreground px-4 py-2 rounded-md font-semibold hover:bg-invoice-nav-btn-hover transition-all">
            <Eye size={18} />
            <span className="text-xs">معاينة الفاتورة</span>
          </button>
          <button className="flex flex-col items-center gap-1 bg-invoice-nav-btn text-foreground px-4 py-2 rounded-md font-semibold hover:bg-invoice-nav-btn-hover transition-all">
            <BarChart3 size={18} />
            <span className="text-xs">معاينة الأوامر بالكميات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
