import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { GravityWell } from './GravityWell';
import { useGameStore } from '../../store/useGameStore';
import * as CANNON from 'cannon-es';
import React from 'react';
import '@testing-library/jest-dom';
import * as THREE from 'three';

// Create a local variable to hold the useFrame callback
let useFrameCallback: any = null;

// Mock components and hooks
vi.mock('@react-three/drei', () => ({
  Float: ({ children }: { children: React.ReactNode }) => <div data-testid="float">{children}</div>,
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    useFrameCallback = callback;
  }),
}));

const mockApplyForce = vi.fn();
const mockWorld = {
  bodies: [] as any[],
};

vi.mock('../../hooks/usePhysics', () => ({
  usePhysics: () => ({ world: mockWorld }),
}));

// We'll mutate these to control the return value of useGameStore
let mockGameStarted = true;
let mockCurrentRadius = 30;

vi.mock('../../store/useGameStore', () => ({
  useGameStore: Object.assign(
    vi.fn((selector) => {
      const state = {
        gameStarted: mockGameStarted,
        currentRadius: mockCurrentRadius,
      };
      return selector(state);
    }),
    {
      getState: vi.fn(() => ({ currentRadius: mockCurrentRadius })),
    }
  ),
}));

// Mock ResizeObserver which is sometimes needed by react-testing-library and three.js
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mute console.error for R3F unknown elements warnings in JSDOM
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('is using incorrect casing')) return;
  if (typeof args[0] === 'string' && args[0].includes('is unrecognized in this browser')) return;
  if (typeof args[0] === 'string' && args[0].includes('React does not recognize the')) return;
  if (typeof args[0] === 'string' && args[0].includes('Received `true` for a non-boolean')) return;
  originalConsoleError(...args);
};

describe('GravityWell', () => {
  let originalRandom: () => number;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorld.bodies = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    mockGameStarted = true;
    mockCurrentRadius = 30;
    useFrameCallback = null;
    originalRandom = Math.random;
  });

  afterEach(() => {
    vi.useRealTimers();
    Math.random = originalRandom;
  });

  // A helper to safely trigger useFrameCallback with a fake clock
  // and handle DOM node refs in JSDOM
  const triggerUseFrame = (container: HTMLElement) => {
    // In JSDOM with testing-library, `<mesh ref={meshRef}>` assigns the DOM Element to `meshRef.current`.
    // The component tries to do `meshRef.current.scale.set(s,s,s)`.
    // Let's monkey-patch the scale property onto the DOM element before calling useFrame.
    const meshElement = container.querySelector('mesh');
    if (meshElement && !('scale' in meshElement)) {
      (meshElement as any).scale = { set: vi.fn() };
      (meshElement as any).material = new THREE.MeshStandardMaterial();
    }

    useFrameCallback({ clock: { getElapsedTime: () => 0 } });
  };

  it('renders null when game is not started', () => {
    mockGameStarted = false;
    const { container } = render(<GravityWell />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing initially (active=false), activates after random delay', () => {
    Math.random = () => 0.5; // Fixed delay: 5000 + 0.5 * 10000 = 10000ms
    const { container } = render(<GravityWell />);

    // Initially active=false, so it renders null
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1); // Reaches 10000ms
    });

    // Now it should be active and render the group
    expect(container.querySelector('[data-testid="float"]')).not.toBeNull();
  });

  it('deactivates after CYCLE_DURATION', () => {
    Math.random = () => 0.5; // Fixed delay: 10000ms
    const { container } = render(<GravityWell />);

    act(() => {
      // Fast-forward to activate
      vi.advanceTimersByTime(10000);
    });
    expect(container.querySelector('[data-testid="float"]')).not.toBeNull();

    act(() => {
      // Fast-forward past CYCLE_DURATION (6000ms)
      vi.advanceTimersByTime(6000);
    });
    expect(container.firstChild).toBeNull();
  });

  it('deactivates when random position is out of bounds (OOB sweeper)', () => {
    Math.random = () => 0.5; // Fixed delay: 10000ms, also affects random position
    mockCurrentRadius = 2; // VERY small, so any random position > 0 will be out of bounds

    const { container } = render(<GravityWell />);

    act(() => {
      vi.advanceTimersByTime(10000); // Activate
    });

    expect(container.querySelector('[data-testid="float"]')).not.toBeNull();
    expect(useFrameCallback).not.toBeNull();

    act(() => {
      triggerUseFrame(container);
      vi.advanceTimersByTime(0);
    });

    expect(container.firstChild).toBeNull();
  });

  it('applies force to dynamic bodies in range', () => {
    Math.random = () => 0; // Delay: 5000ms, Position: r = 0, a = 0 (origin)

    const body = {
      mass: 1,
      type: CANNON.Body.DYNAMIC,
      position: new CANNON.Vec3(10, 1, 0), // distance = ~10 (inside EFFECT_RADIUS = 15)
      applyForce: mockApplyForce,
    };
    mockWorld.bodies.push(body);

    const { container } = render(<GravityWell />);

    act(() => {
      // Activate it
      vi.advanceTimersByTime(5000);
    });

    expect(useFrameCallback).not.toBeNull();

    act(() => {
      // Trigger the callback
      triggerUseFrame(container);
    });

    expect(mockApplyForce).toHaveBeenCalled();
  });

  it('does not apply force to static bodies', () => {
    Math.random = () => 0; // Delay: 5000ms

    const body = {
      mass: 0, // static
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(10, 1, 0),
      applyForce: mockApplyForce,
    };
    mockWorld.bodies.push(body);

    const { container } = render(<GravityWell />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(useFrameCallback).not.toBeNull();

    act(() => {
      triggerUseFrame(container);
    });

    expect(mockApplyForce).not.toHaveBeenCalled();
  });
});
