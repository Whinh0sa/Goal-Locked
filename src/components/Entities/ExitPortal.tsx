import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

interface ExitPortalProps {
    angle?: number;
    destinationUrl?: string;
}

const PORTAL_TRIGGER_RADIUS = 2.8; // world units

export const ExitPortal = ({ 
    angle = 0.111, 
    destinationUrl = 'https://vibejam.cc/portal/2026?username=Whinhosa&color=32CD32&ref=goal-locked.vercel.app' 
}: ExitPortalProps) => {
    const groupRef = useRef<THREE.Group>(null!);
    const meshRef  = useRef<THREE.Mesh>(null!);
    const triggered = useRef(false);

    useFrame((_, delta) => {
        const state = useGameStore.getState();
        const radius = state.currentRadius;

        // Keep portal flush with the shrinking wall
        const x = Math.cos(angle) * (radius - 0.5);
        const z = Math.sin(angle) * (radius - 0.5);

        if (groupRef.current) {
            groupRef.current.position.set(x, 2.5, z);
            groupRef.current.rotation.y = -angle + Math.PI / 2;
        }

        if (meshRef.current) {
            meshRef.current.rotation.z += delta * 1.5;
        }

        // Position-based proximity trigger (reliable vs. cannon isTrigger)
        if (!triggered.current && !state.eliminated[0]) {
            const [px, py, pz] = state.playerPosition;
            const dx = px - x;
            const dz = pz - z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < PORTAL_TRIGGER_RADIUS) {
                triggered.current = true;
                console.log('PORTAL TRIGGERED — EXITING TO VIBEVERSE');
                window.location.href = destinationUrl;
            }
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Torus Gateway */}
                <mesh ref={meshRef} scale={[0.1, 1, 1]}>
                    <torusGeometry args={[3, 0.25, 16, 100]} />
                    <meshStandardMaterial 
                        color="#00ffff" 
                        emissive="#00ffff" 
                        emissiveIntensity={3} 
                        roughness={0.1}
                        metalness={0.9}
                        toneMapped={false} 
                    />
                </mesh>

                {/* Event Horizon */}
                <mesh scale={[1, 1, 0.1]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[2.9, 2.9, 0.1, 32]} />
                    <meshBasicMaterial color="#00ffff" opacity={0.3} transparent />
                </mesh>

                {/* Portal Label */}
                <Text
                    position={[0, -4, 0]}
                    fontSize={0.7}
                    color="#00ffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.12}
                    fontStyle="italic"
                    outlineWidth={0.05}
                    outlineColor="#000"
                >
                    EXIT TO VIBEVERSE
                </Text>
            </Float>
            <pointLight color="#00ffff" intensity={5} distance={15} />
        </group>
    );
};
