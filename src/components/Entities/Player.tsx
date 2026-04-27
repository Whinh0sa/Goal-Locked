import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Float } from '@react-three/drei';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';
import { ARENA_RADIUS } from '../../constants';

const SPEED = 25;
const MAX_SHIELDS = 3;

export const Player = () => {
  const { world } = usePhysics();
  const bodyRef   = useRef<CANNON.Body | null>(null);
  const groupRef  = useRef<THREE.Group>(null!);
  const ghostRef  = useRef<THREE.Group>(null!);

  const playerShields    = useGameStore(state => state.playerShields);
  const playerSpeedUntil = useGameStore(state => state.playerSpeedUntil);
  const updatePlayerPos  = useGameStore(state => state.updatePlayerPosition);
  const isEliminated     = useGameStore(state => state.eliminated[0]);
  const playerColor      = useGameStore(state => state.playerRingColor) || '#32CD32';
  const playerJuggernautUntil = useGameStore(s => s.playerJuggernautUntil);
  const playerGhostUntil = useGameStore(s => s.playerGhostUntil);
  const setLastStriker   = useGameStore(state => state.setLastStriker);

  // Track previous cooldown to detect the exact frame a dash was triggered
  const prevDashCooldown = useRef(0);
  // Snapshot last known position for the ghost
  const lastPos = useRef(new THREE.Vector3(ARENA_RADIUS - 6, 1, 0));
  const playerPosition = useGameStore(state => state.playerPosition);
  const gameStartTime = useGameStore(state => state.gameStartTime);

  // ── Physics Body Lifecycle ──────────────────────────────────
  useEffect(() => {
    if (isEliminated) {
      if (bodyRef.current) {
        world.removeBody(bodyRef.current);
        bodyRef.current = null;
      }
      return;
    }

    if (!bodyRef.current) {
      const stateStore = useGameStore.getState();
      const [spawnX, spawnY, spawnZ] = stateStore.playerPosition;
      const safeRadius = stateStore.currentRadius * 0.8;
      
      const safeX = Math.sign(spawnX) * Math.min(Math.abs(spawnX), safeRadius);
      const safeZ = Math.sign(spawnZ) * Math.min(Math.abs(spawnZ), safeRadius);

      const body = new CANNON.Body({
        mass: 50,
        shape: new CANNON.Sphere(0.8),
        position: new CANNON.Vec3(safeX, 15, safeZ), // Drop from sky
        fixedRotation: true,
        linearDamping: 0.4,
      });
      (body as any).userData = { id: 0, type: 'player' };
      world.addBody(body);
      bodyRef.current = body;
    }

    return () => {
      if (bodyRef.current) {
        world.removeBody(bodyRef.current);
        bodyRef.current = null;
      }
    };
  }, [world, isEliminated]);

  const currentRadius = useGameStore(state => state.currentRadius);
  
  // Cinematic "Attract Mode" formation
  const cinematicPos = useMemo(() => new CANNON.Vec3(0, 1.0, currentRadius * 0.4), [currentRadius]);

  useEffect(() => {
    if (bodyRef.current && gameStartTime === 0) {
      bodyRef.current.position.copy(cinematicPos);
      bodyRef.current.velocity.set(0, 0, 0);
      bodyRef.current.angularVelocity.set(0, 0, 0);
      bodyRef.current.wakeUp();
    }
  }, [gameStartTime, cinematicPos]);

  // Reset Listener
  useEffect(() => {
    if (bodyRef.current && gameStartTime > 0 && !isEliminated) {
      const stateStore = useGameStore.getState();
      const safeRadius = stateStore.currentRadius * 0.8;

      let spawnX = (Math.random() - 0.5) * 15;
      let spawnZ = (Math.random() - 0.5) * 15;
      
      spawnX = Math.sign(spawnX) * Math.min(Math.abs(spawnX), safeRadius);
      spawnZ = Math.sign(spawnZ) * Math.min(Math.abs(spawnZ), safeRadius);

      bodyRef.current.position.set(spawnX, 15, spawnZ);
      bodyRef.current.velocity.set(0, 0, 0);
      bodyRef.current.angularVelocity.set(0, 0, 0);
      bodyRef.current.wakeUp();
    }
  }, [gameStartTime, isEliminated]);

  useFrame(() => {
    // ── ELIMINATED: freeze ghost at last known position ───────────────
    if (isEliminated) {
      groupRef.current.visible = false;
      if (ghostRef.current) {
        ghostRef.current.visible = true;
        ghostRef.current.position.copy(lastPos.current);
      }
      return;
    }

    const body = bodyRef.current;
    if (!body) return;

    // ── Buff Calculations & Physics Application ──────────────────────
    const { moveDirection, pulseTrigger, dashCooldownUntil } = useGameStore.getState();
    const x = moveDirection[0];
    const z = moveDirection[1];

    const now = Date.now();
    const isJuggernaut = playerJuggernautUntil > now;
    const isSpeedBoosted = playerSpeedUntil > now;
    
    let currentSpeedMult = 1.0;
    if (isSpeedBoosted) currentSpeedMult = 1.6;
    else if (isJuggernaut) currentSpeedMult = 1.4;

    body.velocity.set(x * SPEED * currentSpeedMult, body.velocity.y, z * SPEED * currentSpeedMult);

    if (body.position.y > 1.5) {
      body.velocity.y = -20;
    }

    if (isJuggernaut && body.mass !== 200) {
      body.mass = 200;
      body.updateMassProperties();
    } else if (!isJuggernaut && body.mass !== 50) {
      body.mass = 50;
      body.updateMassProperties();
    }

    // ── DASH ──────────────────────────────────────────────────────────
    if (dashCooldownUntil !== prevDashCooldown.current && dashCooldownUntil > Date.now() - 100) {
      prevDashCooldown.current = dashCooldownUntil;
      const dx = x !== 0 || z !== 0 ? x : 1;
      const dz = x !== 0 || z !== 0 ? z : 0;
      bodyRef.current.applyImpulse(new CANNON.Vec3(dx * 400, 0, dz * 400), bodyRef.current.position);
    }

    // Publish player position
    const pos = body.position;
    lastPos.current.set(pos.x, pos.y, pos.z);
    updatePlayerPos([pos.x, pos.y, pos.z]);

    // ── BALL SPIN ─────────────────────────────────────────────────────
    const ballBody = world.bodies.find(b => b.mass === 5 && b.shapes[0] instanceof CANNON.Sphere);
    if (ballBody) {
      const dx2 = ballBody.position.x - pos.x;
      const dz2 = ballBody.position.z - pos.z;
      const dist2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
      if (dist2 < 2.8 && dist2 > 0.1) {
        const nx = dx2 / dist2; const nz = dz2 / dist2;
        const vx = body.velocity.x; const vz = body.velocity.z;
        const dot = vx * nx + vz * nz;
        const tx = vx - dot * nx; const tz = vz - dot * nz;
        const SPIN = 0.35;
        ballBody.angularVelocity.x += tz * SPIN;
        ballBody.angularVelocity.z -= tx * SPIN;

        // ── STICKY DRIBBLING (Natural Feel) ──────────────────────────────
        if (dist2 < 3 && (x !== 0 || z !== 0)) {
          // Instead of overriding velocity, we apply a gentle impulse toward the player
          // to create a "sticky" but physically honest dribbling feel.
          const pullStrength = 1.2;
          ballBody.applyImpulse(
            new CANNON.Vec3(-dx2 * pullStrength, 0, -dz2 * pullStrength),
            ballBody.position
          );
        }
      }
    }

    // ── PULSE ─────────────────────────────────────────────────────────
    if (pulseTrigger) {
      const ballBodyP = world.bodies.find(b => b.mass === 5 && b.shapes[0] instanceof CANNON.Sphere);
      if (ballBodyP) {
        const dp   = ballBodyP.position.vsub(body.position);
        const dist = dp.length();
        if (dist < 5) {
          ballBodyP.applyImpulse(dp.scale(250 / Math.max(dist, 0.1)), ballBodyP.position);
          setLastStriker(0); // Player legally claims possession via Shockwave
        }
      }
    }

    // Sync group position
    groupRef.current.position.set(pos.x, pos.y, pos.z);
    groupRef.current.visible = true;
    if (ghostRef.current) ghostRef.current.visible = false;
  });

  return (
    <>
      {/* ── Active player mesh ── */}
      <group ref={groupRef}>
        {/* Shield indicator dots */}
        <group position={[0, 3.2, 0]}>
          {Array.from({ length: MAX_SHIELDS }).map((_, i) => {
            const active = i < playerShields;
            const offsetX = (i - (MAX_SHIELDS - 1) / 2) * 0.5;
            return (
              <mesh key={i} position={[offsetX, 0, 0]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshStandardMaterial
                  color={active ? playerColor : '#1a1a1a'}
                  emissive={active ? playerColor : '#000'}
                  emissiveIntensity={active ? 4 : 0}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>

        <Float speed={4} rotationIntensity={2} floatIntensity={0.5}>
          <mesh castShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#0B0B0B" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Juggernaut Golden Aura */}
          {Date.now() < playerJuggernautUntil && (
            <mesh>
              <sphereGeometry args={[1.2, 32, 32]} />
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
            <torusGeometry args={[1.5, 0.1, 16, 80]} />
            <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={4} toneMapped={false} />
          </mesh>
          <mesh rotation-x={Math.PI / 3}>
            <torusGeometry args={[1.5, 0.04, 8, 48]} />
            <meshStandardMaterial color={playerColor} emissive={playerColor} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <pointLight color={playerColor} intensity={3} distance={6} />
        </Float>
      </group>

      {/* ── Ghost / spectator mode (shown when eliminated) ── */}
      <group ref={ghostRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={playerColor}
            emissive={playerColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        {/* Faint ring so ghost is identifiable */}
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.5, 0.05, 8, 48]} />
          <meshStandardMaterial
            color={playerColor}
            emissive={playerColor}
            emissiveIntensity={1}
            transparent
            opacity={0.35}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  );
};
