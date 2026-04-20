import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Float } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS, GOALS } from '../../constants';

const BASE_SPEED = 14;
const POSSESSION_RADIUS = 2.2;   // distance to "have" the ball
const PASS_DISTANCE    = 15;     // units from target before preferring a pass
const PLAYER_BIAS      = 0.40;   // 40% chance to target player goal when in possession

type BotState = 'ATTACK' | 'DEFEND' | 'REPOSITION';

export const Bot = ({ id, goalPos }: { id: number; goalPos: THREE.Vector3 }) => {
  const { world } = usePhysics();
  const isEliminated = useGameStore(state => state.eliminated[id]);
  const groupRef   = useRef<THREE.Group>(null!);
  const bodyRef    = useRef<CANNON.Body | null>(null);

  // --- Randomised AI Profile (stable per bot instance) ---
  const profile = useMemo(() => ({
    aggression:    0.5 + Math.random() * 1.0,
    defendRadius:  5   + Math.random() * 7,
    noiseX: (Math.random() - 0.5) * 0.4,
    noiseZ: (Math.random() - 0.5) * 0.4,
    // Does this bot tend to target the player goal?
    prefersPlayer: Math.random() < PLAYER_BIAS,
  }), []);

  const stateRef         = useRef<BotState>('ATTACK');
  const repositionTimer  = useRef(0);

  // Player goal position (index 0, angle = 0)
  const playerGoalPos = useMemo(() =>
    new THREE.Vector3(Math.cos(0) * ARENA_RADIUS, 0, Math.sin(0) * ARENA_RADIUS),
  []);

  useEffect(() => {
    const body = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(0.8),
      position: new CANNON.Vec3(goalPos.x * 0.8, 1, goalPos.z * 0.8),
      fixedRotation: true,
      linearDamping: 0.45,
    });
    world.addBody(body);
    bodyRef.current = body;
    return () => {
      world.removeBody(body);
      bodyRef.current = null;
    };
  }, [world, goalPos]);

  useFrame((_, delta) => {
    if (isEliminated || !bodyRef.current) return;
    const body = bodyRef.current;

    const ballPos3 = useGameStore.getState().ballPosition;
    if (!ballPos3) return;

    const botPos  = new THREE.Vector3(body.position.x, 0, body.position.z);
    const ballPos = new THREE.Vector3(ballPos3[0], 0, ballPos3[2]);
    const goalPos2D = new THREE.Vector3(goalPos.x, 0, goalPos.z);

    const ballToGoalDist  = ballPos.distanceTo(goalPos2D);
    const botToBallDist   = botPos.distanceTo(ballPos);
    const hasPossession   = botToBallDist < POSSESSION_RADIUS;

    // ── FSM Transition ────────────────────────────────────────────────
    if (stateRef.current !== 'REPOSITION') {
      if (ballToGoalDist < profile.defendRadius) {
        stateRef.current = 'DEFEND';
      } else {
        if (botPos.length() < 2 && Math.random() < 0.005) {
          stateRef.current = 'REPOSITION';
          repositionTimer.current = 0.6;
        } else {
          stateRef.current = 'ATTACK';
        }
      }
    }

    // ── Determine target goal ─────────────────────────────────────────
    // If in possession: 40%-chance bots aim for the player's goal directly
    let targetGoal = goalPos2D;
    if (hasPossession && profile.prefersPlayer && !useGameStore.getState().eliminated[0]) {
      targetGoal = new THREE.Vector3(playerGoalPos.x, 0, playerGoalPos.z);
    }

    // ── Passing: if in possession but far from target, look for a nearby ally ──
    let direction = new THREE.Vector3();
    let speed = BASE_SPEED;

    if (stateRef.current === 'ATTACK') {
      if (hasPossession && botPos.distanceTo(targetGoal) > PASS_DISTANCE) {
        // Find nearest other bot body (mass=5, not self) to "pass" to
        let nearestDist = Infinity;
        let passTarget: THREE.Vector3 | null = null;

        world.bodies.forEach(b => {
          if (b === body || b.mass !== 5) return;
          const bPos = new THREE.Vector3(b.position.x, 0, b.position.z);
          const d = botPos.distanceTo(bPos);
          if (d < nearestDist) {
            nearestDist = d;
            passTarget = bPos;
          }
        });

        if (passTarget) {
          // Apply impulse toward ally to simulate a pass
          const ballBody = world.bodies.find(b => b.mass === 1);
          if (ballBody) {
            const passDir = new THREE.Vector3()
              .subVectors(passTarget, ballPos)
              .normalize();
            ballBody.applyImpulse(
              new CANNON.Vec3(passDir.x * 18, 2, passDir.z * 18),
              ballBody.position,
            );
          }
        }
      }
      // Chase the ball (or target if in possession)
      const chaseTarget = hasPossession ? targetGoal : ballPos;
      direction.subVectors(chaseTarget, botPos);
      speed = BASE_SPEED * profile.aggression;

    } else if (stateRef.current === 'DEFEND') {
      const midPoint = new THREE.Vector3().lerpVectors(ballPos, goalPos2D, 0.45);
      direction.subVectors(midPoint, botPos);
      speed = BASE_SPEED * 0.9;

    } else {
      // REPOSITION
      direction.subVectors(goalPos2D, botPos);
      speed = BASE_SPEED * 0.7;
      repositionTimer.current -= delta;
      if (repositionTimer.current <= 0) stateRef.current = 'ATTACK';
    }

    direction.y = 0;
    direction.normalize();
    direction.x += profile.noiseX;
    direction.z += profile.noiseZ;
    direction.normalize();

    body.velocity.set(direction.x * speed, body.velocity.y, direction.z * speed);
    groupRef.current.position.set(body.position.x, body.position.y, body.position.z);
  });

  if (isEliminated) return null;

  return (
    <group ref={groupRef}>
      <Float speed={4} rotationIntensity={2} floatIntensity={0.5}>
        <mesh castShadow>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color="#1a0000" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.5, 0.1, 12, 64]} />
          <meshStandardMaterial color="#FF0033" emissive="#FF0033" emissiveIntensity={4} toneMapped={false} />
        </mesh>
        <mesh rotation-x={Math.PI / 3}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshStandardMaterial color="#FF0033" emissive="#FF0033" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <pointLight color="#FF0033" intensity={2} distance={5} />
      </Float>
    </group>
  );
};
