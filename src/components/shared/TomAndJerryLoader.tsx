import { memo } from 'react';
import { motion } from 'framer-motion';

interface TomAndJerryLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TomAndJerryLoader = memo(({ text = 'جاري التحميل...', size = 'md' }: TomAndJerryLoaderProps) => {
  const sizes = {
    sm: { track: 200, iconSize: 40 },
    md: { track: 280, iconSize: 50 },
    lg: { track: 350, iconSize: 60 },
  };

  const { track, iconSize } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-6" dir="rtl">
      {/* النص العلوي */}
      <motion.p 
        className="text-xl font-bold text-primary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {text}
      </motion.p>

      {/* مسار الجري */}
      <div 
        className="relative rounded-full bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-amber-900/30 shadow-inner overflow-hidden"
        style={{ width: track, height: iconSize + 20, padding: 10 }}
      >
        {/* خط الأرض */}
        <div className="absolute bottom-2 left-4 right-4 h-1 bg-amber-300/50 dark:bg-amber-700/50 rounded-full" />
        
        {/* الفأر (جيري) - يجري أولاً */}
        <motion.div
          className="absolute flex flex-col items-center"
          style={{ top: 5 }}
          animate={{
            x: [track - iconSize - 20, 10, track - iconSize - 20],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            style={{ fontSize: iconSize * 0.8 }}
            className="drop-shadow-lg"
          >
            🐭
          </motion.div>
          {/* غبار الجري */}
          <motion.span
            className="text-xs opacity-60"
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 0.2, repeat: Infinity }}
          >
            💨
          </motion.span>
        </motion.div>

        {/* القط (توم) - يطارد */}
        <motion.div
          className="absolute flex flex-col items-center"
          style={{ top: 5 }}
          animate={{
            x: [track - iconSize * 2 - 30, 0, track - iconSize * 2 - 30],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.15,
          }}
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -8, 0, 8, 0] }}
            transition={{ duration: 0.25, repeat: Infinity }}
            style={{ fontSize: iconSize }}
            className="drop-shadow-lg"
          >
            🐱
          </motion.div>
          {/* غبار الجري */}
          <motion.span
            className="text-sm opacity-60"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.15, repeat: Infinity }}
          >
            💨💨
          </motion.span>
        </motion.div>
      </div>

      {/* نقاط التحميل المتحركة */}
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">انتظر قليلاً</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ 
                y: [0, -8, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

TomAndJerryLoader.displayName = 'TomAndJerryLoader';

/**
 * شاشة تحميل كاملة
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
        className="bg-card p-8 rounded-3xl shadow-2xl border"
      >
        <TomAndJerryLoader text={text} size="lg" />
      </motion.div>
    </motion.div>
  );
});

TomAndJerryFullPageLoader.displayName = 'TomAndJerryFullPageLoader';
