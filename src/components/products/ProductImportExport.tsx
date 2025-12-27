import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProducts, useCreateProduct } from "@/hooks/useProducts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParsedProduct {
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  barcode: string | null;
}

export const ProductImportExport = () => {
  const { data: products } = useProducts();
  const createProduct = useCreateProduct();
  const [isImporting, setIsImporting] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Export products to CSV
  const handleExportCSV = () => {
    if (!products || products.length === 0) {
      toast.error("لا توجد منتجات للتصدير");
      return;
    }

    const headers = ["رقم الصنف", "اسم المنتج", "السعر", "الحد الأدنى", "الكمية", "التصنيف", "الباركود"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => [
        p.item_number,
        `"${p.name}"`,
        p.price,
        p.min_price,
        p.stock_quantity,
        `"${p.category || ""}"`,
        `"${p.barcode || ""}"`
      ].join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("تم تصدير المنتجات بنجاح");
  };

  // Parse CSV file
  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());

      return {
        item_number: cleanValues[0] || "",
        name: cleanValues[1] || "",
        price: parseFloat(cleanValues[2]) || 0,
        min_price: parseFloat(cleanValues[3]) || 0,
        stock_quantity: parseInt(cleanValues[4]) || 0,
        category: cleanValues[5] || null,
        barcode: cleanValues[6] || null,
      };
    }).filter(p => p.item_number && p.name);
  };

  // Parse text from uploaded file
  const parseTextFile = (text: string): ParsedProduct[] => {
    if (text.includes(",")) {
      return parseCSV(text);
    }

    const lines = text.split("\n").filter(line => line.trim());
    const products: ParsedProduct[] = [];

    for (const line of lines) {
      const parts = line.split(/[\t|;]/).map(p => p.trim());
      if (parts.length >= 2) {
        products.push({
          item_number: parts[0] || String(products.length + 1),
          name: parts[1] || "",
          price: parseFloat(parts[2]) || 0,
          min_price: parseFloat(parts[3]) || 0,
          stock_quantity: parseInt(parts[4]) || 0,
          category: parts[5] || null,
          barcode: parts[6] || null,
        });
      }
    }

    return products;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = parseTextFile(text);

      if (parsed.length === 0) {
        toast.error("لم يتم العثور على منتجات في الملف");
        setIsImporting(false);
        return;
      }

      setParsedProducts(parsed);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("خطأ في قراءة الملف");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // AI-powered import from any file
  const handleAIImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAIProcessing(true);
    toast.info("جاري تحليل الملف بالذكاء الاصطناعي...");

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('parse-products', {
        body: { 
          fileContent: text,
          fileType: file.type || file.name.split('.').pop()
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setIsAIProcessing(false);
        return;
      }

      const parsed = data.products || [];
      
      if (parsed.length === 0) {
        toast.error("لم يتم العثور على منتجات في الملف");
        setIsAIProcessing(false);
        return;
      }

      // Normalize products
      const normalizedProducts: ParsedProduct[] = parsed.map((p: any, index: number) => ({
        item_number: p.item_number || String(index + 1).padStart(4, '0'),
        name: p.name || '',
        price: parseFloat(p.price) || 0,
        min_price: parseFloat(p.min_price) || parseFloat(p.price) || 0,
        stock_quantity: parseInt(p.stock_quantity) || 0,
        category: p.category || null,
        barcode: p.barcode || null,
      }));

      setParsedProducts(normalizedProducts);
      setImportDialogOpen(true);
      toast.success(`تم استخراج ${normalizedProducts.length} منتج`);
    } catch (error) {
      console.error("Error with AI import:", error);
      toast.error("خطأ في تحليل الملف");
    } finally {
      setIsAIProcessing(false);
      if (aiFileInputRef.current) {
        aiFileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const product of parsedProducts) {
      try {
        await createProduct.mutateAsync({
          item_number: product.item_number,
          name: product.name,
          price: product.price,
          min_price: product.min_price,
          stock_quantity: product.stock_quantity,
          category: product.category,
          barcode: product.barcode,
          warehouse_id: null,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Error importing product:", product.name, error);
      }
    }

    setIsImporting(false);
    setImportDialogOpen(false);
    setParsedProducts([]);

    if (successCount > 0) {
      toast.success(`تم استيراد ${successCount} منتج بنجاح`);
    }
    if (errorCount > 0) {
      toast.error(`فشل استيراد ${errorCount} منتج`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* AI Import Button */}
      <div className="relative">
        <input
          ref={aiFileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls,.pdf,.doc,.docx,.json,*/*"
          onChange={handleAIImport}
          className="hidden"
          id="product-ai-import"
        />
        <Button
          variant="default"
          size="sm"
          onClick={() => aiFileInputRef.current?.click()}
          disabled={isAIProcessing}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent"
        >
          {isAIProcessing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          استيراد ذكي (AI)
        </Button>
      </div>

      {/* Standard Import Button */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
          id="product-import"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2"
        >
          {isImporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          استيراد CSV
        </Button>
      </div>

      {/* Export CSV Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        تصدير CSV
      </Button>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} />
              معاينة المنتجات المستوردة ({parsedProducts.length} منتج)
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-right border-b">رقم الصنف</th>
                  <th className="px-3 py-2 text-right border-b">الاسم</th>
                  <th className="px-3 py-2 text-center border-b">السعر</th>
                  <th className="px-3 py-2 text-center border-b">الحد الأدنى</th>
                  <th className="px-3 py-2 text-center border-b">الكمية</th>
                  <th className="px-3 py-2 text-right border-b">التصنيف</th>
                </tr>
              </thead>
              <tbody>
                {parsedProducts.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <td className="px-3 py-2 border-b font-mono">{p.item_number}</td>
                    <td className="px-3 py-2 border-b">{p.name}</td>
                    <td className="px-3 py-2 border-b text-center">{p.price.toFixed(2)}</td>
                    <td className="px-3 py-2 border-b text-center">{p.min_price.toFixed(2)}</td>
                    <td className="px-3 py-2 border-b text-center">{p.stock_quantity}</td>
                    <td className="px-3 py-2 border-b">{p.category || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setParsedProducts([]);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              {isImporting && <Loader2 size={16} className="animate-spin" />}
              تأكيد الاستيراد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
