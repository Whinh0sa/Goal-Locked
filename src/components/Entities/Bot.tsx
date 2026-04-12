import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../../hooks/usePhysics';
import { useGameStore } from '../../store/useGameStore';

const BOT_RADIUS = 1;
const ARENA_RADIUS = 20;

interface BotProps {
  id: number;
  goalPos: THREE.Vector3;
}

export const Bot = ({ id, goalPos }: BotProps) => {
  const { world } = usePhysics();
  const eliminated = useGameStore(state => state.eliminated);
  const isOut = eliminated[id];
  
  const meshRef = useRef<THREE.Group>(null);
  const moveSpeed = 9 + Math.random() * 2;
  
  const body = useMemo(() => {
    const b = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(BOT_RADIUS),
      fixedRotation: true,
      linearDamping: 0.9,
    });
    // Position near their goal
    b.position.set(goalPos.x * 0.8, 1, goalPos.z * 0.8);
    return b;
  }, [goalPos]);

  useEffect(() => {
    if (!isOut) {
      world.addBody(body);
      return () => { world.removeBody(body); };
    }
  }, [world, body, isOut]);

  useFrame((state, delta) => {
    if (isOut || !body) return;

    // --- Weighted Behavior Tree ---
    const ballBody = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
    if (!ballBody) return;

    const ballPos = new THREE.Vector3().copy(ballBody.position as any);
    const myPos = new THREE.Vector3().copy(body.position as any);
    const distToBall = myPos.distanceTo(ballPos);
    const distBallToGoal = ballPos.distanceTo(goalPos);
    
    let target = new THREE.Vector3();
    let weightDefense = 0;
    let weightAttack = 0;

    // 1. Defense Weight: High if ball is close to my goal
    if (distBallToGoal < 10) {
        weightDefense = 1.0;
    } else if (distBallToGoal < 15) {
        weightDefense = 0.5;
    }

    // 2. Attack Weight: High if I am close to the ball and not in immediate danger
    if (distToBall < 8 && weightDefense < 0.8) {
        weightAttack = 0.7;
    }

    // Decision Making
    if (weightDefense > weightAttack) {
        // Defensive target: intercept ball path to goal
        const interceptPoint = new THREE.Vector3().lerpVectors(goalPos, ballPos, 0.3);
        target.copy(interceptPoint);
    } else if (weightAttack > 0) {
        // Attack target: stay behind the ball relative to a random opponent's goal
        // (Actually, just move towards the ball to push it)
        target.copy(ballPos);
    } else {
        // Idle: stay near goal quadrant
        target.copy(goalPos.clone().multiplyScalar(0.7));
    }

    const moveDir = new THREE.Vector3().subVectors(target, myPos).normalize();
    if (myPos.distanceTo(target) > 0.5) {
        body.applyForce(new CANNON.Vec3(moveDir.x * moveSpeed * 40, 0, moveDir.z * moveSpeed * 40), body.position);
    }

    // Facing
    if (meshRef.current) {
        meshRef.current.position.copy(body.position as any);
        if (moveDir.length() > 0) {
            const targetRot = Math.atan2(moveDir.x, moveDir.z);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot, 0.1);
        }
    }
  });

  if (isOut) return null;

  return (
    <group ref={meshRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.7, 0.8, 2, 6]} />
        <meshStandardMaterial color="#444" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0.5]}>
        <boxGeometry args={[0.5, 0.1, 0.1]} />
        <meshBasicMaterial color={isOut ? "#500" : "#999"} />
      </mesh>
    </group>
  );
};
