import { useMemo, useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';

interface UseAnimatedListOptions<T> {
  items: T[];
  searchKeys?: (keyof T)[];
  filterFn?: (item: T) => boolean;
  sortKey?: keyof T;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  initialPage?: number;
}

interface UseAnimatedListResult<T> {
  // البيانات
  displayedItems: T[];
  totalItems: number;
  filteredCount: number;
  
  // البحث
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // التصفح
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // الترتيب
  sortBy: (key: keyof T) => void;
  currentSortKey: keyof T | null;
  currentSortDirection: 'asc' | 'desc';
  
  // حالة التحميل
  isSearching: boolean;
}

/**
 * Hook لإدارة القوائم مع بحث وترتيب وتصفح محسن
 */
export function useAnimatedList<T extends Record<string, any>>({
  items,
  searchKeys = [],
  filterFn,
  sortKey: initialSortKey,
  sortDirection: initialSortDirection = 'asc',
  pageSize = 20,
  initialPage = 0
}: UseAnimatedListOptions<T>): UseAnimatedListResult<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);
  const isSearching = searchQuery !== debouncedSearch;

  // تصفية البيانات
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // تطبيق الفلتر المخصص
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    // تطبيق البحث
    if (debouncedSearch && searchKeys.length > 0) {
      const lowerSearch = debouncedSearch.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => {
          const value = item[key];
          return value && String(value).toLowerCase().includes(lowerSearch);
        })
      );
    }
    
    return result;
  }, [items, debouncedSearch, searchKeys, filterFn]);

  // ترتيب البيانات
  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;
    
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortKey] as unknown;
      const bVal = b[sortKey] as unknown;
      
      // ترتيب الأرقام
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // ترتيب التواريخ
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDateParsed = Date.parse(aVal);
        const bDateParsed = Date.parse(bVal);
        if (!isNaN(aDateParsed) && !isNaN(bDateParsed)) {
          return sortDirection === 'asc' 
            ? aDateParsed - bDateParsed 
            : bDateParsed - aDateParsed;
        }
      }
      
      // ترتيب النصوص
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      const comparison = aStr.localeCompare(bStr, 'ar');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortKey, sortDirection]);

  // حساب الصفحات
  const totalPages = Math.ceil(sortedItems.length / pageSize);
  
  // ضبط الصفحة الحالية عند تغير البيانات
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  // إعادة للصفحة الأولى عند البحث
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch]);

  // البيانات المعروضة
  const displayedItems = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // وظائف التنقل
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // وظيفة الترتيب
  const sortBy = useCallback((key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  return {
    displayedItems,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    
    searchQuery,
    setSearchQuery,
    
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages - 1,
    hasPrevPage: currentPage > 0,
    
    sortBy,
    currentSortKey: sortKey,
    currentSortDirection: sortDirection,
    
    isSearching
  };
}
