import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, Environment, ContactShadows, Html, Float, Text } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { PhysicsProvider } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';
import { Crucible } from './Crucible';
import { Ball } from './Entities/Ball';
import { Player } from './Entities/Player';
import { Bot } from './Entities/Bot';
import { GameManager } from './GameManager';
import { CameraManager } from './CameraManager';
import { GoalJuice } from './VFX/GoalJuice';
import { CollisionParticles } from './VFX/CollisionParticles';
import { ScorchMarks } from './VFX/ScorchMarks';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';
import { MobileControls } from './UI/MobileControls';
import { FadingText } from './UI/FadingText';
import { GOALS, ARENA_RADIUS } from '../constants';
import { EliminationFeed } from './UI/EliminationFeed';
import { AudioController } from './UI/AudioController';
import { LeaderboardUI } from './UI/LeaderboardUI';
import { DecoyBalls } from './Entities/DecoyBalls';
import { FloorBumper } from './Hazards/FloorBumper';
import { Stats } from '../hooks/useStats';
import { AudioManager } from '../audio/AudioManager';
import { GravityWell } from './Hazards/GravityWell';
import { PowerUp } from './Entities/PowerUp';
import { ConfettiExplosion } from './VFX/ConfettiExplosion';
import { EntryPortal } from './Entities/EntryPortal';
import { ExitPortal } from './Entities/ExitPortal';

const WORLD_CONFIG: Record<number, { preset: any, bg: string, fog: string }> = {
  1: { preset: 'city', bg: '#000000', fog: '#000000' },
  2: { preset: 'sunset', bg: '#1c0d06', fog: '#1c0d06' },
  3: { preset: 'night', bg: '#0a0a20', fog: '#0a0a20' },
  4: { preset: 'warehouse', bg: '#171a1c', fog: '#171a1c' },
  5: { preset: 'apartment', bg: '#111318', fog: '#111318' },
};
const getWorldConfig = (tier: number) => {
  const t = ((tier - 1) % 5) + 1;
  return WORLD_CONFIG[t] || WORLD_CONFIG[1];
};

// ... (skipping unchanged code for brevity in thought, but tool will use full content)

// --- Diegetic 3D HUD Components ---

function DiegeticStartUI({ onStart }: { onStart: () => void }) {
    return (
        <group position={[0, 5, 10]}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <FadingText
                    fontSize={4}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    fontStyle="italic"
                    fadeDelay={10000}
                >
                    CRUCIBLE
                </FadingText>
                <FadingText
                    position={[0, -3, 0]}
                    fontSize={0.5}
                    color="#00cccc"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.5}
                    fadeDelay={8000}
                >
                    GET READY
                </FadingText>
                
                <group position={[0, -6, 0]} onClick={onStart}>
                    <mesh>
                        <planeGeometry args={[12, 2.5]} />
                        <meshBasicMaterial color="#008080" transparent opacity={0.2} />
                    </mesh>
                    <Text
                        fontSize={0.8}
                        color="#00ffff"
                        anchorX="center"
                        anchorY="middle"
                    >
                        READY
                    </Text>
                </group>
            </Float>
        </group>
    );
}

function DiegeticVictoryUI({ onReset }: { onReset: () => void }) {
    return (
        <group position={[0, 8, 5]}>
            <Float speed={3} rotationIntensity={0.5} floatIntensity={1.5}>
                {/* Glow backlight */}
                <pointLight color="#32CD32" intensity={6} distance={20} />

                <Text
                    fontSize={4}
                    color="#32CD32"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight={900}
                    outlineWidth={0.05}
                    outlineColor="#000"
                >
                    YOU WIN!
                </Text>

                <Text
                    position={[0, -3.5, 0]}
                    fontSize={0.9}
                    color="#aaffaa"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.15}
                >
                    Last Player Standing
                </Text>

                {/* PLAY AGAIN button */}
                <group position={[0, -6, 0]}>
                    <Html transform distanceFactor={25} zIndexRange={[100, 0]}>
                        <button 
                            onClick={onReset}
                            style={{ 
                                pointerEvents: 'auto',
                                background: 'rgba(50,205,50,0.18)',
                                border: '2px solid #32CD32',
                                color: '#32CD32',
                                fontSize: '18px',
                                fontWeight: 700,
                                padding: '12px 32px',
                                cursor: 'pointer',
                                textShadow: '0 0 10px #32CD32',
                                textTransform: 'uppercase',
                                outline: 'none'
                            }}
                        >
                            Play Again
                        </button>
                    </Html>
                </group>
            </Float>
        </group>
    );
}

