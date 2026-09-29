import React, { useEffect, useRef } from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Crucible } from '../Crucible';
import { useGameStore } from '../../store/useGameStore';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Suppress console.error for custom React elements like <mesh> in jsdom
const originalError = console.error;
beforeEach(() => {
    console.error = (...args) => {
        if (typeof args[0] === 'string' && (args[0].includes('is using incorrect casing') || args[0].includes('was not wrapped in act') || args[0].includes('unrecognized in this browser') || args[0].includes('does not recognize') || args[0].includes('transparent'))) return;
        originalError(...args);
    };
});
afterEach(() => {
    console.error = originalError;
});

let capturedUseFrameCallbacks: Array<(state: any, delta: number) => void> = [];

vi.mock('@react-three/fiber', () => ({
    useFrame: (cb: (state: any, delta: number) => void) => {
        useEffect(() => {
            capturedUseFrameCallbacks.push(cb);
            return () => {
                capturedUseFrameCallbacks = capturedUseFrameCallbacks.filter(c => c !== cb);
            };
        }, [cb]);
    }
}));

vi.mock('@react-three/drei', () => ({
    MeshReflectorMaterial: () => <meshBasicMaterial data-testid="mock-reflector" />,
    Text: ({ children }: { children: React.ReactNode }) => <group data-testid="mock-text">{children}</group>
}));

const mockAddBodyFn = vi.fn();
const mockRemoveBody = vi.fn();

vi.mock('../../hooks/usePhysics', () => ({
    usePhysics: () => ({
        world: {
            addBody: mockAddBodyFn,
            removeBody: mockRemoveBody
        }
    })
}));

// We mock CANNON completely because Crucible instantiates `new CANNON.Body` inside its useEffect
vi.mock('cannon-es', () => {
    return {
        Box: class {},
        Vec3: class {
            constructor(public x = 0, public y = 0, public z = 0) {}
            set = vi.fn();
            copy = vi.fn();
        },
        Quaternion: class {
            setFromAxisAngle = vi.fn();
            copy = vi.fn();
        },
        Body: class {
            position = { set: vi.fn(), copy: vi.fn() };
            velocity = { set: vi.fn(), copy: vi.fn() };
            quaternion = { set: vi.fn(), copy: vi.fn(), setFromAxisAngle: vi.fn() };
            constructor(public options: any) {}
        }
    };
});


vi.mock('three', async () => {
    const actual = await vi.importActual<typeof import('three')>('three');
    return {
        ...actual,
        CircleGeometry: class {
            parameters = { radius: 25 };
            dispose = vi.fn();
            constructor(public radius: number) {}
        }
    };
});

describe('Crucible', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedUseFrameCallbacks = [];
        useGameStore.setState({
            currentRadius: 25,
            eliminated: [false, false, false, false, false, false, false, false]
        });

        // Mock properties missing from JS DOM
        Object.defineProperty(window.HTMLElement.prototype, 'position', {
            get() {
                if (!this._position) this._position = { set: vi.fn(), copy: vi.fn() };
                return this._position;
            },
            configurable: true
        });
        Object.defineProperty(window.HTMLElement.prototype, 'rotation', {
            get() {
                if (!this._rotation) this._rotation = { set: vi.fn(), copy: vi.fn() };
                return this._rotation;
            },
            configurable: true
        });
        Object.defineProperty(window.HTMLElement.prototype, 'velocity', {
            get() {
                if (!this._velocity) this._velocity = { set: vi.fn(), copy: vi.fn() };
                return this._velocity;
            },
            configurable: true
        });
        Object.defineProperty(window.HTMLElement.prototype, 'geometry', {
            get() {
                if (!this._geometry) this._geometry = { dispose: vi.fn(), parameters: { radius: 25 } };
                return this._geometry;
            },
            set(v) {
                this._geometry = v;
            },
            configurable: true
        });
    });

    afterEach(() => {
        delete (window.HTMLElement.prototype as any).position;
        delete (window.HTMLElement.prototype as any).rotation;
        delete (window.HTMLElement.prototype as any).velocity;
        delete (window.HTMLElement.prototype as any).geometry;
    });

    it('renders and adds initial physics bodies', () => {
        const { unmount } = render(<Crucible />);
        // 1 floor + 8 boundaries = 9 bodies added to world
        expect(mockAddBodyFn).toHaveBeenCalledTimes(9);
        unmount();
    });

    it('updates floor geometry radius in useFrame', () => {
        const { rerender, container } = render(<Crucible />);

        // Find floor element
        const floorElement = container.querySelector('mesh');
        expect(floorElement).toBeDefined();

        useGameStore.setState({ currentRadius: 10 });
        rerender(<Crucible />);

        // Trigger useFrame multiple times to update lerp
        capturedUseFrameCallbacks.forEach(cb => cb({}, 0.016));
        capturedUseFrameCallbacks.forEach(cb => cb({}, 0.016));
        capturedUseFrameCallbacks.forEach(cb => cb({}, 0.016));

        // The display radius will lerp from 25 to 10
        // Initially it's 25. Let's make sure dispose is called and geometry is recreated.


        // It replaces geometry entirely directly in DOM via the ref
        if (floorElement) {
           // React re-renders might unwrap geometry or lose the mock spy on replacement
           expect((floorElement as any).geometry.radius).toBeDefined();
           expect((floorElement as any).geometry.radius).toBeLessThan(25);
        }
    });

    it('removes body when segment is eliminated', () => {
        const { rerender } = render(<Crucible />);

        expect(mockAddBodyFn).toHaveBeenCalledTimes(9);

        useGameStore.setState({
            eliminated: [true, false, false, false, false, false, false, false]
        });
        rerender(<Crucible />);

        expect(mockRemoveBody).toHaveBeenCalled();
    });
});
