import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';

export const ExitPortal = () => {
    const meshRef = useRef<THREE.Mesh>(null!);
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.z += delta * 2;
        }
    });

    const handleExit = () => {
        window.location.href = 'https://vibejam.cc/portal/2026?username=Whinhosa&color=32CD32&ref=goal-locked.vercel.app';
    };

    return (
        <group position={[0, 10, -15]} onClick={handleExit}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* The portal ring */}
                <mesh ref={meshRef}>
                    <torusGeometry args={[2.5, 0.2, 16, 100]} />
                    <meshStandardMaterial 
                        color="#00ffff" 
                        emissive="#00ffff" 
                        emissiveIntensity={2} 
                        roughness={0.1}
                        metalness={0.8}
                        toneMapped={false} 
                    />
                </mesh>

                {/* Inner glowing portal effect */}
                <mesh>
                    <cylinderGeometry args={[2.4, 2.4, 0.1, 32]} />
                    <meshBasicMaterial color="#000000" opacity={0.6} transparent />
                </mesh>

                {/* Portal Label */}
                <Text
                    position={[0, -3.5, 0]}
                    fontSize={0.8}
                    color="#00ffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.1}
                    fontStyle="italic"
                >
                    ENTER VIBEVERSE
                </Text>
            </Float>
            <pointLight color="#00ffff" intensity={2} distance={20} />
        </group>
    );
};
