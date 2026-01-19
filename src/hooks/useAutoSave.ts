import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  forceSave: () => Promise<void>;
}

/**
 * Hook للحفظ التلقائي مع debounce
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);
  const initialDataRef = useRef(JSON.stringify(data));

  // تحديث المرجع
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // حفظ البيانات
  const save = useCallback(async () => {
    if (!enabled) return;
    
    // تحقق من وجود تغييرات
    const currentData = JSON.stringify(dataRef.current);
    if (currentData === initialDataRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(dataRef.current);
      setLastSaved(new Date());
      initialDataRef.current = currentData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('فشل الحفظ'));
    } finally {
      setIsSaving(false);
    }
  }, [onSave, enabled]);

  // Debounced save
  useEffect(() => {
    if (!enabled) return;
    
    // إلغاء المهلة السابقة
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // تعيين مهلة جديدة
    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, save, enabled]);

  // حفظ عند مغادرة الصفحة
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentData = JSON.stringify(dataRef.current);
      if (currentData !== initialDataRef.current) {
        // محاولة حفظ سريعة
        navigator.sendBeacon?.('/api/autosave', currentData);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    forceSave: save
  };
}
