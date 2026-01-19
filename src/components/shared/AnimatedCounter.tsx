import { memo, useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * عداد متحرك مع تأثيرات سلسة
 */
export const AnimatedCounter = memo(({
  value,
  duration = 1,
  prefix = '',
  suffix = '',
  decimals = 0,
  className
}: AnimatedCounterProps) => {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000
  });

  const display = useTransform(spring, (current) => {
    const formatted = current.toFixed(decimals);
    return `${prefix}${Number(formatted).toLocaleString('ar-EG')}${suffix}`;
  });

  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {displayValue}
    </motion.span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  className?: string;
}

/**
 * بطاقة إحصائية محسنة
 */
export const StatCard = memo(({
  title,
  value,
  prefix,
  suffix,
  icon,
  trend,
  color = 'primary',
  className
}: StatCardProps) => {
  const colors = {
    primary: 'from-primary to-primary/80',
    success: 'from-success to-success/80',
    warning: 'from-warning to-warning/80',
    destructive: 'from-destructive to-destructive/80',
    accent: 'from-accent to-accent/80',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        'relative overflow-hidden rounded-xl bg-card p-4 shadow-soft border border-border',
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn(
        'absolute top-0 left-0 w-24 h-24 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br',
        colors[color]
      )} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            className="text-2xl font-bold"
          />
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            'p-2.5 rounded-lg bg-gradient-to-br text-white',
            colors[color]
          )}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';
