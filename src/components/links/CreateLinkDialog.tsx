import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, ShoppingCart, FileText, CreditCard, Tag } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { StoreLinkType, CreateLinkData } from "@/hooks/useStoreLinks";
import { useProducts } from "@/hooks/useProducts";

interface CreateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLinkData) => Promise<void>;
  tenantId: string;
  allowedTypes?: StoreLinkType[];
}

const linkTypes: { value: StoreLinkType; label: string; icon: React.ReactNode }[] = [
  { value: 'product', label: 'رابط منتج', icon: <Package className="h-4 w-4" /> },
  { value: 'cart', label: 'سلة جاهزة', icon: <ShoppingCart className="h-4 w-4" /> },
  { value: 'invoice', label: 'فاتورة', icon: <FileText className="h-4 w-4" /> },
  { value: 'payment', label: 'دفع مباشر', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'offer', label: 'عرض خاص', icon: <Tag className="h-4 w-4" /> },
];

export const CreateLinkDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  tenantId,
  allowedTypes 
}: CreateLinkDialogProps) => {
  const [linkType, setLinkType] = useState<StoreLinkType>('product');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState(100);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: products = [] } = useProducts();

  const availableTypes = allowedTypes
    ? linkTypes.filter(t => allowedTypes.includes(t.value))
    : linkTypes;

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);

    const linkData: Record<string, any> = {};

    switch (linkType) {
      case 'product':
        if (selectedProduct) {
          const product = products.find(p => p.id === selectedProduct);
          linkData.product_id = selectedProduct;
          linkData.product_name = product?.name;
          linkData.product_price = product?.price;
        }
        break;
      case 'payment':
        linkData.amount = paymentAmount;
        break;
      case 'cart':
        linkData.items = []; // Can be extended to allow pre-filled cart
        break;
    }

    await onSubmit({
      link_type: linkType,
      title,
      description,
      link_data: linkData,
      max_uses: hasMaxUses ? maxUses : undefined,
      expires_at: hasExpiry && expiryDate ? expiryDate.toISOString() : undefined,
      discount_type: hasDiscount ? discountType : undefined,
      discount_value: hasDiscount ? discountValue : undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setHasExpiry(false);
    setExpiryDate(undefined);
    setHasMaxUses(false);
    setMaxUses(100);
    setHasDiscount(false);
    setDiscountValue(0);
    setSelectedProduct('');
    setPaymentAmount(0);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء رابط جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Link Type */}
          <div className="space-y-2">
            <Label>نوع الرابط</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as StoreLinkType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>عنوان الرابط</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عرض العيد الخاص"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>الوصف (اختياري)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف قصير للرابط"
              rows={2}
            />
          </div>

          {/* Product Selection (for product links) */}
          {linkType === 'product' && (
            <div className="space-y-2">
              <Label>اختر المنتج</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر منتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.price} ج.م
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Amount (for payment links) */}
          {linkType === 'payment' && (
            <div className="space-y-2">
              <Label>مبلغ الدفع</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          )}

          {/* Expiry Date */}
          <div className="flex items-center justify-between">
            <Label>تاريخ انتهاء</Label>
            <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
          </div>
          {hasExpiry && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, 'dd/MM/yyyy') : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Max Uses */}
          <div className="flex items-center justify-between">
            <Label>حد أقصى للاستخدام</Label>
            <Switch checked={hasMaxUses} onCheckedChange={setHasMaxUses} />
          </div>
          {hasMaxUses && (
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              min={1}
            />
          )}

          {/* Discount */}
          <div className="flex items-center justify-between">
            <Label>تطبيق خصم</Label>
            <Switch checked={hasDiscount} onCheckedChange={setHasDiscount} />
          </div>
          {hasDiscount && (
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة %</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder="القيمة"
                min={0}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? "جاري الإنشاء..." : "إنشاء الرابط"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
