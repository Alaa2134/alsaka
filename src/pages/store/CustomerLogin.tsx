import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Hash, LogIn, User, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { StoreContextData } from "./StoreLayout";
import { Helmet } from "react-helmet-async";

const CustomerLogin = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useOutletContext<StoreContextData>();
  const { login, logout, customer } = useCustomerAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, show welcome message
  if (customer) {
    return (
      <>
        <Helmet>
          <title>حسابي | {tenant?.name}</title>
        </Helmet>
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>مرحباً {customer.name}</CardTitle>
                <CardDescription>أنت مسجل الدخول بنجاح</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم العميل:</span>
                    <span className="font-medium">{customer.client_number}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الهاتف:</span>
                      <span className="font-medium" dir="ltr">{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">البريد:</span>
                      <span className="font-medium" dir="ltr">{customer.email}</span>
                    </div>
                  )}
                </div>

                {/* Orders Link */}
                <Button
                  variant="default"
                  className="w-full gap-2"
                  onClick={() => navigate(`/store/${tenantSlug}/orders`)}
                >
                  <Package className="h-4 w-4" />
                  عرض طلباتي
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/store/${tenantSlug}`)}
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة للمتجر
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                  >
                    تسجيل الخروج
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(phone, clientNumber, tenant.id);
    
    setIsLoading(false);

    if (result.success) {
      navigate(`/store/${tenantSlug}`);
    } else {
      setError(result.error || "فشل تسجيل الدخول");
    }
  };

  return (
    <>
      <Helmet>
        <title>تسجيل الدخول | {tenant?.name}</title>
      </Helmet>
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>تسجيل دخول العميل</CardTitle>
              <CardDescription>
                سجل دخولك لتتبع طلباتك والاستفادة من العروض الخاصة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="text-right"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    رقم العميل
                  </Label>
                  <Input
                    id="clientNumber"
                    type="text"
                    value={clientNumber}
                    onChange={(e) => setClientNumber(e.target.value)}
                    placeholder="أدخل رقم العميل الخاص بك"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك الحصول على رقم العميل من الفاتورة أو من خدمة العملاء
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-center text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      جاري التحقق...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      تسجيل الدخول
                    </span>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate(`/store/${tenantSlug}`)}
                    className="text-muted-foreground"
                  >
                    تصفح كزائر
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default CustomerLogin;
