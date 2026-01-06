import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, Image, DollarSign, Hash, Tag, Check, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProduct, useNextProductNumber, useProductCategories } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generateProductBarcode } from "@/utils/barcodeGenerator";
import { Helmet } from "react-helmet-async";
import type { StoreContextData } from "./StoreLayout";

export const StoreAddProduct = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<StoreContextData>();
  
  const { data: nextProductNumber } = useNextProductNumber();
  const { data: existingCategories } = useProductCategories();
  const { data: warehouses } = useWarehouses();
  const createProduct = useCreateProduct();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    min_price: "",
    stock_quantity: "",
    category: "",
    newCategory: "",
    warehouse_id: "",
    barcode: "",
    description: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStep1Valid = formData.name.trim() !== "";
  const isStep2Valid = formData.price !== "" && parseFloat(formData.price) > 0;
  const isStep3Valid = formData.stock_quantity !== "" && parseInt(formData.stock_quantity) >= 0;

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsSubmitting(true);

    try {
      const itemNumber = nextProductNumber || `P${Date.now()}`;
      const barcode = formData.barcode || generateProductBarcode(itemNumber);
      const category = formData.newCategory || formData.category || null;

      await createProduct.mutateAsync({
        item_number: itemNumber,
        name: formData.name,
        price: parseFloat(formData.price),
        min_price: formData.min_price ? parseFloat(formData.min_price) : parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        category,
        warehouse_id: formData.warehouse_id || null,
        barcode,
        image_url: null,
      });

      setShowSuccess(true);
      toast.success("تم إضافة المنتج بنجاح!");

      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: "",
          price: "",
          min_price: "",
          stock_quantity: "",
          category: "",
          newCategory: "",
          warehouse_id: "",
          barcode: "",
          description: "",
        });
        setStep(1);
        setShowSuccess(false);
      }, 2000);

    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("حدث خطأ أثناء إضافة المنتج");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "معلومات المنتج", icon: Package },
    { number: 2, title: "السعر", icon: DollarSign },
    { number: 3, title: "المخزون", icon: Hash },
  ];

  const primaryColor = context?.tenant?.primary_color || "#3b82f6";

  return (
    <>
      <Helmet>
        <title>إضافة منتج | {context?.tenant?.name || "المتجر"}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(`/store/${tenantSlug}/products`)}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمنتجات
          </Button>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <motion.button
                onClick={() => setStep(s.number)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all
                  ${step === s.number 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : step > s.number 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                  }
                `}
                style={step === s.number ? { backgroundColor: primaryColor } : {}}
              >
                {step > s.number ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.number}</span>
              </motion.button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${step > s.number ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </motion.div>

        {/* Success Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Check className="h-10 w-10" style={{ color: primaryColor }} />
                </motion.div>
                <h2 className="text-2xl font-bold">تم بنجاح!</h2>
                <p className="text-muted-foreground">تمت إضافة المنتج</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="shadow-xl border-2">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {step === 1 && <Package className="h-8 w-8" style={{ color: primaryColor }} />}
                {step === 2 && <DollarSign className="h-8 w-8" style={{ color: primaryColor }} />}
                {step === 3 && <Hash className="h-8 w-8" style={{ color: primaryColor }} />}
              </motion.div>
              <CardTitle className="text-2xl">
                {step === 1 && "معلومات المنتج"}
                {step === 2 && "تحديد السعر"}
                {step === 3 && "إدارة المخزون"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "أدخل اسم المنتج والتصنيف"}
                {step === 2 && "حدد سعر البيع والحد الأدنى"}
                {step === 3 && "حدد الكمية المتاحة والمخزن"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step 1: Product Info */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      اسم المنتج *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="مثال: هاتف ذكي سامسونج"
                      className="text-lg h-12"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-base font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      التصنيف
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="اختر تصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingCategories?.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="أو أضف تصنيف جديد..."
                      value={formData.newCategory}
                      onChange={(e) => {
                        handleInputChange("newCategory", e.target.value);
                        if (e.target.value) handleInputChange("category", "");
                      }}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode" className="text-base font-medium">
                      الباركود (اختياري)
                    </Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange("barcode", e.target.value)}
                      placeholder="سيتم توليده تلقائياً إن تُرك فارغاً"
                      className="h-12 font-mono"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Pricing */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-base font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      سعر البيع *
                    </Label>
                    <div className="relative">
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                        placeholder="0.00"
                        className="text-2xl h-14 pr-16 font-bold"
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {context?.settings?.currency || "EGP"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_price" className="text-base font-medium">
                      الحد الأدنى للسعر
                    </Label>
                    <div className="relative">
                      <Input
                        id="min_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.min_price}
                        onChange={(e) => handleInputChange("min_price", e.target.value)}
                        placeholder="مثل سعر البيع إن تُرك فارغاً"
                        className="h-12 pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {context?.settings?.currency || "EGP"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      أقل سعر مسموح به عند البيع
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Stock */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-base font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      الكمية المتاحة *
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => handleInputChange("stock_quantity", e.target.value)}
                      placeholder="0"
                      className="text-2xl h-14 font-bold text-center"
                      autoFocus
                    />
                  </div>

                  {warehouses && warehouses.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="warehouse" className="text-base font-medium">
                        المخزن
                      </Label>
                      <Select
                        value={formData.warehouse_id}
                        onValueChange={(value) => handleInputChange("warehouse_id", value)}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="اختر المخزن" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Summary */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-muted/50 space-y-2 mt-6"
                  >
                    <h3 className="font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                      ملخص المنتج
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">الاسم:</span>
                      <span className="font-medium">{formData.name || "-"}</span>
                      <span className="text-muted-foreground">السعر:</span>
                      <span className="font-medium">
                        {formData.price ? `${formData.price} ${context?.settings?.currency || "EGP"}` : "-"}
                      </span>
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-medium">{formData.stock_quantity || "-"}</span>
                      <span className="text-muted-foreground">التصنيف:</span>
                      <span className="font-medium">{formData.newCategory || formData.category || "-"}</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 h-12"
                  >
                    السابق
                  </Button>
                )}
                
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={
                      (step === 1 && !isStep1Valid) ||
                      (step === 2 && !isStep2Valid)
                    }
                    className="flex-1 h-12 gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    التالي
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isStep1Valid || !isStep2Valid || !isStep3Valid}
                    className="flex-1 h-12 gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جاري الإضافة...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" />
                        إضافة المنتج
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Add Another */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-muted-foreground">
            يمكنك إضافة منتجات متعددة بسهولة
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default StoreAddProduct;
