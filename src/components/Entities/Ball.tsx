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

    body.addEventListener('collide', (e: { body: CANNON.Body & { userData?: { id?: number } } }) => {
      const colliderId = e.body.userData?.id;
      // If the ball hits a player or a bot (ignore walls/floors)
      if (colliderId !== undefined) {
        useGameStore.getState().setLastStriker(colliderId);
      }
    });

    world.addBody(body);
    bodyRef.current = body;
    // Cache reference in store — eliminates per-frame world.bodies.find() scans
    useGameStore.getState().setBallBodyRef(body);
    return () => {
      if (bodyRef.current) world.removeBody(bodyRef.current);
      useGameStore.getState().setBallBodyRef(null);
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

  const lastStriker = useGameStore(state => state.lastStriker);

  const getPossessionColor = () => {
    if (lastStriker === 0) return '#32CD32'; // Player: Cyber Neon Lime
    if (lastStriker !== null && lastStriker > 0) return '#FF0033'; // Bot: Hostile Red
    return '#FF8C00'; // Neutral: Current Gold/Orange
  };
  const currentColor = getPossessionColor();

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
        (ballMesh.current.material as THREE.MeshPhysicalMaterial).color.set(currentColor);
        (ballMesh.current.material as THREE.MeshPhysicalMaterial).emissive.set(currentColor);
    }
    if (glowRef.current) {
        glowRef.current.color.set(currentColor);
    }
  });

  return (
    <group ref={groupRef}>
      <Trail
        width={1.5}
        length={8}
        color={new THREE.Color(currentColor)}
        attenuation={(t) => t * t}
      >
        <mesh ref={ballMesh} castShadow>
            <icosahedronGeometry args={[0.6, 3]} />
            <meshPhysicalMaterial 
                color={currentColor}
                emissive={currentColor}
                emissiveIntensity={4}
                roughness={0.1}
                metalness={1}
                clearcoat={1}
                reflectivity={1}
            />
            <pointLight ref={glowRef} color={currentColor} intensity={3} distance={15} />
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
