import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'gradient';
  text?: string;
  className?: string;
}

/**
 * مكون تحميل محسن مع أنماط متعددة
 */
export const LoadingSpinner = memo(({
  size = 'md',
  variant = 'default',
  text,
  className
}: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center gap-1', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              'rounded-full bg-primary',
              size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut'
            }}
          />
        ))}
        {text && <span className={cn('mr-2 text-muted-foreground', textSizes[size])}>{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <motion.div
          className={cn(
            'rounded-full gradient-primary',
            sizes[size]
          )}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        {text && <span className={cn('text-muted-foreground', textSizes[size])}>{text}</span>}
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <motion.div
          className={cn(
            'rounded-full border-4 border-t-primary border-r-accent border-b-primary/30 border-l-accent/30',
            sizes[size]
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        {text && <span className={cn('text-muted-foreground', textSizes[size])}>{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
      {text && <span className={cn('text-muted-foreground', textSizes[size])}>{text}</span>}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

/**
 * تحميل الصفحة الكاملة
 */
export const FullPageLoader = memo(({ text = 'جاري التحميل...' }: { text?: string }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <LoadingSpinner size="xl" variant="gradient" />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-medium text-muted-foreground"
        >
          {text}
        </motion.p>
      </motion.div>
    </div>
  );
});

FullPageLoader.displayName = 'FullPageLoader';
