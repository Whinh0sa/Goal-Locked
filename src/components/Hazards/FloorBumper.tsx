/**
 * FloorBumper — every 15 seconds, a random floor zone lights up red for 1.5s
 * then a physics box rockets up to y=5 and retracts, launching anything above it.
 */
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS } from '../../constants';

type Phase = 'idle' | 'warning' | 'rising' | 'retracting';

const CYCLE_INTERVAL = 15_000;  // ms between bumper events
const WARNING_DURATION = 1500;  // ms red warning stays visible
const RISE_TARGET = 5;          // world-units height the bumper reaches
const BUMPER_SIZE = 2.5;        // half-size of the bumper square

function randomArenaPos(radius: number): [number, number] {
  const safetyBuffer = 6;
  const maxR = Math.max(5, radius - safetyBuffer);
  const r = maxR * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export const FloorBumper = () => {
  const { world } = usePhysics();
  const gameStarted = useGameStore(s => s.gameStarted);
  const currentRadius = useGameStore(s => s.currentRadius);

  const [phase, setPhase]   = useState<Phase>('idle');
  const [pos, setPos]       = useState<[number, number]>([0, 0]);
  const bumperY             = useRef(0);            // current visual Y
  const bodyRef             = useRef<CANNON.Body | null>(null);
  const warningMeshRef      = useRef<THREE.Mesh>(null!);
  const bumperMeshRef       = useRef<THREE.Mesh>(null!);

  // Spawn the physics body when rising begins, remove it when retracted
  useEffect(() => {
    if (phase === 'rising') {
      const body = new CANNON.Body({
        mass: 0, // Kinematic-like behavior via manual Y updates
        shape: new CANNON.Box(new CANNON.Vec3(BUMPER_SIZE, 0.5, BUMPER_SIZE)),
        position: new CANNON.Vec3(pos[0], 0, pos[1]),
      });

      // Massive Upthrust Logic for 50-mass entities
      body.addEventListener('collide', (e: any) => {
        const target = e.body as CANNON.Body;
        // Launch players (50), bots (50), or the ball (5)
        if (target.mass >= 5) {
          const impulseStrength = target.mass >= 50 ? 1500 : 150;
          target.applyImpulse(new CANNON.Vec3(0, impulseStrength, 0), new CANNON.Vec3(0, 0, 0));
        }
      });

      world.addBody(body);
      bodyRef.current = body;
    }
    if (phase === 'idle' && bodyRef.current) {
      world.removeBody(bodyRef.current);
      bodyRef.current = null;
    }
  }, [phase, world, pos]);

  // 15-second cycle
  useEffect(() => {
    if (!gameStarted) return;
    const kick = () => {
      const newPos = randomArenaPos(useGameStore.getState().currentRadius);
      setPos(newPos);
      setPhase('warning');
      bumperY.current = -0.3;

      const warningTimer = setTimeout(() => {
        setPhase('rising');
      }, WARNING_DURATION);

      return () => clearTimeout(warningTimer);
    };
    const interval = setInterval(kick, CYCLE_INTERVAL);
    // Start first event after a random delay so multiple bumpers don't fire together
    const initialDelay = 5000 + Math.random() * 10000;
    const initial = setTimeout(kick, initialDelay);
    return () => { clearInterval(interval); clearTimeout(initial); };
  }, [gameStarted]);

  useFrame((_, delta) => {
    // --- OOB Sweeper ---
    const distFromCenter = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1]);
    if ((phase === 'warning' || phase === 'rising') && distFromCenter > currentRadius) {
      // Swallowed by walls! Despawn immediately.
      setPhase('idle');
      if (bodyRef.current) {
        world.removeBody(bodyRef.current);
        bodyRef.current = null;
      }
      return;
    }

    if (phase === 'rising') {
      bumperY.current = Math.min(bumperY.current + delta * 12, RISE_TARGET);
      if (bumperY.current >= RISE_TARGET) {
        setPhase('retracting');
      }
    }
    if (phase === 'retracting') {
      bumperY.current = Math.max(bumperY.current - delta * 8, -0.3);
      if (bumperY.current <= -0.3) {
        setPhase('idle');
      }
    }

    // Sync physics body Y
    if (bodyRef.current) {
      bodyRef.current.position.y = bumperY.current;
    }

    // Update visual meshes
    if (warningMeshRef.current) {
      warningMeshRef.current.visible = phase === 'warning';
    }
    if (bumperMeshRef.current) {
      bumperMeshRef.current.position.y = bumperY.current;
      bumperMeshRef.current.visible = phase === 'rising' || phase === 'retracting';
    }
  });

  if (!gameStarted) return null;

  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* Red warning square — flat on the floor */}
      <mesh ref={warningMeshRef} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[BUMPER_SIZE * 2, BUMPER_SIZE * 2]} />
        <meshBasicMaterial color="#ff1111" transparent opacity={0.55} />
      </mesh>

      {/* The physical bumper slab */}
      <mesh ref={bumperMeshRef} position={[0, -0.3, 0]}>
        <boxGeometry args={[BUMPER_SIZE * 2, 0.6, BUMPER_SIZE * 2]} />
        <meshStandardMaterial
          color="#ff3300"
          emissive="#ff2200"
          emissiveIntensity={3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};
