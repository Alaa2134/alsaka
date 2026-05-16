import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

export interface Suggestion {
  id: string;
  label: string;
  hint?: string;
  payload?: unknown;
}

export interface AutoSuggestProps {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: Suggestion) => void;
  onEnter?: (v: string) => void;
  placeholder?: string;
  suggestions: Suggestion[];
  className?: string;
  dataAttr?: string;
}

export interface AutoSuggestHandle {
  focus: () => void;
}

/**
 * First-character-match autocomplete with inline ghost text and floating
 * dropdown. Pressing Enter when no row is highlighted triggers onEnter so the
 * invoice form can auto-add a barcode without a button.
 */
export const AutoSuggestInput = forwardRef<AutoSuggestHandle, AutoSuggestProps>(function AutoSuggestInput(
  { value, onChange, onPick, onEnter, placeholder, suggestions, className, dataAttr },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState<number>(-1);
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    setActive(-1);
  }, [suggestions]);

  // First-character match (spec requirement): start of label or hint
  const filtered = useMemo(() => {
    if (!value) return [] as Suggestion[];
    const v = value.trim().toLowerCase();
    return suggestions
      .filter((s) => s.label.toLowerCase().startsWith(v) || (s.hint || "").toLowerCase().startsWith(v))
      .slice(0, 8);
  }, [suggestions, value]);

  const ghost = useMemo(() => {
    if (!value || filtered.length === 0) return "";
    const top = filtered[0]!.label;
    if (top.toLowerCase().startsWith(value.toLowerCase())) return top;
    return "";
  }, [value, filtered]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Tab" && ghost) {
      e.preventDefault();
      onChange(ghost);
    } else if (e.key === "Enter") {
      if (active >= 0 && filtered[active]) {
        e.preventDefault();
        onPick(filtered[active]!);
        setOpen(false);
      } else if (filtered.length === 1) {
        e.preventDefault();
        onPick(filtered[0]!);
        setOpen(false);
      } else if (onEnter) {
        e.preventDefault();
        onEnter(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="ghost-text">
        {ghost && value && ghost !== value && (
          <span className="ghost px-3 text-sm">
            <span className="invisible">{value}</span>
            <span>{ghost.slice(value.length)}</span>
          </span>
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
          {...(dataAttr ? { [dataAttr]: true } : {})}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover shadow-elevated">
          {filtered.map((s, idx) => (
            <li
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(s);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-secondary",
                idx === active && "bg-secondary",
              )}
            >
              <span className="truncate">{s.label}</span>
              {s.hint && <span className="text-xs text-muted-foreground">{s.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
