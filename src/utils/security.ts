import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * أدوات الأمان الشاملة للمنصة
 */

// ===================================
// مخططات التحقق من المدخلات
// ===================================

export const phoneSchema = z.string()
  .min(10, 'رقم الهاتف قصير جداً')
  .max(15, 'رقم الهاتف طويل جداً')
  .regex(/^[+]?[0-9\s-]+$/, 'رقم هاتف غير صالح');

export const emailSchema = z.string()
  .email('بريد إلكتروني غير صالح')
  .max(255, 'البريد الإلكتروني طويل جداً');

export const passwordSchema = z.string()
  .min(8, 'كلمة المرور قصيرة جداً')
  .max(100, 'كلمة المرور طويلة جداً');

export const accessCodeSchema = z.string()
  .min(4, 'كود الوصول قصير جداً')
  .max(50, 'كود الوصول طويل جداً')
  .regex(/^[a-zA-Z0-9_-]+$/, 'كود الوصول يحتوي على أحرف غير مسموحة');

export const searchQuerySchema = z.string()
  .max(200, 'نص البحث طويل جداً')
  .transform(val => sanitizeSearchQuery(val));

export const nameSchema = z.string()
  .min(2, 'الاسم قصير جداً')
  .max(100, 'الاسم طويل جداً')
  .transform(val => sanitizeText(val));

export const addressSchema = z.string()
  .max(500, 'العنوان طويل جداً')
  .transform(val => sanitizeText(val));

export const notesSchema = z.string()
  .max(2000, 'الملاحظات طويلة جداً')
  .transform(val => sanitizeText(val));

export const amountSchema = z.number()
  .min(0, 'المبلغ لا يمكن أن يكون سالباً')
  .max(999999999, 'المبلغ كبير جداً');

export const quantitySchema = z.number()
  .int('الكمية يجب أن تكون عدداً صحيحاً')
  .min(0, 'الكمية لا يمكن أن تكون سالبة')
  .max(999999, 'الكمية كبيرة جداً');

// ===================================
// دوال التنظيف والتطهير
// ===================================

/**
 * تنظيف نص عادي من الأحرف الخطرة
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // إزالة أي HTML/Script tags
  let cleaned = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  
  // إزالة أحرف التحكم
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // تقليم المسافات الزائدة
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  return cleaned;
};

/**
 * تنظيف استعلام البحث
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query) return '';
  
  // إزالة الأحرف الخاصة التي قد تسبب مشاكل SQL
  let cleaned = query.replace(/['"`;\\]/g, '');
  
  // إزالة HTML tags
  cleaned = DOMPurify.sanitize(cleaned, { ALLOWED_TAGS: [] });
  
  // إزالة أحرف التحكم
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  return cleaned.trim().substring(0, 200);
};

/**
 * تنظيف رقم الهاتف
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // إبقاء الأرقام و + فقط
  return phone.replace(/[^0-9+]/g, '').substring(0, 15);
};

/**
 * تنظيف البريد الإلكتروني
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // إزالة المسافات والأحرف غير المسموحة
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '').substring(0, 255);
};

/**
 * تنظيف URL
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // السماح فقط ببروتوكولات آمنة
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
};

/**
 * تشفير البيانات للعرض
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) return '****';
  return '****' + data.slice(-visibleChars);
};

/**
 * إخفاء البريد الإلكتروني
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '****@****';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '****' 
    : '****';
  
  return `${maskedLocal}@${domain}`;
};

/**
 * إخفاء رقم الهاتف
 */
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
};

// ===================================
// حماية من الهجمات
// ===================================

/**
 * التحقق من معدل الطلبات (Rate Limiting) على العميل
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export const checkClientRateLimit = (
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const key = action;
  const record = rateLimitMap.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
};

/**
 * حماية من CSRF
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * التحقق من أصل الطلب
 */
export const validateOrigin = (allowedOrigins: string[]): boolean => {
  const currentOrigin = window.location.origin;
  return allowedOrigins.some(origin => 
    currentOrigin === origin || 
    currentOrigin.endsWith(`.${origin.replace(/^https?:\/\//, '')}`)
  );
};

// ===================================
// تسجيل الأحداث الأمنية
// ===================================

export interface SecurityEventData {
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, unknown>;
}

/**
 * إضافة معلومات السياق للأحداث الأمنية
 */
export const enrichSecurityEvent = (event: SecurityEventData): SecurityEventData => {
  return {
    ...event,
    details: {
      ...event.details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      screenSize: `${window.screen.width}x${window.screen.height}`,
    }
  };
};

// ===================================
// التحقق من قوة كلمة المرور/كود الوصول
// ===================================

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  suggestions: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];
  
  if (password.length >= 8) score++;
  else suggestions.push('استخدم 8 أحرف على الأقل');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('استخدم أحرف كبيرة وصغيرة');
  
  if (/[0-9]/.test(password)) score++;
  else suggestions.push('أضف أرقام');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push('أضف رموز خاصة');
  
  // التحقق من الأنماط الشائعة
  if (/^(123|abc|qwe|password|admin)/i.test(password)) {
    score = Math.max(0, score - 2);
    suggestions.push('تجنب الأنماط الشائعة');
  }
  
  const labels = ['ضعيف جداً', 'ضعيف', 'متوسط', 'قوي', 'قوي جداً'];
  
  return {
    score: Math.min(4, Math.max(0, score)),
    label: labels[Math.min(4, Math.max(0, score))],
    suggestions: suggestions.slice(0, 3)
  };
};

// ===================================
// حماية التخزين المحلي
// ===================================

const STORAGE_PREFIX = 'secure_';

/**
 * تخزين آمن في localStorage (مع تشفير بسيط)
 */
export const secureStorage = {
  set: (key: string, value: unknown): void => {
    try {
      const data = JSON.stringify(value);
      // تشفير بسيط - للحماية من القراءة المباشرة
      const encoded = btoa(encodeURIComponent(data));
      localStorage.setItem(STORAGE_PREFIX + key, encoded);
    } catch (error) {
      console.error('Secure storage set error:', error);
    }
  },
  
  get: <T>(key: string): T | null => {
    try {
      const encoded = localStorage.getItem(STORAGE_PREFIX + key);
      if (!encoded) return null;
      
      const data = decodeURIComponent(atob(encoded));
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },
  
  clear: (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};

// ===================================
// أدوات الجلسة الآمنة
// ===================================

/**
 * التحقق من صلاحية الجلسة
 */
export const isSessionValid = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  
  try {
    const expiry = new Date(expiresAt);
    return expiry > new Date();
  } catch {
    return false;
  }
};

/**
 * حساب وقت انتهاء الجلسة
 */
export const getSessionExpiryTime = (minutes: number = 30): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

// ===================================
// التحقق من الإدخال
// ===================================

export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(e => e.message)
  };
};

/**
 * مخطط نموذج العميل
 */
export const clientFormSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: addressSchema.optional(),
  notes: notesSchema.optional(),
});

/**
 * مخطط نموذج المنتج
 */
export const productFormSchema = z.object({
  name: nameSchema,
  item_number: z.string().min(1).max(50),
  price: amountSchema,
  min_price: amountSchema.optional(),
  stock_quantity: quantitySchema.optional(),
  barcode: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});

/**
 * مخطط نموذج الطلب
 */
export const orderFormSchema = z.object({
  customer_name: nameSchema,
  customer_phone: phoneSchema,
  customer_email: emailSchema.optional(),
  customer_address: addressSchema,
  notes: notesSchema.optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type OrderFormData = z.infer<typeof orderFormSchema>;
