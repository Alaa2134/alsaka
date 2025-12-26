import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";

interface Suggestion {
  id: string;
  label: string;
  sublabel?: string;
  value: string;
}

interface AutoSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: Suggestion) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AutoSuggestInput = ({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className = "",
  disabled = false,
}: AutoSuggestInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(value.toLowerCase()) ||
          s.sublabel?.toLowerCase().includes(value.toLowerCase()) ||
          s.value.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.value);
    onSelect?.(suggestion);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all ${className}`}
        autoComplete="off"
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-primary/20 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto animate-scale-in">
          <div className="p-2 border-b border-border flex items-center gap-2 text-muted-foreground">
            <Search size={14} />
            <span className="text-xs">اختر من القائمة</span>
          </div>
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-right hover:bg-primary/10 transition-colors flex justify-between items-center gap-2 border-b border-border/50 last:border-0"
            >
              <span className="font-semibold text-foreground truncate">
                {suggestion.label}
              </span>
              {suggestion.sublabel && (
                <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground whitespace-nowrap">
                  {suggestion.sublabel}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
