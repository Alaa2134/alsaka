export interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  payment_method: string;
  total_amount: number;
  notes: string | null;
  clients: { name: string } | null;
}

export interface InvoiceItemData {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  min_price: number;
  total: number;
}

export interface TenantData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export interface InvoiceTemplateProps {
  invoice: InvoiceData;
  items: InvoiceItemData[];
  tenant?: TenantData | null;
}

export type TemplateType = "classic" | "modern" | "minimal" | "thermal";

export const templateNames: Record<TemplateType, string> = {
  classic: "كلاسيكي",
  modern: "عصري",
  minimal: "مختصر",
  thermal: "حراري (طابعة صغيرة)",
};
