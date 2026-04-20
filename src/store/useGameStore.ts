import { create } from 'zustand';

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
  remainingPlayers: number;
  ballPosition: [number, number, number];
  moveDirection: [number, number];
  pulseTrigger: boolean;
  impactPosition: [number, number, number] | null;
  eliminationLog: EliminationEntry[];
  currentRadius: number;
  playerShields: number;        // Player has 3 lives before elimination

  // Actions
  startGame: () => void;
  registerGoal: (playerIndex: number) => void;
  resetGame: () => void;
  updateBallPosition: (pos: [number, number, number]) => void;
  setMoveDirection: (dir: [number, number]) => void;
  triggerPulse: () => void;
  setImpactPosition: (pos: [number, number, number] | null) => void;
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
  remainingPlayers: GOAL_COUNT,
  ballPosition: [0, 5, 0],
  moveDirection: [0, 0],
  pulseTrigger: false,
  impactPosition: null,
  eliminationLog: [],
  currentRadius: 25,
  playerShields: 3,

  startGame: () => set({ gameStarted: true }),

  registerGoal: (playerIndex: number) => set((state) => {
    const newEliminated = [...state.eliminated];
    if (newEliminated[playerIndex]) return state; // Already out

    // ── Player shield system ──────────────────────────────────────────
    if (playerIndex === 0 && state.playerShields > 1) {
      const shieldsLeft = state.playerShields - 1;
      const entry: EliminationEntry = {
        id: -1,
        message: `🛡️ Shield broken! ${shieldsLeft} remaining`,
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
    const name = SLOT_NAMES[playerIndex] ?? `Sector ${playerIndex + 1}`;
    const message = isPlayer
      ? '💀 Game over! You\'ve been eliminated!'
      : `⚽ ${name} is out!`;

    const newEntry: EliminationEntry = {
      id: playerIndex,
      message,
      timestamp: Date.now(),
    };

    return {
      eliminated: newEliminated,
      lastGoal: playerIndex,
      remainingPlayers: remainingCount,
      victory: remainingCount === 1,
      eliminationLog: [...state.eliminationLog, newEntry],
      currentRadius: state.currentRadius * 0.9,
      ...(isPlayer ? { playerShields: 0 } : {}),
    };
  }),

  resetGame: () => set({
    gameStarted: false,
    score: new Array(GOAL_COUNT).fill(0),
    eliminated: new Array(GOAL_COUNT).fill(false),
    lastGoal: null,
    victory: false,
    remainingPlayers: GOAL_COUNT,
    ballPosition: [0, 5, 0],
    moveDirection: [0, 0],
    pulseTrigger: false,
    impactPosition: null,
    eliminationLog: [],
    currentRadius: 25,
    playerShields: 3,
  }),

  updateBallPosition: (pos) => set({ ballPosition: pos }),
  setMoveDirection: (dir) => set({ moveDirection: dir }),
  triggerPulse: () => {
    set({ pulseTrigger: true });
    setTimeout(() => set({ pulseTrigger: false }), 100);
  },
  setImpactPosition: (pos) => set({ impactPosition: pos }),
}));
