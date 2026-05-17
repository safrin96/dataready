import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";

function Orb({ score }: { score: number }) {
  const mesh = useRef<THREE.Mesh>(null);

  const tone = useMemo(() => {
    if (score >= 85) return "#2EE59D";
    if (score >= 70) return "#25D0C9";
    if (score >= 50) return "#5BE6FF";
    return "#ff6b6b";
  }, [score]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!mesh.current) return;
    mesh.current.rotation.y = t * 0.35;
    mesh.current.rotation.x = Math.sin(t * 0.25) * 0.15;
    mesh.current.position.y = Math.sin(t * 0.75) * 0.1;
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.1, 2]} />
      <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.35} roughness={0.2} metalness={0.15} />
    </mesh>
  );
}

export function ScoreOrb({
  score,
  className,
  size = 160,
}: {
  score: number;
  className?: string;
  size?: number;
}) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <directionalLight intensity={0.9} position={[3, 3, 3]} />
        <pointLight intensity={1.1} position={[-3, -2, 2]} />
        <Orb score={score} />
      </Canvas>
    </div>
  );
}

