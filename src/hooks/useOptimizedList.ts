import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

interface UseOptimizedListOptions<T> {
  items: T[];
  pageSize?: number;
  searchFields?: (keyof T)[];
}

interface UseOptimizedListReturn<T> {
  visibleItems: T[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  totalCount: number;
  isSearching: boolean;
  reset: () => void;
}

/**
 * Hook محسن لإدارة القوائم الكبيرة
 * - Pagination محلي
 * - بحث مع debounce
 * - تحميل تدريجي
 */
export function useOptimizedList<T extends Record<string, unknown>>({
  items,
  pageSize = 50,
  searchFields = []
}: UseOptimizedListOptions<T>): UseOptimizedListReturn<T> {
  const [searchTerm, setSearchTermInternal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermInternal(term);
    setIsSearching(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(term);
      setDisplayCount(pageSize);
      setIsSearching(false);
    }, 300);
  }, [pageSize]);

  // فلترة العناصر
  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    
    const searchLower = debouncedSearch.toLowerCase().trim();
    
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchLower);
        }
        return false;
      })
    );
  }, [items, debouncedSearch, searchFields]);

  // العناصر المرئية
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, displayCount);
  }, [filteredItems, displayCount]);

  const hasMore = displayCount < filteredItems.length;

  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + pageSize, filteredItems.length));
  }, [pageSize, filteredItems.length]);

  const reset = useCallback(() => {
    setSearchTermInternal('');
    setDebouncedSearch('');
    setDisplayCount(pageSize);
  }, [pageSize]);

  // تنظيف
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleItems,
    searchTerm,
    setSearchTerm,
    loadMore,
    hasMore,
    totalCount: filteredItems.length,
    isSearching,
    reset
  };
}

/**
 * Hook لتتبع الأداء
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderRef.current;
    
    if (import.meta.env.DEV && timeSinceLastRender < 16) {
      // أقل من 60fps
      console.warn(`⚠️ ${componentName}: Rapid re-render detected (${timeSinceLastRender}ms)`);
    }
    
    lastRenderRef.current = now;
  });

  return {
    renderCount: renderCountRef.current
  };
}

/**
 * Hook لتحميل البيانات المؤجل
 */
export function useDeferredValue<T>(value: T, delay: number = 300): T {
  const [deferredValue, setDeferredValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDeferredValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return deferredValue;
}

/**
 * Hook للتحميل الكسول للمكونات
 */
export function useIntersectionLoader(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callbackRef.current();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return ref;
}
