import { useMemo } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const useAI = (id: number, goalPos: THREE.Vector3, api: CANNON.Body | null) => {
  return useMemo(() => ({
    update: (ballPos: [number, number, number]) => {
      if (!api || !api.velocity) return; // Lifecycle Guard

      const ballVector = new THREE.Vector3(...ballPos);
      const botPos = new THREE.Vector3().copy(api.position as any);
      
      const distanceToBall = ballVector.distanceTo(goalPos);
      const isDefending = distanceToBall > 10;
      
      const target = isDefending ? goalPos : ballVector;
      const direction = new THREE.Vector3().subVectors(target, botPos).normalize();
      
      // Basic movement towards target
      const speed = 12;
      api.velocity.set(direction.x * speed, api.velocity.y, direction.z * speed);
    }
  }), [id, goalPos, api]);
};
