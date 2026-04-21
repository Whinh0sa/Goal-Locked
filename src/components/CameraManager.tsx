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

    // ── NORMAL GAMEPLAY ──────────────────────────────────────────────────
    const playerBody = world.bodies.find(b => (b as any).userData?.isPlayer === true);
    
    let targetCamX = 0;
    let targetCamZ = 0;
    let targetCamY = 50;

    if (playerBody) {
      const pp = new THREE.Vector3().copy(playerBody.position as any);
      const isPortrait = window.innerHeight > window.innerWidth;
      targetCamX = pp.x * 1.4;
      targetCamZ = pp.z * 1.4;
      targetCamY = isPortrait ? 60 : 35; // Hover height
    }

    const idealPos = new THREE.Vector3(targetCamX, targetCamY, targetCamZ);
    camPosition.current.lerp(idealPos, 0.05);

    state.camera.position.copy(camPosition.current);
    state.camera.lookAt(0, 0, 0);

    if (pCam.fov !== undefined) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, FOV_ACTION, 0.05);
      pCam.updateProjectionMatrix();
    }
  });

  return null;
};
