import { useRef, useMemo, useEffect } from 'react';
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
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS + 2, 64]} />
        <meshStandardMaterial color="#080808" roughness={0.9} />
        {/* Floor Grid */}
        <gridHelper 
          args={[ARENA_RADIUS * 2, 20, '#FFBF00', '#1a1a1a']} 
          rotation-x={Math.PI / 2} 
          position-z={0.01}
        />
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
  const meshRef = useRef<THREE.Mesh>(null);
  
  const body = useMemo(() => {
    if (isGoal && !isEliminated) return null; // Opening in arena
    
    const shape = new CANNON.Box(new CANNON.Vec3(1, WALL_HEIGHT / 2, 0.5));
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

  return (
    <mesh 
      ref={meshRef} 
      position={[x, isGoal && !isEliminated ? 0.1 : WALL_HEIGHT / 2, z]} 
      rotation={[0, -angle, 0]}
      visible={!isGoal || isEliminated}
    >
      <boxGeometry args={[2.5, WALL_HEIGHT, 0.5]} />
      <meshStandardMaterial 
        color={isEliminated ? '#400' : '#111'} 
        roughness={0.2} 
        metalness={0.5}
      />
      {isEliminated && (
          <mesh position-z={0.3}>
              <boxGeometry args={[2.6, 0.2, 0.2]} />
              <meshBasicMaterial color="#f00" />
          </mesh>
      )}
    </mesh>
  );
};
