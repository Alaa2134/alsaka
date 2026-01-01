import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, CreditCard, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification3DProps {
  id: string;
  type: "order_new" | "order_confirmed" | "payment_success" | "payment_failed" | "shipping" | "info";
  title: string;
  message: string;
  onClose: (id: string) => void;
  autoClose?: number;
}

const iconMap = {
  order_new: ShoppingBag,
  order_confirmed: CheckCircle2,
  payment_success: CreditCard,
  payment_failed: AlertCircle,
  shipping: Truck,
  info: AlertCircle,
};

const colorMap = {
  order_new: "from-blue-500 to-blue-600",
  order_confirmed: "from-green-500 to-green-600",
  payment_success: "from-emerald-500 to-emerald-600",
  payment_failed: "from-red-500 to-red-600",
  shipping: "from-amber-500 to-amber-600",
  info: "from-purple-500 to-purple-600",
};

export const Notification3D = ({
  id,
  type,
  title,
  message,
  onClose,
  autoClose = 5000,
}: Notification3DProps) => {
  const Icon = iconMap[type] || AlertCircle;
  const colorClass = colorMap[type] || colorMap.info;

  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => onClose(id), autoClose);
      return () => clearTimeout(timer);
    }
  }, [id, autoClose, onClose]);

  return (
    <motion.div
      layout
      initial={{ 
        opacity: 0, 
        y: -100, 
        scale: 0.8,
        rotateX: -30,
      }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotateX: 0,
      }}
      exit={{ 
        opacity: 0, 
        x: 100, 
        scale: 0.8,
        rotateY: 30,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className="relative"
      style={{ perspective: "1000px" }}
    >
      <div className="relative bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50 backdrop-blur-xl">
        {/* Gradient accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClass}`} />
        
        <div className="p-4 flex items-start gap-4">
          {/* Icon */}
          <motion.div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Icon className="h-6 w-6 text-white" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.h4 
              className="font-bold text-foreground"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {title}
            </motion.h4>
            <motion.p 
              className="text-sm text-muted-foreground mt-1 line-clamp-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.p>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-muted"
            onClick={() => onClose(id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        {autoClose > 0 && (
          <motion.div
            className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${colorClass}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: autoClose / 1000, ease: "linear" }}
          />
        )}
      </div>
    </motion.div>
  );
};

// Notifications container
interface NotificationsContainerProps {
  notifications: Array<{
    id: string;
    type: "order_new" | "order_confirmed" | "payment_success" | "payment_failed" | "shipping" | "info";
    title: string;
    message: string;
  }>;
  onClose: (id: string) => void;
}

export const NotificationsContainer = ({ notifications, onClose }: NotificationsContainerProps) => {
  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <Notification3D
            key={notification.id}
            {...notification}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
