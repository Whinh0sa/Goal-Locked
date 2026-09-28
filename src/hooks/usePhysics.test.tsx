import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePhysics } from './usePhysics';

describe('usePhysics', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error output from React's expected error boundary behavior
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('throws an error when used outside of PhysicsProvider', () => {
    expect(() => {
      renderHook(() => usePhysics());
    }).toThrow('usePhysics must be used within PhysicsProvider');
  });
});
