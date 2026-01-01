import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const PENDING_OPS_KEY = 'pending_offline_operations';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending operations count
  const loadPendingCount = useCallback(() => {
    try {
      const pending = localStorage.getItem(PENDING_OPS_KEY);
      const ops: PendingOperation[] = pending ? JSON.parse(pending) : [];
      setPendingCount(ops.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال بالإنترنت');
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('أنت الآن في وضع عدم الاتصال');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadPendingCount]);

  // Add operation to pending queue
  const addPendingOperation = useCallback((
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ) => {
    try {
      const pending = localStorage.getItem(PENDING_OPS_KEY);
      const ops: PendingOperation[] = pending ? JSON.parse(pending) : [];
      
      ops.push({
        id: crypto.randomUUID(),
        table,
        operation,
        data,
        timestamp: Date.now(),
      });

      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
      loadPendingCount();
    } catch (error) {
      console.error('Failed to save pending operation:', error);
    }
  }, [loadPendingCount]);

  // Sync all pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const pending = localStorage.getItem(PENDING_OPS_KEY);
      const ops: PendingOperation[] = pending ? JSON.parse(pending) : [];

      if (ops.length === 0) {
        setIsSyncing(false);
        return;
      }

      const failedOps: PendingOperation[] = [];

      for (const op of ops) {
        try {
          switch (op.operation) {
            case 'insert':
              await supabase.from(op.table as any).insert(op.data);
              break;
            case 'update':
              if (op.data.id) {
                await supabase.from(op.table as any).update(op.data).eq('id', op.data.id);
              }
              break;
            case 'delete':
              if (op.data.id) {
                await supabase.from(op.table as any).delete().eq('id', op.data.id);
              }
              break;
          }
        } catch {
          failedOps.push(op);
        }
      }

      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(failedOps));
      loadPendingCount();

      if (failedOps.length === 0) {
        toast.success('تم مزامنة جميع البيانات بنجاح');
      } else {
        toast.warning(`فشلت مزامنة ${failedOps.length} عملية`);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadPendingCount]);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    localStorage.removeItem(PENDING_OPS_KEY);
    loadPendingCount();
  }, [loadPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addPendingOperation,
    syncPendingOperations,
    clearPendingOperations,
  };
};
