import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
}

export const GlassCard = ({ 
  children, 
  className = "",
  blur = "md",
  opacity = 0.8
}: GlassCardProps) => {
  const blurValues = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/10 dark:bg-black/10
        ${blurValues[blur]}
        border border-white/20 dark:border-white/10
        shadow-xl shadow-black/5
        ${className}
      `}
      style={{
        background: `rgba(255, 255, 255, ${opacity * 0.1})`,
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
