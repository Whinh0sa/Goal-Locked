import { create } from 'zustand';

interface GameState {
  gameStarted: boolean;
  score: number[];
  eliminated: boolean[];
  lastGoal: number | null;
  victory: boolean;
  remainingPlayers: number;
  ballPosition: [number, number, number];
  
  // Actions
  startGame: () => void;
  registerGoal: (playerIndex: number) => void;
  resetGame: () => void;
  updateBallPosition: (pos: [number, number, number]) => void;
}

const GOAL_COUNT = 8;

export const useGameStore = create<GameState>((set) => ({
  gameStarted: false,
  score: new Array(GOAL_COUNT).fill(0),
  eliminated: new Array(GOAL_COUNT).fill(false),
  lastGoal: null,
  victory: false,
  remainingPlayers: GOAL_COUNT,
  ballPosition: [0, 5, 0],

  startGame: () => set({ gameStarted: true }),

  registerGoal: (playerIndex: number) => set((state) => {
    const newEliminated = [...state.eliminated];
    if (newEliminated[playerIndex]) return state; // Already out

    newEliminated[playerIndex] = true;
    const remainingCount = newEliminated.filter(e => !e).length;
    
    return {
      eliminated: newEliminated,
      lastGoal: playerIndex,
      remainingPlayers: remainingCount,
      victory: remainingCount === 1,
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
  }),

  updateBallPosition: (pos) => set({ ballPosition: pos }),
}));
