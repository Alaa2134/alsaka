import { useRef, useCallback, useState, useEffect } from 'react';
import React, { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

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

/**
 * مكون صورة كسولة التحميل
 */
interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
}

export const LazyImage = React.memo(function LazyImageComponent({ 
  src, 
  alt, 
  placeholder = '/placeholder.svg',
  className,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return React.createElement('img', {
    ref: imgRef,
    src: currentSrc,
    alt: alt,
    className: cn(
      'transition-opacity duration-300',
      isLoaded ? 'opacity-100' : 'opacity-50',
      className
    ),
    loading: 'lazy',
    decoding: 'async',
    ...props
  });
});
