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
    const ballBody   = world.bodies.find(b => b.mass === 1 && b.shapes[0] instanceof CANNON.Sphere);
    if (!playerBody || !ballBody) return;

    const pp = new THREE.Vector3().copy(playerBody.position as any);
    const bp = new THREE.Vector3().copy(ballBody.position as any);

    const dist = pp.distanceTo(bp);
    const t = THREE.MathUtils.clamp(1 - (dist - MIN_DIST) / (MAX_DIST - MIN_DIST), 0, 1);

    const targetY   = THREE.MathUtils.lerp(CAM_Y_TACTICAL, CAM_Y_ACTION, t);
    const targetFOV = THREE.MathUtils.lerp(FOV_TACTICAL,   FOV_ACTION,   t);
    const mobileFactor = (state.size.width / state.size.height) < 1.6 ? 1.35 : 1.0;

    const midpoint = new THREE.Vector3().lerpVectors(pp, bp, 0.4);
    camTarget.current.lerp(midpoint, 0.08);

    const idealPos = new THREE.Vector3(
      pp.x * 0.3,
      targetY * mobileFactor,
      pp.z * 0.3 + 35 * mobileFactor,
    );
    camPosition.current.lerp(idealPos, 0.05);

    state.camera.position.copy(camPosition.current);
    state.camera.lookAt(camTarget.current);

    if (pCam.fov !== undefined) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFOV, 0.06);
      pCam.updateProjectionMatrix();
    }
  });

  return null;
};
