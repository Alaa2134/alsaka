import { FileText, Printer, Save, MessageSquare, Edit, MessageCircle, Phone, CheckCircle, Loader2, Send, Percent, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface InvoiceFooterProps {
  totalAmount: number;
  onNewInvoice: () => void;
  onPrint: () => void;
  onSave?: () => void;
  onSendWhatsApp?: () => void;
  isSaving?: boolean;
  isEditing?: boolean;
  isSendingWhatsApp?: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  clientPhone?: string;
  clientName?: string;
  whatsappConnected?: boolean;
  discount: number;
  onDiscountChange: (value: number) => void;
  payment: number;
  onPaymentChange: (value: number) => void;
}

export const InvoiceFooter = ({
  totalAmount,
  onNewInvoice,
  onPrint,
  onSave,
  onSendWhatsApp,
  isSaving,
  isEditing,
  isSendingWhatsApp,
  notes,
  onNotesChange,
  clientPhone,
  clientName,
  whatsappConnected = true,
  discount,
  onDiscountChange,
  payment,
  onPaymentChange,
}: InvoiceFooterProps) => {
  const handleWhatsAppClick = () => {
    if (!clientPhone) {
      toast.error("يرجى إدخال رقم هاتف العميل أولاً");
      return;
    }
    if (isSendingWhatsApp) {
      toast.info("جاري الإرسال...");
      return;
    }
    onSendWhatsApp?.();
  };

  const canSendWhatsApp = clientPhone && clientPhone.length >= 10;
  
  // Calculate net total and remaining
  const netTotal = totalAmount - discount;
  const remaining = netTotal - payment;

  return (
    <div className="mt-4 space-y-4">
      {/* Discount and Payment Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Discount Field */}
        <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-3">
          <label className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-2">
            <Percent size={14} />
            الخصم
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={discount || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, '');
                onDiscountChange(parseFloat(val) || 0);
              }}
              placeholder="0.00"
              className="w-full bg-card border-2 border-orange-500/30 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-orange-600 dark:text-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
            />
            <span className="text-muted-foreground text-sm whitespace-nowrap">ج.م</span>
          </div>
        </div>

        {/* Payment Field */}
        <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-3">
          <label className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2 mb-2">
            <CreditCard size={14} />
            التسديد
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={payment || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d.]/g, '');
                onPaymentChange(parseFloat(val) || 0);
              }}
              placeholder="0.00"
              className="w-full bg-card border-2 border-green-500/30 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-green-600 dark:text-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
            />
            <span className="text-muted-foreground text-sm whitespace-nowrap">ج.م</span>
          </div>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Subtotal */}
          <div className="text-center">
            <span className="text-xs text-muted-foreground block mb-1">الإجمالي</span>
            <span className="text-xl font-bold text-foreground">{totalAmount.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground mr-1">ج.م</span>
          </div>
          
          {/* Net Total (after discount) */}
          <div className="text-center border-x border-border px-4">
            <span className="text-xs text-muted-foreground block mb-1">الصافي</span>
            <span className="text-2xl font-bold text-primary">{netTotal.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground mr-1">ج.م</span>
          </div>
          
          {/* Remaining */}
          <div className="text-center">
            <span className="text-xs text-muted-foreground block mb-1">المتبقي</span>
            <span className={`text-xl font-bold ${remaining > 0 ? 'text-red-500' : remaining < 0 ? 'text-green-500' : 'text-foreground'}`}>
              {remaining.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground mr-1">ج.م</span>
          </div>
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
              whileHover={!isSendingWhatsApp ? { scale: 1.05 } : {}}
              whileTap={!isSendingWhatsApp ? { scale: 0.95 } : {}}
              onClick={handleWhatsAppClick}
              disabled={!canSendWhatsApp || isSendingWhatsApp}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                isSendingWhatsApp 
                  ? 'bg-green-400 text-white cursor-wait'
                  : canSendWhatsApp 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30 hover:shadow-xl' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <AnimatePresence mode="wait">
                {isSendingWhatsApp ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-3"
                  >
                    <Loader2 size={24} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-3"
                  >
                    <Send size={24} />
                    <span>إرسال الفاتورة</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          
          {/* Quick Info */}
          {canSendWhatsApp && !isSendingWhatsApp && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 flex flex-wrap items-center gap-4 text-sm text-green-600 dark:text-green-400"
            >
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                إرسال تلقائي في الخلفية
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                بدون فتح صفحة جديدة
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={14} />
                اضغط وانتظر فقط
              </span>
            </motion.div>
          )}
          
          {/* Sending Status */}
          {isSendingWhatsApp && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 bg-green-500/10 rounded-lg p-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  جاري إرسال الفاتورة...
                </p>
                <p className="text-xs text-muted-foreground">
                  سيتم إعلامك عند اكتمال الإرسال
                </p>
              </div>
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