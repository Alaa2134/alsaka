import { Plus, FileText, Printer, Save, MessageSquare } from "lucide-react";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Total Amount */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground">الإجمالي:</span>
          <div className="bg-primary/10 border-2 border-primary rounded-lg px-6 py-2 min-w-[140px] text-center">
            <span className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground mr-1">ج.م</span>
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={onAddItem}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all text-sm"
        >
          <Plus size={18} />
          إضافة صنف
        </button>
      </div>

      {/* Notes Section - Compact */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
          <MessageSquare size={12} />
          ملاحظات
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="ملاحظات..."
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm min-h-[60px] resize-none focus:border-primary focus:outline-none transition-all"
        />
      </div>

      {/* Action Buttons - Simplified */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        {/* Primary Actions */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </button>
          )}

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all text-sm"
          >
            <FileText size={16} />
            فاتورة جديدة
          </button>
        </div>

        {/* Print Button */}
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all text-sm"
        >
          <Printer size={16} />
          طباعة
        </button>
      </div>
    </div>
  );
};
