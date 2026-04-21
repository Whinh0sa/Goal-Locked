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
  const bodyRef = useRef<CANNON.Body>(null!);

  useEffect(() => {
    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(0.6),
        position: new CANNON.Vec3(0, 8, 0),
        linearDamping: 0.3,
        angularDamping: 0.5,
    });
    world.addBody(body);
    bodyRef.current = body;
    return () => world.removeBody(body);
  }, [world]);

  useFrame((state) => {
    if (!bodyRef.current) return;
    const body = bodyRef.current;
    const pos = body.position;

    // ── Ceiling Guard: ball must stay on the pitch ──────────────────
    if (pos.y > 10) {
      body.applyImpulse(new CANNON.Vec3(0, -30, 0), body.position);
    }

    // ── Tier scaling: each tier reduces damping 5% (ball gets slicker) ───
    const tierDamping = Math.max(0.1 - (tier - 1) * 0.005, 0.04);
    body.linearDamping  = tierDamping;
    body.angularDamping = tierDamping;

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
