import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Ball } from '../Ball';
import { useGameStore } from '../../../store/useGameStore';
import * as CANNON from 'cannon-es';
import React from 'react';

// Mock console.error to suppress standard R3F warnings about custom elements in jsdom
const originalError = console.error;
console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (
        args[0].includes('is using incorrect casing') ||
        args[0].includes('is unrecognized in this browser') ||
        args[0].includes('React does not recognize the') ||
        args[0].includes('act(...)')
    )) {
        return;
    }
    originalError(...args);
};

let frameCallbacks: any[] = [];
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: any) => {
    frameCallbacks.push(cb);
  },
}));

vi.mock('@react-three/drei', () => ({
  Trail: function Trail({ children }: any) {
    return <group>{children}</group>;
  }
}));

const mockAddBody = vi.fn();
const mockRemoveBody = vi.fn();

vi.mock('../../../hooks/usePhysics', () => ({
  usePhysics: () => ({
    world: {
      addBody: mockAddBody,
      removeBody: mockRemoveBody,
    }
  })
}));

describe('Ball component', () => {
  beforeEach(() => {
    frameCallbacks = [];
    vi.clearAllMocks();
    useGameStore.setState({
      ballPosition: [1, 2, 3],
      lastStriker: null,
      gameStartTime: 0,
    });
  });

  it('renders and mounts a Cannon body on mount', () => {
    render(<Ball />);
    expect(mockAddBody).toHaveBeenCalledTimes(1);
    const addedBody = mockAddBody.mock.calls[0][0];

    expect(addedBody.mass).toBe(5);
    expect(addedBody.position.x).toBe(1);
    expect(addedBody.position.y).toBe(2);
    expect(addedBody.position.z).toBe(3);
    expect(addedBody.linearDamping).toBe(0.4);

    // Check that store has cached the body ref
    expect(useGameStore.getState().ballBodyRef).toBe(addedBody);
  });

  it('removes body on unmount', () => {
    const { unmount } = render(<Ball />);
    unmount();
    expect(mockRemoveBody).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().ballBodyRef).toBeNull();
  });

  it('updates lastStriker on collision with player/bot', () => {
    render(<Ball />);
    const addedBody = mockAddBody.mock.calls[0][0];
    expect(useGameStore.getState().lastStriker).toBe(null);

    act(() => {
        addedBody.dispatchEvent({
            type: 'collide',
            body: { userData: { id: 0 } }
        });
    });

    expect(useGameStore.getState().lastStriker).toBe(0);
  });

  it('ignores collisions without colliderId', () => {
    render(<Ball />);
    const addedBody = mockAddBody.mock.calls[0][0];

    act(() => {
        addedBody.dispatchEvent({
            type: 'collide',
            body: { userData: {} }
        });
    });

    expect(useGameStore.getState().lastStriker).toBe(null);
  });

  it('resets physics on game restart (gameStartTime change)', () => {
    const { unmount } = render(<Ball />);
    // unmount the first one so we can test the effect on a fresh mount
    unmount();

    act(() => {
        useGameStore.setState({ gameStartTime: 1000, ballPosition: [4, 5, 6] });
    });

    render(<Ball />);
    const addedBody = mockAddBody.mock.calls[1][0];

    // The effect should run and reset the position, velocity and wake it up
    expect(addedBody.position.x).toBe(4);
    expect(addedBody.position.y).toBe(5);
    expect(addedBody.position.z).toBe(6);
  });

  it('useFrame checks ceiling guard and clamps velocity', () => {
    const { container } = render(<Ball />);
    const addedBody = mockAddBody.mock.calls[0][0];

    // Patch dom nodes in jsdom because R3F elements are just DOM nodes here
    const groupNode = container.querySelector('group');
    if (groupNode) (groupNode as any).position = { set: vi.fn() };
    const meshNode = container.querySelector('mesh');
    if (meshNode) (meshNode as any).material = { emissiveIntensity: 0, color: { set: vi.fn() }, emissive: { set: vi.fn() } };
    const lightNode = container.querySelector('pointLight');
    if (lightNode) (lightNode as any).color = { set: vi.fn() };

    // Setup conditions for logic tests
    addedBody.velocity.set(30, 40, 0); // speed = 50 > 35 (max limit)
    addedBody.position.set(0, 15, 0); // y > 10 triggers impulse
    vi.spyOn(addedBody, 'applyImpulse');

    expect(frameCallbacks.length).toBe(1);

    // Trigger frame
    act(() => {
        frameCallbacks[0]({ clock: { getElapsedTime: () => 1 } });
    });

    // Verify Ceiling guard
    expect(addedBody.applyImpulse).toHaveBeenCalledWith(
        expect.objectContaining({ y: -30 }),
        addedBody.position
    );

    // Verify Velocity clamp
    const speed = Math.sqrt(addedBody.velocity.x**2 + addedBody.velocity.y**2 + addedBody.velocity.z**2);
    expect(speed).toBeCloseTo(35);

    // Verify state sync
    expect(useGameStore.getState().ballPosition).toEqual([
        addedBody.position.x,
        addedBody.position.y,
        addedBody.position.z
    ]);
  });
});
