import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';
import { Howl, Howler } from 'howler';

// Mock howler to verify rate interactions
vi.mock('howler', () => {
  // Use a global variable to keep track of the mock since it will be hoisted
  // by vitest.
  (global as any).__currentHowlMock = null;
  class HowlMock {
    constructor() {
      (global as any).__currentHowlMock = this;
    }
    play = vi.fn().mockReturnValue(123);
    fade = vi.fn();
    rate = vi.fn();
    stop = vi.fn();
    unload = vi.fn();
    once = vi.fn();
    volume = vi.fn();
  }

  const HowlerMock = {
    volume: vi.fn(),
    mute: vi.fn(),
  };

  return {
    Howl: HowlMock,
    Howler: HowlerMock,
  };
});

describe('AudioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stop any existing tracks to reset state
    AudioManager.stopAmbient();
  });

  describe('setAmbientIntensity', () => {
    it('does not crash if no background music is playing', () => {
      // Calling without starting ambient music should just silently return
      expect(() => AudioManager.setAmbientIntensity(8, 8)).not.toThrow();
    });

    it('calculates correctly for full players (8/8)', () => {
      AudioManager.startAmbient();

      // Get the mocked instance that was created
      const mockedHowl = (global as any).__currentHowlMock;
      // startAmbient calls rate(1.0)

      // Clear startAmbient calls to test setAmbientIntensity in isolation
      vi.clearAllMocks();

      AudioManager.setAmbientIntensity(8, 8);

      // t = 1 - (8 - 1) / (8 - 1) = 0
      // rate = min(1.0 + 0 * 0.4, 1.6) = 1.0
      expect(mockedHowl.rate).toHaveBeenCalledWith(1.0, 123);
    });

    it('calculates correctly when half players remain (4/8)', () => {
      AudioManager.startAmbient();

      const mockedHowl = (global as any).__currentHowlMock;
      vi.clearAllMocks();

      AudioManager.setAmbientIntensity(4, 8);

      // t = 1 - (4 - 1) / (8 - 1) = 1 - 3/7 ≈ 0.5714
      // rate = min(1.0 + 0.5714 * 0.4, 1.6) ≈ 1.2285
      const expectedRate = 1.0 + (1 - 3/7) * 0.4;
      expect(mockedHowl.rate).toHaveBeenCalledWith(expectedRate, 123);
    });

    it('calculates correctly for 2 players left (final duel)', () => {
      AudioManager.startAmbient();

      const mockedHowl = (global as any).__currentHowlMock;
      vi.clearAllMocks();

      AudioManager.setAmbientIntensity(2, 8);

      // t = 1 - (2 - 1) / (8 - 1) = 1 - 1/7 = 6/7
      // rate = min(1.0 + 6/7 * 0.4, 1.6) = 1.3428
      const expectedRate = 1.0 + (6/7) * 0.4;
      expect(mockedHowl.rate).toHaveBeenCalledWith(expectedRate, 123);
    });

    it('calculates correctly when 1 player remains (winner)', () => {
      AudioManager.startAmbient();

      const mockedHowl = (global as any).__currentHowlMock;
      vi.clearAllMocks();

      AudioManager.setAmbientIntensity(1, 8);

      // t = 1 - (1 - 1) / (8 - 1) = 1
      // rate = min(1.0 + 1 * 0.4, 1.6) = 1.4
      expect(mockedHowl.rate).toHaveBeenCalledWith(1.4, 123);
    });

    it('caps the rate at 1.6 even with different total players', () => {
      AudioManager.startAmbient();

      const mockedHowl = (global as any).__currentHowlMock;
      vi.clearAllMocks();

      // If we somehow get negative remaining players or unusual parameters
      // Let's pass parameters that would theoretically yield > 1.6
      AudioManager.setAmbientIntensity(-5, 8);

      // t = 1 - (-5 - 1) / (8 - 1) = 1 - (-6/7) = 1 + 6/7 = 13/7
      // rate = 1.0 + (13/7) * 0.4 = 1.0 + 0.74 = 1.74
      // Should cap at 1.6
      expect(mockedHowl.rate).toHaveBeenCalledWith(1.6, 123);
    });
  });
});
