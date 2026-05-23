export interface StoreSettings {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  banner_image_url: string | null;
  primary_color: string;
  accent_color: string;
  currency: string;
  currency_symbol: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  address: string | null;
  working_hours: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  delivery_note: string | null;
  return_policy: string | null;
  privacy_policy: string | null;
  terms: string | null;
  is_published: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  image_url: string | null;
  gallery: string[];
  price: number;
  original_price: number | null;
  description: string | null;
  in_stock: boolean;
  stock: number | null;
  purchasable: boolean;
  featured: boolean;
  weight_kg: number;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface Carrier {
  id: string;
  name: string;
  provider: string;
  flat_rate: number;
  free_above: number | null;
  estimated_days: number | null;
}

export interface Gateway {
  id: string;
  name: string;
  provider: string;
  surcharge_percent: number;
}

export interface StoreFeed {
  published: boolean;
  settings: StoreSettings;
  products: StoreProduct[];
  categories: Category[];
  carriers: Carrier[];
  gateways: Gateway[];
}

export interface CartItem {
  product: StoreProduct;
  quantity: number;
}
