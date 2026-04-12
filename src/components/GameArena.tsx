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
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, ShieldAlert, Cpu } from 'lucide-react';
import * as THREE from 'three';

const GOALS = 8;
const ARENA_RADIUS = 20;

export default function GameArena() {
  const { gameStarted, startGame, eliminated, lastGoal, victory, resetGame, remainingPlayers } = useGameStore();

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
<<<<<<< HEAD
    <div className="relative w-full h-screen overflow-hidden bg-[#080808] font-sans selection:bg-tactical selection:text-black">
      <Suspense fallback={<LoadingOverlay />}>
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }} camera={{ position: [0, 50, 50], fov: 45 }}>
            <PhysicsProvider>
                {/* Dynamic Camera managed by CameraManager (MUST BE INSIDE PhysicsProvider) */}
=======
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#050505] font-sans selection:bg-tactical selection:text-black scanlines">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }} camera={{ position: [0, 50, 50], fov: 45 }}>
        <Suspense fallback={<Html center fullscreen><LoadingOverlay /></Html>}>
            <PhysicsProvider>
>>>>>>> 816b9a1 (Premium Overhaul: High-fidelity shaders, Reflector floor, Force fields, and HUD update)
                <CameraManager />
                
                <Sky sunPosition={[100, 20, 100]} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
<<<<<<< HEAD
                <ambientLight intensity={0.2} />
                <pointLight position={[0, 10, 0]} intensity={1.5} color="#FFBF00" />
                <directionalLight 
                    position={[10, 20, 10]} 
                    intensity={1.2} 
                    castShadow 
                    shadow-mapSize={[1024, 1024]} 
=======
                <ambientLight intensity={0.1} />
                <pointLight position={[0, 10, 0]} intensity={1.5} color="#FFBF00" />
                <directionalLight 
                    position={[20, 40, 20]} 
                    intensity={1.5} 
                    castShadow 
                    shadow-mapSize={[2048, 2048]} 
>>>>>>> 816b9a1 (Premium Overhaul: High-fidelity shaders, Reflector floor, Force fields, and HUD update)
                />
                <Environment preset="night" />

                <GameManager />
                <Crucible />
                <Ball />
                <Player />
                
                {/* AI Bots 1-7 */}
                {botGoalPositions.map((pos, i) => (
                    i !== 0 && <Bot key={i} id={i} goalPos={pos} />
                ))}
                
                <ContactShadows 
                    position={[0, 0.01, 0]} 
                    opacity={0.6} 
                    scale={ARENA_RADIUS * 2.5} 
                    blur={2.4} 
                    far={4.5} 
                />
            </PhysicsProvider>

<<<<<<< HEAD
            <EffectComposer>
                <Bloom 
                    luminanceThreshold={0.5} 
                    mipmapBlur 
                    intensity={1.2} 
                    radius={0.4}
                />
                <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
                <Noise opacity={0.05} />
            </EffectComposer>
        </Canvas>
      </Suspense>
=======
            <EffectComposer disableNormalPass>
                <Bloom 
                    luminanceThreshold={0.5} 
                    mipmapBlur 
                    intensity={1.5} 
                    radius={0.3}
                />
                <ChromaticAberration offset={new THREE.Vector2(0.0015, 0.0015)} />
                <Noise opacity={0.08} />
            </EffectComposer>
        </Suspense>
      </Canvas>
