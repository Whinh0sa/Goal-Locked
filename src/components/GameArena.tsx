import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
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
    <div className="relative w-full h-screen overflow-hidden bg-[#080808] font-sans selection:bg-tactical selection:text-black">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
        {/* Dynamic Camera managed by CameraManager */}
        <CameraManager />
        
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 10, 0]} intensity={1.5} color="#FFBF00" />
        <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <Environment preset="night" />

        <Suspense fallback={null}>
          <PhysicsProvider>
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
        </Suspense>

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

      {/* UI Overlay */}
      <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between select-none">
        {/* Header Stats */}
        <div className="flex justify-between items-start w-full">
          <div className="glass-panel px-6 py-4 flex flex-col border-l-4 border-l-tactical shadow-2xl">
            <h1 className="text-4xl font-poppins font-black text-white italic tracking-tighter uppercase leading-none">
                Goal <span className="text-tactical">Locked</span>
            </h1>
            <p className="text-[10px] font-mono tracking-[0.3em] text-[#FFBF00]/80 mt-2 uppercase flex items-center gap-2">
                <Cpu className="w-3 h-3" /> Tactical Survival Arena // V2.9
            </p>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <StatCard label="PLAYERS ACTIVE" value={`${remainingPlayers}`} />
            <div className="glass-panel px-3 py-1 flex items-center gap-2 border-[#FFBF00]/10">
                 <ShieldAlert className="w-3 h-3 text-red-500 animate-pulse" />
                 <span className="text-[9px] font-mono text-white/50 uppercase">Protocol: SURVIVE</span>
            </div>
          </div>
        </div>

        {/* Elimination Alert */}
        <div className="flex justify-center w-full mb-12">
            <AnimatePresence>
                {lastGoal !== null && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -50, opacity: 0, scale: 1.5 }}
                        className="glass-panel px-12 py-4 amber-glow border-tactical border-t-2 border-b-2 bg-black/90"
                    >
                        <h2 className="text-3xl font-poppins text-[#FFBF00] italic uppercase font-black tracking-[0.15em] flex items-center gap-4">
                            <span className="w-2 h-2 bg-tactical rounded-full animate-ping" />
                            {lastGoal === 0 ? "UNIT TERMINATED" : `GA-0${lastGoal + 1} OFFLINE`}
                        </h2>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end w-full">
            <div className="glass-panel px-6 py-4 flex gap-10 border-b-4 border-b-tactical/30">
                <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-[#FFBF00]/50 uppercase mb-1 tracking-widest">NAV_SYSTEM</span>
                    <span className="text-sm font-black text-white uppercase tracking-tighter">WASD</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-10">
                    <span className="text-[9px] font-mono text-[#FFBF00]/50 uppercase mb-1 tracking-widest">PULSE_CHARGE</span>
                    <span className="text-sm font-black text-white uppercase tracking-tighter">SPACE</span>
                </div>
            </div>

            <button 
                onClick={resetGame}
                className="pointer-events-auto p-5 glass-panel hover:bg-tactical/20 transition-all group amber-glow"
            >
                <RotateCcw className="w-8 h-8 text-white group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
            </button>
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
                <h2 className="text-8xl font-poppins font-black text-white italic tracking-tighter uppercase leading-tight">
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

const StatCard = ({ label, value }: { label: string, value: string }) => (
    <div className="glass-panel px-8 py-3 flex flex-col items-end border-r-4 border-r-tactical shadow-lg">
        <span className="text-[9px] font-mono text-[#FFBF00]/70 uppercase mb-1 tracking-widest leading-none">{label}</span>
        <span className="text-4xl font-poppins font-black text-white tabular-nums tracking-tighter leading-none">{value}</span>
    </div>
);
