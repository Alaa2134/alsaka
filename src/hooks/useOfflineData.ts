/**
 * Hook للتعامل مع البيانات في وضع عدم الاتصال
 * يوفر طبقة تجريد للتخزين المحلي والمزامنة مع السيرفر
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  OfflineTable,
  saveToLocal,
  getFromLocal,
  deleteFromLocal,
  addPendingOperation,
  getPendingOperations,
  removePendingOperation,
  updateRetryCount,
  getPendingCount,
  cleanupOldData
} from '@/lib/offlineStorage';

interface UseOfflineDataOptions {
  table: OfflineTable;
  tenantId?: string;
  autoSync?: boolean;
  syncInterval?: number;
}

interface OfflineDataResult<T> {
  data: T[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (item: Partial<T>) => Promise<T>;
  update: (id: string, item: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

// Helper to safely cast supabase responses
function safeDataCast<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
}

export function useOfflineData<T extends { id: string }>({
  table,
  tenantId,
  autoSync = true,
  syncInterval = 30000 // 30 ثانية
}: UseOfflineDataOptions): OfflineDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال');
      syncWithServer();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('أنت الآن في وضع عدم الاتصال - البيانات محفوظة محلياً');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحميل البيانات
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // محاولة تحميل من السيرفر أولاً
      if (navigator.onLine) {
        let query = supabase.from(table as any).select('*');
        
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const { data: serverData, error: serverError } = await query;

        if (!serverError && serverData) {
          const typedData = safeDataCast<T>(serverData);
          // حفظ في التخزين المحلي
          if (typedData.length > 0) {
            await saveToLocal(table, typedData as unknown as { id: string }[]);
          }
          setData(typedData);
          setIsLoading(false);
          return;
        }
      }

      // إذا لم يكن متصل أو فشل، استخدم البيانات المحلية
      const localData = await getFromLocal<T>(table, tenantId);
      setData(localData);
    } catch (err) {
      console.error(`Error loading ${table}:`, err);
      setError(err as Error);
      
      // محاولة استخدام البيانات المحلية كخطة بديلة
      try {
        const localData = await getFromLocal<T>(table, tenantId);
        setData(localData);
      } catch {
        setData([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [table, tenantId]);

  // مزامنة مع السيرفر
  const syncWithServer = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const pendingOps = await getPendingOperations();
      const tableOps = pendingOps.filter(op => op.table === table);

      let successCount = 0;
      let failCount = 0;

      for (const op of tableOps) {
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

      // تحديث عدد العمليات المعلقة
      const newCount = await getPendingCount();
      setPendingCount(newCount);

      // إعادة تحميل البيانات من السيرفر
      if (successCount > 0) {
        await loadData();
        queryClient.invalidateQueries({ queryKey: [table] });
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`تم مزامنة ${successCount} عملية بنجاح`);
      } else if (failCount > 0) {
        toast.warning(`فشلت ${failCount} عملية في المزامنة`);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [table, isSyncing, loadData, queryClient]);

  // إنشاء عنصر جديد
  const create = useCallback(async (item: Partial<T>): Promise<T> => {
    const newItem = {
      ...item,
      id: (item as any).id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tenant_id: tenantId
    } as unknown as T;

    // حفظ محلياً
    await saveToLocal(table, newItem as unknown as { id: string });
    setData(prev => [...prev, newItem]);

    if (navigator.onLine) {
      try {
        const { data: serverData, error } = await supabase
          .from(table as any)
          .insert(newItem)
          .select()
          .single();

        if (error) throw error;
        
        const typedServerData = serverData as unknown as T;
        // تحديث بالبيانات من السيرفر
        await saveToLocal(table, typedServerData as unknown as { id: string });
        setData(prev => prev.map(d => d.id === newItem.id ? typedServerData : d));
        return typedServerData;
      } catch (err) {
        // إضافة للمزامنة لاحقاً
        await addPendingOperation(table, 'insert', newItem);
        setPendingCount(prev => prev + 1);
        toast.info('سيتم مزامنة البيانات عند الاتصال');
      }
    } else {
      // حفظ للمزامنة لاحقاً
      await addPendingOperation(table, 'insert', newItem);
      setPendingCount(prev => prev + 1);
      toast.info('تم الحفظ محلياً - سيتم المزامنة عند الاتصال');
    }

    return newItem;
  }, [table, tenantId]);

  // تحديث عنصر
  const update = useCallback(async (id: string, item: Partial<T>): Promise<T> => {
    const existingItem = data.find(d => d.id === id);
    const updatedItem = {
      ...existingItem,
      ...item,
      id,
      updated_at: new Date().toISOString()
    } as unknown as T;

    // تحديث محلياً
    await saveToLocal(table, updatedItem as unknown as { id: string });
    setData(prev => prev.map(d => d.id === id ? updatedItem : d));

    if (navigator.onLine) {
      try {
        const { data: serverData, error } = await supabase
          .from(table as any)
          .update(item)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        
        const typedServerData = serverData as unknown as T;
        await saveToLocal(table, typedServerData as unknown as { id: string });
        setData(prev => prev.map(d => d.id === id ? typedServerData : d));
        return typedServerData;
      } catch (err) {
        await addPendingOperation(table, 'update', updatedItem);
        setPendingCount(prev => prev + 1);
        toast.info('سيتم مزامنة التحديث عند الاتصال');
      }
    } else {
      await addPendingOperation(table, 'update', updatedItem);
      setPendingCount(prev => prev + 1);
      toast.info('تم الحفظ محلياً - سيتم المزامنة عند الاتصال');
    }

    return updatedItem;
  }, [table, data]);

  // حذف عنصر
  const remove = useCallback(async (id: string): Promise<void> => {
    // حذف محلياً
    await deleteFromLocal(table, id);
    setData(prev => prev.filter(d => d.id !== id));

    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        await addPendingOperation(table, 'delete', { id });
        setPendingCount(prev => prev + 1);
        toast.info('سيتم مزامنة الحذف عند الاتصال');
      }
    } else {
      await addPendingOperation(table, 'delete', { id });
      setPendingCount(prev => prev + 1);
      toast.info('تم الحذف محلياً - سيتم المزامنة عند الاتصال');
    }
  }, [table]);

  // تحميل البيانات عند البدء
  useEffect(() => {
    loadData();
    
    // تحديث عدد العمليات المعلقة
    getPendingCount().then(setPendingCount);
    
    // تنظيف البيانات القديمة
    cleanupOldData().catch(console.error);
  }, [loadData]);

  // مزامنة تلقائية
  useEffect(() => {
    if (autoSync && isOnline) {
      syncIntervalRef.current = setInterval(syncWithServer, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, isOnline, syncWithServer, syncInterval]);

  return {
    data,
    isLoading,
    isOnline,
    isSyncing,
    pendingCount,
    error,
    refresh: loadData,
    create,
    update,
    remove,
    syncNow: syncWithServer
  };
}