>>>>>>> 816b9a1 (Premium Overhaul: High-fidelity shaders, Reflector floor, Force fields, and HUD update)

      {/* Diegetic UI Overlay */}
      <div className="absolute inset-0 p-8 pointer-events-none flex flex-col justify-between select-none z-10">
        
        {/* Top Bar: Tactical Status */}
        <div className="flex justify-between items-start w-full">
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-4">
                 <div className="w-1.5 h-12 bg-tactical amber-glow" />
                 <div className="flex flex-col">
                    <h1 className="text-5xl font-poppins font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                        GOAL <span className="text-tactical">LOCKED</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Cpu className="w-3 h-3 text-tactical" />
                        <span className="text-[10px] font-mono tracking-[0.4em] text-white/40 uppercase">Crucible_OS // v2.9.4</span>
                    </div>
                 </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col gap-3 items-end"
          >
            <StatCard label="PLAYERS_ACTIVE" value={`0${remainingPlayers}`} />
            <div className="flex items-center gap-3">
                 <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">System_Link: Stable</span>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </div>
          </motion.div>
        </div>

        {/* Elimination Alert */}
        <div className="flex justify-center w-full">
            <AnimatePresence mode="wait">
                {lastGoal !== null && (
                    <motion.div 
                        key={lastGoal}
                        initial={{ scale: 0.5, opacity: 0, filter: 'blur(10px)' }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
                        className="glass-panel px-16 py-6 amber-glow border-2 border-tactical/50 bg-black/80 backdrop-blur-xl flex flex-col items-center"
                    >
                        <ShieldAlert className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                        <h2 className="text-4xl font-poppins text-white italic uppercase font-black tracking-[0.2em]">
                            {lastGoal === 0 ? "UNIT_ELIMINATED" : `GA-0${lastGoal + 1}_OFFLINE`}
                        </h2>
                        <div className="w-full h-1 bg-white/5 mt-4 overflow-hidden">
                            <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1.5 }}
                                className="h-full bg-tactical"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Bottom HUD: Telemetry */}
        <div className="flex justify-between items-end w-full">
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex gap-1"
            >
                <ControlBadge label="MOVE" keys="WASD" />
                <ControlBadge label="PULSE" keys="SPACE" />
            </motion.div>

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-6"
            >
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Reboot_Protocol</span>
                    <button 
                        onClick={resetGame}
                        className="pointer-events-auto p-4 glass-panel border-tactical/20 hover:border-tactical transition-all group amber-glow mt-1"
                    >
                        <RotateCcw className="w-6 h-6 text-white group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </motion.div>
        </div>

        {/* Mobile Controls (Visible only on touch devices) */}
        <div className="absolute bottom-24 left-12 md:hidden pointer-events-auto">
            <div className="w-32 h-32 glass-panel rounded-full flex items-center justify-center opacity-40">
                 <div className="w-12 h-12 bg-tactical rounded-full amber-glow opacity-80" />
            </div>
            <div className="text-[10px] font-mono text-tactical/50 text-center mt-2 tracking-widest uppercase">Joystick_Emu</div>
        </div>
        
        <div className="absolute bottom-24 right-24 md:hidden pointer-events-auto">
             <button className="w-24 h-24 glass-panel rounded-full border-2 border-tactical text-tactical font-poppins font-black text-xs uppercase tracking-[0.2em] amber-glow shadow-2xl active:scale-90 transition-transform">
                 PULSE
             </button>
        </div>
      </div>

      {/* Start Screen */}
      <AnimatePresence>
        {!gameStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/95 z-50 overflow-hidden"
          >
             {/* Background Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,191,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,191,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            <div className="text-center space-y-12 relative z-10">
              <div className="relative inline-block">
                <Trophy className="w-32 h-32 text-tactical mx-auto mb-4" />
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-tactical/20 blur-3xl -z-10"
                />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-8xl font-poppins font-black text-white italic tracking-tighter uppercase leading-tight text-center">
                    Defend <br/> <span className="text-tactical">OR</span> Delete
                </h2>
                <div className="h-0.5 w-24 bg-tactical mx-auto mb-4" />
                <p className="text-white/60 font-mono tracking-[0.5em] max-w-md mx-auto uppercase text-[10px]">Crucible Deployment Imminent</p>
              </div>

              <motion.button 
                whileHover={{ scale: 1.05, letterSpacing: '0.4em' }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="px-20 py-5 bg-tactical text-black font-poppins font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-tactical/40"
              >
                Engage
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Notification */}
      <AnimatePresence>
        {victory && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/95 z-[60]"
          >
             <div className="absolute inset-0 bg-tactical/5 animate-pulse" />
             <h2 className="text-[12rem] font-poppins font-black text-[#FFBF00] italic tracking-tighter uppercase leading-none opacity-20 absolute select-none">CHAMPION</h2>
            
            <div className="text-center space-y-10 relative z-10">
               <Trophy className="w-40 h-40 text-tactical mx-auto drop-shadow-[0_0_30px_rgba(255,191,0,0.6)]" />
               <div className="space-y-2">
                 <h3 className="text-6xl font-poppins font-black text-white uppercase italic tracking-tighter">Crucible Master</h3>
                 <p className="font-mono text-tactical/60 tracking-widest uppercase text-xs">All Opponents Deleted</p>
               </div>
               <button 
                onClick={resetGame}
                className="px-20 py-5 border-2 border-white text-white font-poppins font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
              >
                Re-Deploy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
    return (
<<<<<<< HEAD
        <div className="glass-panel px-8 py-3 flex flex-col items-end border-r-4 border-r-tactical shadow-lg">
            <span className="text-[9px] font-mono text-[#FFBF00]/70 uppercase mb-1 tracking-widest leading-none">{label}</span>
            <span className="text-4xl font-poppins font-black text-white tabular-nums tracking-tighter leading-none">{value}</span>
=======
        <div className="glass-panel px-10 py-4 flex flex-col items-end border-r-8 border-r-tactical shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-full bg-tactical/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <span className="text-[10px] font-mono text-[#FFBF00]/60 uppercase mb-1 tracking-[0.3em] leading-none z-10">{label}</span>
            <span className="text-5xl font-poppins font-black text-white tabular-nums tracking-tighter leading-none z-10">{value}</span>
>>>>>>> 816b9a1 (Premium Overhaul: High-fidelity shaders, Reflector floor, Force fields, and HUD update)
        </div>
    );
}

<<<<<<< HEAD
function LoadingOverlay() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-tactical border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                <p className="font-mono text-tactical tracking-widest uppercase text-xs">Initializing_Crucible...</p>
=======
function ControlBadge({ label, keys }: { label: string, keys: string }) {
    return (
        <div className="glass-panel px-6 py-3 flex flex-col border-t-2 border-white/5 bg-white/2">
            <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.4em] mb-1">{label}</span>
            <span className="text-lg font-black text-white uppercase tracking-tighter font-poppins italic">{keys}</span>
        </div>
    )
}

function LoadingOverlay() {
    return (
        <div className="flex flex-col items-center justify-center">
            <div className="w-24 h-24 border-2 border-tactical border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(255,191,0,0.3)]" />
            <div className="space-y-4 text-center">
                <h3 className="text-2xl font-poppins font-black text-white uppercase tracking-[0.5em] italic">CRUCIBLE_BOOTING</h3>
                <div className="flex gap-1 justify-center">
                     {[1,2,3].map(i => (
                         <motion.div 
                            key={i}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            className="w-2 h-2 bg-tactical" 
                        />
                     ))}
                </div>
>>>>>>> 816b9a1 (Premium Overhaul: High-fidelity shaders, Reflector floor, Force fields, and HUD update)
            </div>
        </div>
    );
}
