import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, Environment, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
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

const GOALS = 8;
const ARENA_RADIUS = 20;

// --- Diegetic 3D HUD Components ---

function LoadingOverlay() {
    return (
        <Html center transform scale={1.5}>
            <div className="flex flex-col items-center justify-center p-12 bg-black/40 backdrop-blur-3xl border border-teal-500/20 rounded-full">
                <div className="w-32 h-32 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(0,128,128,0.5)]" />
                <h3 className="text-4xl font-poppins font-black text-teal-400 uppercase tracking-[0.5em] italic">Crucible_OS_Initializing</h3>
            </div>
        </Html>
    );
}

function WorldSpaceHUD() {
    const { remainingPlayers, lastGoal } = useGameStore();
    return (
        <group position={[0, 15, -30]}>
             <Html transform distanceFactor={50}>
                <div className="flex flex-col items-center gap-4 opacity-80 pointer-events-none select-none">
                     <div className="flex gap-10">
                         <div className="flex flex-col items-center">
                            <span className="text-[14px] font-mono text-teal-500/60 tracking-[0.4em] uppercase">Active_Units</span>
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

export default function GameArena() {
  const { gameStarted, startGame, victory, resetGame } = useGameStore();

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
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#020202]">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: false, stencil: false, depth: true }} 
        camera={{ position: [0, 50, 50], fov: 45 }}
      >
        <Suspense fallback={<LoadingOverlay />}>
            <PhysicsProvider>
                <CameraManager />
                
                {/* Elite Environment Mapping */}
                <Environment preset="night" />
                <Sky sunPosition={[10, -1, 10]} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                
                <ambientLight intensity={0.05} />
                <pointLight position={[0, 15, 0]} intensity={2.5} color="#008080" />
                <directionalLight 
                    position={[40, 60, 40]} 
                    intensity={1.5} 
                    castShadow 
                    shadow-mapSize={[4096, 4096]} 
                    shadow-camera-far={200}
                    shadow-camera-left={-50}
                    shadow-camera-right={50}
                    shadow-camera-top={50}
                    shadow-camera-bottom={-50}
                />

                <GameManager />
                <Crucible />
                <Ball />
                <Player />
                <GoalJuice />
                <CollisionParticles />
                
                <WorldSpaceHUD />

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
                    luminanceThreshold={1.2} 
                    mipmapBlur 
                    intensity={2} 
                    radius={0.4}
                />
                <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                <Noise opacity={0.05} />
            </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Minimum HTML layer for Start/Victory Screens (Still using Framer Motion for high-end feel) */}
      <AnimatePresence>
        {!gameStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/90 z-50 p-24"
          >
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
             <div className="text-center space-y-16 relative z-10">
                <div className="space-y-4">
                    <h1 className="text-[12rem] font-poppins font-black text-white italic tracking-tighter uppercase leading-[0.8] mix-blend-difference">
                        CRUCIBLE
                    </h1>
                    <div className="flex items-center gap-6 justify-center">
                         <div className="h-0.5 w-32 bg-teal-500" />
                         <span className="text-teal-400 font-mono tracking-[0.8em] uppercase text-sm">Deployment_Imminent</span>
                         <div className="h-0.5 w-32 bg-teal-500" />
                    </div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.1, backgroundColor: "#008080", color: "#FFF" }}
                    onClick={startGame}
                    className="px-24 py-6 border-2 border-teal-500 text-teal-500 font-poppins font-black uppercase tracking-[0.4em] text-xl transition-all shadow-[0_0_50px_rgba(0,128,128,0.3)]"
                >
                    Initialize_Sector
                </motion.button>
             </div>
          </motion.div>
        )}

        {victory && (
           <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-teal-600/20 backdrop-blur-3xl z-[60]"
           >
              <div className="text-center space-y-12">
                 <Trophy className="w-48 h-48 text-white mx-auto drop-shadow-2xl" />
                 <h2 className="text-9xl font-poppins font-black text-white italic tracking-tighter uppercase leading-none">SECTOR_CLEARED</h2>
                 <button 
                  onClick={resetGame}
                  className="px-20 py-5 bg-white text-black font-poppins font-black uppercase tracking-widest hover:bg-teal-400 transition-all shadow-2xl"
                 >
                   RE-DEPLOY
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-12 left-12 font-mono text-[10px] text-teal-500/40 tracking-[0.3em] uppercase select-none pointer-events-none">
           Crucible_OS // Sector_Control_System // v4.0.0_STABLE
      </div>
    </div>
  );
}
