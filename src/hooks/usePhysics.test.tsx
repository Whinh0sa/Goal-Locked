import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PhysicsProvider, usePhysics } from './usePhysics';
import * as CANNON from 'cannon-es';
import { useFrame } from '@react-three/fiber';
import React from 'react';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

describe('usePhysics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if used outside PhysicsProvider', () => {
    // Suppress console.error for expected throws in React
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePhysics());
    }).toThrow('usePhysics must be used within PhysicsProvider');

    consoleError.mockRestore();
  });

  it('provides world and setTimeScale when used within PhysicsProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PhysicsProvider>{children}</PhysicsProvider>
    );

    const { result } = renderHook(() => usePhysics(), { wrapper });

    expect(result.current.world).toBeInstanceOf(CANNON.World);
    expect(result.current.world.gravity.y).toBe(-9.82);
    expect(typeof result.current.setTimeScale).toBe('function');
  });

  it('calls useFrame to step the physics world', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PhysicsProvider>{children}</PhysicsProvider>
    );

    const { result } = renderHook(() => usePhysics(), { wrapper });

    // Get the useFrame callback
    expect(useFrame).toHaveBeenCalledTimes(1);
    const useFrameCallback = vi.mocked(useFrame).mock.calls[0][0];

    // Spy on world.step
    const stepSpy = vi.spyOn(result.current.world, 'step');

    // Call the callback with delta = 0.016
    useFrameCallback({} as any, 0.016);

    // Default timeScale is 1.0, so step is min(0.016 * 1.0, 0.1) = 0.016
    expect(stepSpy).toHaveBeenCalledWith(1 / 60, 0.016, 10);
  });

  it('respects timeScale when stepping the physics world', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PhysicsProvider>{children}</PhysicsProvider>
    );

    const { result } = renderHook(() => usePhysics(), { wrapper });

    act(() => {
      result.current.setTimeScale(2.0);
    });

    // Re-renders happen, so we might have multiple useFrame calls, but it's the same callback identity or a new one.
    // Let's get the latest useFrame call
    const useFrameCallback = vi.mocked(useFrame).mock.calls.at(-1)![0];
    const stepSpy = vi.spyOn(result.current.world, 'step');

    useFrameCallback({} as any, 0.016);

    // timeScale is 2.0, so step is min(0.016 * 2.0, 0.1) = 0.032
    expect(stepSpy).toHaveBeenCalledWith(1 / 60, 0.032, 10);
  });

  it('caps the step at 0.1', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PhysicsProvider>{children}</PhysicsProvider>
    );

    const { result } = renderHook(() => usePhysics(), { wrapper });

    const useFrameCallback = vi.mocked(useFrame).mock.calls.at(-1)![0];
    const stepSpy = vi.spyOn(result.current.world, 'step');

    // Call with a large delta
    useFrameCallback({} as any, 0.5);

    // step should be capped at 0.1
    expect(stepSpy).toHaveBeenCalledWith(1 / 60, 0.1, 10);
  });
});
