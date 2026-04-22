import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';
import { ARENA_RADIUS, GOALS, SLOW_MO_DIST } from '../constants';
import { triggerShake } from '../hooks/useCameraShake';

export const GameManager = () => {
  const { world, setTimeScale } = usePhysics();
  const registerGoal = useGameStore(state => state.registerGoal);
  const eliminated = useGameStore(state => state.eliminated);
  const setImpactPosition = useGameStore(state => state.setImpactPosition);

  const isSlowMo = useRef(false);
  const lastImpactTime = useRef(0);

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
      const ballBody = world.bodies.find(b => b.mass === 5 && b.shapes[0] instanceof CANNON.Sphere);
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
      // S = √(vx² + vy² + vz²) — AudioManager scales volume/pitch to this
      setImpactPosition([pos.x, pos.y, pos.z], vel);
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
    const ballBody = world.bodies.find(b => b.mass === 5 && b.shapes[0] instanceof CANNON.Sphere);
    if (!ballBody) return;

    const ballPos = new THREE.Vector3().copy(ballBody.position as any);
    const { currentRadius } = useGameStore.getState();

    // --- Containment Field: hard border impulse ---
    const distFromCenter = Math.sqrt(ballPos.x ** 2 + ballPos.z ** 2);
    if (distFromCenter > currentRadius + 1) {
      ballBody.applyImpulse(
        new CANNON.Vec3(-ballPos.x * 2, 0, -ballPos.z * 2),
        ballBody.position,
      );
    }

    // --- Slow-mo Focus Logic ---
    let nearGoal = false;
    goalPositions.forEach((g, i) => {
        if (eliminated[i]) return;
        if (ballPos.distanceTo(g) < SLOW_MO_DIST) nearGoal = true;
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
    if (distFromCenter > currentRadius && ballPos.y < 3.0) {
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
            registerGoal(hitGoalIdx);

            // ── Hit-Stop: 150ms anime-impact freeze ─────────────────
            setTimeScale(0.01);
            isSlowMo.current = false;
            triggerShake(1.5);  // Heavy camera trauma
            setTimeout(() => {
                setTimeScale(1.0);
            }, 150);

            // Re-centre ball after freeze — random offset within 5u radius
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const r     = Math.random() * 4;
                ballBody.position.set(Math.cos(angle) * r, 5, Math.sin(angle) * r);
                ballBody.velocity.set(0, 0, 0);
                ballBody.angularVelocity.set(0, 0, 0);
            }, 650);
        }
    }
  });

  return null;
};
