import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  RefreshCw, 
  Check,
  Info,
  Eye
} from "lucide-react";
import { useWhatsAppSettings, useSaveWhatsAppSettings, DEFAULT_INVOICE_TEMPLATE, parseInvoiceTemplate } from "@/hooks/useWhatsAppSettings";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const InvoiceMessageTemplateEditor = () => {
  const { data: settings, isLoading } = useWhatsAppSettings();
  const saveSettings = useSaveWhatsAppSettings();
  const [template, setTemplate] = useState(DEFAULT_INVOICE_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (settings?.invoice_message_template) {
      setTemplate(settings.invoice_message_template);
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings.mutateAsync({
      invoice_message_template: template,
    });
  };

  const handleReset = () => {
    setTemplate(DEFAULT_INVOICE_TEMPLATE);
    toast.info("تم إعادة القالب للنص الافتراضي - اضغط حفظ للتأكيد");
  };

  // Sample preview data
  const previewData = {
    invoiceNumber: "INV-001",
    storeName: "متجر النور",
    clientName: "أحمد محمد",
    itemsList: `1. منتج أ × 2 = 200.00 ج.م
2. منتج ب × 1 = 150.00 ج.م
3. منتج ج × 3 = 300.00 ج.م`,
    totalAmount: "650.00",
    date: new Date().toLocaleDateString("ar-EG"),
    paymentMethod: "نقدي",
    notes: "ملاحظة تجريبية",
  };

  const previewMessage = parseInvoiceTemplate(template, previewData);

  const availableVariables = [
    { name: "{invoice_number}", description: "رقم الفاتورة" },
    { name: "{store_name}", description: "اسم المتجر" },
    { name: "{client_name}", description: "اسم العميل" },
    { name: "{items_list}", description: "قائمة الأصناف" },
    { name: "{total_amount}", description: "المبلغ الإجمالي" },
    { name: "{date}", description: "التاريخ" },
    { name: "{payment_method}", description: "طريقة الدفع" },
    { name: "{notes}", description: "الملاحظات" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          قالب رسالة الفاتورة
        </CardTitle>
        <CardDescription>
          تخصيص نص رسالة الفاتورة التي تُرسل للعميل عبر الواتساب
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Available Variables */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700 text-sm">المتغيرات المتاحة</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((v) => (
              <Badge 
                key={v.name} 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  navigator.clipboard.writeText(v.name);
                  toast.success(`تم نسخ ${v.name}`);
                }}
                title={`انقر للنسخ - ${v.description}`}
              >
                {v.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="space-y-2">
          <Textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="أدخل قالب الرسالة..."
            className="min-h-[300px] font-mono text-sm"
            dir="rtl"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 ml-1" />
              إعادة تعيين
            </Button>
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 ml-1" />
                  معاينة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>معاينة الرسالة</DialogTitle>
                  <DialogDescription>
                    هذا هو شكل الرسالة التي ستُرسل للعميل
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {previewMessage}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saveSettings.isPending}
            className="bg-green-500 hover:bg-green-600"
          >
            {saveSettings.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Check className="h-4 w-4 ml-1" />
            )}
            حفظ القالب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};