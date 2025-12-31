import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Phone, Search, FileText, CreditCard, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ClientData {
  id: string;
  name: string;
  phone: string;
  client_number: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  payment_method: string;
  status: string;
}

interface PaymentData {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
}

export default function ClientTracking() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<ClientData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  const handleSearch = async () => {
    if (!phone.trim()) {
      toast.error("أدخل رقم الهاتف");
      return;
    }

    setIsLoading(true);
    try {
      // Find client by phone
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, phone, client_number")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientData) {
        toast.error("لم يتم العثور على عميل بهذا الرقم");
        setClient(null);
        setInvoices([]);
        setPayments([]);
        return;
      }

      setClient(clientData);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, payment_method, status")
        .eq("client_id", clientData.id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method")
        .eq("client_id", clientData.id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Calculate totals
      const invoicesTotal = (invoicesData || [])
        .filter(inv => inv.payment_method === "آجل")
        .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      
      const paymentsTotal = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount), 0);

      setTotalInvoices(invoicesTotal);
      setTotalPaid(paymentsTotal);

      toast.success(`تم العثور على بيانات: ${clientData.name}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const balance = totalInvoices - totalPaid;

  return (
    <>
      <Helmet>
        <title>متابعة العميل | نظام الفواتير</title>
        <meta name="description" content="متابعة حساب العميل عبر رقم الهاتف" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container max-w-2xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft size={16} />
              العودة لتسجيل الدخول
            </Link>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Phone className="w-10 h-10 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">متابعة الحساب</h1>
            </div>
            <p className="text-muted-foreground">أدخل رقم هاتفك لعرض تفاصيل حسابك</p>
          </div>

          {/* Search Box */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="أدخل رقم الهاتف..."
                    className="pr-10 text-lg"
                    dir="ltr"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading} className="px-6">
                  {isLoading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Search size={18} className="ml-2" />
                      بحث
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          {client && (
            <div className="space-y-4 animate-fade-in">
              {/* Client Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="text-primary" />
                    بيانات العميل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground text-sm">الاسم</span>
                      <p className="font-semibold text-lg">{client.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">رقم العميل</span>
                      <p className="font-semibold text-lg">{client.client_number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">إجمالي الآجل</p>
                    <p className="text-xl font-bold text-primary">{totalInvoices.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">المدفوع</p>
                    <p className="text-xl font-bold text-green-600">{totalPaid.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card className={`${balance > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">المتبقي</p>
                    <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {balance.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-primary" />
                    الفواتير ({invoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد فواتير</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold">فاتورة #{inv.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(inv.invoice_date).toLocaleDateString("ar-EG")} • {inv.payment_method}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-lg">{Number(inv.total_amount).toFixed(2)}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              inv.status === 'completed' ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'
                            }`}>
                              {inv.status === 'completed' ? 'مكتملة' : 'معلقة'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="text-primary" />
                    الدفعات ({payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">لا توجد دفعات</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold">دفعة</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString("ar-EG")} • {payment.payment_method}
                            </p>
                          </div>
                          <p className="font-bold text-lg text-green-600">+{Number(payment.amount).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
