import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag,
  ArrowLeft,
  Sparkles
} from "lucide-react";

interface Cart3DDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  primaryColor?: string;
}

export const Cart3DDrawer = ({ 
  isOpen, 
  onClose, 
  tenantSlug,
  primaryColor = "#3b82f6" 
}: Cart3DDrawerProps) => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  const drawerVariants = {
    hidden: { 
      x: "-100%",
      opacity: 0,
      rotateY: 15,
    },
    visible: { 
      x: 0,
      opacity: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      }
    },
    exit: { 
      x: "-100%",
      opacity: 0,
      rotateY: 15,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50, rotateY: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      rotateY: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 200,
      }
    }),
    exit: { 
      opacity: 0, 
      x: -100, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  const boxScale = (quantity: number) => {
    const baseScale = 1;
    const maxScale = 1.3;
    const scale = baseScale + (quantity - 1) * 0.05;
    return Math.min(scale, maxScale);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 shadow-2xl"
            style={{ 
              perspective: "1000px",
              transformStyle: "preserve-3d" 
            }}
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <ShoppingCart className="h-6 w-6" style={{ color: primaryColor }} />
                </motion.div>
                <h2 className="text-xl font-bold">سلة التسوق</h2>
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary text-primary-foreground text-sm px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-6 space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        animate={{ 
                          y: [0, -10, 0],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          ease: "easeInOut" 
                        }}
                      >
                        <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30" />
                      </motion.div>
                      <p className="text-muted-foreground mt-4">السلة فارغة</p>
                    </motion.div>
                  ) : (
                    items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="relative"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        {/* 3D Box Effect */}
                        <motion.div
                          className="relative bg-card rounded-2xl p-4 border shadow-lg overflow-hidden"
                          whileHover={{ 
                            scale: 1.02, 
                            rotateY: 2,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                          }}
                          style={{
                            transform: `scale(${boxScale(item.quantity)})`,
                            transformOrigin: "center center",
                          }}
                        >
                          {/* Gradient accent */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{ backgroundColor: primaryColor }}
                          />

                          <div className="flex gap-4">
                            {/* Product Image/Box */}
                            <motion.div
                              className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                              whileHover={{ rotate: [0, -5, 5, 0] }}
                              transition={{ duration: 0.5 }}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <motion.div
                                  animate={{ 
                                    rotateY: [0, 180, 360],
                                  }}
                                  transition={{ 
                                    duration: 3, 
                                    repeat: Infinity,
                                    ease: "linear" 
                                  }}
                                >
                                  <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                                </motion.div>
                              )}
                            </motion.div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold line-clamp-2 text-sm">
                                {item.name}
                              </h3>
                              <motion.p 
                                className="font-bold mt-1"
                                style={{ color: primaryColor }}
                                key={item.price * item.quantity}
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                              >
                                {(item.price * item.quantity).toLocaleString()} ج.م
                              </motion.p>

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center border rounded-lg overflow-hidden">
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="p-2 hover:bg-muted disabled:opacity-50"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </motion.button>
                                  <motion.span 
                                    className="w-8 text-center text-sm font-medium"
                                    key={item.quantity}
                                    initial={{ scale: 1.3 }}
                                    animate={{ scale: 1 }}
                                  >
                                    {item.quantity}
                                  </motion.span>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                    disabled={item.quantity >= item.max_quantity}
                                    className="p-2 hover:bg-muted disabled:opacity-50"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </motion.button>
                                </div>

                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeItem(item.product_id)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </div>
                          </div>

                          {/* Quantity indicator dots */}
                          {item.quantity > 1 && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                              {Array.from({ length: Math.min(item.quantity, 5) }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: primaryColor }}
                                />
                              ))}
                              {item.quantity > 5 && (
                                <span className="text-xs text-muted-foreground">+{item.quantity - 5}</span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer */}
            {items.length > 0 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">الإجمالي</span>
                  <motion.span 
                    className="text-2xl font-bold"
                    style={{ color: primaryColor }}
                    key={totalPrice}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                  >
                    {totalPrice.toLocaleString()} ج.م
                  </motion.span>
                </div>

                <Link to={`/store/${tenantSlug}/checkout`} onClick={onClose}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      size="lg" 
                      className="w-full gap-2 text-lg py-6 rounded-2xl"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Sparkles className="h-5 w-5" />
                      إتمام الطلب
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
