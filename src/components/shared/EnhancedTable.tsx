import { memo, ReactNode, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => ReactNode;
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * جدول محسن مع بحث وترتيب وتصفح
 */
export function EnhancedTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  searchable = true,
  searchKeys = [],
  pageSize = 10,
  emptyMessage = 'لا توجد بيانات',
  onRowClick,
  className
}: EnhancedTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  // تصفية البيانات
  const filteredData = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;
    
    const lowerSearch = search.toLowerCase();
    return data.filter(row => 
      searchKeys.some(key => {
        const value = row[key];
        return value && String(value).toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, search, searchKeys]);

  // ترتيب البيانات
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortDir === 'asc' 
        ? aStr.localeCompare(bStr, 'ar') 
        : bStr.localeCompare(aStr, 'ar');
    });
  }, [filteredData, sortKey, sortDir]);

  // تصفح الصفحات
  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" variant="gradient" text="جاري تحميل البيانات..." />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* شريط البحث */}
      {searchable && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pr-10"
          />
        </div>
      )}

      {/* الجدول */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      'px-4 py-3 text-right text-sm font-semibold text-foreground',
                      col.sortable && 'cursor-pointer hover:bg-muted transition-colors',
                      col.width
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.header}</span>
                      {col.sortable && sortKey === String(col.key) && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {sortDir === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </motion.span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, i) => (
                    <motion.tr
                      key={row.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={cn('px-4 py-3 text-sm', col.width)}
                        >
                          {col.render 
                            ? col.render(row[col.key as keyof T], row)
                            : String(row[col.key as keyof T] ?? '-')
                          }
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* التصفح */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {page * pageSize + 1} - {Math.min((page + 1) * pageSize, sortedData.length)} من {sortedData.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(EnhancedTable) as typeof EnhancedTable;
