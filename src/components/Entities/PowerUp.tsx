/**
 * PowerUp — glowing Overdrive orb that doubles the player's speed for 5 seconds.
 * Respawns at a new random position 12 seconds after collection.
 */
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { usePhysics } from '../../hooks/usePhysics';
import { ARENA_RADIUS } from '../../constants';

const PICKUP_RADIUS   = 2.2;     // world-units — how close to trigger pickup
const PICKUP_RADIUS_SQ = PICKUP_RADIUS * PICKUP_RADIUS;
const BOOST_DURATION  = 5000;   // ms
const RESPAWN_DELAY   = 12000;  // ms after pickup before a new orb appears

type PowerUpType = 'SPEED' | 'GHOST' | 'FREEZE' | 'JUGGERNAUT' | 'EMP';

function randomPowerUpType(): PowerUpType {
  const r = Math.random();
  if (r < 0.20) return 'SPEED';
  if (r < 0.40) return 'GHOST';
  if (r < 0.60) return 'FREEZE';
  if (r < 0.80) return 'JUGGERNAUT';
  return 'EMP';
}

const TYPE_CONFIG = {
  SPEED:      { color: '#32CD32' }, // Neon Lime
  GHOST:      { color: '#9126EF' }, // Electric Purple
  FREEZE:     { color: '#00ccff' }, // Cyan
  JUGGERNAUT: { color: '#FFD700' }, // Gold
  EMP:        { color: '#00FFFF' }, // Bright Stuttering Cyan
};

function randomSpawnPos(radius: number): THREE.Vector3 {
  const safetyMargin = 4;
  const maxR = Math.max(5, radius - safetyMargin);
  const r = 5 + Math.random() * (maxR - 5);
  const a = Math.random() * Math.PI * 2;
  // Hitbox stays grounded at 0.5; Float will offset the visual mesh only
  return new THREE.Vector3(Math.cos(a) * r, 0.5, Math.sin(a) * r);
}

export const PowerUp = () => {
  const gameStarted    = useGameStore(s => s.gameStarted);
  const triggerPowerUp = useGameStore(s => s.triggerPowerUp);
  const currentRadius  = useGameStore(s => s.currentRadius);
  const { world }      = usePhysics();
  const registerPowerUp = useGameStore(s => s.registerPowerUp);
  const unregisterPowerUp = useGameStore(s => s.unregisterPowerUp);

  const [id]                   = useState(() => `pw-${crypto.randomUUID()}`);
  const [visible, setVisible]   = useState(false);
  const [spawnPos, setSpawnPos] = useState(() => randomSpawnPos(ARENA_RADIUS));
  const [type, setType]         = useState<PowerUpType>(() => randomPowerUpType());
  const meshRef   = useRef<THREE.Mesh>(null!);
  const collected = useRef(false);

  // Appearance cycle
  useEffect(() => {
    if (!gameStarted) {
      collected.current = false;
      setVisible(false);
      unregisterPowerUp(id);
      return;
    }

    const initialTimer = setTimeout(() => {
      const pos = randomSpawnPos(useGameStore.getState().currentRadius);
      const t = randomPowerUpType();
      setSpawnPos(pos);
      setType(t);
      setVisible(true);
      registerPowerUp(id, { position: [pos.x, pos.y, pos.z], type: t });
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      unregisterPowerUp(id);
    };
  }, [gameStarted, id, registerPowerUp, unregisterPowerUp]);

  useFrame(() => {
    if (!visible || collected.current || !gameStarted) return;

    // --- OOB Sweeper ---
    const distFromCenter = Math.sqrt(spawnPos.x * spawnPos.x + spawnPos.z * spawnPos.z);
    if (distFromCenter > currentRadius - 1) {
      // Swallowed by wall! Forced respawn.
      collected.current = true;
      setVisible(false);
      unregisterPowerUp(id);
      
      setTimeout(() => {
        if (useGameStore.getState().gameStarted) {
          collected.current = false;
          const nextPos = randomSpawnPos(useGameStore.getState().currentRadius);
          const nextType = randomPowerUpType();
          setSpawnPos(nextPos);
          setType(nextType);
          setVisible(true);
          registerPowerUp(id, { position: [nextPos.x, nextPos.y, nextPos.z], type: nextType });
        }
      }, 2000); // Shorter retry if swallowed
      return;
    }

    const orbPos = spawnPos;
    const state = useGameStore.getState();
    const { playerPosition, eliminated } = state;

    // 1. Check Player
    if (!eliminated[0]) {
      const dx = playerPosition[0] - orbPos.x;
      const dy = playerPosition[1] - orbPos.y;
      const dz = playerPosition[2] - orbPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < PICKUP_RADIUS_SQ) {
        handlePickup(0);
        return;
      }
    }

    // 2. Check Bots via physics bodies
    const bodies = world.bodies;
    for (const body of bodies) {
      const userData = (body as any).userData;
      if (userData && userData.id !== undefined && userData.id > 0) {
        // Only check bots that aren't eliminated (implied by body being in world)
        const dx = body.position.x - orbPos.x;
        const dz = body.position.z - orbPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < PICKUP_RADIUS_SQ) {
          handlePickup(userData.id);
          return;
        }
      }
    }
  });

  const handlePickup = (entityId: number) => {
    collected.current = true;
    setVisible(false);
    unregisterPowerUp(id);

    const typeKey = type.toLowerCase() as any;
    triggerPowerUp(typeKey, entityId);

    // Respawn cycle
    setTimeout(() => {
        if (useGameStore.getState().gameStarted) {
          collected.current = false;
          const nextPos = randomSpawnPos(useGameStore.getState().currentRadius);
          const nextType = randomPowerUpType();
        setSpawnPos(nextPos);
        setType(nextType);
        setVisible(true);
        registerPowerUp(id, { position: [nextPos.x, nextPos.y, nextPos.z], type: nextType });
      }
    }, RESPAWN_DELAY);
  };

  if (!visible) return null;

  const config = TYPE_CONFIG[type];
  const color = config.color;

  return (
    <group position={spawnPos}>
      <Float speed={5} rotationIntensity={3} floatIntensity={1.5}>
        <mesh ref={meshRef}>
          {type === 'EMP' ? (
            <torusKnotGeometry args={[0.3, 0.1, 64, 16]} />
          ) : (
            <octahedronGeometry args={[0.7, 0]} />
          )}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={12}
            roughness={0}
            metalness={1}
            toneMapped={false}
          />
          <pointLight color={color} intensity={15} distance={15} />
        </mesh>
      </Float>
    </group>
  );
};
