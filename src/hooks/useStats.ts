/**
 * useStats — localStorage persistence for meta-progression stats.
 * Reads on first call, provides helpers to update individual stats.
 *
 * Tracked:
 *   fastestSurvival  — shortest winning run in ms (lower = better)
 *   totalBotsDeleted — all-time cumulative bot eliminations
 *   highestTier      — highest Tier reached across all sessions
 */
const LS_KEY = 'goal_locked_stats_v1';

export interface PlayerStats {
  fastestSurvival: number | null;  // ms, null if never won
  totalBotsDeleted: number;
  highestTier: number;
  highestScore: number;
}

function load(): PlayerStats {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const stats = defaultStats();
        if (typeof parsed.fastestSurvival === 'number' || parsed.fastestSurvival === null) {
          stats.fastestSurvival = parsed.fastestSurvival;
        }
        if (typeof parsed.totalBotsDeleted === 'number') {
          stats.totalBotsDeleted = parsed.totalBotsDeleted;
        }
        if (typeof parsed.highestTier === 'number') {
          stats.highestTier = parsed.highestTier;
        }
        if (typeof parsed.highestScore === 'number') {
          stats.highestScore = parsed.highestScore;
        }
        return stats;
      }
    }
  } catch (_) {}
  return defaultStats();
}

function save(s: PlayerStats) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
}

function defaultStats(): PlayerStats {
  return { fastestSurvival: null, totalBotsDeleted: 0, highestTier: 1, highestScore: 0 };
}

export const Stats = {
  load,

  /** Call when a bot (non-player) is eliminated */
  recordBotElimination() {
    const s = load();
    s.totalBotsDeleted += 1;
    save(s);
    return s;
  },

  /** Call on player victory — survivalMs = game duration */
  recordVictory(survivalMs: number, tier: number) {
    const s = load();
    if (s.fastestSurvival === null || survivalMs < s.fastestSurvival) {
      s.fastestSurvival = survivalMs;
    }
    if (tier > s.highestTier) s.highestTier = tier;
    save(s);
    return s;
  },

  /** Call on match end to update high score */
  recordScore(score: number) {
    const s = load();
    if (score > s.highestScore) {
      s.highestScore = score;
      save(s);
    }
    return s;
  },

  /** Format ms as M:SS.s */
  formatTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0.0s';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    const ds = Math.floor((ms % 1000) / 100);
    return m > 0 ? `${m}m ${s}.${ds}s` : `${s}.${ds}s`;
  },
};
