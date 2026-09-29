import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '../useGameStore';
import { Stats } from '../../hooks/useStats';

vi.mock('../../hooks/useStats', () => ({
  Stats: {
    load: vi.fn(() => ({ highestScore: 100, highestTier: 5 })),
    recordBotElimination: vi.fn(),
    recordVictory: vi.fn(),
    recordScore: vi.fn(),
  }
}));

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

  it('should not modify state for unknown power-up types', () => {
    const initialState = useGameStore.getState();
    // @ts-expect-error - Intentionally passing an unknown power-up type to test edge cases
    useGameStore.getState().triggerPowerUp('unknown', 0);
    const state = useGameStore.getState();
    expect(state).toEqual(initialState);
  });
});

describe('useGameStore - registerGoal', () => {
  const initialState = useGameStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState(initialState, true);
  });

  it('should ignore already eliminated players', () => {
    useGameStore.setState({ eliminated: [true, false, false, false, false, false, false, false] });
    useGameStore.getState().registerGoal(0);
    expect(useGameStore.getState().eliminated[0]).toBe(true);
  });

  it('should decrement player shields when player is hit and has shields', () => {
    useGameStore.setState({ playerShields: 3 });
    useGameStore.getState().registerGoal(0);
    expect(useGameStore.getState().playerShields).toBe(2);
    expect(useGameStore.getState().eliminated[0]).toBe(false);

    const log = useGameStore.getState().eliminationLog;
    expect(log.length).toBe(1);
    expect(log[0].message).toContain('Shield hit');
  });

  it('should eliminate player when player is hit and out of shields', () => {
    useGameStore.setState({ playerShields: 1, eliminated: new Array(8).fill(false), eliminationLog: [] });
    useGameStore.getState().registerGoal(0);

    const state = useGameStore.getState();
    expect(state.eliminated[0]).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.victory).toBe(false);
    expect(state.playerShields).toBe(0);

    const lastEntry = state.eliminationLog[state.eliminationLog.length - 1];
    expect(lastEntry.message).toContain("GAME OVER");
  });

  it('should eliminate a bot and update score when killed by player', () => {
    useGameStore.setState({
      eliminated: new Array(8).fill(false),
      lastStriker: 0,
      score: 10,
      playerKills: 0,
      botNames: ['', 'Alpha']
    });

    useGameStore.getState().registerGoal(1);

    const state = useGameStore.getState();
    expect(state.eliminated[1]).toBe(true);
    expect(state.score).toBe(20);
    expect(state.playerKills).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.victory).toBe(false);

    const lastEntry = state.eliminationLog[state.eliminationLog.length - 1];
    expect(lastEntry.message).toContain("PLAYER eliminated Alpha");
    expect(Stats.recordBotElimination).toHaveBeenCalled();
  });

  it('should eliminate a bot and NOT update score when killed by another bot', () => {
    useGameStore.setState({
      eliminated: new Array(8).fill(false),
      lastStriker: 2,
      score: 10,
      playerKills: 0
    });

    useGameStore.getState().registerGoal(1);

    const state = useGameStore.getState();
    expect(state.eliminated[1]).toBe(true);
    expect(state.score).toBe(10);
    expect(state.playerKills).toBe(0);
    expect(Stats.recordBotElimination).toHaveBeenCalled();
  });

  it('should grant victory when the last bot is eliminated', () => {
    const almostWinState = [false, true, true, true, true, true, true, false];
    useGameStore.setState({
      eliminated: almostWinState,
      tier: 1,
      maxTier: 5,
      score: 50,
      gameStartTime: Date.now() - 10000
    });

    useGameStore.getState().registerGoal(7);

    const state = useGameStore.getState();
    expect(state.eliminated[7]).toBe(true);
    expect(state.victory).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.tier).toBe(2);
    expect(state.maxTier).toBe(5);
    expect(Stats.recordVictory).toHaveBeenCalled();
    expect(Stats.recordScore).toHaveBeenCalled();
  });
});
