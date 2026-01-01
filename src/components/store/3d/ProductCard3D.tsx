import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Eye, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Card3D } from "./Card3D";

interface ProductCard3DProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  stock: number;
  category?: string;
  tenantSlug: string;
  primaryColor?: string;
}

export const ProductCard3D = ({
  id,
  name,
  price,
  originalPrice,
  imageUrl,
  stock,
  category,
  tenantSlug,
  primaryColor = "#3b82f6",
}: ProductCard3DProps) => {
  const { addItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);
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
    toast.success("تمت الإضافة إلى السلة", {
      icon: <Sparkles className="h-4 w-4" />,
    });
    
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <Card3D className="w-full" intensity={12}>
      <Link to={`/store/${tenantSlug}/product/${id}`}>
        <motion.div
          className="relative bg-card rounded-2xl overflow-hidden border border-border/50 backdrop-blur-sm"
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
            {imageUrl ? (
              <motion.img
                src={imageUrl}
                alt={name}
                className="object-cover w-full h-full"
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ duration: 0.4 }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <motion.div
                  animate={{ 
                    rotateY: isHovered ? 180 : 0,
                    scale: isHovered ? 1.1 : 1
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/20" />
                </motion.div>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <AnimatePresence>
                {hasDiscount && (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    <Badge className="bg-red-500 text-white border-0 shadow-lg">
                      -{discountPercent}%
                    </Badge>
                  </motion.div>
                )}
                {isOutOfStock && (
                  <Badge variant="secondary" className="backdrop-blur-sm">
                    نفذ المخزون
                  </Badge>
                )}
              </AnimatePresence>
            </div>

            {/* Category */}
            {category && (
              <motion.div
                className="absolute top-3 left-3"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-0">
                  {category}
                </Badge>
              </motion.div>
            )}

            {/* Hover Actions */}
            <AnimatePresence>
              {isHovered && !isOutOfStock && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-xl"
                      style={{ backgroundColor: primaryColor }}
                      onClick={handleAddToCart}
                    >
                      {isAdded ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <ShoppingCart className="h-5 w-5" />
                      )}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-12 w-12 rounded-full shadow-xl backdrop-blur-sm"
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
              {name}
            </h3>

            {/* Price */}
            <div className="flex items-center gap-2">
              <motion.span 
                className="font-bold text-lg"
                style={{ color: primaryColor }}
                key={price}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {price.toLocaleString()} ج.م
              </motion.span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {originalPrice?.toLocaleString()} ج.م
                </span>
              )}
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full ${
                  isOutOfStock 
                    ? "bg-red-500" 
                    : stock <= 5 
                    ? "bg-yellow-500" 
                    : "bg-green-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isOutOfStock 
                  ? "غير متوفر" 
                  : stock <= 5 
                  ? `آخر ${stock} قطع` 
                  : "متوفر"}
              </span>
            </div>
          </div>

          {/* Bottom gradient accent */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: primaryColor }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </Link>
    </Card3D>
  );
};
