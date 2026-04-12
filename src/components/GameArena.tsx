import React, { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars, Environment, ContactShadows, Html, PresentationControls, Float, Text } from '@react-three/drei';
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

const GOALS = 8;
const ARENA_RADIUS = 20;

// --- Diegetic 3D HUD Components ---

function LoadingOverlay() {
    return (
        <Float speed={5} rotationIntensity={2} floatIntensity={2}>
            <Text
                font="https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff"
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
                <Text
                    font="https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff"
                    fontSize={4}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    fontStyle="italic"
                >
                    CRUCIBLE
                </Text>
                <Text
                    position={[0, -3, 0]}
                    font="https://fonts.gstatic.com/s/robotomono/v22/L0tkDFwvuaCwsiZqcb99A660CcZ_O3O_S_S_S_S_S_.woff"
                    fontSize={0.5}
                    color="#00cccc"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.5}
                >
                    DEPLOYMENT_IMMINENT
                </Text>
                
                <group position={[0, -6, 0]} onClick={onStart}>
                    <mesh>
                        <planeGeometry args={[12, 2.5]} />
                        <meshBasicMaterial color="#008080" transparent opacity={0.2} />
                    </mesh>
                    <Text
                        font="https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff"
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
                    font="https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff"
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
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#020202]">
      <Canvas 
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: false, stencil: false, depth: true }} 
        camera={{ position: [0, 50, 50], fov: 50 }}
      >
        <scene fog={new THREE.FogExp2('#000000', 0.02)} />
        <Suspense fallback={<LoadingOverlay />}>
            <PresentationControls
              global
              zoom={0.8}
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 10, Math.PI / 10]}
              azimuth={[-Math.PI / 10, Math.PI / 10]}
              snap
            >
                <PhysicsProvider>
                    <CameraManager />
                    
                    {/* Elite Environment Mapping */}
                    <Environment preset="night" background blur={0.8} />
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
                    />

                    <GameManager />
                    <Crucible />
                    <Ball />
                    <Player />
                    <GoalJuice />
                    <CollisionParticles />
                    
                    <WorldSpaceHUD />

                    {!gameStarted && <DiegeticStartUI onStart={startGame} />}
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
            </PresentationControls>
        </Suspense>
      </Canvas>

      {/* Minimum HTML layer for Start/Victory Screens (Still using Framer Motion for high-end feel) */}
      <div className="absolute bottom-12 left-12 font-mono text-[10px] text-teal-500/60 tracking-[0.4em] uppercase select-none pointer-events-none drop-shadow-[0_0_10px_rgba(0,128,128,0.5)]">
           Crucible_OS // Sector_Control_System // v5.0.0_ULTRA
      </div>
    </div>
  );
}
