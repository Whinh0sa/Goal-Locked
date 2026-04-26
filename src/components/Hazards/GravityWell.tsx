/**
 * GravityWell — a dark matter hazard that pulls the ball and players toward its center.
 * Active for 6 seconds, then despawns and respawns after a delay.
 */
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS } from '../../constants';

const PULL_FORCE = 400; // Force multiplier
const EFFECT_RADIUS = 15; // Max distance for attraction
const CYCLE_DURATION = 6000; // How long it stays active
const RESPAWN_DELAY = 12000; // Delay between appearances

function randomArenaPos(radius: number): [number, number] {
  const safetyBuffer = 8;
  const maxR = Math.max(5, radius - safetyBuffer);
  const r = maxR * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export const GravityWell = () => {
  const { world } = usePhysics();
  const gameStarted = useGameStore(s => s.gameStarted);
  const currentRadius = useGameStore(s => s.currentRadius);

  const [active, setActive] = useState(false);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const meshRef = useRef<THREE.Mesh>(null!);
  
  // Random Initial Offset to desynchronize multiple wells
  useEffect(() => {
    if (!gameStarted) return;
    
    const initialDelay = 5000 + Math.random() * 10000;
    const startCycle = () => {
      const run = () => {
        setPos(randomArenaPos(useGameStore.getState().currentRadius));
        setActive(true);
        setTimeout(() => {
          setActive(false);
        }, CYCLE_DURATION);
      };
      
      run();
      return setInterval(run, CYCLE_DURATION + RESPAWN_DELAY);
    };

    const timer = setTimeout(() => {
      const interval = startCycle();
      return () => clearInterval(interval);
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [gameStarted]);

  useFrame((state, delta) => {
    if (!active || !gameStarted) return;

    // --- OOB Sweeper ---
    const distFromCenter = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1]);
    if (distFromCenter > currentRadius - 2) {
      setActive(false);
      return;
    }

    // Apply Radial Force
    const wellPos = new CANNON.Vec3(pos[0], 1, pos[1]);
    for (const body of world.bodies) {
      // Only pull Ball (mass 1 or 5), Players (id 0), or Bots (id > 0)
      const isDynamic = body.mass > 0 && body.type !== CANNON.Body.STATIC;
      if (isDynamic) {
        const diff = wellPos.vsub(body.position);
        const distance = diff.length();
        
        if (distance < EFFECT_RADIUS && distance > 0.5) {
          const forceMag = (1 - distance / EFFECT_RADIUS) * PULL_FORCE * (body.mass / 50 + 1);
          const force = diff.unit().scale(forceMag);
          body.applyForce(force, body.position);
        }
      }
    }

    // Visual pulse
    const t = state.clock.getElapsedTime();
    const s = 1 + Math.sin(t * 4) * 0.2;
    meshRef.current.scale.set(s, s, s);
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.emissiveIntensity = 4 + Math.sin(t * 8) * 2;
    }
  });

  if (!active || !gameStarted) return null;

  return (
    <group position={[pos[0], 1.5, pos[1]]}>
      <Float speed={4} rotationIntensity={2} floatIntensity={1}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshStandardMaterial
            color="#4b0082"
            emissive="#9400d3"
            emissiveIntensity={4}
            roughness={0}
            metalness={1}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      </Float>
      {/* Attraction Field visualizer / Area effect */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.45, 0]}>
        <ringGeometry args={[0, 5, 32]} />
        <meshBasicMaterial color="#9400d3" transparent opacity={0.1} />
      </mesh>
      <pointLight color="#9400d3" intensity={15} distance={20} />
    </group>
  );
};
