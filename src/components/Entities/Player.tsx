import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';

const PLAYER_RADIUS = 1;
const PULSE_FORCE = 15;
const PUSH_DISTANCE = 3.5;

export const Player = () => {
  const { world } = usePhysics();
  const meshRef = useRef<THREE.Group>(null);
  const pulseMeshRef = useRef<THREE.Mesh>(null);
  
  const moveSpeed = 12;
  const keys = useRef<Record<string, boolean>>({});
  
  const body = useMemo(() => {
    const b = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(PLAYER_RADIUS),
      fixedRotation: true,
      linearDamping: 0.9,
    });
    b.position.set(0, 1, 15);
    return b;
  }, []);

  useEffect(() => {
    world.addBody(body);
    const handleDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      world.removeBody(body);
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [world, body]);

  useFrame((state, delta) => {
    if (!body) return;

    // Movement logic
    const moveDir = new THREE.Vector3();
    if (keys.current['KeyW']) moveDir.z -= 1;
    if (keys.current['KeyS']) moveDir.z += 1;
    if (keys.current['KeyA']) moveDir.x -= 1;
    if (keys.current['KeyD']) moveDir.x += 1;

    if (moveDir.length() > 0) {
      moveDir.normalize();
      body.applyForce(new CANNON.Vec3(moveDir.x * moveSpeed * 50, 0, moveDir.z * moveSpeed * 50), body.position);
    }

    // Pulse Logic
    if (keys.current['Space']) {
      // Find ball in world
      const ballBody = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
      if (ballBody) {
        const dist = body.position.distanceTo(ballBody.position);
        if (dist < PUSH_DISTANCE) {
          const dir = ballBody.position.vsub(body.position).unit();
          ballBody.applyImpulse(dir.scale(PULSE_FORCE), ballBody.position);
          
          // Visual Pulse
          if (pulseMeshRef.current) {
            pulseMeshRef.current.scale.set(1, 1, 1);
            pulseMeshRef.current.visible = true;
          }
        }
      }
      keys.current['Space'] = false; // Single pulse
    }

    if (pulseMeshRef.current && pulseMeshRef.current.visible) {
      pulseMeshRef.current.scale.addScalar(0.2);
      (pulseMeshRef.current.material as THREE.MeshBasicMaterial).opacity -= 0.05;
      if ((pulseMeshRef.current.material as THREE.MeshBasicMaterial).opacity <= 0) {
        pulseMeshRef.current.visible = false;
        (pulseMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5;
      }
    }

    // Sync mesh
    if (meshRef.current) {
      meshRef.current.position.copy(body.position as any);
      // Face movement direction
      if (moveDir.length() > 0) {
        const targetRot = Math.atan2(moveDir.x, moveDir.z);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot, 0.1);
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Tactical Player Body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.7, 0.8, 2, 6]} />
        <meshStandardMaterial color="#222" roughness={0.1} metalness={0.8} />
      </mesh>
      
      {/* Visor */}
      <mesh position={[0, 0.5, 0.5]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshBasicMaterial color="#FFBF00" />
      </mesh>
      
      {/* Pulse Effect */}
      <mesh ref={pulseMeshRef} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.5, 3.5, 32]} />
          <meshBasicMaterial color="#FFBF00" transparent opacity={0.5} />
      </mesh>
    </group>
  );
};
