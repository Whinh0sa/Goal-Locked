import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { PhysicsProvider } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
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
import { EliminationFeed } from './UI/EliminationFeed';
import { StartScreen } from './UI/StartScreen';
import { VictoryScreen } from './UI/VictoryScreen';
import { DefeatScreen } from './UI/DefeatScreen';
import { GOALS, ARENA_RADIUS } from '../constants';
import { AudioController } from './UI/AudioController';
import { CommandCenter } from './UI/CommandCenter';
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
  const { gameStarted, startGame, victory, gameOver, resetGame, advanceToNextTier, tier, eliminated, score, graphicsMode } = useGameStore(useShallow(state => ({
    gameStarted: state.gameStarted,
    startGame: state.startGame,
    victory: state.victory,
    gameOver: state.gameOver,
    resetGame: state.resetGame,
    advanceToNextTier: state.advanceToNextTier,
    tier: state.tier,
    eliminated: state.eliminated,
    score: state.score,
    graphicsMode: state.graphicsMode
  })));
  const timer = useMemo(() => new THREE.Timer(), []);
  const worldConf = getWorldConfig(tier);
  const isQuality = graphicsMode === 'QUALITY';

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
                    shadow-mapSize={isQuality ? [2048, 2048] : [512, 512]} 
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
                {/* Multi-drop Power-Ups: Tier scaled saturation */}
                {Array.from({ length: Math.min(1 + tier, 5) }).map((_, i) => (
                  <PowerUp key={`powerup-${i}`} />
                ))}
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

            {isQuality && (
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
            )}
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
      const key = e.key.toLowerCase();
      keys[key] = false;
      if (!useGameStore.getState().gameStarted) return; // Bug 5 fix: ignore pre-game input
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

// --- Canvas Error Fallback ---

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

function HUDToggleButton() {
  const { isHudOpen, isPaused, toggleHud, togglePause, gameStarted } = useGameStore(useShallow(state => ({
    isHudOpen: state.isHudOpen,
    isPaused: state.isPaused,
    toggleHud: state.toggleHud,
    togglePause: state.togglePause,
    gameStarted: state.gameStarted
  })));
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  const autoCollapseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-collapse desktop HUD after 5s of inactivity
  React.useEffect(() => {
    if (!isMobile && isHudOpen) {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = setTimeout(() => {
        if (useGameStore.getState().isHudOpen) toggleHud();
      }, 5000);
    }
    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
    };
  }, [isHudOpen, isMobile, toggleHud]);

  if (!gameStarted) return null;

  // On Mobile, we hide the pause button if we're already paused (the modal takes over)
  if (isMobile && isPaused) return null;

  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    top: '15px',
    right: '15px',
    width: '44px',
    height: '44px',
    backgroundColor: 'rgba(50, 205, 50, 0.2)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(50, 205, 50, 0.4)',
    borderRadius: '50%',
    color: '#32CD32',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    zIndex: 50,
    boxShadow: '0 0 15px rgba(50, 205, 50, 0.2)',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  };

  const desktopStyle: React.CSSProperties = {
    position: 'fixed',
    top: '24px',
    right: '24px',
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
  };

  const handleClick = () => {
    if (isMobile) {
      toggleHud();
      togglePause();
    } else {
      toggleHud();
    }
  };

  return (
    <button
      type="button"
      aria-label="Toggle HUD"
      onClick={handleClick}
      style={isMobile ? mobileStyle : desktopStyle}
      onFocus={(e) => {
        e.currentTarget.style.outline = isMobile ? '2px solid #32CD32' : '2px solid #00eeff';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {isMobile ? (
        <span>⏸</span>
      ) : (
        <>
          <span style={{ fontSize: '0.8rem' }}>☰</span>
          HUD
        </>
      )}
    </button>
  );
}

// --- +1 Life Banner — fires when player presses "Enter Next Tier" ---
function TierBanner() {
  const show = useGameStore(s => s.showLifeBanner);
  const tier  = useGameStore(s => s.tier);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            pointerEvents: 'none',
            background: 'rgba(20, 255, 0, 0.15)',
            border: '2px solid #14FF00',
            boxShadow: '0 0 20px rgba(20, 255, 0, 0.4), inset 0 0 15px rgba(20, 255, 0, 0.2)',
            padding: '16px 32px',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ fontSize: '28px' }}>🛡️</div>
          <div>
            <div style={{ color: '#14FF00', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '2px', textShadow: '0 0 10px #14FF00', margin: 0, lineHeight: 1 }}>
              TIER {tier} ENTERED
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px', marginTop: '4px' }}>
              +1 LIFE RESTORED
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Main Arena Container ---

export default function GameArena() {
  const { gameStarted, startGame, resetGame, victory, gameOver, score, highScore, tier, setPlayerRingColor, triggerEntryPortal, eliminated, advanceToNextTier, isHudOpen } = useGameStore(useShallow(state => ({
    gameStarted: state.gameStarted,
    startGame: state.startGame,
    resetGame: state.resetGame,
    victory: state.victory,
    gameOver: state.gameOver,
    score: state.score,
    highScore: state.highScore,
    tier: state.tier,
    setPlayerRingColor: state.setPlayerRingColor,
    triggerEntryPortal: state.triggerEntryPortal,
    eliminated: state.eliminated,
    advanceToNextTier: state.advanceToNextTier,
    isHudOpen: state.isHudOpen
  })));
  const worldConf = getWorldConfig(tier);

  // Portal auto-start logic
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isPortal = searchParams.get('portal');
    if (isPortal === 'true' && !gameStarted) {
      const color = searchParams.get('color');
      // Validate color as a hex string to prevent XSS injection
      if (color && /^[0-9A-Fa-f]{3,8}$/.test(color)) {
        setPlayerRingColor(`#${color}`);
      }
      startGame();
      triggerEntryPortal();
    }
  }, [gameStarted, startGame, setPlayerRingColor, triggerEntryPortal]);



  const graphicsMode = useGameStore(s => s.graphicsMode);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
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
          dpr={graphicsMode === 'QUALITY' ? [1, 1.5] : [1, 1]}
          gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
          camera={{ position: [0, 50, 50], fov: 50 }}
        >
          <color attach="background" args={[worldConf.bg]} />
          <CrucibleScene />
        </Canvas>
      </ErrorBoundary>

      <AudioController />
      <CommandCenter />

      {/* ── Persistent Kill Feed — always visible, top-left ───────────────── */}
      {gameStarted && (
        <div className="kill-feed-overlay">
          <EliminationFeed />
        </div>
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

      <TierBanner />

      <div className="portrait-overlay">
        <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>LANDSCAPE MODE REQUIRED</div>
        <div style={{ fontSize: '1rem', marginTop: '10px', color: '#cbd5e1' }}>Please rotate your device to play the game.</div>
      </div>
      <DashCooldownHUD />
      <HUDToggleButton />
      <MobileControls />
    </div>
  );
}
