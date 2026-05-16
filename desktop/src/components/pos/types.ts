// Shared types between every POS skin so they can be hot-swapped at
// runtime without rewriting the parent screen.
export interface PosRow {
  id: string;
  product_id: string | null;
  product_name: string;
  barcode: string;
  quantity: number;
  price: number;
}

export interface PosClient {
  id: string;
  name: string;
  phone: string | null;
  pricing_tier?: string;
}

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  wholesale_price: number | null;
  vip_price: number | null;
  stock: number;
  barcode: string | null;
  item_number: string | null;
  category_id: string | null;
  image_url: string | null;
  has_variants: number;
  is_service: number;
}

export interface PosCategory {
  id: string;
  name: string;
}

export interface PosTotals {
  subtotal: number;
  discount: number;
  paid: number;
  remaining: number;
}

export interface PosLayoutProps {
  rows: PosRow[];
  setRows: (next: PosRow[]) => void;
  clients: PosClient[];
  client: PosClient | null;
  setClient: (c: PosClient | null) => void;
  products: PosProduct[];
  categories: PosCategory[];
  totals: PosTotals;
  discount: number;
  setDiscount: (v: number) => void;
  paid: number;
  setPaid: (v: number) => void;
  onSave: () => void;
  onPrint: () => void;
  onHold: () => void;
  onClear: () => void;
  resolvePrice: (p: PosProduct) => number;
  busy: boolean;
}

export type PosLayoutId = 'classic' | 'grid' | 'restaurant' | 'quick' | 'dual';

export interface PosLayoutMeta {
  id: PosLayoutId;
  label: string;
  description: string;
  useFor: string;
}

export const POS_LAYOUTS: PosLayoutMeta[] = [
  {
    id: 'classic',
    label: 'كلاسيكي',
    description: 'جدول مبيعات تقليدي + باركود + autocomplete — لمن يحب لوحة المفاتيح.',
    useFor: 'محلات الجملة، النصف جملة، المخازن، تجار التجزئة المخضرمين',
  },
  {
    id: 'grid',
    label: 'لمسي (شبكة منتجات)',
    description: 'تصنيفات على الجنب + شبكة منتجات كبيرة بصور — مناسب لشاشات اللمس.',
    useFor: 'سوبرماركت، صيدليات، محلات ملابس، أزياء، إكسسوارات',
  },
  {
    id: 'restaurant',
    label: 'مطعم / كافيه',
    description: 'منتقي طاولات + قائمة منيو بصور + إرسال للمطبخ (KOT).',
    useFor: 'مطاعم، كافيهات، فاست فود، تيك أواي',
  },
  {
    id: 'quick',
    label: 'خدمة سريعة',
    description: 'أزرار كبيرة للمنتجات الأكثر مبيعًا — نقرة واحدة لإضافة منتج.',
    useFor: 'كوفي شوب، إيس كريم، عصائر، قهوة شرقي، فاست فود',
  },
  {
    id: 'dual',
    label: 'مزدوج (شاشتين)',
    description: 'يمين: شبكة + إضافة سريعة. يسار: جدول الكمية والسعر + الدفع.',
    useFor: 'مولات، محلات كبيرة، فروع متعددة',
  },
];
