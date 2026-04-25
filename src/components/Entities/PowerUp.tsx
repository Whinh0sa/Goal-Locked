/**
 * PowerUp — glowing Overdrive orb that doubles the player's speed for 5 seconds.
 * Respawns at a new random position 12 seconds after collection.
 */
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS } from '../../constants';

const PICKUP_RADIUS   = 2.2;     // world-units — how close to trigger pickup
const BOOST_DURATION  = 5000;   // ms
const RESPAWN_DELAY   = 12000;  // ms after pickup before a new orb appears

type PowerUpType = 'OVERDRIVE' | 'GHOST' | 'FREEZE';

function randomPowerUpType(): PowerUpType {
  const r = Math.random();
  if (r < 0.33) return 'OVERDRIVE';
  if (r < 0.66) return 'GHOST';
  return 'FREEZE';
}

const TYPE_CONFIG = {
  OVERDRIVE: { color: '#00ffaa' }, // Teal
  GHOST:     { color: '#cc00ff' }, // Purple
  FREEZE:    { color: '#00aaff' }, // Cyan
};

function randomSpawnPos(): THREE.Vector3 {
  const r = 5 + Math.random() * (ARENA_RADIUS - 10);
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * r, 1.5, Math.sin(a) * r);
}

export const PowerUp = () => {
  const gameStarted      = useGameStore(s => s.gameStarted);
  const ballPosition     = useGameStore(s => s.ballPosition);   // proxy for player pos
  const setSpeedMult     = useGameStore(s => s.setSpeedMultiplier);
  const triggerGhostBall = useGameStore(s => s.triggerGhostBall);
  const triggerFreeze    = useGameStore(s => s.triggerFreeze);

  const [visible, setVisible]   = useState(true);
  const [spawnPos, setSpawnPos] = useState(() => randomSpawnPos());
  const [type, setType]         = useState<PowerUpType>(() => randomPowerUpType());
  const meshRef   = useRef<THREE.Mesh>(null!);
  const collected = useRef(false);

  // Reset when game resets
  useEffect(() => {
    if (!gameStarted) {
      collected.current = false;
      setVisible(false);
      // Appear 5s after game starts
      const t = setTimeout(() => {
        setSpawnPos(randomSpawnPos());
        setType(randomPowerUpType());
        setVisible(true);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [gameStarted]);

  useFrame(() => {
    if (!visible || collected.current || !gameStarted) return;

    // Use ballPosition as a stand-in proxy to check player proximity.
    // For true player tracking we read the physics world directly
    // via the userData tag in the store approach; here we use the
    // store's ballPosition which Ball.tsx publishes every frame, and
    // we rely on GameArena to also expose playerPosition if needed.
    // A simpler approach that works: proximity check vs the orb independently.
    const orbPos = spawnPos;

    // Read actual player position from the DOM physics world via the store ballPosition.
    // We'll subscribe to a separate playerPosition we add to the store — OR use the
    // impactPosition as an indirect trigger. For now: check distance every frame
    // against a playerPosition we'll piggyback from the store.
    const state = useGameStore.getState() as any;
    const playerPos: [number, number, number] | null = state.playerPosition ?? null;
    if (!playerPos) return;

    const dx = playerPos[0] - orbPos.x;
    const dy = playerPos[1] - orbPos.y;
    const dz = playerPos[2] - orbPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < PICKUP_RADIUS) {
      collected.current = true;
      setVisible(false);

      if (type === 'OVERDRIVE') {
        setSpeedMult(2);
        setTimeout(() => setSpeedMult(1), BOOST_DURATION);
      } else if (type === 'GHOST') {
        triggerGhostBall();
      } else if (type === 'FREEZE') {
        triggerFreeze();
      }

      // Respawn at a new position
      setTimeout(() => {
        collected.current = false;
        setSpawnPos(randomSpawnPos());
        setType(randomPowerUpType());
        setVisible(true);
      }, RESPAWN_DELAY);
    }
  });

  if (!visible) return null;

  const color = TYPE_CONFIG[type].color;

  return (
    <Float speed={3} rotationIntensity={2} floatIntensity={1}>
      <mesh ref={meshRef} position={spawnPos}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={5}
          roughness={0.1}
          metalness={0.8}
          toneMapped={false}
        />
        <pointLight color={color} intensity={4} distance={8} />
      </mesh>
    </Float>
  );
};
