import { useState, useRef, useEffect, KeyboardEvent, forwardRef, useCallback } from "react";
import { InvoiceItem } from "@/types/invoice";
import { Trash2, Search, AlertCircle, Volume2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useSoundAlerts } from "@/hooks/useSoundAlerts";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InvoiceTableProps {
  items: InvoiceItem[];
  onUpdateItem: (id: string, field: keyof InvoiceItem, value: string | number) => void;
  onDeleteItem: (id: string) => void;
  onAddItem?: () => void;
  defaultWarehouse?: string;
}

interface Product {
  id: string;
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  warehouse_id: string | null;
  category: string | null;
}

interface SuggestionDropdownProps {
  suggestions: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  visible: boolean;
  selectedIndex: number;
  notFound: boolean;
  searchTerm: string;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const SuggestionDropdown = ({ 
  suggestions, 
  onSelect, 
  onClose, 
  visible, 
  selectedIndex,
  notFound,
  searchTerm,
  categories,
  selectedCategory,
  onCategoryChange
}: SuggestionDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!visible) return null;
  if (suggestions.length === 0 && !notFound) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-primary/20 rounded-xl shadow-2xl max-h-64 overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--card))', zIndex: 9999, position: 'absolute' }}
    >
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="p-2 border-b border-border bg-muted/50 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCategoryChange(""); }}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              selectedCategory === "" 
                ? "bg-primary text-primary-foreground" 
                : "bg-background hover:bg-muted text-foreground"
            }`}
          >
            الكل
          </button>
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={(e) => { e.stopPropagation(); onCategoryChange(cat); }}
              className={`px-2 py-1 text-xs rounded-md transition-colors truncate max-w-[100px] ${
                selectedCategory === cat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background hover:bg-muted text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      
      <div className="p-2 border-b border-border flex items-center gap-2 text-muted-foreground bg-muted/30">
        <Search size={14} />
        <span className="text-xs">اختر منتج {selectedCategory && `(${selectedCategory})`}</span>
      </div>
      
      <div className="max-h-44 overflow-y-auto">
        {notFound && searchTerm.length >= 2 ? (
          <div className="px-4 py-3 flex items-center gap-2 text-destructive bg-destructive/10">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">الصنف غير موجود</span>
          </div>
        ) : (
          suggestions.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product)}
              className={`w-full px-4 py-3 text-right transition-colors flex justify-between items-center gap-2 border-b border-border/50 last:border-0 ${
                index === selectedIndex 
                  ? "bg-primary/20 text-primary" 
                  : "hover:bg-primary/10"
              }`}
              style={{ backgroundColor: index === selectedIndex ? 'hsl(var(--primary) / 0.2)' : undefined }}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-semibold text-foreground truncate">{product.name}</span>
                {product.category && (
                  <span className="text-[10px] text-muted-foreground">{product.category}</span>
                )}
              </div>
              <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground whitespace-nowrap">
                {product.item_number}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export const InvoiceTable = ({ items, onUpdateItem, onDeleteItem, onAddItem, defaultWarehouse }: InvoiceTableProps) => {
  const { data: products } = useProducts();
  const { data: warehousesList } = useWarehouses();
  const { playAlertSound } = useSoundAlerts();
  const [activeInput, setActiveInput] = useState<{ id: string; field: "itemNumber" | "itemName" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Auto-set default warehouse
  const defaultWh = defaultWarehouse || (warehousesList && warehousesList.length === 1 ? warehousesList[0].name : "");
  
  // Refs for inputs to handle Enter navigation
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const warehouses = warehousesList?.map(w => w.name) || [];

  // Get unique categories from products
  const categories = Array.from(new Set(products?.map(p => p.category).filter(Boolean) as string[]));

  const getSuggestions = (): Product[] => {
    if (!products) return [];
    
    let filtered = products;
    
    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm && searchTerm.length >= 1) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().startsWith(term) || 
        p.item_number.toLowerCase().startsWith(term) ||
        p.name.toLowerCase().includes(term) || 
        p.item_number.toLowerCase().includes(term)
      );
    }
    
    return filtered
      .sort((a, b) => {
        if (!searchTerm) return 0;
        const term = searchTerm.toLowerCase();
        // Prioritize items that start with the search term
        const aStartsWithName = a.name.toLowerCase().startsWith(term);
        const bStartsWithName = b.name.toLowerCase().startsWith(term);
        const aStartsWithNumber = a.item_number.toLowerCase().startsWith(term);
        const bStartsWithNumber = b.item_number.toLowerCase().startsWith(term);
        
        if ((aStartsWithName || aStartsWithNumber) && !(bStartsWithName || bStartsWithNumber)) return -1;
        if (!(aStartsWithName || aStartsWithNumber) && (bStartsWithName || bStartsWithNumber)) return 1;
        return 0;
      })
      .slice(0, 10);
  };

  const suggestions = getSuggestions();
  const notFound = searchTerm.length >= 2 && suggestions.length === 0;

  const handleSelectProduct = (itemId: string, product: Product) => {
    onUpdateItem(itemId, "itemNumber", product.item_number);
    onUpdateItem(itemId, "itemName", product.name);
    onUpdateItem(itemId, "price", product.price);
    onUpdateItem(itemId, "minPrice", product.min_price);
    const wh = warehousesList?.find(w => w.id === product.warehouse_id);
    // Set warehouse from product, or default warehouse
    onUpdateItem(itemId, "warehouse", wh?.name || defaultWh);
    setActiveInput(null);
    setSearchTerm("");
    setSelectedSuggestionIndex(0);
    
    // Move focus to quantity field
    setTimeout(() => {
      const quantityInput = inputRefs.current.get(`${itemId}-quantity`);
      quantityInput?.focus();
      quantityInput?.select();
    }, 50);
  };

  const handleInputChange = (itemId: string, field: "itemNumber" | "itemName", value: string) => {
    onUpdateItem(itemId, field, value);
    setActiveInput({ id: itemId, field });
    setSearchTerm(value);
    setSelectedSuggestionIndex(0);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setActiveInput(null);
      setSearchTerm("");
      setSelectedSuggestionIndex(0);
    }, 200);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, itemId: string, field: string) => {
    const currentSuggestions = getSuggestions();
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < currentSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      
      // If suggestions visible and one is selected, select it
      if (currentSuggestions.length > 0 && activeInput) {
        handleSelectProduct(itemId, currentSuggestions[selectedSuggestionIndex]);
        return;
      }
      
      // Navigate through fields: itemNumber -> itemName -> quantity -> price
      const fieldOrder = ["itemNumber", "itemName", "quantity", "price"];
      const currentIndex = fieldOrder.indexOf(field);
      
      if (currentIndex < fieldOrder.length - 1) {
        // Move to next field
        const nextField = fieldOrder[currentIndex + 1];
        const nextInput = inputRefs.current.get(`${itemId}-${nextField}`);
        nextInput?.focus();
        nextInput?.select();
      } else {
        // Last field (price) - add new item and focus on it
        if (onAddItem) {
          onAddItem();
          // Focus on the new item's first field after a short delay
          setTimeout(() => {
            const allItemIds = items.map(i => i.id);
            // The new item will be added, so we need to wait for it
            // Focus on the first input of the table
            const firstInput = document.querySelector('table input[type="text"]') as HTMLInputElement;
            if (firstInput) {
              // Find the last row's first input
              const rows = document.querySelectorAll('table tbody tr');
              const lastRow = rows[rows.length - 1];
              if (lastRow) {
                const newInput = lastRow.querySelector('input[type="text"]') as HTMLInputElement;
                newInput?.focus();
              }
            }
          }, 100);
        }
      }
    } else if (e.key === "Escape") {
      setActiveInput(null);
      setSearchTerm("");
    }
  };

  const setInputRef = (key: string, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl shadow-soft border border-border animate-slide-in mt-6" style={{ overflow: 'visible' }} dir="rtl">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-foreground text-background">
            <th className="px-2 py-3 text-center font-bold w-24">رقم الصنف</th>
            <th className="px-2 py-3 text-right font-bold">اسم الصنف</th>
            <th className="px-2 py-3 text-center font-bold w-16">الكمية</th>
            <th className="px-2 py-3 text-center font-bold w-20">السعر</th>
            <th className="px-2 py-3 text-center font-bold w-20">الحد الأدنى</th>
            <th className="px-2 py-3 text-center font-bold w-24">الإجمالي</th>
            <th className="px-2 py-3 text-center font-bold w-12">حذف</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={`${
                index % 2 === 0 ? "bg-card" : "bg-muted/30"
              } hover:bg-primary/5 transition-colors`}
            >
              {/* رقم الصنف */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 relative" style={{ overflow: 'visible' }}>
                <input
                  ref={(el) => setInputRef(`${item.id}-itemNumber`, el)}
                  type="text"
                  value={item.itemNumber}
                  onChange={(e) => handleInputChange(item.id, "itemNumber", e.target.value)}
                  onFocus={() => {
                    setActiveInput({ id: item.id, field: "itemNumber" });
                    setSearchTerm(item.itemNumber);
                  }}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => handleKeyDown(e, item.id, "itemNumber")}
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-center shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                  autoComplete="off"
                />
                {activeInput?.id === item.id && activeInput?.field === "itemNumber" && (
                  <SuggestionDropdown
                    suggestions={suggestions}
                    onSelect={(p) => handleSelectProduct(item.id, p)}
                    onClose={() => setActiveInput(null)}
                    visible={true}
                    selectedIndex={selectedSuggestionIndex}
                    notFound={notFound}
                    searchTerm={searchTerm}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                )}
              </td>
              
              {/* اسم الصنف */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 relative" style={{ overflow: 'visible' }}>
                <input
                  ref={(el) => setInputRef(`${item.id}-itemName`, el)}
                  type="text"
                  value={item.itemName}
                  onChange={(e) => handleInputChange(item.id, "itemName", e.target.value)}
                  onFocus={() => {
                    setActiveInput({ id: item.id, field: "itemName" });
                    setSearchTerm(item.itemName);
                  }}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) => handleKeyDown(e, item.id, "itemName")}
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                  placeholder="اسم الصنف..."
                  autoComplete="off"
                />
                {activeInput?.id === item.id && activeInput?.field === "itemName" && (
                  <SuggestionDropdown
                    suggestions={suggestions}
                    onSelect={(p) => handleSelectProduct(item.id, p)}
                    onClose={() => setActiveInput(null)}
                    visible={true}
                    selectedIndex={selectedSuggestionIndex}
                    notFound={notFound}
                    searchTerm={searchTerm}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                )}
              </td>
              
              {/* الكمية */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  ref={(el) => setInputRef(`${item.id}-quantity`, el)}
                  type="text"
                  inputMode="numeric"
                  value={item.quantity || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    onUpdateItem(item.id, "quantity", parseInt(val) || 0);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, item.id, "quantity")}
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-center shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm"
                />
              </td>
              
              {/* السعر */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <input
                    ref={(el) => setInputRef(`${item.id}-price`, el)}
                    type="text"
                    inputMode="decimal"
                    value={item.price || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d.]/g, '');
                      const newPrice = parseFloat(val) || 0;
                      onUpdateItem(item.id, "price", newPrice);
                    }}
                    onBlur={() => {
                      if (item.minPrice > 0 && item.price < item.minPrice && item.price > 0) {
                        playAlertSound();
                        toast.warning(
                          `تحذير: سعر "${item.itemName}" أقل من الحد الأدنى!`,
                          {
                            description: `السعر: ${item.price} - الحد الأدنى: ${item.minPrice}`,
                            duration: 5000,
                            icon: <Volume2 className="text-warning" />,
                          }
                        );
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, item.id, "price")}
                    className={`w-full bg-white dark:bg-gray-800 border-2 rounded-lg px-2 py-2 text-center shadow-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm ${
                      item.minPrice > 0 && item.price < item.minPrice && item.price > 0
                        ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
                        : "border-gray-300 dark:border-gray-600 focus:border-primary"
                    }`}
                  />
                  {item.minPrice > 0 && item.price < item.minPrice && item.price > 0 && (
                    <div className="absolute -top-1 -left-1">
                      <AlertCircle className="w-4 h-4 text-destructive animate-bounce" />
                    </div>
                  )}
                </div>
              </td>
              
              {/* الحد الأدنى */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  inputMode="decimal"
                  value={item.minPrice || ""}
                  readOnly
                  className="w-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-center cursor-not-allowed opacity-70 shadow-sm text-sm"
                  title="الحد الأدنى - يمكن تعديله من صفحة المنتجات فقط"
                />
              </td>
              
              {/* الإجمالي */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center">
                <div className="bg-primary/10 border-2 border-primary/30 rounded-lg px-2 py-2">
                  <span className="font-bold text-base text-primary">{item.total.toFixed(2)}</span>
                </div>
              </td>
              
              {/* حذف */}
              <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center">
                <button
                  onClick={() => {
                    setItemToDelete({ id: item.id, name: item.itemName || `صنف ${index + 1}` });
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-all hover:scale-110"
                  title="حذف الصنف"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{itemToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (itemToDelete) {
                  onDeleteItem(itemToDelete.id);
                }
                setItemToDelete(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
