/**
 * شريط حالة الاتصال - يظهر في أعلى التطبيق
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Cloud,
  CloudOff,
  CheckCircle,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOffline } from './OfflineProvider';

interface OfflineStatusBarProps {
  showAlways?: boolean;
  compact?: boolean;
  className?: string;
}

export const OfflineStatusBar = memo(({
  showAlways = false,
  compact = false,
  className
}: OfflineStatusBarProps) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    storageUsed,
    storageQuota,
    lastSyncTime,
    syncNow
  } = useOffline();

  const storagePercentage = storageQuota > 0 
    ? Math.round((storageUsed / storageQuota) * 100) 
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'لم تتم المزامنة بعد';
    const now = new Date();
    const diff = Math.round((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'منذ ثوان';
    if (diff < 3600) return `منذ ${Math.round(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.round(diff / 3600)} ساعة`;
    return `منذ ${Math.round(diff / 86400)} يوم`;
  };

  // لا تظهر إذا كان متصل ولا توجد عمليات معلقة
  if (!showAlways && isOnline && pendingCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          'fixed bottom-4 left-4 z-50',
          className
        )}
      >
        <Button
          variant={isOnline ? 'outline' : 'destructive'}
          size="sm"
          onClick={syncNow}
          disabled={isSyncing || !isOnline}
          className="gap-2 shadow-lg"
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : isOnline ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          {pendingCount > 0 && (
            <span className="bg-warning/20 text-warning-foreground px-1.5 py-0.5 rounded text-xs">
              {pendingCount}
            </span>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
          !isOnline && 'bg-destructive/10 border-destructive/30',
          className
        )}
      >
        <div className="flex items-center justify-between px-4 py-2">
          {/* حالة الاتصال */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
              isOnline 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            )}>
              {isOnline ? (
                <>
                  <Cloud className="h-4 w-4" />
                  <span>متصل</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-4 w-4" />
                  <span>غير متصل</span>
                </>
              )}
            </div>

            {/* العمليات المعلقة */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span>{pendingCount} عملية معلقة</span>
              </div>
            )}

            {/* آخر مزامنة */}
            {lastSyncTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>آخر مزامنة: {formatTime(lastSyncTime)}</span>
              </div>
            )}
          </div>

          {/* التخزين والمزامنة */}
          <div className="flex items-center gap-4">
            {/* استخدام التخزين */}
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div className="w-24">
                <Progress value={storagePercentage} className="h-2" />
              </div>
              <span className="text-muted-foreground text-xs">
                {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
              </span>
            </div>

            {/* زر المزامنة */}
            <Button
              variant="outline"
              size="sm"
              onClick={syncNow}
              disabled={isSyncing || !isOnline || pendingCount === 0}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

OfflineStatusBar.displayName = 'OfflineStatusBar';
