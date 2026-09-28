import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import * as THREE from 'three';

export function GoalJuice() {
  const lastGoal = useGameStore(state => state.lastGoal);
  const particles = useRef<THREE.Points>(null!);
  const pulseActive = useRef(false);
  const pulseTimer = useRef(0);
  const count = 500;

  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 50;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, []);

  const velocities = React.useMemo(() => {
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        v[i * 3] = (Math.random() - 0.5) * 0.2;
        v[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        v[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    return v;
  }, []);

  // FIX: when a new goal fires, enable a 1.5s pulse window then stop
  useEffect(() => {
    if (lastGoal !== null) {
      pulseActive.current = true;
      pulseTimer.current = 0;
      if (particles.current) {
        particles.current.visible = true;
      }
    }
  }, [lastGoal]);

  useFrame((state, delta) => {
    if (!particles.current) return;

    const posAttr = particles.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
        posAttr.array[i * 3] += velocities[i * 3];
        posAttr.array[i * 3 + 1] += velocities[i * 3 + 1];
        posAttr.array[i * 3 + 2] += velocities[i * 3 + 2];

        // Wrap around
        if (Math.abs(posAttr.array[i * 3]) > 40) posAttr.array[i * 3] *= -0.9;
        if (Math.abs(posAttr.array[i * 3 + 1]) > 40) posAttr.array[i * 3 + 1] *= -0.9;
        if (Math.abs(posAttr.array[i * 3 + 2]) > 40) posAttr.array[i * 3 + 2] *= -0.9;
    }

    posAttr.needsUpdate = true;

    // Pulse scale for a fixed duration (1.5s) after each goal, then reset to 1
    if (pulseActive.current) {
      pulseTimer.current += delta;
      const time = state.clock.getElapsedTime();
      particles.current.scale.setScalar(1 + Math.sin(time * 20) * 0.2);
      if (pulseTimer.current > 1.5) {
        pulseActive.current = false;
        particles.current.scale.setScalar(1);
        particles.current.visible = false;
      }
    }
  });

  return (
    <points ref={particles} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#FFBF00"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
