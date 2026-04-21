/**
 * DecoyBalls — spawns 2 small fast white balls when remainingPlayers <= 4.
 * Mass = 0.4 (not 1) so goal detection ignores them entirely.
 * They collide with players and the main ball to create chaos.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';

const DECOY_SPAWN_POSITIONS: [number, number, number][] = [
  [-6, 6, -4],
  [6, 6, 4],
];

const DecoyBall = ({ spawnPos }: { spawnPos: [number, number, number] }) => {
  const { world } = usePhysics();
  const meshRef = useRef<THREE.Mesh>(null!);
  const bodyRef = useRef<CANNON.Body | null>(null);

  useEffect(() => {
    const body = new CANNON.Body({
      mass: 0.4,                          // must NOT be 1 — goal detection skips it
      shape: new CANNON.Sphere(0.4),
      position: new CANNON.Vec3(...spawnPos),
      linearDamping: 0.05,
      angularDamping: 0.05,
    });
    // Give it an initial random kick for chaos
    body.velocity.set(
      (Math.random() - 0.5) * 16,
      4,
      (Math.random() - 0.5) * 16,
    );
    world.addBody(body);
    bodyRef.current = body;
    return () => { world.removeBody(body); bodyRef.current = null; };
  }, [world, spawnPos]);

  useFrame((state) => {
    if (!bodyRef.current || !meshRef.current) return;
    const p = bodyRef.current.position;
    meshRef.current.position.set(p.x, p.y, p.z);

    // Ceiling guard (same as main ball)
    if (p.y > 10) {
      bodyRef.current.applyImpulse(new CANNON.Vec3(0, -20, 0), bodyRef.current.position);
    }

    // Pulse emissive intensity for the "alive" look
    const t = state.clock.getElapsedTime();
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      2 + Math.sin(t * 18) * 1;
  });

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={2}
        roughness={0.0}
        metalness={1}
        toneMapped={false}
      />
      <pointLight color="#ffffff" intensity={2} distance={6} />
    </mesh>
  );
};

/** Conditional wrapper — only renders when half the players are eliminated */
export const DecoyBalls = () => {
  const remaining = useGameStore(s => s.remainingPlayers);
  const gameStarted = useGameStore(s => s.gameStarted);

  if (!gameStarted || remaining > 4) return null;

  return (
    <>
      {DECOY_SPAWN_POSITIONS.map((pos, i) => (
        <DecoyBall key={i} spawnPos={pos} />
      ))}
    </>
  );
};
