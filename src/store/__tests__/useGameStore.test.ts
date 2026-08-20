import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '../useGameStore';

describe('useGameStore - triggerPowerUp', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState(useGameStore.getInitialState ? useGameStore.getInitialState() : {
      playerSpeedUntil: 0,
      playerGhostUntil: 0,
      playerJuggernautUntil: 0,
      freezeBotsUntil: 0,
      botBuffs: {},
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should apply speed power-up to player', () => {
    useGameStore.getState().triggerPowerUp('speed', 0);
    const state = useGameStore.getState();
    expect(state.playerSpeedUntil).toBe(Date.now() + 8000);
  });

  it('should apply speed power-up to bot', () => {
    useGameStore.getState().triggerPowerUp('speed', 1);
    const state = useGameStore.getState();
    expect(state.playerSpeedUntil).toBe(0);
    expect(state.botBuffs[1]?.speedUntil).toBe(Date.now() + 8000);
  });

  it('should apply ghost power-up to player', () => {
    useGameStore.getState().triggerPowerUp('ghost', 0);
    const state = useGameStore.getState();
    expect(state.playerGhostUntil).toBe(Date.now() + 8000);
  });

  it('should apply ghost power-up to bot', () => {
    useGameStore.getState().triggerPowerUp('ghost', 2);
    const state = useGameStore.getState();
    expect(state.playerGhostUntil).toBe(0);
    expect(state.botBuffs[2]?.ghostUntil).toBe(Date.now() + 8000);
  });

  it('should apply freeze power-up globally to bots', () => {
    useGameStore.getState().triggerPowerUp('freeze', 0);
    const state = useGameStore.getState();
    expect(state.freezeBotsUntil).toBe(Date.now() + 3000);
  });

  it('should apply freeze power-up globally to bots when triggered by bot', () => {
    useGameStore.getState().triggerPowerUp('freeze', 3);
    const state = useGameStore.getState();
    expect(state.freezeBotsUntil).toBe(Date.now() + 3000);
  });

  it('should apply juggernaut power-up to player', () => {
    useGameStore.getState().triggerPowerUp('juggernaut', 0);
    const state = useGameStore.getState();
    expect(state.playerJuggernautUntil).toBe(Date.now() + 8000);
    expect(state.playerSpeedUntil).toBe(Date.now() + 8000);
  });

  it('should apply juggernaut power-up to bot', () => {
    useGameStore.getState().triggerPowerUp('juggernaut', 4);
    const state = useGameStore.getState();
    expect(state.playerJuggernautUntil).toBe(0);
    expect(state.playerSpeedUntil).toBe(0);
    expect(state.botBuffs[4]?.juggernautUntil).toBe(Date.now() + 8000);
    expect(state.botBuffs[4]?.speedUntil).toBe(Date.now() + 8000);
  });

  it('should not overwrite existing bot buffs when applying a new one', () => {
    useGameStore.getState().triggerPowerUp('speed', 1);
    vi.setSystemTime(new Date('2024-01-01T00:00:01Z')); // Move time forward 1s
    useGameStore.getState().triggerPowerUp('ghost', 1);
    const state = useGameStore.getState();

    // Ghost should be 8000ms from the NEW time
    expect(state.botBuffs[1]?.ghostUntil).toBe(Date.now() + 8000);
    // Speed should be 8000ms from the OLD time (which is Date.now() - 1000 + 8000)
    expect(state.botBuffs[1]?.speedUntil).toBe(Date.now() - 1000 + 8000);
  });
});
