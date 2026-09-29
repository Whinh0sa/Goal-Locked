import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCameraShake, triggerShake } from './useCameraShake';
import * as THREE from 'three';

let useFrameCallback: any = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: any) => {
    useFrameCallback = cb;
  }
}));

describe('useCameraShake', () => {
  beforeEach(() => {
    useFrameCallback = null;
    // reset global shakeState by decaying it to 0
    renderHook(() => useCameraShake());
    if (useFrameCallback) {
      useFrameCallback({ camera: { position: new THREE.Vector3() } }, 100);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accumulates trauma up to 1.0 via triggerShake and applies shake', () => {
    renderHook(() => useCameraShake());
    expect(useFrameCallback).not.toBeNull();

    // Trigger shake
    triggerShake(0.5);
    triggerShake(0.6); // Should cap at 1.0

    const mockState = {
      camera: {
        position: new THREE.Vector3(0, 0, 0)
      }
    };

    // First frame (delta = 0.1) -> trauma will be 1.0 - 0.1 * 2.5 = 0.75
    useFrameCallback(mockState, 0.1);

    // The camera position should have changed (added shakeOffset)
    expect(mockState.camera.position.x).not.toBe(0);
    expect(mockState.camera.position.y).not.toBe(0);
    expect(mockState.camera.position.z).not.toBe(0);
  });

  it('does not perturb camera if trauma is 0', () => {
    renderHook(() => useCameraShake());

    const mockState = {
      camera: {
        position: new THREE.Vector3(1, 2, 3)
      }
    };

    useFrameCallback(mockState, 0.1);

    // Position should be unchanged
    expect(mockState.camera.position.x).toBe(1);
    expect(mockState.camera.position.y).toBe(2);
    expect(mockState.camera.position.z).toBe(3);
  });
});
