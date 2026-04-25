import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

export const EntryPortal = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const active = useGameStore(state => state.entryPortalActive);
  const color = useGameStore(state => state.playerRingColor) || '#32CD32';
  const pos = useGameStore(state => state.playerPosition);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!active) {
        time.current = 0;
        return;
    }
    time.current += delta;
    if (meshRef.current) {
        // portal scales down over 3 seconds and rotates
        const scale = Math.max(0, 1 - (time.current / 3));
        meshRef.current.scale.setScalar(scale);
        meshRef.current.rotation.y -= delta * 8;
        meshRef.current.position.y = 10 * scale; // slides down slightly
    }
  });

  if (!active) return null;

  return (
    <group position={pos}>
        <mesh ref={meshRef}>
            <cylinderGeometry args={[0, 4, 20, 16, 1, true]} />
            <meshBasicMaterial 
                color={color} 
                transparent 
                opacity={0.6} 
                side={THREE.DoubleSide} 
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
        <pointLight color={color} intensity={5} distance={15} position={[pos[0], pos[1]+5, pos[2]]} />
    </group>
  );
};
