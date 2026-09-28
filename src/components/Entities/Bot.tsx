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

// --- Pre-allocated objects for useFrame (avoids GC pressure) ---
const _botPos = new THREE.Vector3();
const _ballPos = new THREE.Vector3();
const _goalPos2D = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _interceptPos = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _facingVec = new THREE.Vector3();
const _shootDir = new THREE.Vector3();
const _scaledDir = new THREE.Vector3();

export const Bot = ({ id, goalPos }: { id: number; goalPos: THREE.Vector3; key?: React.Key }) => {
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

    _botPos.set(body.position.x, 0, body.position.z);
    _ballPos.set(ballPos3[0], 0, ballPos3[2]);
    _goalPos2D.set(goalPos.x, 0, goalPos.z);

    // Use distanceToSquared for performance
    const ballToGoalDistSq = _ballPos.distanceToSquared(_goalPos2D);
    const botToBallDistSq = _botPos.distanceToSquared(_ballPos);
    const hasPossession = botToBallDistSq < (POSSESSION_RADIUS * POSSESSION_RADIUS);

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
    const ballInBotHalf = ballToGoalDistSq < (currentRadius * 0.55) * (currentRadius * 0.55);

    if (stateRef.current !== 'REPOSITION' && stateRef.current !== 'SHOOT') {
      if (botToBallDistSq < 9.0) { // 3.0 squared
        stateRef.current = 'SLAM';
      } else if (ballInBotHalf) {
        stateRef.current = 'DEFEND';
      } else {
        if (_botPos.lengthSq() < 4 && Math.random() < 0.005) { // 2.0 squared
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
      _targetGoal.copy(_goalPos2D); // fallback
      const stateStore = useGameStore.getState();
      const { eliminated } = stateStore;
      const playerAlive = !eliminated[0];

      // ── Power-Up Hunting Logic (AI Intercept Matrix) ──
      let huntingPowerUp = false;
      const activeOrbs = Object.values(stateStore.activePowerUps);
      const hasBuff = isSpeedBoosted || isJuggernaut || myBuffs.ghostUntil > now;

      if (activeOrbs.length > 0 && !hasBuff) {
        let closestOrb = null;
        let minDistSqToOrb = Infinity;

        activeOrbs.forEach(orb => {
          const orbX = orb.position[0];
          const orbZ = orb.position[2];
          const dSq = (orbX - _botPos.x)**2 + (orbZ - _botPos.z)**2;
          if (dSq < minDistSqToOrb) {
            minDistSqToOrb = dSq;
            closestOrb = { x: orbX, z: orbZ };
          }
        });

        if (closestOrb && minDistSqToOrb < 225 && minDistSqToOrb < botToBallDistSq) { // 15 squared
          _targetGoal.set(closestOrb.x, 0, closestOrb.z);
          huntingPowerUp = true;
        }
      }

      if (!huntingPowerUp) {
        // Normal AI Targeting
        if (playerAlive && profile.prefersPlayer) {
          _targetGoal.copy(playerGoalPos);
        } else {
          // Target a random alive bot's goal
          const aliveIndices = eliminated
            .map((e, index) => (!e && index !== id ? index : -1))
            .filter(idx => idx !== -1);
          
          if (aliveIndices.length > 0) {
            const randomIndex = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
            const angle = (randomIndex / 8) * Math.PI * 2;
            _targetGoal.set(Math.cos(angle) * ARENA_RADIUS, 0, Math.sin(angle) * ARENA_RADIUS);
          }
        }
      }

      let speed = BASE_SPEED;
      // Smooth difficulty curve: 70% at Tier 1 → 100% at Tier 4 → hyper at Tier 5+
      const tierMult = 0.6 + (tier * 0.1);

      if (stateRef.current === 'SLAM') {
        _direction.subVectors(_ballPos, _botPos);
        speed = BASE_SPEED * 2.0 * profile.aggression * tierMult;
      } else if (stateRef.current === 'ATTACK') {
        const chaseTarget = hasPossession ? _targetGoal : _ballPos;
        _direction.subVectors(chaseTarget, _botPos);
        speed = BASE_SPEED * profile.aggression * tierMult;
      } else if (stateRef.current === 'DEFEND') {
        _interceptPos.set((_ballPos.x + _goalPos2D.x) / 2, 0, (_ballPos.z + _goalPos2D.z) / 2);
        _direction.subVectors(_interceptPos, _botPos);
        speed = BASE_SPEED * profile.aggression * tierMult;
      } else if (stateRef.current === 'SHOOT') {
        _direction.subVectors(_targetGoal, _botPos);
        speed = BASE_SPEED * 0.5;
      } else {
        _direction.subVectors(_goalPos2D, _botPos);
        speed = BASE_SPEED * 0.7;
        repositionTimer.current -= delta * 5; // adjusted for throttle
        if (repositionTimer.current <= 0) stateRef.current = 'ATTACK';
      }

      _direction.y = 0;
      if (_direction.lengthSq() > 0.0001) {
        _direction.normalize();
        _direction.x += profile.noiseX;
        _direction.z += profile.noiseZ;
        _direction.normalize();
      } else {
        _direction.set(0, 0, 0);
      }

      // ── Proximity Slowdown (Relaxed for aggression) ──
      if (botToBallDistSq < 2.25 && stateRef.current !== 'SLAM') { // 1.5 squared
        speed = 0;
      }

      // ── Apply Buffs ──
      speed *= speedMultiplier;
      if (isEMPed) speed *= 0.3;

      _scaledDir.copy(_direction).multiplyScalar(speed);
      body.velocity.set(_scaledDir.x, body.velocity.y, _scaledDir.z);

      lastDirection.current.copy(_direction);
      lastSpeed.current = speed;

      // ── SHOOT TRIGGER ──────────────────────────────────────────────
      _facingVec.subVectors(_targetGoal, _botPos).normalize();
      const facingTarget = _direction.dot(_facingVec) > 0.8;
      const canShoot = Date.now() - lastShotTime.current > 2000;
      if (botToBallDistSq < 12.25 && facingTarget && canShoot) { // 3.5 squared
        stateRef.current = 'SHOOT';
        
        // Use cached O(1) ball body reference
        const ballBody = useGameStore.getState().ballBodyRef;
        if (ballBody) {
          _shootDir.subVectors(_targetGoal, _ballPos).normalize();
          ballBody.applyImpulse(
            new CANNON.Vec3(_shootDir.x * 300, 0, _shootDir.z * 300),
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
