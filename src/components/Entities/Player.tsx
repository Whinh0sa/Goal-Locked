import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Box, Cylinder, Text, Html } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';

export const Player = () => {
  const { world } = usePhysics();
  const { gameStarted } = useGameStore();
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<CANNON.Body>(null!);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const body = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(0.8),
        position: new CANNON.Vec3(0, 1, 10),
        fixedRotation: true,
        linearDamping: 0.5,
    });
    world.addBody(body);
    bodyRef.current = body;
    const handleDown = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: true }));
    const handleUp = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: false }));
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
        world.removeBody(body);
        window.removeEventListener('keydown', handleDown);
        window.removeEventListener('keyup', handleUp);
    };
  }, [world]);

  useFrame(() => {
    if (!bodyRef.current || !gameStarted) return;
    const moveVelocity = 28;
    const force = new THREE.Vector3(0, 0, 0);
    if (keys['w'] || keys['ArrowUp']) force.z -= 1;
    if (keys['s'] || keys['ArrowDown']) force.z += 1;
    if (keys['a'] || keys['ArrowLeft']) force.x -= 1;
    if (keys['d'] || keys['ArrowRight']) force.x += 1;

    if (force.length() > 0) {
        force.normalize().multiplyScalar(moveVelocity);
        bodyRef.current.velocity.x = force.x;
        bodyRef.current.velocity.z = force.z;
        if (meshRef.current) {
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, force.z * 0.015, 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -force.x * 0.015, 0.1);
        }
    } else {
        bodyRef.current.velocity.x *= 0.9;
        bodyRef.current.velocity.z *= 0.9;
        if (meshRef.current) {
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
        }
    }
    const pos = bodyRef.current.position;
    groupRef.current.position.set(pos.x, pos.y, pos.z);
  });

  return (
    <group ref={groupRef}>
      {/* Diegetic Label */}
      <Html position={[0, 1.5, 0]} center transform scale={0.5} distanceFactor={10}>
         <div className="px-4 py-1 border-l-4 border-teal-500 bg-black/80 backdrop-blur-md text-teal-400 font-mono text-[10px] tracking-widest whitespace-nowrap uppercase">
             UNIT_PLAYER // ACTIVE
         </div>
      </Html>

      <group ref={meshRef}>
        {/* Gunmetal PBR Body */}
        <Box args={[1.2, 0.4, 1.2]} position={[0, 0.2, 0]} castShadow>
            <meshPhysicalMaterial color="#1a1c2c" roughness={0.2} metalness={0.8} clearcoat={1} />
        </Box>
        <Box args={[0.4, 0.2, 0.4]} position={[0, 0.5, 0]}>
            <meshPhysicalMaterial color="#008080" emissive="#008080" emissiveIntensity={1} />
        </Box>
        <Box args={[0.3, 0.2, 0.8]} position={[0.7, 0.3, 0]}>
            <meshPhysicalMaterial color="#050505" roughness={0} metalness={1} />
        </Box>
        <Box args={[0.3, 0.2, 0.8]} position={[-0.7, 0.3, 0]}>
            <meshPhysicalMaterial color="#050505" roughness={0} metalness={1} />
        </Box>
        <pointLight position={[0, -0.5, 0]} color="#008080" intensity={2} distance={5} />
      </group>
    </group>
  );
};
