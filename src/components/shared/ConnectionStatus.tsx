import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle,
  CloudOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ConnectionStatusProps {
  showAlways?: boolean;
  className?: string;
}

/**
 * مؤشر حالة الاتصال المحسن
 */
export const ConnectionStatus = memo(({ 
  showAlways = false,
  className 
}: ConnectionStatusProps) => {
  const { isOnline } = useNetworkStatus();
  const [show, setShow] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setJustReconnected(false);
    } else if (show) {
      setJustReconnected(true);
      setTimeout(() => {
        setShow(false);
        setJustReconnected(false);
      }, 3000);
    }
  }, [isOnline, show]);

  const shouldShow = showAlways || show;

  if (!shouldShow) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 z-50',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-full shadow-elevated backdrop-blur-lg border',
          isOnline 
            ? justReconnected 
              ? 'bg-success/10 border-success/30' 
              : 'bg-card/90 border-border'
            : 'bg-destructive/10 border-destructive/30'
        )}
      >
        {isOnline ? (
          justReconnected ? (
            <>
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">تم استعادة الاتصال</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">متصل</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">لا يوجد اتصال</span>
          </>
        )}
      </div>
    </motion.div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

/**
 * صفحة عدم الاتصال الكاملة
 */
export const OfflinePage = memo(() => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="text-center space-y-6 p-8">
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <CloudOff className="h-24 w-24 text-muted-foreground mx-auto" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h2>
          <p className="text-muted-foreground max-w-md">
            يبدو أنك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    </motion.div>
  );
});

OfflinePage.displayName = 'OfflinePage';
