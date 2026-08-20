import test from 'node:test';
import assert from 'node:assert';
import { Stats, PlayerStats } from './useStats';

// Mock localStorage globally
const store = new Map<string, string>();
global.localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  length: 0,
  key: () => null,
};

test('Stats.recordVictory', async (t) => {
  t.beforeEach(() => {
    store.clear();
  });

  await t.test('First win - sets fastestSurvival and highestTier', () => {
    const s = Stats.recordVictory(5000, 2);
    assert.strictEqual(s.fastestSurvival, 5000);
    assert.strictEqual(s.highestTier, 2);
  });

  await t.test('Faster win - updates fastestSurvival', () => {
    // Setup existing state
    store.set('goal_locked_stats_v1', JSON.stringify({ fastestSurvival: 5000, highestTier: 1, totalBotsDeleted: 0, highestScore: 0 }));

    const s = Stats.recordVictory(4000, 1);
    assert.strictEqual(s.fastestSurvival, 4000);
    assert.strictEqual(s.highestTier, 1);
  });

  await t.test('Slower win - keeps existing fastestSurvival', () => {
    store.set('goal_locked_stats_v1', JSON.stringify({ fastestSurvival: 4000, highestTier: 1, totalBotsDeleted: 0, highestScore: 0 }));

    const s = Stats.recordVictory(5000, 1);
    assert.strictEqual(s.fastestSurvival, 4000);
    assert.strictEqual(s.highestTier, 1);
  });

  await t.test('Tier progression - updates highestTier if new tier is greater', () => {
    store.set('goal_locked_stats_v1', JSON.stringify({ fastestSurvival: 4000, highestTier: 2, totalBotsDeleted: 0, highestScore: 0 }));

    const s = Stats.recordVictory(5000, 3);
    assert.strictEqual(s.highestTier, 3);
  });

  await t.test('Tier progression - keeps existing highestTier if new tier is lower', () => {
    store.set('goal_locked_stats_v1', JSON.stringify({ fastestSurvival: 4000, highestTier: 3, totalBotsDeleted: 0, highestScore: 0 }));

    const s = Stats.recordVictory(5000, 2);
    assert.strictEqual(s.highestTier, 3);
  });
});
