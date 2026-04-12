import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 100;

export function CollisionParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      temp.push({
        t: 0,
        speed: 0.1 + Math.random() * 0.5,
        dir: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        pos: new THREE.Vector3(0, -100, 0), // Start hidden
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_state, delta) => {
    particles.forEach((p, i) => {
      p.t += delta * p.speed;
      p.pos.addScaledVector(p.dir, p.speed);
      
      const scale = Math.max(0, 1 - p.t * 2);
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(scale * 0.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Export a way to trigger particles (this would be better in a store or context)
  // For now, we'll keep it simple and just have them ambiently or triggered by global state
  // In a real implementation, you'd use a store to set impact position.

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#FFBF00" />
    </instancedMesh>
  );
}
