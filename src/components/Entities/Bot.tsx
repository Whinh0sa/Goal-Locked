import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import { useAI } from '../../hooks/useAI';
import { useGameStore } from '../../store/useGameStore';
import { Box, Html } from '@react-three/drei';

export const Bot = ({ id, goalPos }: { id: number, goalPos: THREE.Vector3 }) => {
  const isEliminated = useGameStore(state => state.eliminated[id]);
  const ballPosition = useGameStore(state => state.ballPosition);
  
  const [ref, api] = useSphere(() => ({
    mass: 10,
    position: [goalPos.x, 1, goalPos.z],
    args: [0.8],
    fixedRotation: true,
    material: { friction: 0.1, restitution: 0 }
  }));

  const meshRef = useRef<THREE.Group>(null!);
  const { update } = useAI(id, goalPos, api);

  useFrame((state) => {
    if (isEliminated) return;
    update(ballPosition);

    // Tilt animation based on velocity
    if (meshRef.current) {
        // We'd need to track velocity, but as a shortcut we can use the position delta
        // For now, let's add a subtle hover animation
        meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2 + id) * 0.1;
    }
  });

  if (isEliminated) return null;

  return (
    <group ref={ref as any}>
      <group ref={meshRef}>
        {/* Tactical Bot Body (Red Accent for Hostiles) */}
        <Box args={[1.2, 0.4, 1.2]} position={[0, 0.2, 0]} castShadow>
            <meshPhysicalMaterial color="#0a0a0c" roughness={0.3} metalness={0.9} clearcoat={1} emissive="#ff4500" emissiveIntensity={0.1} />
        </Box>
        
        {/* Sensor Unit */}
        <Box args={[0.5, 0.2, 0.5]} position={[0, 0.5, 0]}>
            <meshPhysicalMaterial color="#ff4500" emissive="#ff4500" emissiveIntensity={1} />
        </Box>

        {/* Side Sponsons */}
        <Box args={[0.4, 0.2, 0.6]} position={[0.7, 0.3, 0]}>
            <meshStandardMaterial color="#1a1a1a" metalness={1} />
        </Box>
        <Box args={[0.4, 0.2, 0.6]} position={[-0.7, 0.3, 0]}>
            <meshStandardMaterial color="#1a1a1a" metalness={1} />
        </Box>

        {/* Bottom Thrust Glow */}
        <pointLight position={[0, -0.5, 0]} color="#ff4500" intensity={1} distance={3} />
        
        {/* Bot ID Badge */}
        <Html position={[0, 1.2, 0]} center>
            <div className="px-2 py-0.5 border border-red-500/50 bg-black/80 font-mono text-[8px] text-red-500 whitespace-nowrap">
                GA-0{id + 1}_UNIT
            </div>
        </Html>
      </group>

      {/* Target Ring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.7, 0]}>
          <ringGeometry args={[1, 1.1, 32]} />
          <meshBasicMaterial color="#ff4500" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
