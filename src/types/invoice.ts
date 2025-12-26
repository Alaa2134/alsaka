export interface InvoiceItem {
  id: string;
  itemNumber: string;
  itemName: string;
  quantity: number;
  price: number;
  minPrice: number;
  total: number;
  warehouse: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientNumber: string;
  clientName: string;
  date: string;
  paymentMethod: string;
  items: InvoiceItem[];
  totalAmount: number;
}
