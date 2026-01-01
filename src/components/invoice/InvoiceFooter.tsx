import { Plus, FileText, Printer, Save, MessageSquare, Edit } from "lucide-react";

interface InvoiceFooterProps {
  totalAmount: number;
  onNewInvoice: () => void;
  onAddItem: () => void;
  onPrint: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isEditing?: boolean;
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
  isEditing,
  notes,
  onNotesChange,
}: InvoiceFooterProps) => {
  return (
    <div className="mt-4 space-y-3">
      {/* Total and Add Button Row - Compact */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Total Amount */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm">الإجمالي:</span>
          <div className="bg-primary/10 border border-primary rounded px-3 py-1 min-w-[100px] text-center">
            <span className="text-lg font-bold text-primary">{totalAmount.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground mr-1">ج.م</span>
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={onAddItem}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium hover:bg-primary/90 transition-all text-xs"
        >
          <Plus size={14} />
          صنف
        </button>
      </div>

      {/* Notes Section - Compact */}
      <div className="bg-muted/30 rounded px-2 py-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
          <MessageSquare size={10} />
          ملاحظات
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="ملاحظات..."
          className="w-full bg-card border border-border rounded px-2 py-1.5 text-foreground text-xs min-h-[40px] resize-none focus:border-primary focus:outline-none transition-all"
        />
      </div>

      {/* Action Buttons - Very Compact */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
        {/* Primary Actions */}
        <div className="flex items-center gap-1.5">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={`flex items-center gap-1 ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white px-2.5 py-1.5 rounded font-medium transition-all text-xs disabled:opacity-50`}
            >
              {isEditing ? <Edit size={12} /> : <Save size={12} />}
              {isSaving ? "..." : isEditing ? "تحديث" : "حفظ"}
            </button>
          )}

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 rounded font-medium hover:bg-primary/90 transition-all text-xs"
          >
            <FileText size={12} />
            جديدة
          </button>
        </div>

        {/* Print Button */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2.5 py-1.5 rounded font-medium hover:bg-secondary/80 transition-all text-xs"
        >
          <Printer size={12} />
          طباعة
        </button>
      </div>
    </div>
  );
};
