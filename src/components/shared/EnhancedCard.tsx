import { memo, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

/**
 * بطاقة محسنة مع تأثيرات بصرية متقدمة
 */
export const EnhancedCard = memo(({
  children,
  variant = 'default',
  hover = true,
  glow = false,
  delay = 0,
  className,
  ...props
}: EnhancedCardProps) => {
  const variants = {
    default: 'bg-card border border-border',
    glass: 'glass-effect',
    gradient: 'border-gradient bg-card',
    elevated: 'bg-card shadow-elevated',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={hover ? { 
        y: -4,
        transition: { duration: 0.2 }
      } : undefined}
      className={cn(
        'rounded-xl p-4 transition-all duration-300',
        variants[variant],
        hover && 'cursor-pointer',
        glow && 'shadow-glow',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

EnhancedCard.displayName = 'EnhancedCard';
