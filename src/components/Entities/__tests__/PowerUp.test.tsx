import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { PowerUp } from '../PowerUp';
import * as THREE from 'three';

// Mock Zustand store and state
let mockGameState = {
  gameStarted: true,
  currentRadius: 100,
  playerPosition: [0, 0, 0],
  eliminated: { 0: false },
};

const mockActions = {
  triggerPowerUp: vi.fn(),
  registerPowerUp: vi.fn(),
  unregisterPowerUp: vi.fn(),
};

vi.mock('../../../store/useGameStore', () => {
  const store: any = vi.fn((selector: any) => {
    return selector({ ...mockGameState, ...mockActions });
  });
  // Assign a mock getState method
  store.getState = vi.fn(() => {
    return { ...mockGameState, ...mockActions };
  });
  return { useGameStore: store };
});

// Mock physics world
const mockPhysicsWorld = {
  bodies: [] as any[],
};

vi.mock('../../../hooks/usePhysics', () => ({
  usePhysics: () => ({ world: mockPhysicsWorld }),
}));

// Mock R3F useFrame
// Export a mutable frame manager so we can trigger frames in tests
export const mockFiberState = {
  frameCallbacks: [] as any[],
  __triggerFrame: (state: any = {}, delta: number = 0.016) => {
    mockFiberState.frameCallbacks.forEach(cb => cb(state, delta));
  },
  __clearFrames: () => {
    mockFiberState.frameCallbacks = [];
  }
};

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: any) => {
    mockFiberState.frameCallbacks.push(cb);
  }
}));

// Mock Drei Float
vi.mock('@react-three/drei', () => ({
  Float: ({ children }: any) => <group data-testid="drei-float">{children}</group>,
}));

describe('PowerUp Component', () => {
  const origError = console.error;

  beforeEach(() => {
    vi.useFakeTimers();
    console.error = vi.fn(); // Suppress R3F HTML-tag warnings in jsdom

    // Reset mocks
    vi.clearAllMocks();

    // Reset state
    mockGameState = {
      gameStarted: true,
      currentRadius: 100,
      playerPosition: [0, 0, 0],
      eliminated: { 0: false },
    };

    // Reset physics bodies
    mockPhysicsWorld.bodies = [];

    // Clear frame callbacks
    mockFiberState.__clearFrames();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    console.error = origError;
  });

  it('renders nothing initially before 5s timeout, then renders and registers', () => {
    render(<PowerUp />);

    // Initial state: not visible
    expect(mockActions.registerPowerUp).not.toHaveBeenCalled();

    // Advance timers by 5s to trigger spawn
    vi.advanceTimersByTime(5000);

    expect(mockActions.registerPowerUp).toHaveBeenCalledTimes(1);
    const args = mockActions.registerPowerUp.mock.calls[0];
    expect(args[0]).toMatch(/^pw-/); // ID check
    expect(args[1]).toHaveProperty('type');
    expect(args[1]).toHaveProperty('position');
  });

  it('unregisters on unmount or gameStarted=false', () => {
    mockGameState.gameStarted = false;
    const { unmount } = render(<PowerUp />);

    expect(mockActions.unregisterPowerUp).toHaveBeenCalledTimes(1);

    mockGameState.gameStarted = true;
    unmount(); // Unmount component
  });

  it('triggers power-up when player is close', () => {
    const { unmount, rerender } = render(<PowerUp />);

    // Advance 5s to spawn
    vi.advanceTimersByTime(5000);

    // Let's force playerPosition to be far away first
    mockGameState.playerPosition = [1000, 0, 1000];
    mockFiberState.__triggerFrame(); // Should not trigger pickup

    expect(mockActions.triggerPowerUp).not.toHaveBeenCalled();

    const registeredPos = mockActions.registerPowerUp.mock.calls[0][1].position;
    mockGameState.playerPosition = registeredPos; // Set player exactly at orb pos

    // React state updates (e.g. spawnPos) in the useEffect might need a render tick

    // Because we updated the mock gameState but Zustand's useGameStore.getState() is called in useFrame,
    // we need to make sure the mock store returns the updated state.
    // Our mock of useGameStore.getState() reads from mockGameState.

    rerender(<PowerUp />);
    mockFiberState.__triggerFrame();

    expect(mockActions.triggerPowerUp).toHaveBeenCalledTimes(1);
    const triggerArgs = mockActions.triggerPowerUp.mock.calls[0];
    expect(typeof triggerArgs[0]).toBe('string'); // type
    expect(triggerArgs[1]).toBe(0); // entityId for player is 0
    unmount();
  });

  it('triggers power-up when a bot is close', () => {
    const { unmount, rerender } = render(<PowerUp />);
    vi.advanceTimersByTime(5000);

    const registeredPos = mockActions.registerPowerUp.mock.calls[0][1].position;

    // Set player away
    mockGameState.playerPosition = [1000, 0, 1000];

    // Create a mock bot body
    mockPhysicsWorld.bodies = [
      {
        position: new THREE.Vector3(registeredPos[0], registeredPos[1], registeredPos[2]),
        userData: { id: 1 },
      }
    ];

    rerender(<PowerUp />);
    mockFiberState.__triggerFrame();

    expect(mockActions.triggerPowerUp).toHaveBeenCalledTimes(1);
    expect(mockActions.triggerPowerUp.mock.calls[0][1]).toBe(1); // Bot ID
    unmount();
  });

  it('respawns after pickup', () => {
    const { unmount, rerender } = render(<PowerUp />);
    vi.advanceTimersByTime(5000); // initial spawn

    const registeredPos = mockActions.registerPowerUp.mock.calls[0][1].position;
    mockGameState.playerPosition = registeredPos;

    // Re-render to ensure useFrame gets the updated Zustand mock state closure
    rerender(<PowerUp />);
    mockFiberState.__triggerFrame(); // Pickup triggers

    expect(mockActions.triggerPowerUp).toHaveBeenCalledTimes(1);
    mockActions.registerPowerUp.mockClear();

    // Advance timers by respawn delay (12000ms)
    vi.advanceTimersByTime(12000);

    expect(mockActions.registerPowerUp).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('forces respawn if swallowed by wall (out of bounds)', () => {
    const { unmount, rerender } = render(<PowerUp />);
    vi.advanceTimersByTime(5000); // initial spawn

    // Move player away
    mockGameState.playerPosition = [1000, 0, 1000];

    // Shrink arena to be smaller than the orb's position
    mockGameState.currentRadius = 1; // Spawn pos is typically r=5+ so this makes it OOB

    mockActions.registerPowerUp.mockClear();
    mockActions.unregisterPowerUp.mockClear();

    rerender(<PowerUp />);
    mockFiberState.__triggerFrame(); // Should trigger OOB sweeper

    expect(mockActions.unregisterPowerUp).toHaveBeenCalledTimes(1);

    // Advance short respawn timer (2000ms)
    vi.advanceTimersByTime(2000);

    expect(mockActions.registerPowerUp).toHaveBeenCalledTimes(1);
    unmount();
  });
});
