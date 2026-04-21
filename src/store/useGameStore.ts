import { create } from 'zustand';
import { Stats } from '../hooks/useStats';
import { ARENA_RADIUS } from '../constants';

export interface EliminationEntry {
  id: number;
  message: string;
  timestamp: number;
}

interface GameState {
  gameStarted: boolean;
  score: number[];
  eliminated: boolean[];
  lastGoal: number | null;
  victory: boolean;
  gameOver: boolean;  // true for both win AND loss — gates end-game UI
  remainingPlayers: number;
  ballPosition: [number, number, number];
  playerPosition: [number, number, number];
  moveDirection: [number, number];
  pulseTrigger: boolean;
  impactPosition: [number, number, number] | null;
  impactStrength: number;
  eliminationLog: EliminationEntry[];
  currentRadius: number;
  playerShields: number;
  playerSpeedMultiplier: number;
  dashCooldownUntil: number;
  tier: number;           // Escalating difficulty tier — survives resets
  gameStartTime: number;  // Date.now() when game started, for survival timing

  // Actions
  startGame: () => void;
  registerGoal: (playerIndex: number) => void;
  resetGame: () => void;
  updateBallPosition: (pos: [number, number, number]) => void;
  updatePlayerPosition: (pos: [number, number, number]) => void;
  setMoveDirection: (dir: [number, number]) => void;
  triggerPulse: () => void;
  setImpactPosition: (pos: [number, number, number] | null, strength?: number) => void;
  setSpeedMultiplier: (m: number) => void;
  triggerDash: () => void;
}

const GOAL_COUNT = 8;

// Human-readable slot names
const SLOT_NAMES = [
  'Your Sector', 'Sector 2', 'Sector 3', 'Sector 4',
  'Sector 5',   'Sector 6', 'Sector 7', 'Sector 8',
];

export const useGameStore = create<GameState>((set) => ({
  gameStarted: false,
  score: new Array(GOAL_COUNT).fill(0),
  eliminated: new Array(GOAL_COUNT).fill(false),
  lastGoal: null,
  victory: false,
  gameOver: false,
  remainingPlayers: GOAL_COUNT,
  ballPosition: [0, 5, 0],
  playerPosition: [18, 1, 0],
  moveDirection: [0, 0],
  pulseTrigger: false,
  impactPosition: null,
  impactStrength: 0,
  eliminationLog: [],
  currentRadius: ARENA_RADIUS,
  playerShields: 3,
  playerSpeedMultiplier: 1,
  dashCooldownUntil: 0,
  tier: 1,
  gameStartTime: 0,

  startGame: () => set({ gameStarted: true, gameStartTime: Date.now() }),

  registerGoal: (playerIndex: number) => set((state) => {
    const newEliminated = [...state.eliminated];
    if (newEliminated[playerIndex]) return state; // Already out

    // ── Player shield system ──────────────────────────────────────────
    if (playerIndex === 0 && state.playerShields > 1) {
      const shieldsLeft = state.playerShields - 1;
      const entry: EliminationEntry = {
        id: -1,
        message: `🛡 Shield hit — ${shieldsLeft} left`,
        timestamp: Date.now(),
      };
      return {
        playerShields: shieldsLeft,
        eliminationLog: [...state.eliminationLog, entry],
      };
    }

    // Normal elimination (or player out of shields)
    newEliminated[playerIndex] = true;
    const remainingCount = newEliminated.filter(e => !e).length;

    const isPlayer = playerIndex === 0;
    const message = isPlayer
      ? 'GAME OVER — You\'ve been eliminated'
      : `GOAL! — Sector ${playerIndex + 1} eliminated`;

    const newEntry: EliminationEntry = {
      id: playerIndex,
      message,
      timestamp: Date.now(),
    };

    // Persist bot deletions to localStorage
    if (!isPlayer) Stats.recordBotElimination();

    // Condition A: player just got eliminated → game over, defeat
    if (isPlayer) {
      return {
        eliminated: newEliminated,
        lastGoal: playerIndex,
        remainingPlayers: remainingCount,
        victory: false,
        gameOver: true,
        eliminationLog: [...state.eliminationLog, newEntry],
        currentRadius: state.currentRadius * 0.9,
        playerShields: 0,
      };
    }

    // Condition B: a bot was eliminated — check if player is now the last one
    const isVictory = remainingCount === 1 && !newEliminated[0];
    if (isVictory) {
      const survivalMs = Date.now() - state.gameStartTime;
      Stats.recordVictory(survivalMs, state.tier + 1);
    }

    return {
      eliminated: newEliminated,
      lastGoal: playerIndex,
      remainingPlayers: remainingCount,
      victory: isVictory,
      gameOver: isVictory,
      // Increment tier immediately on victory (carries into next game)
      tier: isVictory ? state.tier + 1 : state.tier,
      eliminationLog: [...state.eliminationLog, newEntry],
      currentRadius: state.currentRadius * 0.9,
    };
  }),

  resetGame: () => set(state => ({
    gameStarted: false,
    score: new Array(GOAL_COUNT).fill(0),
    eliminated: new Array(GOAL_COUNT).fill(false),
    lastGoal: null,
    victory: false,
    gameOver: false,
    remainingPlayers: GOAL_COUNT,
    ballPosition: [0, 5, 0] as [number, number, number],
    playerPosition: [18, 1, 0] as [number, number, number],
    moveDirection: [0, 0] as [number, number],
    pulseTrigger: false,
    impactPosition: null,
    impactStrength: 0,
    eliminationLog: [],
    currentRadius: ARENA_RADIUS,
    playerShields: 3,
    playerSpeedMultiplier: 1,
    dashCooldownUntil: 0,
    gameStartTime: 0,
    // tier intentionally preserved — carries escalating difficulty forward
    tier: state.tier,
  })),

  updateBallPosition: (pos) => set({ ballPosition: pos }),
  updatePlayerPosition: (pos) => set({ playerPosition: pos }),
  setMoveDirection: (dir) => set({ moveDirection: dir }),
  triggerPulse: () => {
    set({ pulseTrigger: true });
    setTimeout(() => set({ pulseTrigger: false }), 100);
  },
  setImpactPosition: (pos, strength = 0) => set({ impactPosition: pos, impactStrength: strength }),
  setSpeedMultiplier: (m) => set({ playerSpeedMultiplier: m }),
  triggerDash: () => set(state => {
    const now = Date.now();
    if (now < state.dashCooldownUntil) return state; // still on cooldown
    return { dashCooldownUntil: now + 3000 };
  }),
}));
