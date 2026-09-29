import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PowerUp } from '../PowerUp';
import { useGameStore } from '../../../store/useGameStore';
import * as THREE from 'three';

let mockFrameCallback: ((state: any, delta: number) => void) | null = null;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: any) => {
    mockFrameCallback = cb;
  },
}));

vi.mock('@react-three/drei', () => ({
  Float: ({ children, ...props }: any) => <div data-testid="float" {...props}>{children}</div>,
}));

vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
  };
});

const mockWorld = {
  bodies: [] as any[],
};

vi.mock('../../../hooks/usePhysics', () => ({
  usePhysics: () => ({
    world: mockWorld,
  }),
}));

describe('PowerUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFrameCallback = null;
    mockWorld.bodies = [];
    useGameStore.setState(useGameStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing initially when game not started', () => {
    const { container } = render(<PowerUp />);
    expect(container.firstChild).toBeNull();
  });

  it('spawns after initial delay when game starts', () => {
    useGameStore.setState({ gameStarted: true });
    const { container } = render(<PowerUp />);

    // Initially not visible
    expect(container.firstChild).toBeNull();

    // Fast forward 5000ms
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should now be visible
    expect(container.firstChild).not.toBeNull();
  });

  it('triggers power-up for player when they are in range', () => {
    useGameStore.setState({
      gameStarted: true,
      eliminated: [false]
    });

    const triggerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'triggerPowerUp');
    const registerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'registerPowerUp');

    render(<PowerUp />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Find where it spawned
    expect(registerPowerUpSpy).toHaveBeenCalled();
    const spawnCall = registerPowerUpSpy.mock.calls[0];
    const spawnPos = spawnCall[1].position;
    const typeKey = spawnCall[1].type.toLowerCase();

    // Move player out of range
    act(() => {
      useGameStore.setState({ playerPosition: [100, 100, 100] });
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });
    expect(triggerPowerUpSpy).not.toHaveBeenCalled();

    // Move player in range
    act(() => {
      useGameStore.setState({ playerPosition: spawnPos });
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });

    expect(triggerPowerUpSpy).toHaveBeenCalledWith(typeKey, 0);
  });

  it('triggers power-up for bot when bot is in range', () => {
    useGameStore.setState({
      gameStarted: true,
      eliminated: [false]
    });

    const triggerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'triggerPowerUp');
    const registerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'registerPowerUp');

    render(<PowerUp />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const spawnPos = registerPowerUpSpy.mock.calls[0][1].position;
    const typeKey = registerPowerUpSpy.mock.calls[0][1].type.toLowerCase();

    // Setup a bot out of range
    act(() => {
      mockWorld.bodies = [
        {
          userData: { id: 1 },
          position: { x: 100, y: 100, z: 100 }
        }
      ];
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });
    expect(triggerPowerUpSpy).not.toHaveBeenCalled();

    // Move bot in range
    act(() => {
      mockWorld.bodies[0].position = { x: spawnPos[0], y: spawnPos[1], z: spawnPos[2] };
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });

    expect(triggerPowerUpSpy).toHaveBeenCalledWith(typeKey, 1);
  });

  it('respawns out of bounds orb', () => {
    useGameStore.setState({ gameStarted: true, currentRadius: 10 });
    const registerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'registerPowerUp');
    const unregisterPowerUpSpy = vi.spyOn(useGameStore.getState(), 'unregisterPowerUp');

    render(<PowerUp />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Get the UUID used by the component
    const orbId = registerPowerUpSpy.mock.calls[0][0];

    // Force shrink radius to be smaller than spawn position
    act(() => {
      useGameStore.setState({ currentRadius: 1 });
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });

    // Should have unregistered
    expect(unregisterPowerUpSpy).toHaveBeenCalledWith(orbId);

    // Clear mock to cleanly see the respawn
    registerPowerUpSpy.mockClear();

    // Fast forward for the respawn timeout (2000ms for OOB sweeper)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(registerPowerUpSpy).toHaveBeenCalled();
  });

  it('respawns after delay when picked up', () => {
    useGameStore.setState({
      gameStarted: true,
      eliminated: [false]
    });

    const registerPowerUpSpy = vi.spyOn(useGameStore.getState(), 'registerPowerUp');

    render(<PowerUp />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const spawnPos = registerPowerUpSpy.mock.calls[0][1].position;
    registerPowerUpSpy.mockClear();

    // Move player in range to pick it up
    act(() => {
      useGameStore.setState({ playerPosition: spawnPos });
    });

    act(() => {
      if (mockFrameCallback) mockFrameCallback({}, 0.016);
    });

    // Should not have respawned immediately
    expect(registerPowerUpSpy).not.toHaveBeenCalled();

    // Fast forward RESPAWN_DELAY (12000ms)
    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(registerPowerUpSpy).toHaveBeenCalled();
  });
});
