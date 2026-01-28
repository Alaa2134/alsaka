import { memo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface TomAndJerryLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

// القط 3D
const Cat3D = ({ position }: { position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftFrontLegRef = useRef<THREE.Mesh>(null);
  const rightFrontLegRef = useRef<THREE.Mesh>(null);
  const leftBackLegRef = useRef<THREE.Mesh>(null);
  const rightBackLegRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime * 8;
    
    // حركة الجري
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 1.5) * 2;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) > 0 ? 0 : Math.PI;
    }

    // حركة الأرجل
    if (leftFrontLegRef.current) {
      leftFrontLegRef.current.rotation.x = Math.sin(time) * 0.5;
    }
    if (rightFrontLegRef.current) {
      rightFrontLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.5;
    }
    if (leftBackLegRef.current) {
      leftBackLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.5;
    }
    if (rightBackLegRef.current) {
      rightBackLegRef.current.rotation.x = Math.sin(time) * 0.5;
    }
    
    // حركة الذيل
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(time * 0.5) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* جسم القط */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 0.8, 8, 16]} />
        <meshStandardMaterial color="#6B7B8C" />
      </mesh>
      
      {/* رأس القط */}
      <mesh position={[0.7, 0.3, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* أذن يسرى */}
      <mesh position={[0.6, 0.65, -0.15]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.12, 0.25, 4]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* أذن يمنى */}
      <mesh position={[0.6, 0.65, 0.15]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.12, 0.25, 4]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* عين يسرى */}
      <mesh position={[0.95, 0.35, -0.12]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#FFFACD" />
      </mesh>
      <mesh position={[0.98, 0.35, -0.12]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      
      {/* عين يمنى */}
      <mesh position={[0.95, 0.35, 0.12]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#FFFACD" />
      </mesh>
      <mesh position={[0.98, 0.35, 0.12]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      
      {/* أنف */}
      <mesh position={[1.02, 0.25, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      
      {/* رجل أمامية يسرى */}
      <mesh ref={leftFrontLegRef} position={[0.3, -0.5, -0.2]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* رجل أمامية يمنى */}
      <mesh ref={rightFrontLegRef} position={[0.3, -0.5, 0.2]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* رجل خلفية يسرى */}
      <mesh ref={leftBackLegRef} position={[-0.3, -0.5, -0.2]}>
        <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* رجل خلفية يمنى */}
      <mesh ref={rightBackLegRef} position={[-0.3, -0.5, 0.2]}>
        <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
        <meshStandardMaterial color="#7B8B9C" />
      </mesh>
      
      {/* ذيل */}
      <mesh ref={tailRef} position={[-0.7, 0.2, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.05, 0.6, 4, 8]} />
        <meshStandardMaterial color="#6B7B8C" />
      </mesh>
    </group>
  );
};

// الفأر 3D
const Mouse3D = ({ position }: { position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime * 10;
    
    // حركة الجري - أسرع من القط
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 1.5) * 2 + 1.5;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) > 0 ? 0 : Math.PI;
    }

    // حركة الأرجل
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(time) * 0.6;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.6;
    }
    
    // حركة الذيل
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(time * 0.3) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={0.5}>
      {/* جسم الفأر */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.25, 0.4, 8, 16]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>
      
      {/* رأس الفأر */}
      <mesh position={[0.5, 0.1, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#A08060" />
      </mesh>
      
      {/* أذن يسرى كبيرة */}
      <mesh position={[0.4, 0.4, -0.2]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#D4A574" />
      </mesh>
      <mesh position={[0.4, 0.4, -0.2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      
      {/* أذن يمنى كبيرة */}
      <mesh position={[0.4, 0.4, 0.2]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#D4A574" />
      </mesh>
      <mesh position={[0.4, 0.4, 0.2]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      
      {/* عين يسرى */}
      <mesh position={[0.68, 0.15, -0.1]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.7, 0.17, -0.1]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* عين يمنى */}
      <mesh position={[0.68, 0.15, 0.1]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.7, 0.17, 0.1]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* أنف */}
      <mesh position={[0.75, 0.05, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#FFB6C1" />
      </mesh>
      
      {/* رجل يسرى */}
      <mesh ref={leftLegRef} position={[0, -0.35, -0.12]}>
        <capsuleGeometry args={[0.06, 0.2, 4, 8]} />
        <meshStandardMaterial color="#A08060" />
      </mesh>
      
      {/* رجل يمنى */}
      <mesh ref={rightLegRef} position={[0, -0.35, 0.12]}>
        <capsuleGeometry args={[0.06, 0.2, 4, 8]} />
        <meshStandardMaterial color="#A08060" />
      </mesh>
      
      {/* ذيل طويل */}
      <mesh ref={tailRef} position={[-0.5, 0, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.03, 0.8, 4, 8]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>
    </group>
  );
};

// أرضية
const Floor = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
    <planeGeometry args={[10, 10]} />
    <meshStandardMaterial color="#E8DCC8" />
  </mesh>
);

// غبار الجري
const DustParticles = () => {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const particleCount = 50;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 1] = Math.random() * 0.5 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#D4C4A8" transparent opacity={0.6} />
    </points>
  );
};

// المشهد الكامل
const ChaseScene = () => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 3, 0]} intensity={0.5} color="#FFE4B5" />
      
      <Cat3D position={[-1, 0, 0]} />
      <Mouse3D position={[1, 0, 0]} />
      <Floor />
      <DustParticles />
    </>
  );
};

export const TomAndJerryLoader = memo(({ text = 'جاري التحميل...', size = 'md' }: TomAndJerryLoaderProps) => {
  const sizes = {
    sm: { height: 150, width: 200 },
    md: { height: 200, width: 280 },
    lg: { height: 280, width: 380 },
  };

  const { height, width } = sizes[size];

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

      {/* مشهد 3D */}
      <div 
        className="rounded-2xl overflow-hidden bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 shadow-xl border-2 border-primary/20"
        style={{ width, height }}
      >
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
          <ChaseScene />
        </Canvas>
      </div>

      {/* النص السفلي */}
      <motion.p 
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐱 القط يطارد الفأر 🐭
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
