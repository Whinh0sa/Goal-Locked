/**
 * ConfettiExplosion — fires when `victory` becomes true.
 * 240 instanced rectangular pieces with random colours, velocities, and spin.
 * Gravity pulls them down; they fade while shrinking over ~4 seconds.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

const COUNT = 240;
const GRAVITY = -9.0;
const LIFETIME = 5.0;

interface Piece {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  color: THREE.Color;
  life: number;      // remaining seconds
  maxLife: number;
}

const COLORS = [
  '#ff3b3b', '#ff8c00', '#ffd700', '#32cd32',
  '#00bfff', '#bf5fff', '#ff69b4', '#ffffff',
];

function mkPiece(): Piece {
  const angle  = Math.random() * Math.PI * 2;
  const speed  = 8 + Math.random() * 18;
  const rise   = 6 + Math.random() * 12;
  const life   = 2.5 + Math.random() * 2.5;
  return {
    pos:     new THREE.Vector3((Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4),
    vel:     new THREE.Vector3(Math.cos(angle) * speed, rise, Math.sin(angle) * speed),
    spin:    new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
    ),
    rot:     new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0),
    color:   new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]),
    life,
    maxLife: life,
  };
}

export const ConfettiExplosion = () => {
  const victory = useGameStore(s => s.victory);
  const meshRef  = useRef<THREE.InstancedMesh>(null!);
  const pieces   = useRef<Piece[]>([]);
  const active   = useRef(false);
  const dummy    = useRef(new THREE.Object3D());

  // Spawn burst on victory
  useEffect(() => {
    if (!victory) return;
    active.current = true;
    pieces.current = Array.from({ length: COUNT }, mkPiece);
  }, [victory]);

  useFrame((_, delta) => {
    if (!active.current || !meshRef.current) return;

    let anyAlive = false;
    pieces.current.forEach((p, i) => {
      if (p.life <= 0) {
        // Hide dead pieces
        dummy.current.scale.setScalar(0);
        dummy.current.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.current.matrix);
        return;
      }
      anyAlive = true;
      p.life -= delta;

      // Physics
      p.vel.y += GRAVITY * delta;
      p.pos.addScaledVector(p.vel, delta);
      p.rot.x += p.spin.x * delta;
      p.rot.y += p.spin.y * delta;
      p.rot.z += p.spin.z * delta;

      const progress = p.life / p.maxLife; // 1→0
      const scale    = 0.08 + 0.12 * progress;

      dummy.current.position.copy(p.pos);
      dummy.current.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      dummy.current.scale.setScalar(scale);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
      meshRef.current.setColorAt(i, p.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    if (!anyAlive) active.current = false;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <boxGeometry args={[1, 0.5, 0.05]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
};
