/**
 * شعار عدم الاتصال - يظهر عند فقدان الاتصال
 */

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, X, CloudOff, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOffline } from './OfflineProvider';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner = memo(({ className }: OfflineBannerProps) => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  // إظهار رسالة استعادة الاتصال
  useEffect(() => {
    if (isOnline && !dismissed) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, dismissed]);

  // إعادة تعيين الإغلاق عند فقدان الاتصال
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {/* شعار عدم الاتصال */}
      {!isOnline && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-[100]',
            'bg-gradient-to-r from-destructive to-destructive/80',
            'text-destructive-foreground',
            className
          )}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-full">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">أنت غير متصل بالإنترنت</p>
                  <p className="text-xs opacity-80">
                    لا تقلق! جميع بياناتك محفوظة محلياً وستتم مزامنتها تلقائياً عند الاتصال
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
                    <Database className="h-4 w-4" />
                    <span>{pendingCount} معلقة</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDismissed(true)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* شعار استعادة الاتصال */}
      {showReconnected && isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-[100]',
            'bg-gradient-to-r from-success to-success/80',
            'text-success-foreground',
            className
          )}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-full animate-pulse">
                  <RefreshCw className={cn('h-5 w-5', isSyncing && 'animate-spin')} />
                </div>
                <div>
                  <p className="font-bold text-sm">تم استعادة الاتصال!</p>
                  <p className="text-xs opacity-80">
                    {isSyncing 
                      ? 'جاري مزامنة البيانات...' 
                      : pendingCount > 0 
                        ? `${pendingCount} عملية جاهزة للمزامنة`
                        : 'جميع البيانات متزامنة'
                    }
                  </p>
                </div>
              </div>

              {pendingCount > 0 && !isSyncing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={syncNow}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  مزامنة الآن
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

OfflineBanner.displayName = 'OfflineBanner';
