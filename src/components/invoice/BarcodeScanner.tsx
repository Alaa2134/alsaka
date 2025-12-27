import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Plus } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";

interface BarcodeScannerProps {
  products: Product[] | undefined;
  onProductFound: (product: Product) => void;
}

export const BarcodeScanner = ({ products, onProductFound }: BarcodeScannerProps) => {
  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef("");
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle barcode scanner input (fast sequential keystrokes)
  useEffect(() => {
    if (!isScanning) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if focus is on another input
      if (document.activeElement !== inputRef.current && 
          document.activeElement?.tagName === "INPUT") {
        return;
      }

      if (e.key === "Enter" && scanBuffer.current.length > 0) {
        // Process the scanned barcode
        handleBarcodeSubmit(scanBuffer.current);
        scanBuffer.current = "";
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        scanBuffer.current += e.key;

        // Clear buffer after delay (human typing is slower)
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
          scanBuffer.current = "";
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, [isScanning, products]);

  const handleBarcodeSubmit = (code: string) => {
    if (!code.trim()) return;

    const product = products?.find(
      p => p.barcode === code.trim() || p.item_number === code.trim()
    );

    if (product) {
      onProductFound(product);
      toast.success(`تم إضافة: ${product.name}`, { duration: 2000 });
      setBarcode("");
    } else {
      toast.error(`لم يتم العثور على منتج بهذا الباركود: ${code}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBarcodeSubmit(barcode);
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
    if (!isScanning) {
      toast.info("وضع المسح الضوئي مفعل - امسح الباركود", { duration: 2000 });
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
      <ScanBarcode 
        size={20} 
        className={`${isScanning ? "text-primary animate-pulse" : "text-muted-foreground"}`} 
      />
      <form onSubmit={handleManualSubmit} className="flex-1 flex gap-2">
        <Input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder={isScanning ? "امسح الباركود أو أدخله يدوياً..." : "أدخل الباركود..."}
          className="flex-1 font-mono"
          onFocus={() => setIsScanning(true)}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!barcode}>
          <Plus size={16} />
        </Button>
      </form>
      <Button
        type="button"
        size="sm"
        variant={isScanning ? "default" : "outline"}
        onClick={toggleScanning}
        className="shrink-0"
      >
        {isScanning ? "إيقاف" : "مسح"}
      </Button>
    </div>
  );
};
