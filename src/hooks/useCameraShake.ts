/**
 * useCameraShake — Applies a decaying trauma-based noise offset to the camera.
 *
 * Usage: call triggerShake(intensity) from any component inside the Canvas.
 * The hook applies the offset inside useFrame until the trauma fully decays.
 *
 * Intensity scale:
 *   0.3 = light rumble (high-speed ball bounce)
 *   0.7 = medium shake (bot eliminated)
 *   1.5 = heavy slam (player eliminated / goal scored)
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared singleton so any component can trigger shake → CameraManager reads it
const shakeState = {
  trauma: 0,
};

export function triggerShake(intensity: number) {
  // Trauma accumulates (capped at 1) and decays each frame
  shakeState.trauma = Math.min(shakeState.trauma + intensity, 1.0);
}

// Simple pseudo-random noise from seed
function noise(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Mount this hook inside CameraManager (or any useFrame-capable component).
 * It perturbs `state.camera.position` by a trauma-squared noise offset and
 * returns a stable `triggerShake` function reference.
 */
export function useCameraShake() {
  const frame = useRef(0);
  const shakeOffset = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (shakeState.trauma <= 0) {
      shakeOffset.current.set(0, 0, 0);
      return;
    }

    // Trauma decays faster at high values (feels snappier)
    shakeState.trauma = Math.max(0, shakeState.trauma - delta * 2.5);

    // trauma² gives a non-linear feel — intense peak, rapid falloff
    const magnitude = shakeState.trauma * shakeState.trauma;
    frame.current += 1;

    const t = frame.current;
    const ox = (noise(t * 1.0) * 2 - 1) * magnitude * 3.0;
    const oy = (noise(t * 2.3) * 2 - 1) * magnitude * 1.5;
    const oz = (noise(t * 3.7) * 2 - 1) * magnitude * 2.0;

    shakeOffset.current.set(ox, oy, oz);
    state.camera.position.add(shakeOffset.current);
  });
}
