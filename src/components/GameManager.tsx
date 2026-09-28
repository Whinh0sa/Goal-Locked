import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';
import { ARENA_RADIUS, GOALS, SLOW_MO_DIST } from '../constants';
import { triggerShake } from '../hooks/useCameraShake';
import { randomArenaPos } from '../utils';

export const GameManager = () => {
  const { world, setTimeScale } = usePhysics();
  const registerGoal = useGameStore(state => state.registerGoal);
  const eliminated = useGameStore(state => state.eliminated);
  const setImpactPosition = useGameStore(state => state.setImpactPosition);

  const isSlowMo = useRef(false);
  const lastImpactTime = useRef(0);
  const isProcessingGoal = useRef(false);
  const ballPosRef = useRef(new THREE.Vector3());
  const impulseRef = useRef(new CANNON.Vec3());

  // Goal locations — computed once from shared constants
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

  // Wire up collision particles: fire whenever the ball hits any physics body
  // We attach the listener once after the physics world is available
  useEffect(() => {
    const handleCollision = (event: any) => {
      // O(1) cached lookup — no linear scan
      const ballBody = useGameStore.getState().ballBodyRef;
      if (!ballBody) return;
      // Only trigger if the ball is involved in this collision
      const body = event.target as CANNON.Body;
      if (body !== ballBody) return;

      const now = performance.now();
      // Throttle to at most one burst every 250ms to avoid spam
      if (now - lastImpactTime.current < 250) return;
      lastImpactTime.current = now;

      const vel = ballBody.velocity.length();
      if (vel < 4) return; // Only fire on meaningful impacts

      const pos = ballBody.position;
      const { lastStriker } = useGameStore.getState();
      
      // Reactive Possession Color Logic
      let impactColor = '#FF8C00'; // Neutral Gold
      if (lastStriker === 0) impactColor = '#32CD32'; // Player Neon Lime
      else if (lastStriker !== null && lastStriker > 0) impactColor = '#FF0033'; // Bot Hostile Red

      setImpactPosition([pos.x, pos.y, pos.z], vel, impactColor);
    };

    // Listen on every body added to the world (ball body added asynchronously)
    const addBodyListener = () => {
      world.bodies.forEach(b => {
        b.removeEventListener('collide', handleCollision);
        b.addEventListener('collide', handleCollision);
      });
    };

    world.addEventListener('addBody', addBodyListener);
    addBodyListener(); // Catch bodies already present

    return () => {
      world.removeEventListener('addBody', addBodyListener);
      world.bodies.forEach(b => b.removeEventListener('collide', handleCollision));
    };
  }, [world, setImpactPosition]);

  useFrame(() => {
    // O(1) cached lookup — no linear scan
    const ballBody = useGameStore.getState().ballBodyRef;
    if (!ballBody) return;

    const ballPos = ballPosRef.current.copy(ballBody.position as any);
    const { currentRadius } = useGameStore.getState();

    // --- Containment Field: hard border impulse ---
    const distFromCenterSq = ballPos.x ** 2 + ballPos.z ** 2;
    const boundarySq = (currentRadius + 1) ** 2;
    if (distFromCenterSq > boundarySq) {
      impulseRef.current.set(-ballPos.x * 2, 0, -ballPos.z * 2);
      ballBody.applyImpulse(
        impulseRef.current,
        ballBody.position,
      );
    }

    // --- Slow-mo Focus Logic ---
    let nearGoal = false;
    const slowMoDistSq = SLOW_MO_DIST * SLOW_MO_DIST;
    goalPositions.forEach((g, i) => {
        if (eliminated[i]) return;
        if (ballPos.distanceToSquared(g) < slowMoDistSq) nearGoal = true;
    });

    if (nearGoal && !isSlowMo.current) {
        isSlowMo.current = true;
        setTimeScale(0.2);
    } else if (!nearGoal && isSlowMo.current) {
        isSlowMo.current = false;
        setTimeScale(1.0);
    }

    // --- Goal Detection (dynamic radius + precise post arc + height check) ---
    // Height guard: ball must be below post height (y < 3.0) to count
    const currentRadiusSq = currentRadius * currentRadius;
    if (distFromCenterSq > currentRadiusSq && ballPos.y < 3.0 && !isProcessingGoal.current) {
        const ballAngle = Math.atan2(ballPos.z, ballPos.x);
        const angleStep = (Math.PI * 2) / GOALS;

        let hitGoalIdx = -1;
        for (let i = 0; i < GOALS; i++) {
            if (eliminated[i]) continue;

            const goalAngle = i * angleStep;
            // Shortest angular distance, robust to ±π wrap
            const diff = Math.abs(
                ((ballAngle - goalAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
            );

            if (diff < 0.2) {
                hitGoalIdx = i;
                break;
            }
        }

        if (hitGoalIdx !== -1) {
            isProcessingGoal.current = true;
            registerGoal(hitGoalIdx);

            // ── Hit-Stop: 150ms anime-impact freeze ─────────────────
            setTimeScale(0.01);
            isSlowMo.current = false;
            triggerShake(1.5);  // Heavy camera trauma
            setTimeout(() => {
                setTimeScale(1.0);
            }, 150);

            // Re-centre ball after freeze
            setTimeout(() => {
                const currentRadius = useGameStore.getState().currentRadius;
                const [rx, rz] = randomArenaPos(currentRadius, 5, 0);
                ballBody.position.set(rx, 5, rz);
                ballBody.velocity.set(0, 0, 0);
                ballBody.angularVelocity.set(0, 0, 0);
                isProcessingGoal.current = false;
            }, 650);
        }
    }
  });

  return null;
};
