import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';

// --- Dynamic Zoom Thresholds ---
const MAX_DIST = 15; // Tactical overview — camera pulls back
const MIN_DIST = 4;  // Action close-up — camera dives in

const CAM_Y_TACTICAL = 50;
const CAM_Y_ACTION   = 20;
const FOV_TACTICAL   = 50;
const FOV_ACTION     = 30;

export const CameraManager = () => {
  const { world }   = usePhysics();
  const camTarget   = useRef(new THREE.Vector3());
  const camPosition = useRef(new THREE.Vector3(0, CAM_Y_TACTICAL, 40));

  useFrame((state) => {
    // Identify bodies
    const playerBody = world.bodies.find(b => (b as any).userData?.isPlayer === true);
    const ballBody   = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
    if (!playerBody || !ballBody) return;

    const playerPos = new THREE.Vector3().copy(playerBody.position as any);
    const ballPos   = new THREE.Vector3().copy(ballBody.position as any);

    // --- Dynamic Zoom ---
    const dist = playerPos.distanceTo(ballPos);
    // t = 0 → they are far apart (MAX_DIST+) → Tactical view
    // t = 1 → they are close together (MIN_DIST-) → Action view
    const t = THREE.MathUtils.clamp(
      1 - (dist - MIN_DIST) / (MAX_DIST - MIN_DIST),
      0,
      1
    );

    const targetY   = THREE.MathUtils.lerp(CAM_Y_TACTICAL, CAM_Y_ACTION, t);
    const targetFOV = THREE.MathUtils.lerp(FOV_TACTICAL,   FOV_ACTION,   t);

    // Mobile: pull back further on portrait aspect ratio
    const mobileFactor = (state.size.width / state.size.height) < 1.6 ? 1.35 : 1.0;

    // Midpoint camera focus (40% bias toward ball)
    const midpoint = new THREE.Vector3().lerpVectors(playerPos, ballPos, 0.4);
    camTarget.current.lerp(midpoint, 0.08);

    // Smooth camera position toward ideal
    const idealPos = new THREE.Vector3(
      playerPos.x * 0.3,                    // slight lateral follow
      targetY * mobileFactor,
      playerPos.z * 0.3 + 35 * mobileFactor // always behind player
    );
    camPosition.current.lerp(idealPos, 0.05);

    state.camera.position.copy(camPosition.current);
    state.camera.lookAt(camTarget.current);

    // Smooth FOV transition
    const pCam = state.camera as THREE.PerspectiveCamera;
    if (pCam.fov !== undefined) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFOV, 0.06);
      pCam.updateProjectionMatrix();
    }
  });

  return null;
};
