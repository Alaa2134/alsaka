import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProducts, useCreateProduct } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ParsedProduct {
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string;
}

export const ProductImportExport = () => {
  const { data: products } = useProducts();
  const createProduct = useCreateProduct();
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export products to CSV
  const handleExportCSV = () => {
    if (!products || products.length === 0) {
      toast.error("لا توجد منتجات للتصدير");
      return;
    }

    const headers = ["رقم الصنف", "اسم المنتج", "السعر", "الحد الأدنى", "الكمية", "التصنيف"];
    const csvContent = [
      headers.join(","),
      ...products.map(p => [
        p.item_number,
        `"${p.name}"`,
        p.price,
        p.min_price,
        p.stock_quantity,
        `"${p.category || ""}"`
      ].join(","))
    ].join("\n");

    // Add BOM for proper Arabic encoding
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

    // Skip header row
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());

      return {
        item_number: cleanValues[0] || "",
        name: cleanValues[1] || "",
        price: parseFloat(cleanValues[2]) || 0,
        min_price: parseFloat(cleanValues[3]) || 0,
        stock_quantity: parseInt(cleanValues[4]) || 0,
        category: cleanValues[5] || "",
      };
    }).filter(p => p.item_number && p.name);
  };

  // Parse text from uploaded file (works for TXT, CSV)
  const parseTextFile = (text: string): ParsedProduct[] => {
    // Try CSV format first
    if (text.includes(",")) {
      return parseCSV(text);
    }

    // Try tab-separated or line-by-line
    const lines = text.split("\n").filter(line => line.trim());
    const products: ParsedProduct[] = [];

    for (const line of lines) {
      // Try to parse various formats
      const parts = line.split(/[\t|;]/).map(p => p.trim());
      if (parts.length >= 2) {
        products.push({
          item_number: parts[0] || String(products.length + 1),
          name: parts[1] || "",
          price: parseFloat(parts[2]) || 0,
          min_price: parseFloat(parts[3]) || 0,
          stock_quantity: parseInt(parts[4]) || 0,
          category: parts[5] || "",
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
          category: product.category || null,
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
      {/* Import Button */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
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
          استيراد
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
