import { Wifi, WifiOff, Cloud, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, syncPendingOperations } = useOfflineSync();

  return (
    <AnimatePresence>
      {(!isOnline || pendingCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 z-50"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm ${
            isOnline 
              ? 'bg-green-500/90 text-white' 
              : 'bg-orange-500/90 text-white'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">متصل</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">غير متصل</span>
              </>
            )}

            {pendingCount > 0 && (
              <>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {pendingCount} في الانتظار
                </Badge>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    onClick={() => syncPendingOperations()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
