import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2, Check, FolderSync } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, Product } from "@/hooks/useProducts";

interface OrganizedProduct {
  id: string;
  name: string;
  currentCategory: string | null;
  suggestedCategory: string;
}

export const SmartProductOrganizer = () => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [organizedProducts, setOrganizedProducts] = useState<OrganizedProduct[]>([]);
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null);
  const [updatedProducts, setUpdatedProducts] = useState<Set<number>>(new Set());

  const handleOrganize = async () => {
    if (!products || products.length === 0) {
      toast.error("لا يوجد منتجات لترتيبها");
      return;
    }

    setIsLoading(true);
    try {
      // Get products without categories or need reorganization
      const productsToOrganize = products.slice(0, 50); // Limit to 50 for AI

      const productList = productsToOrganize.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currentCategory: p.category
      }));

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          prompt: `قم بتصنيف المنتجات التالية إلى فئات مناسبة. لكل منتج اقترح تصنيف مناسب بناءً على اسمه وسعره.

المنتجات:
${JSON.stringify(productList, null, 2)}

أرجع النتيجة كـ JSON بالشكل التالي:
{ "organized": [{ "id": "uuid", "name": "اسم المنتج", "currentCategory": "الفئة الحالية", "suggestedCategory": "الفئة المقترحة" }] }

الفئات المقترحة يجب أن تكون عامة مثل: إلكترونيات، أجهزة منزلية، ملابس، أدوات، مستلزمات مكتبية، أثاث، مواد غذائية، مستحضرات تجميل، ألعاب، رياضة، كتب، إكسسوارات، أخرى`,
          action: "organize_products",
          tenantId: tenant?.id,
        },
      });

      if (error) throw error;

      // Extract JSON from response
      const responseText = data?.message || data?.response || JSON.stringify(data);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.organized && Array.isArray(parsed.organized)) {
          setOrganizedProducts(parsed.organized);
          toast.success(`تم تحليل ${parsed.organized.length} منتج`);
        } else {
          toast.error("لم يتم العثور على نتائج");
        }
      } else {
        toast.error("فشل في تحليل الترتيب");
      }
    } catch (error) {
      console.error("Organize error:", error);
      toast.error("فشل في ترتيب المنتجات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (product: OrganizedProduct, index: number) => {
    setUpdatingIndex(index);
    try {
      const { error } = await supabase
        .from("products")
        .update({ category: product.suggestedCategory })
        .eq("id", product.id);

      if (error) throw error;

      setUpdatedProducts(prev => new Set([...prev, index]));
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`تم تحديث تصنيف: ${product.name}`);
    } catch (error) {
      console.error("Update category error:", error);
      toast.error("فشل في تحديث التصنيف");
    } finally {
      setUpdatingIndex(null);
    }
  };

  const handleUpdateAll = async () => {
    for (let i = 0; i < organizedProducts.length; i++) {
      if (!updatedProducts.has(i) && organizedProducts[i].suggestedCategory !== organizedProducts[i].currentCategory) {
        await handleUpdateCategory(organizedProducts[i], i);
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setOrganizedProducts([]);
    setUpdatedProducts(new Set());
  };

  const pendingUpdates = organizedProducts.filter((p, i) => 
    !updatedProducts.has(i) && p.suggestedCategory !== p.currentCategory
  ).length;

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
            <FolderSync className="text-primary" />
            الترتيب الذكي - تصنيف المنتجات بالذكاء الاصطناعي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              سيقوم الذكاء الاصطناعي بتحليل المنتجات واقتراح تصنيفات مناسبة لها بناءً على أسمائها وأسعارها.
            </p>
          </div>

          <Button
            onClick={handleOrganize}
            disabled={isLoading || !products?.length}
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
                تحليل وترتيب المنتجات ({products?.length || 0} منتج)
              </>
            )}
          </Button>

          {/* Organized Products List */}
          {organizedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">التصنيفات المقترحة ({organizedProducts.length})</h4>
                {pendingUpdates > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleUpdateAll}
                  >
                    <Check size={14} className="ml-1" />
                    تطبيق الكل ({pendingUpdates})
                  </Button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {organizedProducts.map((product, index) => {
                  const hasChange = product.suggestedCategory !== product.currentCategory;
                  const isUpdated = updatedProducts.has(index);
                  
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isUpdated
                          ? "bg-green-500/10 border-green-500/30"
                          : hasChange
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{product.name}</p>
                        <div className="flex gap-3 text-sm text-muted-foreground">
                          <span>الحالي: {product.currentCategory || "بدون تصنيف"}</span>
                          {hasChange && (
                            <span className="text-primary font-medium">
                              ← المقترح: {product.suggestedCategory}
                            </span>
                          )}
                        </div>
                      </div>
                      {hasChange && (
                        <Button
                          variant={isUpdated ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => handleUpdateCategory(product, index)}
                          disabled={isUpdated || updatingIndex === index}
                        >
                          {isUpdated ? (
                            <Check size={16} className="text-green-500" />
                          ) : updatingIndex === index ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "تطبيق"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
