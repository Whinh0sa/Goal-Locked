import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';

const ARENA_RADIUS = 20;
const GOALS = 8;
const SLOW_MO_DIST = 5.0;

export const GameManager = () => {
  const { world, setTimeScale } = usePhysics();
  const registerGoal = useGameStore(state => state.registerGoal);
  const eliminated = useGameStore(state => state.eliminated);
  
  const isSlowMo = useRef(false);

  // Goal locations
  const goalPositions = useMemo(() => {
    const pos = [];
    const angleStep = (Math.PI * 2) / GOALS;
    for (let i = 0; i < GOALS; i++) {
      const angle = i * angleStep;
      pos.push(new THREE.Vector3(
        Math.cos(angle) * ARENA_RADIUS,
        1,
        Math.sin(angle) * ARENA_RADIUS
      ));
    }
    return pos;
  }, []);

  useFrame(() => {
    const ballBody = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
    if (!ballBody) return;

    const ballPos = new THREE.Vector3().copy(ballBody.position as any);
    
    // --- Slow-mo Logic ---
    let nearGoal = false;
    goalPositions.forEach((g, i) => {
        if (eliminated[i]) return;
        if (ballPos.distanceTo(g) < SLOW_MO_DIST) nearGoal = true;
    });

    if (nearGoal && !isSlowMo.current) {
        isSlowMo.current = true;
        setTimeScale(0.2); // Slow down time
    } else if (!nearGoal && isSlowMo.current) {
        isSlowMo.current = false;
        setTimeScale(1.0); // Resume normal time
    }

    // --- Goal Detection ---
    const distFromCenter = Math.sqrt(ballPos.x**2 + ballPos.z**2);
    if (distFromCenter > ARENA_RADIUS + 0.3) {
        // Calculate which goal sector
        const angle = Math.atan2(ballPos.z, ballPos.x);
        const normAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        const goalIdx = (Math.round((normAngle / (Math.PI * 2)) * GOALS)) % GOALS;
        
        if (!eliminated[goalIdx]) {
            registerGoal(goalIdx);
            setTimeScale(1.0); // Restore time
            isSlowMo.current = false;
            
            // Re-center ball after a delay
            setTimeout(() => {
                ballBody.position.set(0, 5, 0);
                ballBody.velocity.set(0, 0, 0);
                ballBody.angularVelocity.set(0, 0, 0);
            }, 500);
        } else {
             // Ricochet off locked wall (handled by physics, but safety reset if it somehow glitched out)
             if (distFromCenter > ARENA_RADIUS + 1.0) {
                ballBody.position.set(0, 5, 0);
             }
        }
    }
  });

  return null;
};
