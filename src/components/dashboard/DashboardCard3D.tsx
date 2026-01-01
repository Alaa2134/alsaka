import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardCard3DProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  notificationCount?: number;
  color?: "primary" | "accent" | "success" | "warning" | "destructive";
  disabled?: boolean;
}

const colorClasses = {
  primary: "from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10 border-primary/20",
  accent: "from-accent/20 to-accent/5 hover:from-accent/30 hover:to-accent/10 border-accent/20",
  success: "from-success/20 to-success/5 hover:from-success/30 hover:to-success/10 border-success/20",
  warning: "from-warning/20 to-warning/5 hover:from-warning/30 hover:to-warning/10 border-warning/20",
  destructive: "from-destructive/20 to-destructive/5 hover:from-destructive/30 hover:to-destructive/10 border-destructive/20",
};

const iconColorClasses = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export const DashboardCard3D = ({
  title,
  description,
  icon: Icon,
  onClick,
  notificationCount,
  color = "primary",
  disabled = false,
}: DashboardCard3DProps) => {
  return (
    <motion.div
      whileHover={disabled ? {} : { 
        scale: 1.02, 
        rotateX: -2, 
        rotateY: 2,
        z: 20
      }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border bg-gradient-to-br p-6 shadow-lg transition-all duration-300",
        "transform-gpu perspective-1000",
        colorClasses[color],
        disabled && "opacity-50 cursor-not-allowed"
      )}
      style={{ 
        transformStyle: "preserve-3d",
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)"
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      {/* Notification Badge */}
      {notificationCount && notificationCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -left-2 -top-2 min-w-[24px] animate-pulse"
        >
          {notificationCount > 99 ? "99+" : notificationCount}
        </Badge>
      )}

      {/* Icon */}
      <div 
        className="mb-4 flex items-center justify-center"
        style={{ transform: "translateZ(20px)" }}
      >
        <div className={cn(
          "rounded-xl bg-background/80 p-4 shadow-inner",
          "backdrop-blur-sm"
        )}>
          <Icon className={cn("h-10 w-10", iconColorClasses[color])} />
        </div>
      </div>

      {/* Content */}
      <div 
        className="text-center"
        style={{ transform: "translateZ(10px)" }}
      >
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Bottom shine effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
};
