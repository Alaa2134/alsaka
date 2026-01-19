import { useRef, useCallback, useMemo } from 'react';

interface UseLazyImageOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Hook لتحميل الصور بشكل كسول
 */
export function useLazyImage(options: UseLazyImageOptions = {}) {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((element: HTMLImageElement | null) => {
    if (!element) return;

    // إنشاء observer إذا لم يكن موجوداً
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;
              
              if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                img.classList.add('animate-fade-in');
              }
              
              observerRef.current?.unobserve(img);
            }
          });
        },
        { threshold, rootMargin }
      );
    }

    observerRef.current.observe(element);
  }, [threshold, rootMargin]);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  return { observe, disconnect };
}
