import React, { useEffect, useRef, useState } from 'react';
import { MeshReflectorMaterial, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';
import { ARENA_RADIUS, GOALS } from '../constants';

const INITIAL_DISPLAY_RADIUS = 25;
const LERP_SPEED = 0.04;

export const Crucible = () => {
    const { world } = usePhysics();
    const floorRef = useRef<THREE.Mesh>(null!);

    // Smooth radius tracked in a ref — updates every frame via lerp
    const displayRadius = useRef(INITIAL_DISPLAY_RADIUS);

    // Thick static floor — impossible to tunnel through
    useEffect(() => {
        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(100, 10, 100)),
            position: new CANNON.Vec3(0, -10, 0),
        });
        world.addBody(body);
        return () => world.removeBody(body);
    }, [world]);

    // Every frame: lerp displayRadius toward store target, then directly
    // update the floor geometry so the mesh stays a perfect circle (no oval).
    useFrame(() => {
        const target = useGameStore.getState().currentRadius;
        const prev = displayRadius.current;
        const next = prev + (target - prev) * LERP_SPEED;
        displayRadius.current = next;

        // Mutate the circle geometry's radius directly — no scale distortion.
        if (floorRef.current) {
            const geo = floorRef.current.geometry as THREE.CircleGeometry;
            if (geo && Math.abs(geo.parameters.radius - next) > 0.05) {
                const newGeo = new THREE.CircleGeometry(next, 64);
                floorRef.current.geometry.dispose();
                floorRef.current.geometry = newGeo;
            }
        }
    });

    return (
        <group>
            {/* Arena Floor — geometry updated directly, no scale.set */}
            <mesh ref={floorRef} rotation-x={-Math.PI / 2} receiveShadow>
                <circleGeometry args={[INITIAL_DISPLAY_RADIUS, 64]} />
                <MeshReflectorMaterial
                    blur={[500, 100]}
                    resolution={256}
                    mixBlur={1}
                    mixStrength={40}
                    roughness={0.2}
                    depthScale={1.0}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#111"
                    metalness={0.6}
                    mirror={0.5}
                />
            </mesh>

            {/* Perimeter Light Ring */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
                <ringGeometry args={[23, 23.5, 128]} />
                <meshBasicMaterial color="#008080" transparent opacity={0.6} />
            </mesh>

            {/* Boundary Segments */}
            {Array.from({ length: GOALS }).map((_, i) => (
                <BoundarySegment key={i} index={i} sharedRadius={displayRadius} />
            ))}
        </group>
    );
};

// Each segment reads the shared lerped radius ref and positions itself at
// cos(angle) * radius, sin(angle) * radius — uniform in all directions.
const BoundarySegment = ({
    index,
    sharedRadius,
}: {
    index: number;
    sharedRadius: React.MutableRefObject<number>;
    key?: React.Key;
}) => {
    const { world } = usePhysics();
    const isEliminated = useGameStore(state => state.eliminated[index]);
    const groupRef = useRef<THREE.Group>(null!);
    const bodyRef  = useRef<CANNON.Body | null>(null);

    const isPlayerGoal = index === 0;
    const goalColor  = isPlayerGoal ? '#9126EF' : '#FF4400';
    const labelColor = isPlayerGoal ? '#32CD32' : '#FF4400';
    const angle = (index / GOALS) * Math.PI * 2;

    // Spawn physics body as Back-Wall
    useEffect(() => {
        const r = ARENA_RADIUS;
        const bx = Math.cos(angle) * (r + 1.5);
        const bz = Math.sin(angle) * (r + 1.5);

        // Thicker, taller Back-Wall safety net
        const shape = new CANNON.Box(new CANNON.Vec3(0.6, 5, 7));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(bx, 2, bz),
            shape,
        });
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
        body.quaternion.copy(quat);
        world.addBody(body);
        bodyRef.current = body;
        return () => {
            world.removeBody(body);
            bodyRef.current = null;
        };
    }, [world, angle]);

    // Remove physics when eliminated (opens real gap)
    useEffect(() => {
        if (isEliminated && bodyRef.current) {
            world.removeBody(bodyRef.current);
            bodyRef.current = null;
        }
    }, [isEliminated, world]);

    // Every frame: set position to cos(angle) * sharedRadius, sin(angle) * sharedRadius
    // — identical radius for X and Z so it's always a circle, never an oval.
    useFrame(() => {
        if (!groupRef.current) return;
        const r = sharedRadius.current;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        groupRef.current.position.set(x, 2, z);

        // Slide physics body along with visual, but keep it pushing from behind
        if (bodyRef.current) {
            const bx = Math.cos(angle) * (r + 1.5);
            const bz = Math.sin(angle) * (r + 1.5);
            bodyRef.current.position.set(bx, 2, bz);
            bodyRef.current.velocity.set(0, 0, 0);
        }
    });

    if (isEliminated) return null;

    return (
        <group ref={groupRef} rotation-y={-angle}>
            {/* Base frame */}
            <mesh position={[0, -2, 0]}>
                <boxGeometry args={[0.4, 0.2, 8]} />
                <meshStandardMaterial color={goalColor} emissive={goalColor} emissiveIntensity={1} metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Goal post */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.3, 4, 12]} />
                <meshStandardMaterial
                    color={goalColor}
                    emissive={goalColor}
                    emissiveIntensity={2}
                    transparent
                    opacity={0.35}
                    metalness={0.5}
                    roughness={0.3}
                />
            </mesh>

            <pointLight color={goalColor} intensity={2} distance={8} position={[0, 1, 0]} />

            {isPlayerGoal && (
                <Text
                    position={[0, 3.5, 0]}
                    fontSize={0.55}
                    color={labelColor}
                    anchorX="center"
                    anchorY="middle"
                >
                    YOUR GOAL
                </Text>
            )}
        </group>
    );
};
