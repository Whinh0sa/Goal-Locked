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
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';
import { OrientationLock } from './UI/OrientationLock';
import { MobileControls } from './UI/MobileControls';
import { FadingText } from './UI/FadingText';
import { GOALS, ARENA_RADIUS } from '../constants';
import { EliminationFeed } from './UI/EliminationFeed';

// ... (skipping unchanged code for brevity in thought, but tool will use full content)

// --- Diegetic 3D HUD Components ---

function LoadingOverlay() {
    return (
        <Float speed={5} rotationIntensity={2} floatIntensity={2}>
            <Text
                fontSize={2}
                color="#00ffff"
                anchorX="center"
                anchorY="middle"
                maxWidth={20}
                textAlign="center"
                fontStyle="italic"
            >
                CRUCIBLE_OS_INITIALIZING...
            </Text>
        </Float>
    );
}

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
                    DEPLOYMENT_IMMINENT
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
                        INITIALIZE_SECTOR
                    </Text>
                </group>
            </Float>
        </group>
    );
}

function DiegeticVictoryUI({ onReset }: { onReset: () => void }) {
    return (
        <group position={[0, 8, 5]}>
            <Float speed={4} rotationIntensity={1} floatIntensity={2}>
                <Text
                    fontSize={3}
                    color="#00ffcc"
                    anchorX="center"
                    anchorY="middle"
                    fontStyle="italic"
                >
                    SECTOR_CLEARED
                </Text>
                <group position={[0, -4, 0]} onClick={onReset}>
                     <mesh>
                        <planeGeometry args={[8, 2]} />
                        <meshBasicMaterial color="white" transparent opacity={0.1} />
                    </mesh>
                    <Text
                        fontSize={0.6}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        RE-DEPLOY
                    </Text>
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
  const { gameStarted, startGame, victory, resetGame } = useGameStore();
  const timer = useMemo(() => new THREE.Timer(), []);

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
        <scene fog={new THREE.FogExp2('#000000', 0.02)} />
        <Suspense fallback={<LoadingOverlay />}>
            <PhysicsProvider>
                <CameraManager />
                
                {/* Environment */}
                <Environment preset="city" background blur={0.8} />
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
                <GoalJuice />
                <CollisionParticles />
                
                <WorldSpaceHUD />

                {victory && <DiegeticVictoryUI onReset={resetGame} />}

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

// --- Main Arena Container ---

export default function GameArena() {
  const { gameStarted, startGame, resetGame, victory } = useGameStore();

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
        <color attach="background" args={['#000']} />
        <CrucibleScene />
      </Canvas>

      {/* HTML Start Screen */}
      {!gameStarted && (
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
            <div style={{ fontSize: '5rem', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 0 60px rgba(100,180,255,0.6)' }}>
              ⚽ Goal-Locked
            </div>
            <div style={{ fontSize: '1.1rem', color: '#7dd3fc', marginTop: 12, fontWeight: 600, letterSpacing: '0.1em' }}>
              Football Battle Royale
            </div>
            <button
              onClick={startGame}
              style={{
                marginTop: 36,
                padding: '16px 56px',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(59,130,246,0.5)',
                transition: 'transform 0.1s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(59,130,246,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(59,130,246,0.5)'; }}
            >
              Play Now
            </button>
            <div style={{ marginTop: 20, fontSize: '0.8rem', color: 'rgba(180,220,255,0.5)', letterSpacing: '0.08em' }}>
              WASD / Arrow Keys to move &nbsp;·&nbsp; Space to shoot
            </div>
          </div>
        </div>
      )}

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
            <div style={{ color: '#cbd5e1', fontSize: '1rem', marginTop: 8 }}>Last player standing</div>
            <button
              onClick={resetGame}
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

      {/* Overlays */}
      <EliminationFeed />
      <MobileControls />
      <OrientationLock />
    </div>
  );
}
