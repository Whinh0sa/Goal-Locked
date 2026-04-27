import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, Environment, ContactShadows, Html } from '@react-three/drei';
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

// ─── Overlay Styles (shared) ────────────────────────────────────────────────
const OVERLAY_BASE: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Poppins", sans-serif',
    zIndex: 50,
    // Let touches through to the canvas when this overlay is transparent
    pointerEvents: 'none',
};

function StartScreen({ onStart, tier }: { onStart: () => void; tier: number }) {
    const stats = Stats.load();
    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.15) 0%, rgba(0,0,0,0.75) 60%)',
        }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
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
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24 }}>
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
                    onClick={onStart}
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
                        // Explicit touch action for mobile
                        touchAction: 'manipulation',
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
}

function VictoryScreen({ onReset, score }: { onReset: () => void; score: number }) {
    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.15) 0%, rgba(0,0,0,0.80) 60%)',
        }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.8)' }}>
                    🏆 You Win!
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '1.2rem', marginTop: 8 }}>Tier Upgrade: Entrance Level Cleared</div>
                <div style={{ color: '#fbbf24', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
                <button
                    onClick={onReset}
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
                        boxShadow: '0 0 40px rgba(59,130,246,0.5)',
                        touchAction: 'manipulation',
                    }}
                >
                    Play Again
                </button>
            </div>
        </div>
    );
}

function DefeatScreen({ onReset, score }: { onReset: () => void; score: number }) {
    return (
        <div style={{
            ...OVERLAY_BASE,
            background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.12) 0%, rgba(0,0,0,0.82) 60%)',
        }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ff3b3b', textShadow: '0 0 40px rgba(255,59,59,0.5)' }}>
                    ELIMINATED
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '1rem', marginTop: 8 }}>Tier Progress Halted</div>
                <div style={{ color: '#ff3b3b', fontSize: '1.8rem', fontWeight: 900, marginTop: 12 }}>SCORE: {score}</div>
                <button
                    onClick={onReset}
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
                        backdropFilter: 'blur(10px)',
                        touchAction: 'manipulation',
                    }}
                >
                    Try Again
                </button>
            </div>
        </div>
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
  const { gameStarted, startGame, victory, gameOver, resetGame, advanceToNextTier, tier, eliminated, score } = useGameStore();
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

                {/* All game-state menus have been moved outside the Canvas — see GameArena() below */}

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
      useGameStore.getState().setMoveDirection([x, z]);
    };

    const onDown = (e: KeyboardEvent) => {
      if (!useGameStore.getState().gameStarted) return; // Bug 5 fix: ignore pre-game input
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
      if (!useGameStore.getState().gameStarted) return; // Bug 5 fix: ignore pre-game input
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

// --- Camera Mode Selection UI ---

function CameraModeUI() {
  const { cameraMode, cycleCameraMode, gameStarted } = useGameStore();

  if (!gameStarted) return null;

  return (
    <div
      onClick={cycleCameraMode}
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '30px',
        padding: '12px 24px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        color: '#fff',
        fontFamily: '"Poppins", sans-serif',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>VIEW:</span>
      <span style={{ color: '#00eeff' }}>{cameraMode}</span>
    </div>
  );
}

// --- Zoom Slider HUD ---

function ZoomSliderHUD() {
  const gameStarted   = useGameStore(s => s.gameStarted);
  const zoomOffset    = useGameStore(s => s.zoomOffset);
  const setZoomOffset = useGameStore(s => s.setZoomOffset);

  if (!gameStarted) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 16,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      zIndex: 100,
      pointerEvents: 'auto',
    }}>
      {/* Card wrapper */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Label */}
        <span style={{
          fontSize: '0.5rem',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'rgba(0,238,255,0.7)',
          textTransform: 'uppercase',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}>ZOOM</span>

        {/* Vertical slider */}
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={zoomOffset}
          onChange={e => setZoomOffset(Number(e.target.value))}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            WebkitAppearance: 'slider-vertical',
            width: 28,
            height: 110,
            cursor: 'pointer',
            accentColor: '#00eeff',
            background: 'transparent',
          }}
        />

        {/* Value readout */}
        <span style={{
          fontSize: '0.55rem',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
        }}>{zoomOffset.toFixed(0)}</span>
      </div>
    </div>
  );
}

// --- Canvas Error Fallback ---

function CanvasFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(80,0,0,0.4) 0%, rgba(0,0,0,0.95) 70%)',
      fontFamily: '"Poppins", sans-serif',
      zIndex: 200,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        {/* Icon */}
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>

        {/* Headline */}
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ff3b3b', letterSpacing: '0.05em' }}>
          SYSTEM GLITCH
        </div>
        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: 8, lineHeight: 1.6 }}>
          A hazard caused an unexpected engine fault.
          <br />The 3D context has been safely contained.
        </div>

        {/* Error detail */}
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          background: 'rgba(255,59,59,0.08)',
          border: '1px solid rgba(255,59,59,0.2)',
          borderRadius: 8,
          fontSize: '0.65rem',
          color: 'rgba(255,180,180,0.7)',
          textAlign: 'left',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          {error?.message ?? 'Unknown error'}
        </div>

        {/* Reset button */}
        <button
          onClick={resetErrorBoundary}
          style={{
            marginTop: 24,
            padding: '14px 48px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(239,68,68,0.5)',
            touchAction: 'manipulation',
          }}
        >
          Restart Arena
        </button>
      </div>
    </div>
  );
}

// --- HUD Toggle UI ---

function HUDToggleButton() {
  const { isHudOpen, toggleHud, gameStarted } = useGameStore();

  if (!gameStarted) return null;

  return (
    <div
      onClick={toggleHud}
      style={{
        position: 'fixed',
        top: '64px',
        right: '16px',
        padding: '8px 12px',
        backgroundColor: isHudOpen ? 'rgba(0, 238, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${isHudOpen ? 'rgba(0, 238, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '8px',
        color: isHudOpen ? '#00eeff' : '#fff',
        fontFamily: '"Poppins", sans-serif',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ fontSize: '0.8rem' }}>☰</span>
      HUD
    </div>
  );
}

// --- Main Arena Container ---

export default function GameArena() {
  const { gameStarted, startGame, resetGame, victory, gameOver, score, highScore, tier, setPlayerRingColor, triggerEntryPortal, eliminated, advanceToNextTier, isHudOpen } = useGameStore();
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

      <ErrorBoundary FallbackComponent={CanvasFallback}>
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
      </ErrorBoundary>

      <AudioController />
      {isHudOpen && (
        <>
          <LeaderboardUI />
          <EliminationFeed />
        </>
      )}

      {/* ── 2D Game-State Overlays ─────────────────────────────────────────── */}
      {!gameStarted && (
        <StartScreen tier={tier} onStart={() => {
          AudioManager.startAmbient();
          startGame();
        }} />
      )}
      {gameOver && victory && (
        <VictoryScreen score={score} onReset={advanceToNextTier} />
      )}
      {(gameOver || eliminated[0]) && !victory && (
        <DefeatScreen score={score} onReset={() => {
          AudioManager.startAmbient();
          resetGame();
        }} />
      )}

      <div className="portrait-overlay">
        <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>LANDSCAPE MODE REQUIRED</div>
        <div style={{ fontSize: '1rem', marginTop: '10px', color: '#cbd5e1' }}>Please rotate your device to play the game.</div>
      </div>
      <DashCooldownHUD />
      <ZoomSliderHUD />
      <CameraModeUI />
      <HUDToggleButton />
      <MobileControls />
    </div>
  );
}
