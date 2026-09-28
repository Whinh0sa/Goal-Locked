import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Bot } from './Bot';
import { useGameStore } from '../../store/useGameStore';
import * as THREE from 'three';

// Mock dependencies
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  Float: ({ children }: any) => <div data-testid="float">{children}</div>,
}));

vi.mock('../../hooks/usePhysics', () => ({
  usePhysics: () => ({
    world: { addBody: vi.fn(), removeBody: vi.fn() }
  }),
}));

// Suppress console.error for React warnings about custom elements in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('is using incorrect casing') ||
      args[0].includes('is unrecognized in this browser') ||
      args[0].includes('React does not recognize the')
    )) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});

// We need to mock CANNON correctly
vi.mock('cannon-es', () => {
  class Vec3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    set() {}
    copy() {}
  }
  class Body {
    position = new Vec3();
    velocity = new Vec3();
    angularVelocity = new Vec3();
    collisionFilterGroup = 1;
    collisionFilterMask = -1;
    mass = 50;
    wakeUp() {}
    updateMassProperties() {}
  }
  class Sphere {
    constructor() {}
  }
  return {
    Body,
    Sphere,
    Vec3,
  };
});

// Create custom elements for threejs components to silence React warnings if needed
// Or just let them be divs in our mock
vi.mock('react', async () => {
  const actual = await vi.importActual('react') as any;
  return actual;
});

describe('Bot Elimination Logic', () => {
  beforeEach(() => {
    useGameStore.setState({
      eliminated: [false, false, false, false, false, false, false, false],
      tier: 1,
      botPositions: Array(8).fill([0, 0, 0]),
      gameStartTime: 0,
      botBuffs: {},
    });
  });

  it('renders Bot when it is not eliminated', () => {
    const { container } = render(
      <Bot id={1} goalPos={new THREE.Vector3(0, 0, 0)} />
    );
    // Since <group> is a custom element in jsdom, we can select it
    expect(container.querySelector('group')).toBeInTheDocument();
  });

  it('does not render Bot when it is eliminated', () => {
    // Set Bot 1 as eliminated
    useGameStore.setState({ eliminated: [false, true, false, false, false, false, false, false] });

    const { container } = render(
      <Bot id={1} goalPos={new THREE.Vector3(0, 0, 0)} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('updates elimination status reactively', () => {
    const { container, rerender } = render(
      <Bot id={1} goalPos={new THREE.Vector3(0, 0, 0)} />
    );

    // Initially rendered
    expect(container.querySelector('group')).toBeInTheDocument();

    // Eliminate the bot and wrap in act
    act(() => {
      useGameStore.setState({ eliminated: [false, true, false, false, false, false, false, false] });
    });

    // Should be removed from DOM
    expect(container.firstChild).toBeNull();
  });
});