function DiegeticDefeatUI({ onReset }: { onReset: () => void }) {
    return (
        <group position={[0, 8, 5]}>
            <Float speed={2} rotationIntensity={0.3} floatIntensity={1}>
                {/* Red glow backlight */}
                <pointLight color="#FF3B3B" intensity={5} distance={18} />

                <Text
                    fontSize={4}
                    color="#FF3B3B"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight={900}
                    outlineWidth={0.05}
                    outlineColor="#000"
                >
                    YOU LOST
                </Text>

                <Text
                    position={[0, -3.5, 0]}
                    fontSize={0.9}
                    color="#ff9999"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.15}
                >
                    You were eliminated
                </Text>

                {/* PLAY AGAIN button */}
                <group position={[0, -6, 0]}>
                    <Html transform distanceFactor={25} zIndexRange={[100, 0]}>
                        <button 
                            onClick={() => {
                                AudioManager.startAmbient();
                                onReset();
                            }}
                            style={{ 
                                pointerEvents: 'auto',
                                background: 'rgba(255,59,59,0.18)',
                                border: '2px solid #FF3B3B',
                                color: '#FF3B3B',
                                fontSize: '18px',
                                fontWeight: 700,
                                padding: '12px 32px',
                                cursor: 'pointer',
                                textShadow: '0 0 10px #FF3B3B',
                                textTransform: 'uppercase',
                                outline: 'none'
                            }}
                        >
                            Try Again
                        </button>
                    </Html>
                </group>
            </Float>
        </group>
    );
}

function WorldSpaceHUD() {
    const remainingPlayers = useGameStore(state => state.remainingPlayers);
    const lastGoal = useGameStore(state => state.lastGoal);
    return (
        <group position={[0, 15, -30]}>
             <Html transform distanceFactor={50}>
                <div className="flex flex-col items-center gap-4 opacity-80 pointer-events-none select-none">
                     <div className="flex gap-10">
                         <div className="flex flex-col items-center">
                            <span className="text-[14px] font-mono text-teal-500/60 tracking-[0.4em] uppercase">Players Left</span>
                            <span className="text-9xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-[0_0_40px_rgba(0,128,128,0.4)]">
                                0{remainingPlayers}
                            </span>
                         </div>
                     </div>
                     <div className="w-full h-1 bg-teal-500/20 rounded-full overflow-hidden">
                         <motion.div 
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="w-1/3 h-full bg-teal-500/80 shadow-[0_0_15px_rgba(0,128,128,1)]"
                        />
                     </div>
                </div>
             </Html>
        </group>
    );
}

// --- Main Arena ---

// --- Crucible Scene (Inner R3F Context) ---

