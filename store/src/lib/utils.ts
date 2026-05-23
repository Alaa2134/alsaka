import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(n: number | string | null | undefined, symbol = ""): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  if (!Number.isFinite(v)) return "0.00";
  const formatted = v.toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

export function normalizePhone(raw: string, defaultCountry = "20"): string {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  let digits = String(raw || "")
    .split("")
    .map((c) => (c in map ? map[c] : c))
    .join("")
    .replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = defaultCountry + digits.slice(1);
  return digits;
}
