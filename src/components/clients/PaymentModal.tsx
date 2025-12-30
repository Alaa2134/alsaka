import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePayment, usePayments } from "@/hooks/usePayments";
import { DollarSign, Calendar, Trash2 } from "lucide-react";
import { useDeletePayment } from "@/hooks/usePayments";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  balanceDue: number;
}

export const PaymentModal = ({ open, onClose, clientId, clientName, balanceDue }: PaymentModalProps) => {
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const { data: payments } = usePayments(clientId);
  
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const remainingBalance = balanceDue - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return;
    }

    await createPayment.mutateAsync({
      client_id: clientId,
      amount: paymentAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes: notes || null,
    });

    setAmount("");
    setNotes("");
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الدفعة؟")) {
      await deletePayment.mutateAsync(paymentId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="text-primary" />
            تسديد دفعة - {clientName}
          </DialogTitle>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">إجمالي المستحق</p>
            <p className="text-lg font-bold text-destructive">{balanceDue.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">المدفوع</p>
            <p className="text-lg font-bold text-green-500">{totalPaid.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">المتبقي</p>
            <p className="text-lg font-bold text-primary">{remainingBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="paymentDate">التاريخ</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod">طريقة الدفع</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="نقدي">نقدي</SelectItem>
                <SelectItem value="بطاقة">بطاقة</SelectItem>
                <SelectItem value="تحويل">تحويل بنكي</SelectItem>
                <SelectItem value="شيك">شيك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setAmount(remainingBalance.toString())}
              disabled={remainingBalance <= 0}
              className="flex-1"
            >
              تسديد كامل المبلغ
            </Button>
            <Button type="submit" disabled={createPayment.isPending} className="flex-1">
              {createPayment.isPending ? "جاري الحفظ..." : "تسجيل الدفعة"}
            </Button>
          </div>
        </form>

        {/* Payments History */}
        {payments && payments.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-sm">سجل الدفعات</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-2 bg-card border border-border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-muted-foreground" />
                    <span>{new Date(payment.payment_date).toLocaleDateString("ar-EG")}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-semibold text-green-500">{Number(payment.amount).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{payment.payment_method}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePayment(payment.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
