import { useRef, useMemo, useEffect } from 'react';
import { MeshReflectorMaterial, MeshTransmissionMaterial, Box } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useGameStore } from '../store/useGameStore';

const ARENA_RADIUS = 20;
const SEGMENTS = 64;
const GOALS = 8;
const WALL_HEIGHT = 4;

export const Crucible = () => {
  const { world } = usePhysics();
  const eliminated = useGameStore(state => state.eliminated);
  
  const segments = useMemo(() => {
    const s = [];
    const angleStep = (Math.PI * 2) / SEGMENTS;
    const goalIndices = Array.from({ length: GOALS }, (_, i) => Math.floor((i * SEGMENTS) / GOALS));
    
    for (let i = 0; i < SEGMENTS; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * ARENA_RADIUS;
      const z = Math.sin(angle) * ARENA_RADIUS;
      
      const isGoalCenter = goalIndices.includes(i);
      const goalIndex = goalIndices.indexOf(i);
      
      s.push({
        angle,
        x, z,
        isGoal: isGoalCenter,
        goalIndex: goalIndex !== -1 ? goalIndex : null
      });
    }
    return s;
  }, []);

  return (
    <group>
      {/* Floor with High-End Reflections */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, 0]}>
        <circleGeometry args={[ARENA_RADIUS + 5, 128]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#101010"
          metalness={0.5}
          mirror={1}
        />
      </mesh>

      {/* Floor Grid (Subtle Diegetic Overlay) */}
      <gridHelper 
          args={[ARENA_RADIUS * 2.5, 40, '#FFBF00', '#1a1a1a']} 
          position={[0, 0.01, 0]}
      />

      {/* Neon Perimeter Ring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[ARENA_RADIUS - 0.2, ARENA_RADIUS, 128]} />
          <meshBasicMaterial color="#FFBF00" transparent opacity={0.3} />
      </mesh>

      {/* Boundary Walls & Gates */}
      {segments.map((seg, idx) => (
        <BoundarySegment 
          key={idx} 
          {...seg} 
          isEliminated={seg.goalIndex !== null ? eliminated[seg.goalIndex] : false} 
        />
      ))}
    </group>
  );
};

const BoundarySegment = ({ x, z, angle, isGoal, goalIndex, isEliminated }: any) => {
  const { world } = usePhysics();
  const meshRef = useRef<THREE.Group>(null);
  
  const body = useMemo(() => {
    if (isGoal && !isEliminated) return null; // Opening in arena
    
    const shape = new CANNON.Box(new CANNON.Vec3(1.25, WALL_HEIGHT / 2, 0.25));
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape });
    b.position.set(x, WALL_HEIGHT / 2, z);
    b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
    return b;
  }, [isGoal, isEliminated, x, z, angle]);

  useEffect(() => {
    if (body) {
      world.addBody(body);
      return () => { world.removeBody(body); };
    }
  }, [world, body]);

  const color = isEliminated ? '#ff0000' : '#FFBF00';

  return (
    <group position={[x, WALL_HEIGHT / 2, z]} rotation={[0, -angle, 0]}>
      {(!isGoal || isEliminated) && (
        <>
          {/* Main Barrier Section */}
          <mesh>
            <boxGeometry args={[2.5, WALL_HEIGHT, 0.2]} />
            {!isEliminated ? (
              <MeshTransmissionMaterial
                  thickness={0.5}
                  anisotropy={1}
                  chromaticAberration={0.05}
                  distortion={0.5}
                  distortionScale={0.5}
                  temporalDistortion={0.1}
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.5}
                  attenuationColor={color}
                  transparent
                  opacity={0.3}
              />
            ) : (
              <meshStandardMaterial 
                  color="#440000" 
                  emissive="#ff0000" 
                  emissiveIntensity={2} 
                  roughness={0} 
                  metalness={1}
              />
            )}
          </mesh>

          {/* Support Pillars */}
          <Box args={[0.2, WALL_HEIGHT + 1, 0.4]} position={[1.25, 0, 0]}>
               <meshStandardMaterial color="#1a1a1a" metalness={1} />
          </Box>
          <Box args={[0.2, WALL_HEIGHT + 1, 0.4]} position={[-1.25, 0, 0]}>
               <meshStandardMaterial color="#1a1a1a" metalness={1} />
          </Box>

          {/* Glowing Cap */}
          <Box args={[2.7, 0.1, 0.4]} position={[0, (WALL_HEIGHT / 2) + 0.5, 0]}>
               <meshBasicMaterial color={color} />
          </Box>
        </>
      )}
    </group>
  );
};
