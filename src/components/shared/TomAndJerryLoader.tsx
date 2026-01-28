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
    sm: { cat: 40, mouse: 24, track: 200 },
    md: { cat: 60, mouse: 36, track: 300 },
    lg: { cat: 80, mouse: 48, track: 400 },
  };

  const { cat, mouse, track } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* مسار المطاردة */}
      <div 
        className="relative overflow-hidden rounded-full bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 dark:from-amber-900/20 dark:via-amber-950/10 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800"
        style={{ width: track, height: cat + 20 }}
      >
        {/* خطوط المسار */}
        <div className="absolute inset-0 flex items-center">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-4 bg-amber-300/50 dark:bg-amber-600/30 rounded-full"
              style={{ left: `${i * 12.5}%` }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>

        {/* الفأر (جيري) */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          animate={{ 
            x: [track - mouse - 10, 10, track - mouse - 10],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.svg 
            width={mouse} 
            height={mouse} 
            viewBox="0 0 100 100"
            animate={{ scaleX: [-1, -1, 1, 1, -1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            {/* جسم الفأر */}
            <ellipse cx="50" cy="55" rx="25" ry="20" fill="#8B7355" />
            {/* رأس الفأر */}
            <circle cx="75" cy="50" r="18" fill="#A08060" />
            {/* أذن */}
            <circle cx="85" cy="38" r="10" fill="#D4A574" />
            <circle cx="85" cy="38" r="6" fill="#FFB6C1" />
            {/* عين */}
            <circle cx="80" cy="48" r="4" fill="#000" />
            <circle cx="81" cy="47" r="1.5" fill="#FFF" />
            {/* أنف */}
            <circle cx="90" cy="52" r="3" fill="#FFB6C1" />
            {/* شوارب */}
            <line x1="88" y1="50" x2="98" y2="48" stroke="#333" strokeWidth="1" />
            <line x1="88" y1="52" x2="98" y2="52" stroke="#333" strokeWidth="1" />
            <line x1="88" y1="54" x2="98" y2="56" stroke="#333" strokeWidth="1" />
            {/* ذيل */}
            <motion.path
              d="M 25 55 Q 10 45 5 60 Q 0 75 15 65"
              stroke="#8B7355"
              strokeWidth="4"
              fill="none"
              animate={{ d: [
                "M 25 55 Q 10 45 5 60 Q 0 75 15 65",
                "M 25 55 Q 10 65 5 50 Q 0 35 15 45",
                "M 25 55 Q 10 45 5 60 Q 0 75 15 65"
              ]}}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            {/* أرجل */}
            <motion.ellipse 
              cx="40" cy="72" rx="5" ry="3" fill="#A08060"
              animate={{ cy: [72, 70, 72] }}
              transition={{ duration: 0.15, repeat: Infinity }}
            />
            <motion.ellipse 
              cx="55" cy="72" rx="5" ry="3" fill="#A08060"
              animate={{ cy: [70, 72, 70] }}
              transition={{ duration: 0.15, repeat: Infinity }}
            />
          </motion.svg>
        </motion.div>

        {/* القط (توم) */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          animate={{ 
            x: [track - cat - mouse - 30, -10, track - cat - mouse - 30],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.svg 
            width={cat} 
            height={cat} 
            viewBox="0 0 100 100"
            animate={{ scaleX: [-1, -1, 1, 1, -1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            {/* جسم القط */}
            <ellipse cx="45" cy="60" rx="30" ry="25" fill="#6B7B8C" />
            {/* رأس القط */}
            <circle cx="80" cy="45" r="22" fill="#7B8B9C" />
            {/* أذن يسرى */}
            <polygon points="65,20 70,40 55,35" fill="#7B8B9C" />
            <polygon points="67,25 69,35 60,32" fill="#FFB6C1" />
            {/* أذن يمنى */}
            <polygon points="95,20 90,40 100,35" fill="#7B8B9C" />
            <polygon points="94,25 91,35 98,32" fill="#FFB6C1" />
            {/* عيون */}
            <ellipse cx="72" cy="42" rx="6" ry="7" fill="#FFFACD" />
            <ellipse cx="88" cy="42" rx="6" ry="7" fill="#FFFACD" />
            <circle cx="72" cy="43" r="3" fill="#228B22" />
            <circle cx="88" cy="43" r="3" fill="#228B22" />
            <circle cx="72" cy="43" r="1.5" fill="#000" />
            <circle cx="88" cy="43" r="1.5" fill="#000" />
            {/* أنف */}
            <ellipse cx="80" cy="52" rx="4" ry="3" fill="#FFB6C1" />
            {/* فم */}
            <path d="M 76 56 Q 80 60 84 56" stroke="#333" strokeWidth="1.5" fill="none" />
            {/* شوارب */}
            <line x1="70" y1="50" x2="55" y2="48" stroke="#333" strokeWidth="1" />
            <line x1="70" y1="52" x2="55" y2="52" stroke="#333" strokeWidth="1" />
            <line x1="70" y1="54" x2="55" y2="56" stroke="#333" strokeWidth="1" />
            <line x1="90" y1="50" x2="105" y2="48" stroke="#333" strokeWidth="1" />
            <line x1="90" y1="52" x2="105" y2="52" stroke="#333" strokeWidth="1" />
            <line x1="90" y1="54" x2="105" y2="56" stroke="#333" strokeWidth="1" />
            {/* ذيل */}
            <motion.path
              d="M 15 60 Q 5 40 10 25 Q 15 10 25 20"
              stroke="#6B7B8C"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              animate={{ d: [
                "M 15 60 Q 5 40 10 25 Q 15 10 25 20",
                "M 15 60 Q 0 50 5 35 Q 10 20 20 30",
                "M 15 60 Q 5 40 10 25 Q 15 10 25 20"
              ]}}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            {/* أرجل */}
            <motion.ellipse 
              cx="30" cy="82" rx="8" ry="5" fill="#7B8B9C"
              animate={{ cy: [82, 78, 82] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            />
            <motion.ellipse 
              cx="50" cy="82" rx="8" ry="5" fill="#7B8B9C"
              animate={{ cy: [78, 82, 78] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            />
          </motion.svg>
        </motion.div>

        {/* نجوم الجري */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-yellow-400"
            style={{ 
              left: `${20 + i * 15}%`,
              top: '50%',
            }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 0.5, 
              repeat: Infinity, 
              delay: i * 0.2 
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      {/* النص */}
      <motion.div 
        className="text-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <p className="text-lg font-bold text-primary">{text}</p>
        <motion.p 
          className="text-sm text-muted-foreground mt-1"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🐱 توم يطارد جيري 🐭
        </motion.p>
      </motion.div>

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
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <TomAndJerryLoader text={text} size="lg" />
      </motion.div>
    </motion.div>
  );
});

TomAndJerryFullPageLoader.displayName = 'TomAndJerryFullPageLoader';
