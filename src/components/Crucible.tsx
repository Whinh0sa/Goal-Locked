import React, { useMemo, useEffect } from 'react';
import { MeshReflectorMaterial, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';

export const Crucible = () => {
    const { world } = usePhysics();

    // Floor Physics Collider (Cylinder with thickness to prevent fall-through)
    useEffect(() => {
        const shape = new CANNON.Cylinder(25, 25, 1, 32);
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(0, -0.5, 0), // Positioned so top surface is at y:0
            shape
        });
        
        // Cannon Cylinders are oriented along the local Z-axis by default, 
        // we need to rotate it to align with the Y-axis.
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        body.quaternion.copy(quat);

        world.addBody(body);
        return () => world.removeBody(body);
    }, [world]);

    return (
        <group>
            {/* Arena Floor: Rain-Slicked Concrete */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <circleGeometry args={[25, 64]} />
                <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={1024}
                    mixBlur={1}
                    mixStrength={80}
                    roughness={0.05}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#080808"
                    metalness={0.9}
                    mirror={1}
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
    const { world } = usePhysics();
    const angle = (index / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 20;
    const z = Math.sin(angle) * 20;

    // Add static physics body for the wall
    useEffect(() => {
        const shape = new CANNON.Box(new CANNON.Vec3(0.1, 2, 6)); // Matching visual size
        const body = new CANNON.Body({
            mass: 0, // Static
            position: new CANNON.Vec3(x, 2, z),
            shape
        });
        
        // Rotate body to match visual rotation
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
        body.quaternion.copy(quat);

        world.addBody(body);
        return () => {
            world.removeBody(body);
        };
    }, [world, x, z, angle]);

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
        </group>
    );
};
