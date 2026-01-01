import { ReactNode } from "react";
import { motion } from "framer-motion";

interface FloatingPlatformProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const FloatingPlatform = ({ 
  children, 
  className = "",
  delay = 0
}: FloatingPlatformProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay,
        duration: 0.6,
        type: "spring",
        stiffness: 100 
      }}
      className={`relative ${className}`}
    >
      {/* Platform shadow */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/10 dark:bg-black/30 rounded-full blur-xl"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Floating animation */}
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Animated background particles
export const ParticlesBackground = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/10"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.5, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Gradient background
interface GradientBackgroundProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export const GradientBackground = ({ 
  primaryColor = "#3b82f6", 
  secondaryColor = "#8b5cf6" 
}: GradientBackgroundProps) => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Main gradient */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${primaryColor}40 0%, transparent 50%),
                       radial-gradient(ellipse at 70% 80%, ${secondaryColor}30 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 100%)`,
        }}
      />
      
      {/* Animated orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: primaryColor }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: secondaryColor }}
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};
