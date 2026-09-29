import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { usePhysics } from '../hooks/usePhysics';
import { useCameraShake } from '../hooks/useCameraShake';
import { useGameStore } from '../store/useGameStore';

// --- Dynamic Zoom Thresholds ---
const MAX_DIST = 40; // Tactical overview — camera pulls back
const MIN_DIST = 15;  // Action close-up — camera dives in

const CAM_Y_TACTICAL = 50;
const CAM_Y_ACTION   = 20;
const FOV_TACTICAL   = 50;
const FOV_ACTION     = 30;

export const CameraManager = () => {
  const { world }    = usePhysics();
  const victory      = useGameStore(s => s.victory);
  const playerPos    = useGameStore(s => s.playerPosition);
  const camTarget    = useRef(new THREE.Vector3());
  const camPosition  = useRef(new THREE.Vector3(0, CAM_Y_TACTICAL, 40));
  const orbitAngle   = useRef(0);

  // Trauma-based shake — adds noise offset on top of smooth cam position
  useCameraShake();

  useFrame((state, delta) => {
    const pCam = state.camera as THREE.PerspectiveCamera;

    // ── VICTORY ORBIT ────────────────────────────────────────────────────
    if (victory) {
      orbitAngle.current += delta * (Math.PI * 2 / 8); // one orbit per 8s
      const ORBIT_R = 18;
      const ORBIT_Y = 12;
      const cx = playerPos[0] + Math.cos(orbitAngle.current) * ORBIT_R;
      const cz = playerPos[2] + Math.sin(orbitAngle.current) * ORBIT_R;
      const target = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);

      state.camera.position.lerp(new THREE.Vector3(cx, ORBIT_Y, cz), 0.04);
      camTarget.current.lerp(target, 0.06);
      state.camera.lookAt(camTarget.current);

      if (pCam.fov !== undefined) {
        pCam.fov = THREE.MathUtils.lerp(pCam.fov, 35, 0.03);
        pCam.updateProjectionMatrix();
      }
      return;
    }

    // ── GAMEPLAY CAMERA MODES ────────────────────────────────────────────
    const stateStore = useGameStore.getState();
    const { ballPosition, currentRadius, cameraMode, eliminated, zoomOffset } = stateStore;
    const isPlayerDead = eliminated[0];
    const livePlayerPos = stateStore.playerPosition;
    const isPortrait = window.innerHeight > window.innerWidth;

    let targetPosition = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();
    let targetFov = FOV_ACTION;

    // 1. Global Midpoint Tracking
    let anchorX = 0;
    let anchorZ = 0;
    if (!isPlayerDead) {
      anchorX = (livePlayerPos[0] + ballPosition[0]) / 2;
      anchorZ = (livePlayerPos[2] + ballPosition[2]) / 2;
    } else {
      anchorX = ballPosition[0];
      anchorZ = ballPosition[2];
    }

    if (cameraMode === 'TACTICAL') {
      // High-altitude top-down overview
      const height = 75 + zoomOffset; // Apply Zoom globally
      // Fixed offset to avoid gimbal lock, looking slightly South
      targetPosition.set(anchorX, height, anchorZ + 0.01);
      targetLookAt.set(anchorX, 0, anchorZ);
      // Force "North" to be "Up" on the screen to prevent compass flip
      pCam.up.set(0, 0, -1);
      targetFov = isPortrait ? 60 : 50;
    } 
    else if (cameraMode === 'ORBIT') {
      pCam.up.set(0, 1, 0); // Restore normal up vector

      // Wider trailing "Action Cam" or rotating spectator view
      const orbitTarget = isPlayerDead ? ballPosition : livePlayerPos;
      orbitAngle.current += delta * 0.2;
      const radius = 35;
      const height = 25;
      targetPosition.set(
        orbitTarget[0] + Math.cos(orbitAngle.current) * radius,
        height,
        orbitTarget[2] + Math.sin(orbitAngle.current) * radius
      );
      targetLookAt.set(orbitTarget[0], 0, orbitTarget[2]);
      targetFov = 40;
    }
    else {
      pCam.up.set(0, 1, 0); // Restore normal up vector

      // DYNAMIC: Tracks midpoint between Player and Ball
      // Higher base altitude for mobile landscape so goals stay visible
      const isMobileLandscape = !isPortrait && window.innerWidth < 900;
      const baseHeight = isPortrait ? 60 : (isMobileLandscape ? 55 : 45);
      const targetYVal = baseHeight + zoomOffset;
      const targetZVal = anchorZ + (isPortrait ? 60 : 40) + (zoomOffset * 0.8);

      targetPosition.set(anchorX, targetYVal, targetZVal);
      targetLookAt.set(anchorX, 0, anchorZ);
      targetFov = isPortrait ? 40 : 35;
    }

    // Smooth Lerp transitions
    state.camera.position.lerp(targetPosition, 0.06);
    camTarget.current.lerp(targetLookAt, 0.08);
    state.camera.lookAt(camTarget.current);

    if (pCam.fov !== undefined) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFov, 0.05);
      pCam.updateProjectionMatrix();
    }
  });

  return null;
};
