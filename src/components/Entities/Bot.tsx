import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Float } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS, GOALS } from '../../constants';

const BASE_SPEED = 16;       // increased for responsiveness
const POSSESSION_RADIUS = 2.5; // larger radius to "have" the ball
const PLAYER_BIAS = 0.8;      // 80% chance to target player goal

type BotState = 'ATTACK' | 'DEFEND' | 'REPOSITION' | 'SLAM' | 'SHOOT';

const BOT_NAMES = ['Bot_Apex', 'Bot_Nova', 'Bot_Onyx', 'Bot_Flux', 'Bot_Rift', 'Bot_Echo', 'Bot_Vex', 'Bot_Zero'];

export const Bot = ({ id, goalPos }: { id: number; goalPos: THREE.Vector3 }) => {
  const { world } = usePhysics();
  const isEliminated = useGameStore(state => state.eliminated[id]);
  const tier = useGameStore(state => state.tier);
  const setBotName = useGameStore(state => state.setBotName);
  const setLastStriker = useGameStore(state => state.setLastStriker);
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<CANNON.Body | null>(null);
  const matRef1 = useRef<THREE.MeshStandardMaterial>(null!);
  const matRef2 = useRef<THREE.MeshStandardMaterial>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const botBuffs = useGameStore(state => state.botBuffs);

  // Bot name is set once in the mount useEffect below

  // --- Randomised AI Profile (stable per bot instance) ---
  const profile = useMemo(() => ({
    aggression: 0.5 + Math.random() * 1.0,
    defendRadius: 5 + Math.random() * 7,
    noiseX: (Math.random() - 0.5) * 0.4,
    noiseZ: (Math.random() - 0.5) * 0.4,
    // Does this bot tend to target the player goal?
    prefersPlayer: Math.random() < PLAYER_BIAS,
  }), []);

  const stateRef = useRef<BotState>('ATTACK');
  const repositionTimer = useRef(0);
  const frameCount = useRef(Math.floor(Math.random() * 5)); // offset starts so they don't all sync
  const lastDirection = useRef(new THREE.Vector3());
  const lastSpeed = useRef(BASE_SPEED);
  const lastShotTime = useRef(0);

  // Player goal position (index 0, angle = 0)
  const playerGoalPos = useMemo(() =>
    new THREE.Vector3(Math.cos(0) * ARENA_RADIUS, 0, Math.sin(0) * ARENA_RADIUS),
    []);

  const botPositions = useGameStore(state => state.botPositions);
  const gameStartTime = useGameStore(state => state.gameStartTime);

  useEffect(() => {
    const nm = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    setBotName(id, `${nm}_${id + 1}`);

    const [spawnX, spawnY, spawnZ] = botPositions[id];

    const body = new CANNON.Body({
      mass: 50,
      shape: new CANNON.Sphere(0.8),
      position: new CANNON.Vec3(spawnX, spawnY, spawnZ),
      fixedRotation: true,
      linearDamping: 0.45,
      allowSleep: true,
      sleepSpeedLimit: 0.1,
      collisionFilterGroup: 1,
    });
    (body as any).userData = { id, type: 'bot' };
    world.addBody(body);
    bodyRef.current = body;
    return () => {
      world.removeBody(body);
      bodyRef.current = null;
    };
  }, [world, id]); // Mount once

  // Cinematic "Attract Mode" formation
  const cinematicPos = useMemo(() => {
    const angle = (id / GOALS) * Math.PI * 2;
    return new CANNON.Vec3(Math.cos(angle) * 10, 1.0, Math.sin(angle) * 10);
  }, [id]);

  useEffect(() => {
    if (bodyRef.current && gameStartTime === 0) {
      bodyRef.current.position.copy(cinematicPos);
      bodyRef.current.velocity.set(0, 0, 0);
      bodyRef.current.angularVelocity.set(0, 0, 0);
      bodyRef.current.wakeUp();
    }
  }, [gameStartTime, id, cinematicPos]);

  // Reset Trigger listener (Mid-game or Tier Advance)
  useEffect(() => {
    if (bodyRef.current && gameStartTime > 0) {
      const [sx, sy, sz] = useGameStore.getState().botPositions[id];
      bodyRef.current.position.set(sx, sy, sz);
      bodyRef.current.velocity.set(0, 0, 0);
      bodyRef.current.angularVelocity.set(0, 0, 0);
      // Wake up body if it was sleeping
      bodyRef.current.wakeUp();
    }
  }, [gameStartTime, id]);

  useFrame((_, delta) => {
    if (useGameStore.getState().isPaused) return;
    if (isEliminated || !bodyRef.current) return;
    const body = bodyRef.current;

    const now = Date.now();
    const stateStore = useGameStore.getState();
    const { ballPosition, botBuffs, freezeBotsUntil, empUntil, playerGhostUntil, lastStriker, currentRadius, tier } = stateStore;
    const isEMPed = now < empUntil;
    const ballPos3 = ballPosition;
    if (!ballPos3) return;

    // ── Buff Application ──────────────────────────────────────────
    const myBuffs = botBuffs[id] || { speedUntil: 0, juggernautUntil: 0, ghostUntil: 0 };
    
    const isJuggernaut = myBuffs.juggernautUntil > now;
    const isSpeedBoosted = myBuffs.speedUntil > now;
    
    let speedMultiplier = 1.0;
    if (isSpeedBoosted) speedMultiplier = 1.6;
    else if (isJuggernaut) speedMultiplier = 1.4;

    // Dynamic mass for Juggernaut
    if (isJuggernaut && body.mass !== 200) {
      body.mass = 200;
      body.updateMassProperties();
    } else if (!isJuggernaut && body.mass !== 50) {
      body.mass = 50;
      body.updateMassProperties();
    }

    const botPos = new THREE.Vector3(body.position.x, 0, body.position.z);
    const ballPos = new THREE.Vector3(ballPos3[0], 0, ballPos3[2]);
    const goalPos2D = new THREE.Vector3(goalPos.x, 0, goalPos.z);

    const ballToGoalDist = ballPos.distanceTo(goalPos2D);
    const botToBallDist = botPos.distanceTo(ballPos);
    const hasPossession = botToBallDist < POSSESSION_RADIUS;

    // Self-immunity from freeze if I was the collector
    const isFrozen = now < freezeBotsUntil && lastStriker !== id;
    const isGhostBall = now < stateStore.playerGhostUntil;

    // Filter mask: ~2 means collide with everything EXCEPT group 2 (Ball)
    body.collisionFilterMask = (isGhostBall || myBuffs.ghostUntil > now) ? ~2 : -1;

    if (isFrozen) {
      body.velocity.set(0, body.velocity.y, 0);
      return;
    }

    // ── FSM Transition ─────────────────────────────────────────────────
    const ballInBotHalf = ballToGoalDist < currentRadius * 0.55;

    if (stateRef.current !== 'REPOSITION' && stateRef.current !== 'SHOOT') {
      if (botToBallDist < 3.0) {
        stateRef.current = 'SLAM';
      } else if (ballInBotHalf) {
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

    frameCount.current++;
    const shouldUpdate = frameCount.current % 5 === 0;

    if (shouldUpdate) {
      let targetGoal = goalPos2D; // fallback
      const stateStore = useGameStore.getState();
      const { eliminated, activePowerUp } = stateStore;
      const playerAlive = !eliminated[0];

      // ── Power-Up Hunting Logic (Heuristic: Near Pup < 12 && Ball Far > 15) ──
      let huntingPowerUp = false;
      if (activePowerUp && botToBallDist > 15) {
        const pupPos = new THREE.Vector3(activePowerUp.position[0], 0, activePowerUp.position[2]);
        const distToPup = botPos.distanceTo(pupPos);
        if (distToPup < 12) {
          targetGoal = pupPos;
          huntingPowerUp = true;
        }
      }

      if (!huntingPowerUp) {
        // Normal AI Targeting
        if (playerAlive && profile.prefersPlayer) {
          targetGoal = playerGoalPos;
        } else {
          // Target a random alive bot's goal
          const aliveIndices = eliminated
            .map((e, index) => (!e && index !== id ? index : -1))
            .filter(idx => idx !== -1);
          
          if (aliveIndices.length > 0) {
            const randomIndex = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
            const angle = (randomIndex / 8) * Math.PI * 2;
            targetGoal = new THREE.Vector3(Math.cos(angle) * ARENA_RADIUS, 0, Math.sin(angle) * ARENA_RADIUS);
          }
        }
      }

      let direction = new THREE.Vector3();
      let speed = BASE_SPEED;
      // Smooth difficulty curve: 70% at Tier 1 → 100% at Tier 4 → hyper at Tier 5+
      const tierMult = 0.6 + (tier * 0.1);

      if (stateRef.current === 'SLAM') {
        direction.subVectors(ballPos, botPos);
        speed = BASE_SPEED * 2.0 * profile.aggression * tierMult;
      } else if (stateRef.current === 'ATTACK') {
        const chaseTarget = hasPossession ? targetGoal : ballPos;
        direction.subVectors(chaseTarget, botPos);
        speed = BASE_SPEED * profile.aggression * tierMult;
      } else if (stateRef.current === 'DEFEND') {
        const interceptPos = new THREE.Vector3((ballPos.x + goalPos2D.x) / 2, 0, (ballPos.z + goalPos2D.z) / 2);
        direction.subVectors(interceptPos, botPos);
        speed = BASE_SPEED * profile.aggression * tierMult;
      } else if (stateRef.current === 'SHOOT') {
        direction.subVectors(targetGoal, botPos);
        speed = BASE_SPEED * 0.5;
      } else {
        direction.subVectors(goalPos2D, botPos);
        speed = BASE_SPEED * 0.7;
        repositionTimer.current -= delta * 5; // adjusted for throttle
        if (repositionTimer.current <= 0) stateRef.current = 'ATTACK';
      }

      direction.y = 0;
      if (direction.lengthSq() > 0.0001) {
        direction.normalize();
        direction.x += profile.noiseX;
        direction.z += profile.noiseZ;
        direction.normalize();
      } else {
        direction.set(0, 0, 0);
      }

      // ── Proximity Slowdown (Relaxed for aggression) ──
      if (botToBallDist < 1.5 && stateRef.current !== 'SLAM') {
        speed = 0;
      }

      // ── Apply Buffs ──
      speed *= speedMultiplier;
      if (isEMPed) speed *= 0.3;

      const { x: vx, z: vz } = direction.clone().multiplyScalar(speed);
      body.velocity.set(vx, body.velocity.y, vz);

      lastDirection.current.copy(direction);
      lastSpeed.current = speed;

      // ── SHOOT TRIGGER ──────────────────────────────────────────────
      const facingTarget = direction.dot(new THREE.Vector3().subVectors(targetGoal, botPos).normalize()) > 0.8;
      const canShoot = Date.now() - lastShotTime.current > 2000;
      if (botToBallDist < 3.5 && facingTarget && canShoot) {
        stateRef.current = 'SHOOT';
        
        // Use cached O(1) ball body reference
        const ballBody = useGameStore.getState().ballBodyRef;
        if (ballBody) {
          const shootDir = new THREE.Vector3().subVectors(targetGoal, ballPos).normalize();
          ballBody.applyImpulse(
            new CANNON.Vec3(shootDir.x * 300, 0, shootDir.z * 300),
            ballBody.position
          );
          setLastStriker(id);
          lastShotTime.current = now;
          setTimeout(() => { if(stateRef.current === 'SHOOT') stateRef.current = 'ATTACK'; }, 500);
        }
      }
    }

    if (body.position.y > 1.5) {
      body.velocity.y = -20;
    }

    // ── Apply Responsive Movement (Velocity Override) ──
    if (bodyRef.current) {
        bodyRef.current.wakeUp();
        bodyRef.current.velocity.set(
            lastDirection.current.x * lastSpeed.current,
            bodyRef.current.velocity.y, // Maintain natural gravity
            lastDirection.current.z * lastSpeed.current
        );
    }

    groupRef.current.position.set(body.position.x, body.position.y, body.position.z);
    
    // ── EMP Visual Override ──
    if (matRef1.current && matRef2.current && lightRef.current) {
      if (isEMPed) {
        const stunStutter = Math.random() > 0.5 ? 4 : 0;
        matRef1.current.color.setHex(0x00FFFF);
        matRef1.current.emissive.setHex(0x00FFFF);
        matRef1.current.emissiveIntensity = stunStutter;
        matRef2.current.color.setHex(0x00FFFF);
        matRef2.current.emissive.setHex(0x00FFFF);
        matRef2.current.emissiveIntensity = stunStutter;
        lightRef.current.color.setHex(0x00FFFF);
        lightRef.current.intensity = stunStutter;
      } else {
        matRef1.current.color.setHex(0xFF0033);
        matRef1.current.emissive.setHex(0xFF0033);
        matRef1.current.emissiveIntensity = 4;
        matRef2.current.color.setHex(0xFF0033);
        matRef2.current.emissive.setHex(0xFF0033);
        matRef2.current.emissiveIntensity = 2;
        lightRef.current.color.setHex(0xFF0033);
        lightRef.current.intensity = 2;
      }
    }
  });

  if (isEliminated) return null;

  return (
    <group ref={groupRef}>
      {/* Mesh component grounded with Float only on the visual parts */}
      <Float speed={4} rotationIntensity={2} floatIntensity={0.2}>
        <mesh castShadow>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color="#1a0000" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Juggernaut Golden Aura */}
        {Date.now() < (botBuffs[id]?.juggernautUntil || 0) && (
          <mesh>
            <sphereGeometry args={[1.2, 24, 24]} />
            <meshStandardMaterial 
              color="#FFD700" 
              emissive="#FFD700" 
              emissiveIntensity={10} 
              transparent 
              opacity={0.3} 
              toneMapped={false} 
            />
          </mesh>
        )}

        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.5, 0.1, 12, 64]} />
          <meshStandardMaterial ref={matRef1} color="#FF0033" emissive="#FF0033" emissiveIntensity={4} toneMapped={false} />
        </mesh>
        <mesh rotation-x={Math.PI / 3}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshStandardMaterial ref={matRef2} color="#FF0033" emissive="#FF0033" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        <pointLight ref={lightRef} color="#FF0033" intensity={2} distance={5} />
      </Float>
    </group>
  );
};
