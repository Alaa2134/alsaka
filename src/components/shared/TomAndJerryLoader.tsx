import { memo } from 'react';
import { motion } from 'framer-motion';

interface TomAndJerryLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * أنيميشن توم وجيري - قط يطارد فأر
 */
export const TomAndJerryLoader = memo(({ text = 'جاري التحميل...', size = 'md' }: TomAndJerryLoaderProps) => {
  const sizes = {
    sm: { icon: 32, track: 150 },
    md: { icon: 48, track: 220 },
    lg: { icon: 64, track: 300 },
  };

  const { icon, track } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4" dir="rtl">
      {/* مسار المطاردة */}
      <div 
        className="relative overflow-hidden rounded-full bg-muted/30 border border-border"
        style={{ width: track, height: icon + 16 }}
      >
        {/* الفأر (جيري) 🐭 */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ fontSize: icon * 0.6 }}
          animate={{ 
            x: [track - icon - 8, 8, track - icon - 8],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.span
            animate={{ scaleX: [1, 1, -1, -1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            🐭
          </motion.span>
        </motion.div>

        {/* القط (توم) 🐱 */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ fontSize: icon * 0.7 }}
          animate={{ 
            x: [track - icon * 2 - 20, -icon/2, track - icon * 2 - 20],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.span
            animate={{ scaleX: [1, 1, -1, -1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            🐱
          </motion.span>
        </motion.div>

        {/* أثر الجري */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 text-lg opacity-40"
            style={{ left: `${15 + i * 20}%` }}
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              scale: [0.8, 1.1, 0.8]
            }}
            transition={{ 
              duration: 0.4, 
              repeat: Infinity, 
              delay: i * 0.1 
            }}
          >
            💨
          </motion.div>
        ))}
      </div>

      {/* النص */}
      <motion.div 
        className="text-center"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <p className="text-base font-semibold text-foreground">{text}</p>
        <p className="text-sm text-muted-foreground mt-1">
          🐱 توم يطارد جيري 🐭
        </p>
      </motion.div>

      {/* نقاط التحميل */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
});

TomAndJerryLoader.displayName = 'TomAndJerryLoader';

/**
 * شاشة تحميل كاملة مع توم وجيري
 */
export const TomAndJerryFullPageLoader = memo(({ text = 'جاري التحميل...' }: { text?: string }) => {
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
      >
        <TomAndJerryLoader text={text} size="lg" />
      </motion.div>
    </motion.div>
  );
});

TomAndJerryFullPageLoader.displayName = 'TomAndJerryFullPageLoader';
