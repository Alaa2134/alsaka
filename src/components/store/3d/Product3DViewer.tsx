import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";

interface Product3DViewerProps {
  imageUrl?: string;
  productName: string;
  primaryColor?: string;
}

// 3D Product Box Component
const ProductBox = ({ imageUrl, color }: { imageUrl?: string; color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(imageUrl, (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
      });
    }
  }, [imageUrl]);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[2, 2.5, 0.3]} />
      {texture ? (
        <meshStandardMaterial
          map={texture}
          roughness={0.3}
          metalness={0.1}
        />
      ) : (
        <meshStandardMaterial 
          color={color} 
          roughness={0.3} 
          metalness={0.2}
        />
      )}
    </mesh>
  );
};

// Floating particles around the product
const Particles = ({ color }: { color: string }) => {
  const count = 20;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    
    const positions = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 4;
      positions.push(new THREE.Vector3(x, y, z));
    }

    positions.forEach((pos, i) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(pos);
      meshRef.current!.setMatrixAt(i, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4();
      meshRef.current.getMatrixAt(i, matrix);
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(matrix);
      
      position.y += Math.sin(state.clock.elapsedTime + i) * 0.002;
      position.x += Math.cos(state.clock.elapsedTime + i) * 0.001;
      
      matrix.setPosition(position);
      meshRef.current.setMatrixAt(i, matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </instancedMesh>
  );
};

// Loading indicator
const Loader = () => (
  <Html center>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>جاري التحميل...</span>
    </div>
  </Html>
);

export const Product3DViewer = ({ 
  imageUrl, 
  productName,
  primaryColor = "#3b82f6" 
}: Product3DViewerProps) => {
  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={<Loader />}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color={primaryColor} />
          
          {/* Product */}
          <ProductBox imageUrl={imageUrl} color={primaryColor} />
          
          {/* Particles */}
          <Particles color={primaryColor} />
          
          {/* Shadow */}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={5}
            blur={2}
            far={4}
          />
          
          {/* Environment for reflections */}
          <Environment preset="city" />
          
          {/* Controls */}
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={3}
            maxDistance={8}
            autoRotate
            autoRotateSpeed={2}
          />
        </Suspense>
      </Canvas>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
        اسحب للدوران • قرّب للتكبير
      </div>
    </div>
  );
};
