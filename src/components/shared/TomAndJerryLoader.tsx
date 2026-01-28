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
    sm: { icon: 32, track: 160 },
    md: { icon: 48, track: 240 },
    lg: { icon: 64, track: 320 },
  };

  const { icon, track } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4" dir="rtl">
      {/* النص العلوي */}
      <motion.p 
        className="text-lg font-bold text-primary"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {text}
      </motion.p>

      {/* مسار المطاردة - من اليمين لليسار */}
      <div 
        className="relative overflow-hidden rounded-full bg-gradient-to-l from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-950/10 border-2 border-blue-200 dark:border-blue-800 shadow-inner"
        style={{ width: track, height: icon + 20 }}
      >
        {/* القط (توم) 🐱 - يبدأ من اليمين */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          style={{ fontSize: icon * 0.8 }}
          animate={{ 
            x: [track - icon, 0, track - icon],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🐱
        </motion.div>

        {/* الفأر (جيري) 🐭 - أمام القط */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-20"
          style={{ fontSize: icon * 0.6 }}
          animate={{ 
            x: [track - icon * 0.7 - 10, -icon * 0.5, track - icon * 0.7 - 10],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🐭
        </motion.div>

        {/* أثر الجري 💨 */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ 
              right: `${20 + i * 25}%`,
              fontSize: icon * 0.4 
            }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5],
              x: [0, -10, 0]
            }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              delay: i * 0.15 
            }}
          >
            💨
          </motion.div>
        ))}
      </div>

      {/* النص السفلي */}
      <motion.p 
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐱 توم يطارد جيري 🐭
      </motion.p>

      {/* نقاط التحميل */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.3, 1, 0.3]
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
        className="bg-card p-8 rounded-2xl shadow-2xl border"
      >
        <TomAndJerryLoader text={text} size="lg" />
      </motion.div>
    </motion.div>
  );
});

TomAndJerryFullPageLoader.displayName = 'TomAndJerryFullPageLoader';
