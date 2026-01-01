import { Link } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  stock: number;
  category?: string;
  tenantSlug: string;
}

export const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  imageUrl,
  stock,
  category,
  tenantSlug,
}: ProductCardProps) => {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const isOutOfStock = stock <= 0;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) return;

    addItem({
      product_id: id,
      name,
      price,
      quantity: 1,
      max_quantity: stock,
      image_url: imageUrl,
    });

    setIsAdded(true);
    toast.success("تمت الإضافة إلى السلة");
    
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <Link to={`/store/${tenantSlug}/product/${id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 opacity-20" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {hasDiscount && (
              <Badge variant="destructive" className="text-xs">
                -{discountPercent}%
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="text-xs">
                نفذ المخزون
              </Badge>
            )}
          </div>

          {/* Category */}
          {category && (
            <Badge variant="outline" className="absolute top-2 left-2 bg-background/80 text-xs">
              {category}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          {/* Name */}
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-lg text-primary">
              {price.toLocaleString()} ج.م
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {originalPrice?.toLocaleString()} ج.م
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full gap-2"
            variant={isAdded ? "secondary" : "default"}
          >
            {isAdded ? (
              <>
                <Check className="h-4 w-4" />
                تمت الإضافة
              </>
            ) : isOutOfStock ? (
              "غير متوفر"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                أضف للسلة
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};
