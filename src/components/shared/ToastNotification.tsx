import { memo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastNotificationProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-success/10 border-success/30 text-success',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  info: 'bg-info/10 border-info/30 text-info',
};

const iconColors = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
};

/**
 * إشعار toast محسن
 */
export const ToastNotification = memo(({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onDismiss
}: ToastNotificationProps) => {
  const Icon = icons[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border shadow-elevated backdrop-blur-sm',
        colors[type]
      )}
    >
      {/* Progress bar */}
      <motion.div
        className="absolute bottom-0 right-0 h-1 bg-current/20 rounded-b-xl"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        onAnimationComplete={() => onDismiss(id)}
      />

      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColors[type])} />
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {message && (
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-foreground/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
});

ToastNotification.displayName = 'ToastNotification';

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>;
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

const positions = {
  'top-right': 'top-4 left-4',
  'top-left': 'top-4 right-4',
  'bottom-right': 'bottom-4 left-4',
  'bottom-left': 'bottom-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
};

/**
 * حاوية الإشعارات
 */
export const ToastContainer = memo(({
  toasts,
  onDismiss,
  position = 'top-right'
}: ToastContainerProps) => {
  return (
    <div className={cn(
      'fixed z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none',
      positions[position]
    )}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastNotification
              {...toast}
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';
