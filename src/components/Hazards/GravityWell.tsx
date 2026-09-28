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


// Pre-allocate vectors outside the component to prevent GC in high-frequency loops
const tmpWellPos = new CANNON.Vec3();
const tmpDiff = new CANNON.Vec3();
const tmpForce = new CANNON.Vec3();

export const GravityWell = () => {
  const { world } = usePhysics();
  const gameStarted   = useGameStore(s => s.gameStarted);
  const currentRadius = useGameStore(s => s.currentRadius);

  // --- State & Refs (previously missing — this was the crash origin) ---
  const [active, setActive] = useState(false);
  const [pos, setPos]       = useState<[number, number]>([0, 0]);
  const meshRef             = useRef<THREE.Mesh>(null!);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lifecycle: arm/disarm well based on game state
  useEffect(() => {
    if (!gameStarted) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setActive(false);
      return;
    }

    const initialDelay = 5000 + Math.random() * 10000;

    const run = () => {
      setPos(randomArenaPos(useGameStore.getState().currentRadius));
      setActive(true);
      setTimeout(() => setActive(false), CYCLE_DURATION);
    };

    const timer = setTimeout(() => {
      run();
      intervalRef.current = setInterval(run, CYCLE_DURATION + RESPAWN_DELAY);
    }, initialDelay);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [gameStarted]);

  useFrame((state) => {
    // Safety guard: bail if inactive, game stopped, or mesh not yet mounted
    if (!active || !gameStarted || !meshRef.current) return;

    // OOB Sweeper (Optimized: avoiding Math.sqrt)
    const distFromCenterSq = pos[0] * pos[0] + pos[1] * pos[1];
    const maxRadius = currentRadius - 2;
    if (distFromCenterSq > maxRadius * maxRadius) {
      setActive(false);
      return;
    }

    // Apply radial attraction force to all dynamic bodies
    // Optimized: using pre-allocated vectors and lengthSquared to avoid allocations and Math.sqrt
    tmpWellPos.set(pos[0], 1, pos[1]);
    const effectRadiusSq = EFFECT_RADIUS * EFFECT_RADIUS;

    for (const body of world.bodies) {
      const isDynamic = body.mass > 0 && body.type !== CANNON.Body.STATIC;
      if (isDynamic) {
        tmpWellPos.vsub(body.position, tmpDiff);
        const distanceSq = tmpDiff.lengthSquared();

        if (distanceSq < effectRadiusSq && distanceSq > 0.25) {
          const distance = Math.sqrt(distanceSq); // Need actual distance for falloff
          const forceMag = (1 - distance / EFFECT_RADIUS) * PULL_FORCE * (body.mass / 50 + 1);

          // Manually calculate unit vector and scale in-place to avoid .unit() and .scale() object allocation
          const invDist = 1 / distance;
          tmpForce.set(
            tmpDiff.x * invDist * forceMag,
            tmpDiff.y * invDist * forceMag,
            tmpDiff.z * invDist * forceMag
          );

          body.applyForce(tmpForce, body.position);
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
      {/* Attraction field visualiser */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.45, 0]}>
        <ringGeometry args={[0, 5, 32]} />
        <meshBasicMaterial color="#9400d3" transparent opacity={0.1} />
      </mesh>
      <pointLight color="#9400d3" intensity={15} distance={20} />
    </group>
  );
};
