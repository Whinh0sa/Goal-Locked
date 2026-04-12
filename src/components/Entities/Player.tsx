import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere, useRaycastVehicle } from '@react-three/cannon';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { Box, Cylinder, Sphere } from '@react-three/drei';

export const Player = () => {
  const { gameStarted } = useGameStore();
  const [ref, api] = useSphere(() => ({
    mass: 10,
    position: [0, 1, 10],
    args: [0.8],
    fixedRotation: true,
    material: { friction: 0.1, restitution: 0 }
  }));

  const meshRef = useRef<THREE.Group>(null!);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  // Movement Logic
  useFrame((state) => {
    if (!gameStarted) return;

    const velocity = 15;
    const impulse = new THREE.Vector3(0, 0, 0);
    
    if (keys['w'] || keys['ArrowUp']) impulse.z -= velocity;
    if (keys['s'] || keys['ArrowDown']) impulse.z += velocity;
    if (keys['a'] || keys['ArrowLeft']) impulse.x -= velocity;
    if (keys['d'] || keys['ArrowRight']) impulse.x += velocity;

    if (impulse.length() > 0) {
      impulse.normalize().multiplyScalar(velocity);
      api.velocity.set(impulse.x, 0, impulse.z);
      
      // Tilt effect
      if (meshRef.current) {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, impulse.z * 0.02, 0.1);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -impulse.x * 0.02, 0.1);
      }
    } else {
      api.velocity.set(0, 0, 0);
      if (meshRef.current) {
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, 0.1);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
      }
    }

    // Space to kick (pulse)
    if (keys[' ']) {
      // Handled by GameManager or store, but let's add a visual cue
    }
  });

  // Event Listeners
  useState(() => {
    const handleDown = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: true }));
    const handleUp = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: false }));
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  });

  return (
    <group ref={ref as any}>
      {/* Tactical Mech Model */}
      <group ref={meshRef}>
        {/* Main Body */}
        <Box args={[1.2, 0.4, 1.2]} position={[0, 0.2, 0]} castShadow>
            <meshPhysicalMaterial color="#0a0a0c" roughness={0.2} metalness={0.8} clearcoat={1} />
        </Box>
        
        {/* Head/Sensor Array */}
        <Box args={[0.4, 0.2, 0.4]} position={[0, 0.5, 0]}>
            <meshPhysicalMaterial color="#1a1a1a" emissive="#FFBF00" emissiveIntensity={0.5} />
        </Box>

        {/* Tactical Shoulder Plates */}
        <Box args={[0.3, 0.2, 0.8]} position={[0.7, 0.3, 0]}>
            <meshStandardMaterial color="#222" metalness={1} />
        </Box>
        <Box args={[0.3, 0.2, 0.8]} position={[-0.7, 0.3, 0]}>
            <meshStandardMaterial color="#222" metalness={1} />
        </Box>

        {/* Under-Glow */}
        <pointLight position={[0, -0.5, 0]} color="#FFBF00" intensity={1} distance={3} />
        
        {/* Shield Thrusters (Back) */}
        <Cylinder args={[0.1, 0.1, 0.2]} position={[0.4, 0.1, 0.6]} rotation={[Math.PI/2, 0, 0]}>
            <meshBasicMaterial color="#FFBF00" />
        </Cylinder>
        <Cylinder args={[0.1, 0.1, 0.2]} position={[-0.4, 0.1, 0.6]} rotation={[Math.PI/2, 0, 0]}>
            <meshBasicMaterial color="#FFBF00" />
        </Cylinder>
      </group>

      {/* Bottom Ring Indicator */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.7, 0]}>
          <ringGeometry args={[1, 1.1, 32]} />
          <meshBasicMaterial color="#FFBF00" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};
