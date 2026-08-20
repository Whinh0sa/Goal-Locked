/**
 * ScorchMarks — spawns temporary circular floor decals at high-velocity
 * ball impact points. Each mark fades out over 6 seconds.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

const MAX_MARKS = 12;
const MARK_LIFETIME = 6.0; // seconds before full fade

interface Mark {
  position: THREE.Vector3;
  birth: number;       // elapsed time at spawn
  scale: number;       // world-space radius of scorch
}

export const ScorchMarks = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const marksRef = useRef<Mark[]>([]);
  const elapsedRef = useRef(0);

  const impactPosition = useGameStore(s => s.impactPosition);
  const impactStrength = useGameStore(s => s.impactStrength);

  const dummy = useRef(new THREE.Object3D());
  const color  = useRef(new THREE.Color());

  // Spawn a new mark whenever impactPosition changes and is strong enough
  useEffect(() => {
    if (!impactPosition || impactStrength < 8) return;
    const scale = THREE.MathUtils.clamp(impactStrength / 15, 0.4, 2.5);
    marksRef.current.push({
      position: new THREE.Vector3(impactPosition[0], 0.01, impactPosition[2]),
      birth: elapsedRef.current,
      scale,
    });
    // Cap the pool — remove oldest first
    if (marksRef.current.length > MAX_MARKS) marksRef.current.shift();
  }, [impactPosition, impactStrength]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    elapsedRef.current += delta;
    const now = elapsedRef.current;

    // Update each instance: position + opacity as alpha encoded in scale
    marksRef.current.forEach((mark, i) => {
      const age    = now - mark.birth;
      const progress = Math.min(age / MARK_LIFETIME, 1); // 0→1
      const opacity  = 1 - progress;

      dummy.current.position.copy(mark.position);
      dummy.current.rotation.x = -Math.PI / 2;  // flat on floor
      dummy.current.scale.setScalar(mark.scale * (0.8 + progress * 0.5)); // grows slightly as it fades
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);

      // Encode fade into instance color alpha via r channel (used in shader)
      color.current.setRGB(opacity, opacity * 0.4, 0); // orange-to-dark fade
      meshRef.current.setColorAt(i, color.current);
    });

    // Hide unused slots
    for (let i = marksRef.current.length; i < MAX_MARKS; i++) {
      dummy.current.scale.setScalar(0);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    // Prune fully expired marks
    marksRef.current = marksRef.current.filter(m => now - m.birth < MARK_LIFETIME);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_MARKS]} renderOrder={1}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};
