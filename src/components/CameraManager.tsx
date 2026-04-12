import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';

export const CameraManager = () => {
  const { world } = usePhysics();
  const cameraTarget = useRef(new THREE.Vector3());
  const cameraPosition = useRef(new THREE.Vector3(0, 30, 40));

  useFrame((state) => {
    // Find player and ball bodies in the cannon world
    const playerBody = world.bodies.find(b => b.mass === 5); // Player mass is 5
    const ballBody = world.bodies.find(b => b.mass === 1);   // Ball mass is 1
    
    if (!playerBody || !ballBody) return;

    const playerPos = new THREE.Vector3().copy(playerBody.position as any);
    const ballPos = new THREE.Vector3().copy(ballBody.position as any);
    const ballVel = ballBody.velocity.length();

    // The target is the midpoint between player and ball, weighted towards ball
    const lookAtPos = new THREE.Vector3().lerpVectors(playerPos, ballPos, 0.4);
    cameraTarget.current.lerp(lookAtPos, 0.1);
    
    // Position: Stay behind player but dynamic
    const idealOffset = new THREE.Vector3(0, 25 + ballVel * 0.2, 30 + ballVel * 0.3);
    const idealPosition = playerPos.clone().add(idealOffset);
    
    cameraPosition.current.lerp(idealPosition, 0.05);
    
    state.camera.position.copy(cameraPosition.current);
    state.camera.lookAt(cameraTarget.current);
    
    // Dynamic FOV (Cast to PerspectiveCamera for TS safety)
    const pCamera = state.camera as THREE.PerspectiveCamera;
    if (pCamera.fov !== undefined) {
        pCamera.fov = THREE.MathUtils.lerp(pCamera.fov, 45 + ballVel * 0.5, 0.1);
        pCamera.updateProjectionMatrix();
    }
  });

  return null;
};
