import { useState, useRef, useCallback } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";

interface BarcodeGeneratorProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onBarcodeGenerated?: (barcode: string) => void;
}

const generateRandomBarcode = (type: "EAN13" | "CODE128" | "UPC" = "EAN13"): string => {
  if (type === "EAN13") {
    // Generate 12 digits, the 13th is checksum
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    // Calculate EAN-13 checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else if (type === "UPC") {
    // Generate 11 digits, 12th is checksum
    let code = "";
    for (let i = 0; i < 11; i++) {
      code += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  } else {
    // CODE128 - alphanumeric
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
};

export const BarcodeGenerator = ({ 
  open, 
  onClose, 
  product, 
  onBarcodeGenerated 
}: BarcodeGeneratorProps) => {
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [barcodeType, setBarcodeType] = useState<"EAN13" | "CODE128" | "UPC">("EAN13");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handleGenerateNew = () => {
    const newBarcode = generateRandomBarcode(barcodeType);
    setBarcode(newBarcode);
  };

  const handleCopy = async () => {
    if (barcode) {
      await navigator.clipboard.writeText(barcode);
      setCopied(true);
      toast.success("تم نسخ الباركود");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = useCallback(() => {
    if (!barcodeRef.current || !barcode) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة");
      return;
    }

    const barcodeHtml = barcodeRef.current.innerHTML;
    const productName = product?.name || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>طباعة الباركود - ${productName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { margin: 5mm; }
          body { 
            font-family: Arial, sans-serif;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            padding: 10px;
          }
          .barcode-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            border: 1px dashed #ccc;
            page-break-inside: avoid;
          }
          .product-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            text-align: center;
          }
          .barcode-container svg {
            max-width: 150px;
            height: auto;
          }
          @media print {
            .barcode-item { border: none; }
          }
        </style>
      </head>
      <body>
        ${Array(printQuantity).fill(`
          <div class="barcode-item">
            <div class="product-name">${productName}</div>
            <div class="barcode-container">${barcodeHtml}</div>
          </div>
        `).join("")}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [barcode, product, printQuantity]);

  const handleSave = () => {
    if (barcode && onBarcodeGenerated) {
      onBarcodeGenerated(barcode);
      toast.success("تم حفظ الباركود");
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            إنشاء باركود
            {product && <span className="text-muted-foreground text-sm">- {product.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barcode Type */}
          <div>
            <Label>نوع الباركود</Label>
            <Select value={barcodeType} onValueChange={(v) => setBarcodeType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EAN13">EAN-13 (دولي)</SelectItem>
                <SelectItem value="CODE128">CODE128 (متعدد)</SelectItem>
                <SelectItem value="UPC">UPC (أمريكي)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barcode Input */}
          <div>
            <Label>رقم الباركود</Label>
            <div className="flex gap-2">
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="أدخل أو اضغط توليد"
                className="font-mono"
              />
              <Button variant="outline" size="icon" onClick={handleGenerateNew} title="توليد جديد">
                <RefreshCw size={16} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleCopy} title="نسخ">
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          {/* Barcode Preview */}
          {barcode && (
            <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
              <div ref={barcodeRef}>
                <Barcode
                  value={barcode}
                  format={barcodeType}
                  width={1.5}
                  height={50}
                  fontSize={12}
                  margin={10}
                  displayValue={true}
                />
              </div>
            </div>
          )}

          {/* Print Quantity */}
          <div>
            <Label>عدد النسخ للطباعة</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={printQuantity}
              onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1" disabled={!barcode}>
              حفظ الباركود
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={!barcode}
              className="flex items-center gap-2"
            >
              <Printer size={16} />
              طباعة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
