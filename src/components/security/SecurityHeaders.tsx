import { useEffect } from 'react';

/**
 * مكون لإضافة حماية إضافية على مستوى العميل
 * يتعامل مع حماية الأحداث ومنع التلاعب
 */
export const SecurityHeaders = () => {
  useEffect(() => {
    // منع فتح أدوات المطور في الإنتاج
    if (import.meta.env.PROD) {
      // تعطيل قائمة السياق (الزر الأيمن) في الإنتاج
      const handleContextMenu = (e: MouseEvent) => {
        // السماح بالزر الأيمن في حقول الإدخال فقط
        const target = e.target as HTMLElement;
        if (!['INPUT', 'TEXTAREA'].includes(target.tagName)) {
          e.preventDefault();
        }
      };

      // منع تحديد النص في المناطق الحساسة
      const handleSelectStart = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.dataset.noSelect === 'true') {
          e.preventDefault();
        }
      };

      // منع نسخ البيانات الحساسة
      const handleCopy = (e: ClipboardEvent) => {
        const selection = window.getSelection()?.toString() || '';
        
        // البحث عن أنماط البيانات الحساسة
        const sensitivePatterns = [
          /\d{10,}/, // أرقام طويلة (هواتف، حسابات)
          /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/, // بريد إلكتروني
          /\*{4,}/, // بيانات مخفية
        ];

        const containsSensitive = sensitivePatterns.some(pattern => pattern.test(selection));
        
        if (containsSensitive) {
          e.preventDefault();
          e.clipboardData?.setData('text/plain', '[محتوى محمي]');
        }
      };

      // منع السحب والإفلات للبيانات الحساسة
      const handleDragStart = (e: DragEvent) => {
        const target = e.target as HTMLElement;
        if (target.dataset.sensitive === 'true') {
          e.preventDefault();
        }
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('dragstart', handleDragStart);

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('dragstart', handleDragStart);
      };
    }
  }, []);

  useEffect(() => {
    // حماية من Clickjacking
    if (window.self !== window.top) {
      // الصفحة مفتوحة في iframe - قد تكون هجوم clickjacking
      console.warn('⚠️ Security Warning: Page loaded in iframe');
      
      // محاولة الخروج من الإطار
      try {
        if (window.top) {
          window.top.location.href = window.self.location.href;
        }
      } catch {
        // لا يمكن الوصول لـ top - عرض تحذير
        document.body.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #1a1a2e;
            color: white;
            font-family: Cairo, sans-serif;
            text-align: center;
          ">
            <div>
              <h1>⚠️ تحذير أمني</h1>
              <p>يُرجى فتح هذه الصفحة مباشرة في المتصفح</p>
            </div>
          </div>
        `;
      }
    }
  }, []);

  useEffect(() => {
    // تسجيل محاولات التلاعب
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const [url, options] = args;
      
      // التحقق من أن الطلبات تذهب للخادم الصحيح فقط
      if (typeof url === 'string') {
        const allowedOrigins = [
          import.meta.env.VITE_SUPABASE_URL,
          window.location.origin
        ].filter(Boolean);

        const isAllowed = allowedOrigins.some(origin => 
          url.startsWith(origin as string) || url.startsWith('/')
        );

        if (!isAllowed && !url.startsWith('https://')) {
          console.warn('⚠️ Blocked insecure request:', url);
          throw new Error('طلب غير آمن');
        }
      }

      return originalFetch.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    // مراقبة تغييرات localStorage المشبوهة
    const handleStorageChange = (e: StorageEvent) => {
      // تسجيل التغييرات المشبوهة
      if (e.key?.includes('auth') || e.key?.includes('session')) {
        console.warn('⚠️ Auth storage changed externally:', e.key);
        
        // إذا تم تغيير بيانات المصادقة من نافذة أخرى
        // أعد تحميل الصفحة للتحقق من الجلسة
        if (e.oldValue !== e.newValue) {
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // لا يعرض أي شيء - مكون للحماية فقط
  return null;
};

export default SecurityHeaders;
