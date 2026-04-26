import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Trail } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';

export const Ball = () => {
  const { world } = usePhysics();
  const groupRef = useRef<THREE.Group>(null!);
  const ballMesh = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const updateBallPosition = useGameStore(state => state.updateBallPosition);
  const tier               = useGameStore(state => state.tier);
  const ballPosition = useGameStore(state => state.ballPosition);
  const gameStartTime = useGameStore(state => state.gameStartTime);
  const bodyRef = useRef<CANNON.Body>(null!);

  useEffect(() => {
    const [spawnX, spawnY, spawnZ] = useGameStore.getState().ballPosition;
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(0.6),
        position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
        linearDamping: 0.4,
        angularDamping: 0.4,
        collisionFilterGroup: 2,
    });

    body.addEventListener('collide', (e: any) => {
      const colliderId = e.body.userData?.id;
      // If the ball hits a player or a bot (ignore walls/floors)
      if (colliderId !== undefined) {
        useGameStore.getState().setLastStriker(colliderId);
      }
    });

    world.addBody(body);
    bodyRef.current = body;
    return () => {
      if (bodyRef.current) world.removeBody(bodyRef.current);
    };
  }, [world]); // Mount once

  // Reset physics on restart
  useEffect(() => {
    if (bodyRef.current && gameStartTime > 0) {
      const [sx, sy, sz] = useGameStore.getState().ballPosition;
      bodyRef.current.position.set(sx, sy, sz);
      bodyRef.current.velocity.set(0, 0, 0);
      bodyRef.current.angularVelocity.set(0, 0, 0);
      bodyRef.current.wakeUp();
    }
  }, [gameStartTime]);

  useFrame((state) => {
    if (!bodyRef.current) return;
    const body = bodyRef.current;
    const pos = body.position;

    // ── Ceiling Guard: ball must stay on the pitch ──────────────────
    if (pos.y > 10) {
      body.applyImpulse(new CANNON.Vec3(0, -30, 0), body.position);
    }

    // ── High Damping for natural feel (0.5 baseline) ──────────────────
    body.linearDamping  = 0.5;
    body.angularDamping = 0.5;

    // ── Velocity Clamp ──
    const v = body.velocity;
    const speed = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
    const MAX_SPEED = 35;
    if (speed > MAX_SPEED) {
      const factor = MAX_SPEED / speed;
      body.velocity.set(v.x * factor, v.y * factor, v.z * factor);
    }

    groupRef.current.position.set(pos.x, pos.y, pos.z);
    updateBallPosition([pos.x, pos.y, pos.z]);

    const time = state.clock.getElapsedTime();
    if (ballMesh.current) {
        (ballMesh.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 4 + Math.sin(time * 25) * 2;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail
        width={2}
        length={6}
        color={new THREE.Color('#FF8C00')}
        attenuation={(t) => t * t}
      >
        <mesh ref={ballMesh} castShadow>
            <icosahedronGeometry args={[0.6, 3]} />
            <meshPhysicalMaterial 
                color="#FF8C00"
                emissive="#FF8C00"
                emissiveIntensity={4}
                roughness={0.1}
                metalness={1}
                clearcoat={1}
                reflectivity={1}
            />
            <pointLight ref={glowRef} color="#FF8C00" intensity={3} distance={15} />
        </mesh>
      </Trail>
      {/* Inner Core */}
      <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#FFF" />
      </mesh>
    </group>
  );
};
