import { useEffect, useCallback, useRef } from 'react';

/**
 * تحسينات الأداء الشاملة
 * - تنظيف الذاكرة
 * - تحسين التحميل
 * - تقليل إعادة الرسم
 */
export const usePerformanceOptimizer = () => {
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // تنظيف الذاكرة غير المستخدمة
  const cleanupMemory = useCallback(() => {
    // تنظيف الصور غير المرئية من الذاكرة
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (!isElementInViewport(htmlImg) && htmlImg.src) {
        htmlImg.dataset.loadedSrc = htmlImg.src;
        htmlImg.src = '';
      }
    });

    // إجبار garbage collection إذا كان متاحاً
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }, []);

  // التحقق من وجود العنصر في نطاق الرؤية
  const isElementInViewport = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= -100 &&
      rect.left >= -100 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 100 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 100
    );
  };

  // تحميل كسول للصور
  const setupLazyLoading = useCallback(() => {
    if (!('IntersectionObserver' in window)) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    document.querySelectorAll('img[data-src]').forEach((img) => {
      observerRef.current?.observe(img);
    });
  }, []);

  // تحسين الأداء عند عدم النشاط
  const setupIdleOptimization = useCallback(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        cleanupMemory();
      });
    }
  }, [cleanupMemory]);

  // تحسين scroll
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        document.body.classList.add('is-scrolling');
        isScrolling = true;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
        isScrolling = false;
        setupIdleOptimization();
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [setupIdleOptimization]);

  // تنظيف دوري
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      cleanupMemory();
    }, 60000); // كل دقيقة

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupMemory]);

  // تحميل كسول
  useEffect(() => {
    setupLazyLoading();

    return () => {
      observerRef.current?.disconnect();
    };
  }, [setupLazyLoading]);

  return {
    cleanupMemory,
    setupLazyLoading,
  };
};

/**
 * مكون لتحسين الأداء التلقائي
 */
export const PerformanceOptimizer = () => {
  usePerformanceOptimizer();

  useEffect(() => {
    // إضافة CSS لتحسين الأداء
    const style = document.createElement('style');
    style.id = 'performance-styles';
    style.textContent = `
      /* تحسين الـ scroll */
      .is-scrolling * {
        pointer-events: none !important;
      }
      
      .is-scrolling img,
      .is-scrolling video {
        will-change: transform;
      }
      
      /* تحسين الرسوم المتحركة */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* تحسين التحميل */
      img {
        content-visibility: auto;
      }
      
      /* تحسين الجداول الكبيرة */
      table {
        content-visibility: auto;
        contain-intrinsic-size: 0 500px;
      }
      
      /* GPU acceleration للعناصر المتحركة */
      .animate-pulse,
      .animate-spin,
      .animate-bounce {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
    `;
    
    if (!document.getElementById('performance-styles')) {
      document.head.appendChild(style);
    }

    // تحسين preconnect
    const preconnectUrls = [
      import.meta.env.VITE_SUPABASE_URL,
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ].filter(Boolean);

    preconnectUrls.forEach(url => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url as string;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    return () => {
      const styleEl = document.getElementById('performance-styles');
      if (styleEl) styleEl.remove();
    };
  }, []);

  return null;
};

export default PerformanceOptimizer;
