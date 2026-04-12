import React, { useMemo } from 'react';
import { MeshReflectorMaterial, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useSphere } from '@react-three/cannon'; // Keep cannon-es bodies for walls but visual logic is premium

export const Crucible = () => {
    return (
        <group>
            {/* Arena Floor: Rain-Slicked Concrete */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <circleGeometry args={[25, 64]} />
                <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={1024}
                    mixBlur={1}
                    mixStrength={60}
                    roughness={1}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#050505"
                    metalness={0.5}
                    mirror={0}
                />
            </mesh>

            {/* Perimeter Light Ring: Tactical Teal */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
                <ringGeometry args={[23, 23.5, 128]} />
                <meshBasicMaterial color="#008080" transparent opacity={0.6} />
            </mesh>

            {/* Boundary Wall Segments (Force Fields) */}
            {Array.from({ length: 8 }).map((_, i) => (
                <BoundarySegment key={i} index={i} />
            ))}
        </group>
    );
};

const BoundarySegment = ({ index }: { index: number }) => {
    const angle = (index / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 20;
    const z = Math.sin(angle) * 20;

    return (
        <group position={[x, 2, z]} rotation-y={-angle}>
             {/* Visual Support Frame */}
             <mesh position={[0, -2, 0]}>
                <boxGeometry args={[0.4, 0.2, 8]} />
                <meshPhysicalMaterial color="#1a1c2c" metalness={1} roughness={0.2} />
             </mesh>

            {/* Force Field Barrier: Transmission Material */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.2, 4, 12]} />
                <MeshTransmissionMaterial 
                    backside
                    samples={8}
                    thickness={0.5}
                    roughness={0.1}
                    transmission={1}
                    ior={1.2}
                    chromaticAberration={0.06}
                    anisotropy={0.1}
                    distortion={0.1}
                    color="#008080"
                />
            </mesh>

            {/* Goal Number Decal / Label */}
            <group position={[0.2, 1, 0]} rotation-y={Math.PI / 2}>
                 <mesh>
                    <planeGeometry args={[2, 0.8]} />
                    <meshBasicMaterial color="#000" transparent opacity={0.7} />
                 </mesh>
            </group>
        </group>
    );
};
