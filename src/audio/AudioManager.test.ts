import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';
import { Howl, Howler } from 'howler';

// Mock howler to verify rate interactions
vi.mock('howler', () => {
  // Use global variables to keep track of the mock since it will be hoisted
  // by vitest.
  (global as any).__currentHowlMock = null;
  (global as any).__allHowlMocks = [];

  class HowlMock {
    options: any;

    constructor(options: any) {
      this.options = options;
      (global as any).__currentHowlMock = this;
      (global as any).__allHowlMocks.push(this);
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
  describe('Error Handling', () => {
    it('onloaderror handles cycling to next track', () => {
      vi.useFakeTimers();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      AudioManager.startAmbient(2);
      const mockedHowl = (global as any).__currentHowlMock;

      // trigger error
      mockedHowl.options.onloaderror();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load bgm2.mp3'));

      // fast-forward 1s
      vi.advanceTimersByTime(1000);

      const newMockedHowl = (global as any).__currentHowlMock;
      // 2 % 5 + 1 = 3
      expect(newMockedHowl.options.src).toEqual(['/sounds/bgm3.mp3']);

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });

    it('onloaderror does not retry if stopped', () => {
      vi.useFakeTimers();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      AudioManager.startAmbient(2);
      const mockedHowl = (global as any).__currentHowlMock;

      // Stop the audio manager immediately after start
      AudioManager.stopAmbient();

      // trigger error
      mockedHowl.options.onloaderror();

      // fast-forward 1s
      vi.advanceTimersByTime(1000);

      const currentMock = (global as any).__currentHowlMock;
      // Still the original mock because startAmbient wasn't called again
      expect(currentMock).toBe(mockedHowl);

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });

    it('onplayerror handles cycling to next track and sets unlock listener', () => {
      vi.useFakeTimers();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      AudioManager.startAmbient(2);
      const mockedHowl = (global as any).__currentHowlMock;

      // trigger error
      mockedHowl.options.onplayerror();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to play bgm2.mp3'));
      expect(mockedHowl.once).toHaveBeenCalledWith('unlock', expect.any(Function));

      // Trigger the unlock callback
      const unlockCallback = mockedHowl.once.mock.calls[0][1];
      unlockCallback();
      expect(mockedHowl.play).toHaveBeenCalledTimes(2); // once at start, once at unlock

      // fast-forward 1s
      vi.advanceTimersByTime(1000);

      const newMockedHowl = (global as any).__currentHowlMock;
      expect(newMockedHowl.options.src).toEqual(['/sounds/bgm3.mp3']);

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});

const getSoundMock = (srcContains: string) => {
  const mocks = (global as any).__allHowlMocks;
  return mocks.find((mock: any) =>
    mock.options?.src?.some((s: string) => s.includes(srcContains))
  );
};

describe('AudioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stop any existing tracks to reset state
    AudioManager.stopAmbient();
  });

  describe('SFX Methods', () => {
    it('playBounce does nothing if strength is less than 5', () => {
      const bounceMock = getSoundMock('bounce.mp3');
      vi.clearAllMocks();

      AudioManager.playBounce(4);

      expect(bounceMock.play).not.toHaveBeenCalled();
    });

    it('playBounce plays sound and sets volume based on strength', () => {
      const bounceMock = getSoundMock('bounce.mp3');
      vi.clearAllMocks();

      // strength = 10 -> vol = Math.min(10/20, 1.0) = 0.5
      AudioManager.playBounce(10);

      expect(bounceMock.play).toHaveBeenCalled();
      expect(bounceMock.volume).toHaveBeenCalledWith(0.5, 123);
    });

    it('playBounce caps volume at 1.0', () => {
      const bounceMock = getSoundMock('bounce.mp3');
      vi.clearAllMocks();

      // strength = 30 -> vol = Math.min(30/20, 1.0) = 1.0
      AudioManager.playBounce(30);

      expect(bounceMock.play).toHaveBeenCalled();
      expect(bounceMock.volume).toHaveBeenCalledWith(1.0, 123);
    });

    it('playPulse plays pulse sound', () => {
      const pulseMock = getSoundMock('pulse.mp3');
      vi.clearAllMocks();

      AudioManager.playPulse();

      expect(pulseMock.play).toHaveBeenCalled();
    });

    it('playElimination plays elimination sound', () => {
      const elimMock = getSoundMock('elimination.mp3');
      vi.clearAllMocks();

      AudioManager.playElimination();

      expect(elimMock.play).toHaveBeenCalled();
    });

    it('playShieldBreak plays shield break sound', () => {
      const shieldMock = getSoundMock('shield.mp3');
      vi.clearAllMocks();

      AudioManager.playShieldBreak();

      expect(shieldMock.play).toHaveBeenCalled();
    });
  });

  describe('BGM Methods', () => {
    it('startAmbient loads a track, plays, and fades in', () => {
      AudioManager.startAmbient(2); // force index 2 for predictability

      const mockedHowl = (global as any).__currentHowlMock;

      expect(Howler.mute).toHaveBeenCalledWith(false);
      expect(mockedHowl.options.src).toEqual(['/sounds/bgm2.mp3']);
      expect(mockedHowl.options.volume).toBe(0);
      expect(mockedHowl.play).toHaveBeenCalled();
      expect(mockedHowl.fade).toHaveBeenCalledWith(0, 0.2, 1000, 123);
      expect(mockedHowl.rate).toHaveBeenCalledWith(1.0, 123);
    });

    it('startAmbient can pick a random track when index is not forced', () => {
      // Math.random stub
      const originalRandom = Math.random;
      Math.random = () => 0.6; // Will give 0.6 * 5 = 3 + 1 = 4

      AudioManager.startAmbient();

      const mockedHowl = (global as any).__currentHowlMock;
      expect(mockedHowl.options.src).toEqual(['/sounds/bgm4.mp3']);

      Math.random = originalRandom;
    });

    it('changeTier stops current and starts a new ambient with reset rate', () => {
      AudioManager.startAmbient(1);
      AudioManager.setAmbientIntensity(1, 8); // change rate to 1.4

      vi.clearAllMocks();

      AudioManager.changeTier();

      const mockedHowl = (global as any).__currentHowlMock;
      expect(mockedHowl.rate).toHaveBeenCalledWith(1.0, 123); // back to 1.0
    });

    it('stopAmbient stops and unloads the current track completely', () => {
      AudioManager.startAmbient(1);
      const mockedHowl = (global as any).__currentHowlMock;

      AudioManager.stopAmbient();

      expect(mockedHowl.stop).toHaveBeenCalled();
      expect(mockedHowl.unload).toHaveBeenCalled();
    });
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
