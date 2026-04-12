import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import * as THREE from 'three';
import { Trail } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';

export const Ball = () => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [0, 5, 0],
    args: [0.6],
    material: { restitution: 0.8, friction: 0.1 }
  }));

  const ballMesh = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const updateBallPosition = useGameStore(state => state.updateBallPosition);

  useFrame((state) => {
    // Sync position to store for bots
    if (ref.current) {
        const pos = ref.current.position;
        updateBallPosition([pos.x, pos.y, pos.z]);
    }
    
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
    <group ref={ref as any}>
      <Trail
        width={1.5}
        length={4}
        color={new THREE.Color('#FFBF00')}
        attenuation={(t) => t * t}
      >
        <mesh ref={ballMesh} castShadow>
            <icosahedronGeometry args={[0.6, 3]} />
            <meshPhysicalMaterial 
                color="#050505"
                emissive="#FFBF00"
                emissiveIntensity={2}
                roughness={0.1}
                metalness={1}
                clearcoat={1}
                clearcoatRoughness={0}
                transmission={0.2}
                thickness={1}
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
