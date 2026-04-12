import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Box, Html } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { useAI } from '../../hooks/useAI';

export const Bot = ({ id, goalPos }: { id: number, goalPos: THREE.Vector3 }) => {
  const { world } = usePhysics();
  const isEliminated = useGameStore(state => state.eliminated[id]);
  const ballPosition = useGameStore(state => state.ballPosition);
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<CANNON.Body>(null!);

  const { update } = useAI(id, goalPos, bodyRef.current);

  useEffect(() => {
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(0.8),
        position: new CANNON.Vec3(goalPos.x * 0.8, 1, goalPos.z * 0.8),
        fixedRotation: true,
        linearDamping: 0.5,
    });
    world.addBody(body);
    bodyRef.current = body;
    return () => world.removeBody(body);
  }, [world, goalPos]);

  useFrame((state) => {
    if (isEliminated || !bodyRef.current) return;
    update(ballPosition);
    const pos = bodyRef.current.position;
    groupRef.current.position.set(pos.x, pos.y, pos.z);
    if (meshRef.current) {
        meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2 + id) * 0.1;
    }
  });

  if (isEliminated) return null;

  return (
    <group ref={groupRef}>
      {/* Diegetic Label */}
      <Html position={[0, 1.5, 0]} center transform scale={0.4} distanceFactor={12}>
         <div className="px-4 py-1 border-l-4 border-red-500 bg-black/80 backdrop-blur-md text-red-500 font-mono text-[10px] tracking-widest whitespace-nowrap uppercase">
             GA-0{id + 1}_HOSTILE
         </div>
      </Html>

      <group ref={meshRef}>
        <Box args={[1.2, 0.4, 1.2]} position={[0, 0.2, 0]} castShadow>
            <meshPhysicalMaterial color="#1a1c2c" roughness={0.3} metalness={0.9} clearcoat={1} />
        </Box>
        <Box args={[0.5, 0.2, 0.5]} position={[0, 0.5, 0]}>
            <meshPhysicalMaterial color="#ff4500" emissive="#ff4500" emissiveIntensity={1} />
        </Box>
        <pointLight position={[0, -0.5, 0]} color="#ff4500" intensity={1} distance={3} />
      </group>
    </group>
  );
};
