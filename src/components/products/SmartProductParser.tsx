import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNextProductNumber } from "@/hooks/useProducts";

interface ParsedProduct {
  name: string;
  price: number;
  min_price: number;
  category?: string;
}

export const SmartProductParser = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { data: nextProductNumber } = useNextProductNumber();
  
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedProducts, setAddedProducts] = useState<Set<number>>(new Set());

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast.error("أدخل نص المنتجات أولاً");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          prompt: `قم بتحليل النص التالي واستخراج المنتجات منه. لكل منتج استخرج: الاسم، السعر، الحد الأدنى للسعر (80% من السعر إذا لم يذكر)، والفئة إن وجدت.
          
النص:
${inputText}

أرجع النتيجة كـ JSON بالشكل التالي:
{ "products": [{ "name": "اسم المنتج", "price": 100, "min_price": 80, "category": "الفئة" }] }`,
          action: "parse_products",
          tenantId: tenant?.id,
        },
      });

      if (error) throw error;

      // Extract JSON from response
      const responseText = data?.response || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.products && Array.isArray(parsed.products)) {
          setParsedProducts(parsed.products);
          toast.success(`تم استخراج ${parsed.products.length} منتج`);
        } else {
          toast.error("لم يتم العثور على منتجات في النص");
        }
      } else {
        toast.error("فشل في تحليل النص");
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("فشل في تحليل النص");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async (product: ParsedProduct, index: number) => {
    setAddingIndex(index);
    try {
      const currentNumber = parseInt(nextProductNumber || "1") + addedProducts.size;
      
      const { error } = await supabase.from("products").insert({
        item_number: String(currentNumber),
        name: product.name,
        price: product.price,
        min_price: product.min_price,
        category: product.category || null,
        stock_quantity: 0,
        tenant_id: tenant?.id || null,
      });

      if (error) throw error;

      setAddedProducts(prev => new Set([...prev, index]));
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`تم إضافة: ${product.name}`);
    } catch (error) {
      console.error("Add product error:", error);
      toast.error("فشل في إضافة المنتج");
    } finally {
      setAddingIndex(null);
    }
  };

  const handleAddAll = async () => {
    for (let i = 0; i < parsedProducts.length; i++) {
      if (!addedProducts.has(i)) {
        await handleAddProduct(parsedProducts[i], i);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInputText("");
    setParsedProducts([]);
    setAddedProducts(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Wand2 size={16} />
          الترتيب الذكي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="text-primary" />
            الترتيب الذكي - إضافة منتجات بالذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              أدخل قائمة المنتجات بأي صيغة (مثل: لابتوب 5000، موبايل سامسونج 3500، ...)
            </p>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="لابتوب ديل 5000&#10;موبايل سامسونج S23 بسعر 4500&#10;شاشة LG 27 بوصة - 2500 جنيه&#10;..."
              rows={5}
              className="font-mono"
            />
          </div>

          <Button
            onClick={handleParse}
            disabled={isLoading || !inputText.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="ml-2 animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Wand2 size={16} className="ml-2" />
                تحليل وإستخراج المنتجات
              </>
            )}
          </Button>

          {/* Parsed Products List */}
          {parsedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">المنتجات المستخرجة ({parsedProducts.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAll}
                  disabled={addedProducts.size === parsedProducts.length}
                >
                  <Plus size={14} className="ml-1" />
                  إضافة الكل
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {parsedProducts.map((product, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      addedProducts.has(index)
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{product.name}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <span>السعر: {product.price}</span>
                        <span>الحد الأدنى: {product.min_price}</span>
                        {product.category && <span>الفئة: {product.category}</span>}
                      </div>
                    </div>
                    <Button
                      variant={addedProducts.has(index) ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => handleAddProduct(product, index)}
                      disabled={addedProducts.has(index) || addingIndex === index}
                    >
                      {addedProducts.has(index) ? (
                        <Check size={16} className="text-green-500" />
                      ) : addingIndex === index ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
