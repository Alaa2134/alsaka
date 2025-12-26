import { Plus, FileText, Printer, Eye, BarChart3, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Save, MessageSquare } from "lucide-react";

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
    <div className="mt-8 space-y-6 animate-fade-in">
      {/* Total and Add Button Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Total Amount */}
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg text-foreground">إجمالي الفاتورة</span>
          <div className="bg-card border-3 border-primary rounded-xl px-8 py-3 min-w-[180px] text-center shadow-glow">
            <span className="text-3xl font-bold gradient-text">{totalAmount.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground mr-2">ج.م</span>
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={onAddItem}
          className="flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-glow hover:shadow-glow-lg group"
        >
          <Plus size={22} className="group-hover:scale-110 transition-transform" />
          إضافة صنف
        </button>
      </div>

      {/* Notes Section */}
      <div className="bg-muted/50 rounded-xl p-4">
        <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2 mb-3">
          <MessageSquare size={16} />
          ملاحظات
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="أضف ملاحظاتك هنا..."
          className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 text-foreground min-h-[100px] resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
        {/* Primary Actions */}
        <div className="flex items-center gap-3">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-success text-success-foreground px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50 group"
            >
              <Save size={20} className="group-hover:scale-110 transition-transform" />
              {isSaving ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </button>
          )}

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md group"
          >
            <FileText size={20} className="group-hover:scale-110 transition-transform" />
            فاتورة جديدة
          </button>

          {/* Navigation Arrows */}
          <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <button className="p-3 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <ChevronsRight size={20} />
            </button>
            <button className="p-3 hover:bg-muted transition-colors border-r border-border text-muted-foreground hover:text-foreground">
              <ChevronRight size={20} />
            </button>
            <button className="p-3 hover:bg-muted transition-colors border-r border-border text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} />
            </button>
            <button className="p-3 hover:bg-muted transition-colors border-r border-border text-muted-foreground hover:text-foreground">
              <ChevronsLeft size={20} />
            </button>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all group"
          >
            <Printer size={20} className="group-hover:scale-110 transition-transform" />
            طباعة
          </button>
          <button className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all group">
            <Eye size={20} className="group-hover:scale-110 transition-transform" />
            معاينة
          </button>
          <button className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all group">
            <BarChart3 size={20} className="group-hover:scale-110 transition-transform" />
            الأوامر
          </button>
        </div>
      </div>
    </div>
  );
};