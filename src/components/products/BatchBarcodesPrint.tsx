import { useState, useRef } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";

interface BatchBarcodesPrintProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

export const BatchBarcodesPrint = ({ open, onClose, products }: BatchBarcodesPrintProps) => {
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!previewRef.current || products.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة");
      return;
    }

    // Generate barcode HTML for all products
    const barcodesHtml = products
      .filter(p => p.barcode)
      .map(product => {
        const barcodeItems = Array(copiesPerProduct)
          .fill(null)
          .map(() => `
            <div class="barcode-item">
              <div class="product-name">${product.name}</div>
              <div class="product-number">${product.item_number}</div>
              <div class="barcode-container">
                <svg id="barcode-${product.id}"></svg>
              </div>
              <div class="barcode-text">${product.barcode}</div>
            </div>
          `)
          .join("");
        return barcodeItems;
      })
      .join("");

    const barcodeScripts = products
      .filter(p => p.barcode)
      .map(product => `
        JsBarcode("#barcode-${product.id}", "${product.barcode}", {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 5
        });
      `)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>طباعة ملصقات الباركود</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { margin: 5mm; }
          body { 
            font-family: Arial, sans-serif;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 8px;
            padding: 10px;
          }
          .barcode-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px;
            border: 1px dashed #ccc;
            page-break-inside: avoid;
            width: 180px;
          }
          .product-name {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 2px;
            text-align: center;
            max-width: 160px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .product-number {
            font-size: 9px;
            color: #666;
            margin-bottom: 4px;
          }
          .barcode-container svg {
            max-width: 160px;
            height: auto;
          }
          .barcode-text {
            font-size: 10px;
            font-family: monospace;
            margin-top: 2px;
          }
          @media print {
            .barcode-item { border: none; }
          }
        </style>
      </head>
      <body>
        ${barcodesHtml || '<p style="text-align:center;width:100%">لا توجد منتجات تحتوي على باركود</p>'}
        <script>
          ${barcodeScripts}
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const productsWithBarcode = products.filter(p => p.barcode);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={20} />
            طباعة ملصقات الباركود ({products.length} منتج)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p>المنتجات المحددة: <strong>{products.length}</strong></p>
            <p>المنتجات بباركود: <strong>{productsWithBarcode.length}</strong></p>
            <p>المنتجات بدون باركود: <strong className="text-warning">{products.length - productsWithBarcode.length}</strong></p>
          </div>

          {/* Copies per product */}
          <div>
            <Label>عدد النسخ لكل منتج</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={copiesPerProduct}
              onChange={(e) => setCopiesPerProduct(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Preview */}
          <div ref={previewRef} className="max-h-48 overflow-y-auto border rounded p-2 bg-white">
            <div className="flex flex-wrap gap-2 justify-center">
              {productsWithBarcode.slice(0, 6).map(product => (
                <div key={product.id} className="text-center p-2 border rounded text-xs">
                  <div className="font-bold truncate max-w-[100px]">{product.name}</div>
                  <div className="text-muted-foreground">{product.barcode}</div>
                </div>
              ))}
              {productsWithBarcode.length > 6 && (
                <div className="flex items-center text-muted-foreground text-sm">
                  +{productsWithBarcode.length - 6} المزيد
                </div>
              )}
            </div>
          </div>

          {/* Total labels */}
          <div className="text-center text-sm text-muted-foreground">
            إجمالي الملصقات: <strong>{productsWithBarcode.length * copiesPerProduct}</strong>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1" disabled={productsWithBarcode.length === 0}>
              <Printer size={16} className="ml-2" />
              طباعة الملصقات
            </Button>
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
