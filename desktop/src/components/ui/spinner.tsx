import { motion } from "framer-motion";

/**
 * RTL cat (🐈) chasing a mouse (🐁). Spec calls this out explicitly as the
 * loading animation across the app.
 */
export function Spinner({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" dir="rtl">
      <div className="relative w-48 h-10 overflow-hidden">
        <motion.span
          className="absolute right-0 text-2xl"
          animate={{ x: [-180, 0, -180] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          🐁
        </motion.span>
        <motion.span
          className="absolute right-12 text-2xl"
          animate={{ x: [-150, 30, -150] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          🐈
        </motion.span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
