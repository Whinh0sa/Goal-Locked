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

  // Native Cannon-es Setup
  const bodyRef = useRef<CANNON.Body>(null!);

  useEffect(() => {
    const radius = 0.6;
    const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(0, 5, 0),
        linearDamping: 0.1,
        angularDamping: 0.1,
    });
    
    world.addBody(body);
    bodyRef.current = body;

    return () => {
        world.removeBody(body);
    };
  }, [world]);

  useFrame((state) => {
    if (!bodyRef.current) return;
    
    // Sync position
    const pos = bodyRef.current.position;
    groupRef.current.position.set(pos.x, pos.y, pos.z);
    
    // Sync rotation
    const quat = bodyRef.current.quaternion;
    groupRef.current.quaternion.set(quat.x, quat.y, quat.z, quat.w);

    // Sync to store
    updateBallPosition([pos.x, pos.y, pos.z]);
    
    const time = state.clock.getElapsedTime();
    
    if (ballMesh.current) {
        const pulse = Math.sin(time * 10) * 0.1 + 1;
        ballMesh.current.scale.set(pulse, pulse, pulse);
        (ballMesh.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2 + Math.sin(time * 20) * 1.5;
    }

    if (glowRef.current) {
        glowRef.current.intensity = 1.5 + Math.sin(time * 15) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <Trail
        width={1.5}
        length={4}
        color={new THREE.Color('#FFBF00')}
        attenuation={(t) => t * t}
      >
        <mesh ref={ballMesh} castShadow>
            <icosahedronGeometry args={[0.6, 3]} />
            <meshPhysicalMaterial 
                color="#111"
                emissive="#FFBF00"
                emissiveIntensity={2}
                roughness={0.1}
                metalness={1}
                clearcoat={1}
            />
            <pointLight ref={glowRef} color="#FFBF00" intensity={2} distance={10} />
        </mesh>
      </Trail>

      <mesh>
          <icosahedronGeometry args={[0.3, 2]} />
          <meshBasicMaterial color="#FFBF00" />
      </mesh>

      <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[0.8, 0.85, 32]} />
          <meshBasicMaterial color="#FFBF00" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
