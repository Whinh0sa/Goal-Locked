import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Stats, PlayerStats } from './useStats';

const LS_KEY = 'goal_locked_stats_v1';

describe('Stats', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('load', () => {
    it('returns default stats when localStorage is empty', () => {
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 });
    });

    it('returns default stats when localStorage contains invalid JSON', () => {
      localStorage.setItem(LS_KEY, '{ invalid json');
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 });
    });

    it('returns default stats when localStorage contains an array', () => {
      localStorage.setItem(LS_KEY, '[]');
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 });
    });

    it('returns default stats when localStorage contains primitive types', () => {
      localStorage.setItem(LS_KEY, '123');
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 });
    });

    it('loads and merges valid stats from localStorage', () => {
      const savedStats: Partial<PlayerStats> = {
        fastestSurvival: 1000,
        totalBotsDeleted: 5,
        highestTier: 2,
        highestScore: 100
      };
      localStorage.setItem(LS_KEY, JSON.stringify(savedStats));
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: 1000, totalBotsDeleted: 5, highestTier: 2, highestScore: 100 });
    });

    it('ignores invalid properties and keeps defaults for missing valid properties', () => {
      const savedStats = {
        fastestSurvival: 'invalid', // should be ignored
        highestTier: 3,
        unknownProp: 'hello'
      };
      localStorage.setItem(LS_KEY, JSON.stringify(savedStats));
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 3, highestScore: 0 });
    });

    it('handles null fastestSurvival from localStorage', () => {
      const savedStats: Partial<PlayerStats> = {
        fastestSurvival: null,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(savedStats));
      const stats = Stats.load();
      expect(stats).toEqual({ fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 });
    });
  });

  describe('recordBotElimination', () => {
    it('increments totalBotsDeleted and saves to localStorage', () => {
      const result1 = Stats.recordBotElimination();
      expect(result1.totalBotsDeleted).toBe(1);

      const result2 = Stats.recordBotElimination();
      expect(result2.totalBotsDeleted).toBe(2);

      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      expect(saved.totalBotsDeleted).toBe(2);
    });
  });

  describe('recordVictory', () => {
    it('records the first victory', () => {
      const result = Stats.recordVictory(50000, 2);
      expect(result.fastestSurvival).toBe(50000);
      expect(result.highestTier).toBe(2);

      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      expect(saved.fastestSurvival).toBe(50000);
      expect(saved.highestTier).toBe(2);
    });

    it('updates fastestSurvival only if the new time is shorter', () => {
      Stats.recordVictory(50000, 1);

      const result1 = Stats.recordVictory(60000, 1);
      expect(result1.fastestSurvival).toBe(50000); // Should not update

      const result2 = Stats.recordVictory(40000, 1);
      expect(result2.fastestSurvival).toBe(40000); // Should update
    });

    it('updates highestTier only if the new tier is higher', () => {
      Stats.recordVictory(50000, 3);

      const result1 = Stats.recordVictory(40000, 2);
      expect(result1.highestTier).toBe(3); // Should not update

      const result2 = Stats.recordVictory(30000, 4);
      expect(result2.highestTier).toBe(4); // Should update
    });
  });

  describe('recordScore', () => {
    it('updates highestScore only if the new score is higher', () => {
      const result1 = Stats.recordScore(100);
      expect(result1.highestScore).toBe(100);

      const result2 = Stats.recordScore(50);
      expect(result2.highestScore).toBe(100); // Should not update

      const result3 = Stats.recordScore(200);
      expect(result3.highestScore).toBe(200); // Should update

      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      expect(saved.highestScore).toBe(200);
    });
  });
});

describe('Stats.formatTime', () => {
  it('formats 0 milliseconds correctly', () => {
    expect(Stats.formatTime(0)).toBe('0.0s');
  });

  it('formats less than a second correctly', () => {
    expect(Stats.formatTime(500)).toBe('0.5s');
    expect(Stats.formatTime(999)).toBe('0.9s');
  });

  it('formats exactly one second correctly', () => {
    expect(Stats.formatTime(1000)).toBe('1.0s');
  });

  it('formats less than a minute correctly', () => {
    expect(Stats.formatTime(45600)).toBe('45.6s');
    expect(Stats.formatTime(59999)).toBe('59.9s');
  });

  it('formats exactly one minute correctly', () => {
    expect(Stats.formatTime(60000)).toBe('1m 0.0s');
  });

  it('formats more than a minute correctly', () => {
    expect(Stats.formatTime(65500)).toBe('1m 5.5s');
    expect(Stats.formatTime(119999)).toBe('1m 59.9s');
  });

  it('formats multiple minutes correctly', () => {
    expect(Stats.formatTime(125400)).toBe('2m 5.4s');
    expect(Stats.formatTime(3600000)).toBe('60m 0.0s'); // 1 hour
  });
});
