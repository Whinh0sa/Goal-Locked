import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { PLAYER_BODY_TAG, ARENA_RADIUS } from '../../constants';

interface ExitPortalProps {
    angle?: number; // Target angle on the perimeter
    destinationUrl?: string;
}

export const ExitPortal = ({ 
    angle = 0.111, 
    destinationUrl = 'https://vibejam.cc/portal/2026?username=Whinhosa&color=32CD32&ref=goal-locked.vercel.app' 
}: ExitPortalProps) => {
    const { world } = usePhysics();
    const meshRef = useRef<THREE.Mesh>(null!);
    const groupRef = useRef<THREE.Group>(null!);
    const bodyRef = useRef<CANNON.Body | null>(null);

    // Create physics trigger volume (sensor)
    useEffect(() => {
        const shape = new CANNON.Box(new CANNON.Vec3(1, 3, 3));
        const body = new CANNON.Body({
            mass: 0,
            isTrigger: true, // sensor only
            shape,
        });

        body.addEventListener('collide', (e: any) => {
            if (e.body.userData?.isPlayer) {
                console.log('PORTAL TRIGGERED - EXITING TO VIBEVERSE');
                window.location.href = destinationUrl;
            }
        });

        world.addBody(body);
        bodyRef.current = body;

        return () => {
            world.removeBody(body);
            bodyRef.current = null;
        };
    }, [world, destinationUrl]);

    // Track boundary radius to stay flush with walls
    useFrame((state, delta) => {
        const radius = useGameStore.getState().currentRadius;
        
        // Position on perimeter
        const x = Math.cos(angle) * (radius - 0.2); // Slightly inside the wall
        const z = Math.sin(angle) * (radius - 0.2);
        
        if (groupRef.current) {
            groupRef.current.position.set(x, 2.5, z);
            groupRef.current.rotation.y = -angle + Math.PI / 2;
        }

        if (bodyRef.current) {
            bodyRef.current.position.set(x, 2.5, z);
            const quat = new CANNON.Quaternion();
            quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle + Math.PI / 2);
            bodyRef.current.quaternion.copy(quat);
        }

        if (meshRef.current) {
            meshRef.current.rotation.z += delta * 1.5;
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Torus Gateway - flattened as requested */}
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

                {/* Event Horizon effect */}
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
