import { render, act } from '@testing-library/react';
import { FloorBumper } from '../FloorBumper';
import { test, describe, vi, expect, beforeEach, afterEach } from 'vitest';
import { useGameStore } from '../../../store/useGameStore';
import * as R3F from '@react-three/fiber';

let frameCb: any = null;
vi.mock('@react-three/fiber', async () => {
    const actual = await vi.importActual('@react-three/fiber') as any;
    return {
        ...actual,
        useFrame: (cb: any) => {
            frameCb = cb;
        },
        __triggerFrame: (delta: number) => {
            if (frameCb) frameCb(null, delta);
        }
    }
});

let addBodyMock = vi.fn();
let removeBodyMock = vi.fn();
vi.mock('../../../hooks/usePhysics', () => {
    return {
        usePhysics: () => ({
            world: {
                addBody: addBodyMock,
                removeBody: removeBodyMock,
            }
        })
    }
});

// Mock Three components as regular React components, to avoid DOM renderer issues
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;
    return {
        ...actual,
    }
});
vi.mock('@react-three/drei', async () => {
    const actual = await vi.importActual('@react-three/drei') as any;
    return {
        ...actual,
    }
});

// Since @react-three/fiber custom elements like <mesh> are rendered as DOM elements in testing-library,
// we just mock them so they don't produce warnings and handle refs safely.
vi.mock('react', async () => {
    const actualReact = await vi.importActual('react') as any;
    return {
        ...actualReact,
        useRef: (initial: any) => {
            const ref = actualReact.useRef(initial);
            return new Proxy(ref, {
                set(target, prop, value) {
                    if (prop === 'current' && value && typeof value === 'object' && value.nodeType) {
                        if (!value.position) value.position = { x: 0, y: 0, z: 0 };
                        if (!value.rotation) value.rotation = { x: 0, y: 0, z: 0 };
                    }
                    target[prop] = value;
                    return true;
                }
            });
        }
    };
});

describe('FloorBumper', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useGameStore.setState({ gameStarted: true, currentRadius: 20 });
        addBodyMock.mockClear();
        removeBodyMock.mockClear();

        // Suppress console errors for React warnings about unknown DOM elements
        vi.spyOn(console, 'error').mockImplementation((...args) => {
            if (typeof args[0] === 'string' && (
                args[0].includes('unrecognized in this browser') ||
                args[0].includes('is using incorrect casing') ||
                args[0].includes('React does not recognize') ||
                args[0].includes('Received `true` for a non-boolean')
            )) {
                return;
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('should cycle through phases and add/remove physics body', () => {
        const { unmount, rerender } = render(<FloorBumper />);

        // Initial delay 5000-15000 ms. Advance 15s to guarantee it fires.
        act(() => { vi.advanceTimersByTime(15000); });

        // Warning phase (1500 ms)
        act(() => { vi.advanceTimersByTime(1500); });

        // Rising phase: body should be added
        expect(addBodyMock).toHaveBeenCalledTimes(1);
        const body = addBodyMock.mock.calls[0][0];
        expect(body.position.y).toBe(0);

        act(() => {
            (R3F as any).__triggerFrame(0.5); // 0.5 * 12 = 6, > 5 (RISE_TARGET)
        });

        rerender(<FloorBumper />);

        act(() => {
            (R3F as any).__triggerFrame(1.0); // 5 - 8 = -3 <= -0.3
        });

        rerender(<FloorBumper />);

        // Retracting phase finished, body should be removed
        expect(removeBodyMock).toHaveBeenCalledTimes(1);
        expect(removeBodyMock).toHaveBeenCalledWith(body);

        unmount();
    });

    test('should despawn immediately if out of bounds', () => {
        // Set small currentRadius to guarantee OOB
        useGameStore.setState({ currentRadius: 1 });

        const { unmount } = render(<FloorBumper />);

        act(() => { vi.advanceTimersByTime(15000); });

        act(() => {
            (R3F as any).__triggerFrame(0.1);
        });

        // It never adds body or removes body since it goes idle in warning phase
        expect(addBodyMock).not.toHaveBeenCalled();

        unmount();
    });

    test('should launch entities when collided', () => {
        const { unmount } = render(<FloorBumper />);

        act(() => { vi.advanceTimersByTime(15000); });

        act(() => { vi.advanceTimersByTime(1500); });

        expect(addBodyMock).toHaveBeenCalledTimes(1);
        const body = addBodyMock.mock.calls[0][0];

        // Simulate collision
        const applyImpulseMock = vi.fn();
        const targetBody = { mass: 50, applyImpulse: applyImpulseMock };

        body.dispatchEvent({ type: 'collide', body: targetBody });

        expect(applyImpulseMock).toHaveBeenCalled();
        const impulse = applyImpulseMock.mock.calls[0][0];
        expect(impulse.y).toBe(1500);

        const ballBody = { mass: 5, applyImpulse: applyImpulseMock };
        body.dispatchEvent({ type: 'collide', body: ballBody });

        const impulse2 = applyImpulseMock.mock.calls[1][0];
        expect(impulse2.y).toBe(150);

        unmount();
    });
});