function CrucibleScene() {
  const { gameStarted, startGame, victory, gameOver, resetGame, advanceToNextTier, tier, eliminated } = useGameStore();
  const timer = useMemo(() => new THREE.Timer(), []);
  const worldConf = getWorldConfig(tier);

  useFrame(() => {
    timer.update();
  });

  const botGoalPositions = useMemo(() => {
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

  return (
    <>
        <scene fog={new THREE.FogExp2(worldConf.fog, 0.02)} />
        <Suspense fallback={null}>
            <PhysicsProvider>
                <CameraManager />
                
                {/* Environment */}
                <Environment preset={worldConf.preset} background blur={0.8} />
                <Sky sunPosition={[10, 2, 10]} />
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                
                {/* Lighting — bright arcade style */}
                <ambientLight intensity={0.4} />
                <pointLight position={[0, 15, 0]} intensity={2} color="#ffffff" />
                <directionalLight 
                    position={[40, 60, 40]} 
                    intensity={1.5} 
                    castShadow 
                    shadow-mapSize={[2048, 2048]} 
                    shadow-camera-far={200}
                />
                <pointLight position={[0, 8, 0]} intensity={1} color="#00eeff" />
                <pointLight position={[-15, 5, -15]} intensity={0.8} color="#ff6600" />
                <pointLight position={[15, 5, 15]} intensity={0.8} color="#00ff88" />

                <GameManager />
                <Crucible />
                <Ball />
                <Player />
                <EntryPortal />
                {tier >= 1 && <ExitPortal angle={5/ARENA_RADIUS} destinationUrl={`https://vibejam.cc/portal/2026?username=Whinhosa&color=32CD32&ref=goal-locked.vercel.app`} />}
                <GoalJuice />
                <CollisionParticles />
                <ScorchMarks />
                
                <WorldSpaceHUD />

                {/* Chaos Systems */}
                <DecoyBalls />
                {(() => {
                    const trapCount = 2 + (tier * 2);
                    return Array.from({ length: trapCount }).map((_, i) => {
                        const isGravityWell = tier >= 3 && (i + 1) % 3 === 0;
                        return isGravityWell ? (
                            <GravityWell key={`well-${i}`} />
                        ) : (
                            <FloorBumper key={`trap-${i}`} />
                        );
                    });
                })()}
                <PowerUp />
                <ConfettiExplosion />

                {gameOver && victory && <DiegeticVictoryUI onReset={advanceToNextTier} />}
                {(gameOver || eliminated[0]) && !victory && <DiegeticDefeatUI onReset={resetGame} />}

                {botGoalPositions.map((pos, i) => (
                    i !== 0 && <Bot key={i} id={i} goalPos={pos} />
                ))}
                
                <ContactShadows 
                    position={[0, 0.01, 0]} 
                    opacity={0.7} 
                    scale={50} 
                    blur={3} 
                    far={5} 
                />
            </PhysicsProvider>

            <EffectComposer multisampling={8}>
                <Bloom 
                    luminanceThreshold={1.0} 
                    mipmapBlur 
                    intensity={1.5} 
                    radius={0.4}
                />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} radialModulation={true} modulationOffset={0.5} />
                <Noise opacity={0.05} />
            </EffectComposer>
        </Suspense>
    </>
  );
}

// --- Keyboard Bridge (lives OUTSIDE Canvas so DOM focus is guaranteed) ---
function KeyboardBridge() {
  useEffect(() => {
    const keys: Record<string, boolean> = {};

    const updateDirection = () => {
      let x = 0, z = 0;
      if (keys['w'] || keys['arrowup'])    z -= 1;
      if (keys['s'] || keys['arrowdown'])  z += 1;
      if (keys['a'] || keys['arrowleft'])  x -= 1;
      if (keys['d'] || keys['arrowright']) x += 1;
      // Normalise diagonal
      const len = Math.sqrt(x * x + z * z);
      if (len > 0) { x /= len; z /= len; }
      console.log('Update direction:', [x, z]);
      useGameStore.getState().setMoveDirection([x, z]);
    };

    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault();
        keys[key] = true;
        updateDirection();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        useGameStore.getState().triggerPulse();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        useGameStore.getState().triggerDash();
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys[key] = false;
      updateDirection(); // recalculate — axis resets to 0 on key release
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return null;
}

// Dash cooldown ring HUD — lives outside the Canvas, updates via rAF
function DashCooldownHUD() {
  const gameStarted = useGameStore(s => s.gameStarted);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef    = React.useRef<number>(0);
  const COOLDOWN  = 3000;
  const SIZE      = 52;
  const R         = 20;

  useEffect(() => {
    if (!gameStarted) return;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const { dashCooldownUntil } = useGameStore.getState();
      const now = Date.now();
      const remaining = Math.max(dashCooldownUntil - now, 0);
      const progress  = 1 - remaining / COOLDOWN; // 0=empty 1=full
      const ready     = remaining <= 0;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Background track
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Progress arc
      const start = -Math.PI / 2;
      const end   = start + Math.PI * 2 * progress;
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R, start, end);
      ctx.strokeStyle = ready ? '#32CD32' : '#06b6d4';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Centre icon
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = ready ? '#32CD32' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', SIZE / 2, SIZE / 2 + 1);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameStarted]);

  if (!gameStarted) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', fontFamily: '"Poppins", sans-serif' }}>SHIFT — DASH</div>
    </div>
  );
}

// --- Main Arena Container ---

export default function GameArena() {
  const { gameStarted, startGame, resetGame, victory, gameOver, score, highScore, tier, setPlayerRingColor, triggerEntryPortal, eliminated, advanceToNextTier } = useGameStore();
  const worldConf = getWorldConfig(tier);

  // Portal auto-start logic
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isPortal = searchParams.get('portal');
    if (isPortal === 'true' && !gameStarted) {
      const color = searchParams.get('color');
      if (color) setPlayerRingColor(`#${color}`);
      startGame();
      triggerEntryPortal();
    }
  }, [gameStarted, startGame, setPlayerRingColor, triggerEntryPortal]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0B0B0B',
        touchAction: 'none',
      }}
    >
      {/* Keyboard input bridge — must be outside Canvas */}
      <KeyboardBridge />

      <Canvas
        style={{ width: '100%', height: '100%', display: 'block' }}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
        camera={{ position: [0, 50, 50], fov: 50 }}
      >
        <color attach="background" args={[worldConf.bg]} />
        <CrucibleScene />
      </Canvas>

      {/* HTML Start Screen */}
      {!gameStarted && (() => {
        const stats = Stats.load();
        return (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.12) 0%, transparent 70%)',
              zIndex: 100,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap" />
            <div style={{ textAlign: 'center' }}>
              {/* Tier badge */}
              {tier > 1 && (
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  padding: '4px 16px',
                  borderRadius: 999,
                  marginBottom: 12,
                  boxShadow: '0 0 20px rgba(251,191,36,0.6)',
                }}>⚔️ TIER {tier} — ESCALATED DIFFICULTY</div>
              )}

              <div style={{ fontSize: '5rem', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 0 60px rgba(100,180,255,0.6)' }}>
                ⚽ Goal-Locked
              </div>
              <div style={{ fontSize: '1.1rem', color: '#7dd3fc', marginTop: 12, fontWeight: 600, letterSpacing: '0.1em' }}>
                Football Battle Royale
              </div>

              {/* Stats panel */}
              <div style={{
                display: 'flex', gap: 24, justifyContent: 'center',
                marginTop: 24,
              }}>
                {[
                  { label: 'BEST SCORE', value: stats.highestScore.toString() },
                  { label: 'BOTS DELETED', value: stats.totalBotsDeleted.toString() },
                  { label: 'BEST TIER', value: `T${stats.highestTier}` },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '10px 20px',
                    minWidth: 90,
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{s.value}</div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(180,220,255,0.5)', letterSpacing: '0.12em', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  AudioManager.startAmbient();
                  startGame();
                }}
                style={{
                  marginTop: 28,
                  padding: '16px 56px',
                  background: tier > 1
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: tier > 1
                    ? '0 0 40px rgba(245,158,11,0.5)'
                    : '0 0 40px rgba(59,130,246,0.5)',
                  transition: 'transform 0.1s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {tier > 1 ? `⚔️ Enter Tier ${tier}` : 'Play Now'}
              </button>
              <div style={{ marginTop: 20, fontSize: '0.8rem', color: 'rgba(180,220,255,0.5)', letterSpacing: '0.08em' }}>
                WASD to move &nbsp;·&nbsp; Space to shoot &nbsp;·&nbsp; Shift to DASH
              </div>
            </div>
          </div>
        );
      })()}

      {/* HTML Victory Screen */}
      {victory && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.12) 0%, transparent 70%)',
            zIndex: 100,
            fontFamily: '"Poppins", sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.8)' }}>
              🏆 You Win!
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '1.2rem', marginTop: 8 }}>Tier Upgrade: Entrance Level Cleared</div>
            <div style={{ color: '#fbbf24', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
            <button
              onClick={() => {
                AudioManager.startAmbient();
                advanceToNextTier();
              }}
              style={{
                marginTop: 32,
                padding: '16px 56px',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* HTML Game Over Screen (Defeat) */}
      {(gameOver || eliminated[0]) && !victory && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.1) 0%, transparent 70%)',
            zIndex: 100,
            fontFamily: '"Poppins", sans-serif',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ff3b3b', textShadow: '0 0 40px rgba(255,59,59,0.5)' }}>
              ELIMINATED
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '1rem', marginTop: 8 }}>Tier Progress Halted</div>
            <div style={{ color: '#ff3b3b', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
            <button
              onClick={() => {
                AudioManager.startAmbient();
                resetGame();
              }}
              style={{
                marginTop: 32,
                padding: '16px 56px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                color: '#fff',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      <AudioController />
      <LeaderboardUI />
      <EliminationFeed />

      <div className="portrait-overlay">
        <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>LANDSCAPE MODE REQUIRED</div>
        <div style={{ fontSize: '1rem', marginTop: '10px', color: '#cbd5e1' }}>Please rotate your device to play the game.</div>
      </div>
      <DashCooldownHUD />
      <MobileControls />
    </div>
  );
}
