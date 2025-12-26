import { useState, useRef, useEffect } from "react";
import { InvoiceItem } from "@/types/invoice";
import { Trash2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";

interface InvoiceTableProps {
  items: InvoiceItem[];
  onUpdateItem: (id: string, field: keyof InvoiceItem, value: string | number) => void;
  onDeleteItem: (id: string) => void;
}

interface Product {
  id: string;
  item_number: string;
  name: string;
  price: number;
  min_price: number;
  warehouse_id: string | null;
}

interface SuggestionDropdownProps {
  suggestions: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  visible: boolean;
}

const SuggestionDropdown = ({ suggestions, onSelect, onClose, visible }: SuggestionDropdownProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
    >
      {suggestions.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onSelect(product)}
          className="w-full px-3 py-2 text-right hover:bg-muted transition-colors flex justify-between items-center gap-2 border-b border-border/30 last:border-0"
        >
          <span className="font-semibold text-foreground truncate">{product.name}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{product.item_number}</span>
        </button>
      ))}
    </div>
  );
};

export const InvoiceTable = ({ items, onUpdateItem, onDeleteItem }: InvoiceTableProps) => {
  const { data: products } = useProducts();
  const { data: warehousesList } = useWarehouses();
  const [activeInput, setActiveInput] = useState<{ id: string; field: "itemNumber" | "itemName" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const warehouses = warehousesList?.map(w => w.name) || [
    "السقا للادوات المنزلية",
    "المخزن الرئيسي",
  ];

  const getSuggestions = (): Product[] => {
    if (!products || !searchTerm || searchTerm.length < 1) return [];
    const term = searchTerm.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.item_number.toLowerCase().includes(term)
      )
      .slice(0, 8);
  };

  const handleSelectProduct = (itemId: string, product: Product) => {
    onUpdateItem(itemId, "itemNumber", product.item_number);
    onUpdateItem(itemId, "itemName", product.name);
    onUpdateItem(itemId, "price", product.price);
    onUpdateItem(itemId, "minPrice", product.min_price);
    const wh = warehousesList?.find(w => w.id === product.warehouse_id);
    if (wh) onUpdateItem(itemId, "warehouse", wh.name);
    setActiveInput(null);
    setSearchTerm("");
  };

  const handleInputChange = (itemId: string, field: "itemNumber" | "itemName", value: string) => {
    onUpdateItem(itemId, field, value);
    setActiveInput({ id: itemId, field });
    setSearchTerm(value);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setActiveInput(null);
      setSearchTerm("");
    }, 200);
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-lg border border-border animate-slide-in">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-invoice-table-header text-invoice-table-header-foreground">
            <th className="px-3 py-3 text-right font-bold border-l border-border/30 w-10">#</th>
            <th className="px-3 py-3 text-right font-bold border-l border-border/30 w-24">رقم الصنف</th>
            <th className="px-3 py-3 text-right font-bold border-l border-border/30">اسم الصنف</th>
            <th className="px-3 py-3 text-center font-bold border-l border-border/30 w-20">الكمية</th>
            <th className="px-3 py-3 text-center font-bold border-l border-border/30 w-24">السعر</th>
            <th className="px-3 py-3 text-center font-bold border-l border-border/30 w-24">الحد الأدنى</th>
            <th className="px-3 py-3 text-center font-bold border-l border-border/30 w-24">الاجمالي</th>
            <th className="px-3 py-3 text-right font-bold border-l border-border/30">المخـــــــزن</th>
            <th className="px-3 py-3 text-center font-bold w-12">حذف</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={`${
                index % 2 === 0 ? "bg-invoice-row-even" : "bg-invoice-row-odd"
              } hover:bg-muted/50 transition-colors`}
            >
              <td className="px-3 py-2 border border-border/20 text-center font-semibold text-muted-foreground">
                {index + 1}
              </td>
              <td className="px-3 py-2 border border-border/20 relative">
                <input
                  type="text"
                  value={item.itemNumber}
                  onChange={(e) => handleInputChange(item.id, "itemNumber", e.target.value)}
                  onFocus={() => {
                    setActiveInput({ id: item.id, field: "itemNumber" });
                    setSearchTerm(item.itemNumber);
                  }}
                  onBlur={handleInputBlur}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  autoComplete="off"
                />
                {activeInput?.id === item.id && activeInput?.field === "itemNumber" && (
                  <SuggestionDropdown
                    suggestions={getSuggestions()}
                    onSelect={(p) => handleSelectProduct(item.id, p)}
                    onClose={() => setActiveInput(null)}
                    visible={true}
                  />
                )}
              </td>
              <td className="px-3 py-2 border border-border/20 relative">
                <input
                  type="text"
                  value={item.itemName}
                  onChange={(e) => handleInputChange(item.id, "itemName", e.target.value)}
                  onFocus={() => {
                    setActiveInput({ id: item.id, field: "itemName" });
                    setSearchTerm(item.itemName);
                  }}
                  onBlur={handleInputBlur}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="اسم الصنف..."
                  autoComplete="off"
                />
                {activeInput?.id === item.id && activeInput?.field === "itemName" && (
                  <SuggestionDropdown
                    suggestions={getSuggestions()}
                    onSelect={(p) => handleSelectProduct(item.id, p)}
                    onClose={() => setActiveInput(null)}
                    visible={true}
                  />
                )}
              </td>
              <td className="px-3 py-2 border border-border/20">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </td>
              <td className="px-3 py-2 border border-border/20">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.price}
                  onChange={(e) => onUpdateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </td>
              <td className="px-3 py-2 border border-border/20">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.minPrice}
                  onChange={(e) => onUpdateItem(item.id, "minPrice", parseFloat(e.target.value) || 0)}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
              </td>
              <td className="px-3 py-2 border border-border/20 text-center font-bold text-primary">
                {item.total.toFixed(2)}
              </td>
              <td className="px-3 py-2 border border-border/20">
                <select
                  value={item.warehouse}
                  onChange={(e) => onUpdateItem(item.id, "warehouse", e.target.value)}
                  className="w-full bg-invoice-input-field border border-border rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.map((wh) => (
                    <option key={wh} value={wh}>
                      {wh}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 border border-border/20 text-center">
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-1 rounded transition-all"
                  title="حذف الصنف"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
