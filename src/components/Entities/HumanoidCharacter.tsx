import React, { useEffect, useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface HumanoidCharacterProps {
  color?: string;
  velocityRef: React.RefObject<[number, number, number] | { x: number; y: number; z: number }>;
  scale?: number;
  isJuggernaut?: boolean;
}

const MODEL_PATH = '/models/soldier.glb';

function ModelRenderer({
  color,
  velocityRef,
  scale,
  isJuggernaut,
}: HumanoidCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(MODEL_PATH);

  // Clone scene & skeleton per instance using SkeletonUtils
  const clone = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);

  // Clone animation clips to hook into this cloned scene
  const { actions } = useAnimations(gltf.animations, groupRef);

  // Apply custom styling / accent colors to operative materials
  useEffect(() => {
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.roughness = 0.45;
          mat.metalness = 0.55;

          if (isJuggernaut) {
            mat.color = new THREE.Color('#ffaa00');
            mat.emissive = new THREE.Color('#ffaa00');
            mat.emissiveIntensity = 0.8;
          } else if (color) {
            const teamCol = new THREE.Color(color);
            mat.emissive = teamCol.clone().multiplyScalar(0.25);
            mat.emissiveIntensity = 0.5;
          }
          mesh.material = mat;
        }
      }
    });
  }, [clone, color, isJuggernaut]);

  // Manage Idle / Run animation blending and body orientation
  useEffect(() => {
    if (!actions) return;
    const idleAction = actions['Idle'] || actions['idle'] || actions['Walk'];
    const runAction = actions['Run'] || actions['run'];

    if (idleAction) {
      idleAction.reset().play();
      idleAction.setEffectiveWeight(1);
    }
    if (runAction) {
      runAction.reset().play();
      runAction.setEffectiveWeight(0);
    }

    return () => {
      idleAction?.stop();
      runAction?.stop();
    };
  }, [actions]);

  useFrame((_, delta) => {
    if (!groupRef.current || !actions) return;

    let vx = 0;
    let vz = 0;
    if (velocityRef.current) {
      if (Array.isArray(velocityRef.current)) {
        [vx, , vz] = velocityRef.current;
      } else {
        vx = velocityRef.current.x;
        vz = velocityRef.current.z;
      }
    }

    const speedSq = vx * vx + vz * vz;
    const isMoving = speedSq > 0.35;
    const idleAction = actions['Idle'] || actions['idle'] || actions['Walk'];
    const runAction = actions['Run'] || actions['run'];

    // Smooth animation cross-fading
    const fadeSpeed = 8 * delta;
    if (isMoving && runAction && idleAction) {
      const curRunWeight = runAction.getEffectiveWeight();
      runAction.setEffectiveWeight(Math.min(1, curRunWeight + fadeSpeed));
      idleAction.setEffectiveWeight(Math.max(0, 1 - (curRunWeight + fadeSpeed)));

      // Rotate model towards heading
      const angle = Math.atan2(vx, vz);
      let diff = angle - groupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, 12 * delta);
    } else if (runAction && idleAction) {
      const curRunWeight = runAction.getEffectiveWeight();
      runAction.setEffectiveWeight(Math.max(0, curRunWeight - fadeSpeed));
      idleAction.setEffectiveWeight(Math.min(1, 1 - (curRunWeight - fadeSpeed)));
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.9, 0]} scale={[scale, scale, scale]}>
      <primitive object={clone} />
    </group>
  );
}

export function HumanoidCharacter(props: HumanoidCharacterProps) {
  return (
    <Suspense fallback={null}>
      <ModelRenderer {...props} />
    </Suspense>
  );
}

useGLTF.preload(MODEL_PATH);
