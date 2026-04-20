import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Float } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS } from '../../constants';

const SPEED = 25;
const MAX_SHIELDS = 3;

export const Player = () => {
  const { world } = usePhysics();
  const bodyRef   = useRef<CANNON.Body | null>(null);
  const groupRef  = useRef<THREE.Group>(null!);

  // Subscribe to playerShields for the visual dots
  const playerShields = useGameStore(state => state.playerShields);

  useEffect(() => {
    const spawnPos = new CANNON.Vec3(ARENA_RADIUS - 2, 1, 0);
    const body = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(0.8),
      position: spawnPos,
      fixedRotation: true,
      linearDamping: 0.4,
    });
    (body as any).userData = { isPlayer: true };
    world.addBody(body);
    bodyRef.current = body;
    return () => {
      world.removeBody(body);
      bodyRef.current = null;
    };
  }, [world]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const { moveDirection, pulseTrigger } = useGameStore.getState();
    const x = moveDirection[0];
    const z = moveDirection[1];

    body.velocity.set(x * SPEED, body.velocity.y, z * SPEED);

    // --- PULSE ---
    if (pulseTrigger) {
      const ballBody = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
      if (ballBody) {
        const dp   = ballBody.position.vsub(body.position);
        const dist = dp.length();
        if (dist < 5) {
          ballBody.applyImpulse(dp.scale(80 / Math.max(dist, 0.1)), ballBody.position);
        }
      }
    }

    const pos = body.position;
    groupRef.current.position.set(pos.x, pos.y, pos.z);
  });

  return (
    <group ref={groupRef}>
      {/* Shield indicator dots */}
      <group position={[0, 3.2, 0]}>
        {Array.from({ length: MAX_SHIELDS }).map((_, i) => {
          const active = i < playerShields;
          const offsetX = (i - (MAX_SHIELDS - 1) / 2) * 0.5;
          return (
            <mesh key={i} position={[offsetX, 0, 0]}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial
                color={active ? '#32CD32' : '#1a1a1a'}
                emissive={active ? '#32CD32' : '#000'}
                emissiveIntensity={active ? 4 : 0}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      <Float speed={4} rotationIntensity={2} floatIntensity={0.5}>
        <mesh castShadow>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#0B0B0B" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Primary orbit ring — Cyber Neon Lime */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.5, 0.1, 16, 80]} />
          <meshStandardMaterial color="#32CD32" emissive="#32CD32" emissiveIntensity={4} toneMapped={false} />
        </mesh>

        {/* Secondary tilted ring */}
        <mesh rotation-x={Math.PI / 3}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshStandardMaterial color="#32CD32" emissive="#32CD32" emissiveIntensity={2} toneMapped={false} />
        </mesh>

        <pointLight color="#32CD32" intensity={3} distance={6} />
      </Float>
    </group>
  );
};
