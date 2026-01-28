/**
 * مزود سياق للعمل بدون إنترنت
 * يوفر حالة الاتصال والمزامنة لكل التطبيق
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  getPendingOperations,
  removePendingOperation,
  updateRetryCount,
  getPendingCount,
  cleanupOldData,
  getStorageUsage
} from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  storageUsed: number;
  storageQuota: number;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  clearPendingOperations: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageQuota, setStorageQuota] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // تحديث حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت', {
        description: 'جاري مزامنة البيانات...'
      });
      syncAllPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('أنت الآن في وضع عدم الاتصال', {
        description: 'جميع البيانات محفوظة محلياً'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);

      const storage = await getStorageUsage();
      setStorageUsed(storage.used);
      setStorageQuota(storage.quota);

      // تنظيف البيانات القديمة
      await cleanupOldData();
    } catch (err) {
      console.error('Error loading offline data:', err);
    }
  };

  // مزامنة جميع العمليات المعلقة
  const syncAllPending = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const pendingOps = await getPendingOperations();
      let successCount = 0;
      let failCount = 0;

      for (const op of pendingOps) {
        // تخطي العمليات التي فشلت كثيراً
        if (op.retryCount >= 5) {
          continue;
        }

        try {
          switch (op.operation) {
            case 'insert':
              await supabase.from(op.table as any).insert(op.data);
              break;
            case 'update':
              await supabase.from(op.table as any)
                .update(op.data)
                .eq('id', op.data.id);
              break;
            case 'delete':
              await supabase.from(op.table as any)
                .delete()
                .eq('id', op.data.id);
              break;
          }
          await removePendingOperation(op.id);
          successCount++;
        } catch (err) {
          console.error(`Sync failed for operation ${op.id}:`, err);
          await updateRetryCount(op.id);
          failCount++;
        }
      }

      // تحديث العداد
      const newCount = await getPendingCount();
      setPendingCount(newCount);
      setLastSyncTime(new Date());

      if (successCount > 0) {
        toast.success(`تم مزامنة ${successCount} عملية`, {
          description: failCount > 0 ? `فشلت ${failCount} عملية` : undefined
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('فشل في المزامنة');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // مسح العمليات المعلقة
  const clearPendingOperations = useCallback(async () => {
    try {
      const pendingOps = await getPendingOperations();
      for (const op of pendingOps) {
        await removePendingOperation(op.id);
      }
      setPendingCount(0);
      toast.success('تم مسح جميع العمليات المعلقة');
    } catch (err) {
      console.error('Error clearing pending operations:', err);
      toast.error('فشل في مسح العمليات');
    }
  }, []);

  // مزامنة دورية كل دقيقة
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      if (pendingCount > 0) {
        syncAllPending();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isOnline, pendingCount, syncAllPending]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        storageUsed,
        storageQuota,
        lastSyncTime,
        syncNow: syncAllPending,
        clearPendingOperations
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
