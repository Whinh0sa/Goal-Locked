import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

const PARTICLE_COUNT = 100;
const PARTICLE_LIFETIME = 0.8; // seconds

interface Particle {
  t: number;
  speed: number;
  dir: THREE.Vector3;
  pos: THREE.Vector3;
  active: boolean;
}

export function CollisionParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const impactPosition = useGameStore(state => state.impactPosition);
  const setImpactPosition = useGameStore(state => state.setImpactPosition);

  const particles = useMemo<Particle[]>(() => {
    const temp: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      temp.push({
        t: PARTICLE_LIFETIME, // start as expired (inactive)
        speed: 0.1 + Math.random() * 0.5,
        dir: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() * 0.5 + 0.3, // bias upward
          Math.random() - 0.5
        ).normalize(),
        pos: new THREE.Vector3(0, -100, 0), // hidden
        active: false,
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // FIX: watch impactPosition from the store and burst all particles at that point
  useEffect(() => {
    if (!impactPosition) return;
    const [ix, iy, iz] = impactPosition;
    particles.forEach(p => {
      p.active = true;
      p.t = 0;
      p.pos.set(ix, iy, iz);
      p.dir.set(
        Math.random() - 0.5,
        Math.random() * 0.5 + 0.3,
        Math.random() - 0.5
      ).normalize();
      p.speed = 4 + Math.random() * 6;
    });
    // Clear the trigger so the same position doesn't re-fire
    setImpactPosition(null);
  }, [impactPosition, particles, setImpactPosition]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      if (!p.active) {
        // Keep hidden
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        return;
      }

      p.t += delta;
      p.pos.addScaledVector(p.dir, p.speed * delta);

      const life = Math.max(0, 1 - p.t / PARTICLE_LIFETIME);
      if (life <= 0) {
        p.active = false;
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
      } else {
        dummy.position.copy(p.pos);
        dummy.scale.setScalar(life * 0.3);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#FFBF00" />
    </instancedMesh>
  );
}
