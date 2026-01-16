import { Plus, FileText, Printer, Save, MessageSquare, Edit, MessageCircle, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InvoiceFooterProps {
  totalAmount: number;
  onNewInvoice: () => void;
  onAddItem: () => void;
  onPrint: () => void;
  onSave?: () => void;
  onSendWhatsApp?: () => void;
  isSaving?: boolean;
  isEditing?: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  clientPhone?: string;
  clientName?: string;
  whatsappConnected?: boolean;
}

export const InvoiceFooter = ({
  totalAmount,
  onNewInvoice,
  onAddItem,
  onPrint,
  onSave,
  onSendWhatsApp,
  isSaving,
  isEditing,
  notes,
  onNotesChange,
  clientPhone,
  clientName,
  whatsappConnected = true,
}: InvoiceFooterProps) => {
  const handleWhatsAppClick = () => {
    if (!clientPhone) {
      toast.error("يرجى إدخال رقم هاتف العميل أولاً");
      return;
    }
    onSendWhatsApp?.();
  };

  const canSendWhatsApp = clientPhone && clientPhone.length >= 10;

  return (
    <div className="mt-4 space-y-4">
      {/* Total Amount - Large and Prominent */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">إجمالي الفاتورة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{totalAmount.toFixed(2)}</span>
                <span className="text-lg text-muted-foreground">ج.م</span>
              </div>
            </div>
          </div>
          
          {/* Add Item Button */}
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus size={22} />
            إضافة صنف
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-muted/30 rounded-xl p-3">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
          <MessageSquare size={14} />
          ملاحظات الفاتورة
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="أضف ملاحظات على الفاتورة..."
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm min-h-[60px] resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
        />
      </div>

      {/* WhatsApp Send Section - Large and Featured */}
      {onSendWhatsApp && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-2 border-green-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <MessageCircle size={28} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-green-700 dark:text-green-400">
                  إرسال عبر واتساب
                </h3>
                <p className="text-sm text-muted-foreground">
                  {canSendWhatsApp ? (
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      إرسال إلى: {clientPhone}
                    </span>
                  ) : (
                    "أدخل رقم هاتف العميل أولاً"
                  )}
                </p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsAppClick}
              disabled={!canSendWhatsApp}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                canSendWhatsApp 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30 hover:shadow-xl' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <MessageCircle size={24} />
              إرسال الفاتورة
            </motion.button>
          </div>
          
          {/* Quick Info */}
          {canSendWhatsApp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 flex flex-wrap items-center gap-4 text-sm text-green-600 dark:text-green-400"
            >
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                سيتم فتح واتساب ويب
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                الرسالة جاهزة تلقائياً
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                اضغط إرسال فقط
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        {/* Primary Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {onSave && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSave}
              disabled={isSaving}
              className={`flex items-center gap-2 ${
                isEditing 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-6 py-3 rounded-xl font-bold transition-all text-base disabled:opacity-50 shadow-lg`}
            >
              {isEditing ? <Edit size={20} /> : <Save size={20} />}
              {isSaving ? "جاري الحفظ..." : isEditing ? "تحديث الفاتورة" : "حفظ الفاتورة"}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewInvoice}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all text-base shadow-lg"
          >
            <FileText size={20} />
            فاتورة جديدة
          </motion.button>
        </div>

        {/* Print Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrint}
          className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-bold hover:bg-secondary/80 transition-all text-base shadow-md"
        >
          <Printer size={20} />
          طباعة
        </motion.button>
      </div>
    </div>
  );
};