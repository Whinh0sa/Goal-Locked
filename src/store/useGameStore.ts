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
  lastGoal: number | null;
  eliminated: boolean[];
  victory: boolean;
  gameOver: boolean;
  score: number;       // Current match score
  highScore: number;   // All-time high score
  maxTier: number;     // Highest tier ever reached
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
  playerRingColor: string | null;
  entryPortalActive: boolean;
  playerSpeedMultiplier: number;
  dashCooldownUntil: number;
  ghostBallUntil: number;
  freezeBotsUntil: number;
  tier: number;           // Escalating difficulty tier — survives resets
  gameStartTime: number;  // Date.now() when game started, for survival timing
  playerKills: number;    // Number of bots eliminated while player is alive
  botNames: string[];     // Runtime assigned bot names for kill feed
  botPositions: [number, number, number][]; // Physics drop coordinates
  lastStriker: number | null;               // ID of the last entity to strike/pulse the ball

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
  setPlayerRingColor: (color: string | null) => void;
  triggerEntryPortal: () => void;
  triggerDash: () => void;
  triggerGhostBall: () => void;
  triggerFreeze: () => void;
  setBotName: (index: number, name: string) => void;
  setLastStriker: (id: number | null) => void;
  advanceToNextTier: () => void;
  resetPositions: () => void;
}

const GOAL_COUNT = 8;

// Human-readable slot names
const SLOT_NAMES = [
  'YOU', 'BOT 2', 'BOT 3', 'BOT 4',
  'BOT 5',   'BOT 6', 'BOT 7', 'BOT 8',
];

export const useGameStore = create<GameState>((set, get) => ({
  gameStarted: false,
  eliminated: new Array(GOAL_COUNT).fill(false),
  lastGoal: null,
  victory: false,
  gameOver: false,
  score: 0,
  highScore: Stats.load().highestScore,
  maxTier: Stats.load().highestTier,
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
  playerRingColor: null,
  entryPortalActive: false,
  playerSpeedMultiplier: 1,
  dashCooldownUntil: 0,
  ghostBallUntil: 0,
  freezeBotsUntil: 0,
  tier: 1,
  gameStartTime: 0,
  playerKills: 0,
  botNames: new Array(GOAL_COUNT).fill(''),
  botPositions: new Array(GOAL_COUNT).fill(null).map(() => [0, 10, 0] as [number, number, number]),
  lastStriker: null,

  startGame: () => {
    get().resetPositions();
    set({ gameStarted: true, gameStartTime: Date.now() });
  },

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
    const name = state.botNames[playerIndex] || `BOT ${playerIndex + 1}`;
    
    // We only explicitly say the player eliminated them if the player is still alive, else they just die
    const message = isPlayer
      ? 'GAME OVER — You\'ve been eliminated'
      : state.eliminated[0] ? `${name} was eliminated` : `Player eliminated ${name}`;

    const newPlayerKills = (!isPlayer && !state.eliminated[0]) 
      ? state.playerKills + 1 
      : state.playerKills;

    const newEntry: EliminationEntry = {
      id: playerIndex,
      message,
      timestamp: Date.now(),
    };

    // Persist bot deletions to localStorage
    if (!isPlayer) {
      Stats.recordBotElimination();
      // Increase score by 10 ONLY if player was the last striker
      if (state.lastStriker === 0) {
        state.score += 10;
      }
    }

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
      
      // Update max tier
      if (state.tier + 1 > state.maxTier) {
        localStorage.setItem('crucible_maxtier', (state.tier + 1).toString());
        state.maxTier = state.tier + 1;
      }
    }

    // Persistence on game over (Win or Loss)
    if (isPlayer || isVictory) {
      Stats.recordScore(state.score);
      // Refresh highScore from disk
      state.highScore = Stats.load().highestScore;
    }

    return {
      eliminated: newEliminated,
      lastGoal: playerIndex,
      remainingPlayers: remainingCount,
      victory: isVictory,
      gameOver: isVictory || isPlayer || state.eliminated[0], // gameOver on defeat too, and persist if already dead
      score: state.score,
      tier: isVictory ? state.tier + 1 : state.tier,
      eliminationLog: [...state.eliminationLog, newEntry],
      currentRadius: state.currentRadius * 0.9,
      playerKills: newPlayerKills,
    };
  }),

  resetGame: () => {
    get().resetPositions();
    set(state => ({
      gameStarted: false,
      score: 0,
      tier: 1,
      eliminated: new Array(GOAL_COUNT).fill(false),
      lastGoal: null,
      victory: false,
      gameOver: false,
      remainingPlayers: GOAL_COUNT,
      moveDirection: [0, 0] as [number, number],
    pulseTrigger: false,
    impactPosition: null,
    impactStrength: 0,
    eliminationLog: [],
    currentRadius: ARENA_RADIUS,
    playerShields: 3,
    playerSpeedMultiplier: 1,
    dashCooldownUntil: 0,
    ghostBallUntil: 0,
    freezeBotsUntil: 0,
    gameStartTime: 0,
    playerKills: 0,
    // Note: botNames are NOT reset here so they persist for rendering until next mount
    lastStriker: null,
    }));
  },

  advanceToNextTier: () => {
    get().resetPositions();
    set(state => ({
      gameStarted: true,
      eliminated: new Array(GOAL_COUNT).fill(false),
      lastGoal: null,
      victory: false,
      gameOver: false,
      remainingPlayers: GOAL_COUNT,
      currentRadius: ARENA_RADIUS,
      lastStriker: null,
      // score, tier, playerKills are INHERITED/PERSISTED
    }));
  },

  resetPositions: () => set(() => {
    const getPos = (scatter = 20): [number, number, number] => {
      const x = (Math.random() - 0.5) * scatter;
      const z = (Math.random() - 0.5) * scatter;
      const y = 10 + Math.random() * 5; // Drop from height
      return [x, y, z];
    };
    return {
      playerPosition: [18, 1, 0], // Fixed start for player
      ballPosition: [0, 5, 0],    // Fixed start for ball
      botPositions: Array.from({ length: GOAL_COUNT }, () => getPos(30)), // Wider scatter for bots
    };
  }),

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
  setPlayerRingColor: (color) => set({ playerRingColor: color }),
  triggerEntryPortal: () => {
    set({ entryPortalActive: true });
    setTimeout(() => set({ entryPortalActive: false }), 3000); // Effect lasts 3s
  },
  triggerGhostBall: () => set({ ghostBallUntil: Date.now() + 5000 }),
  triggerFreeze: () => set({ freezeBotsUntil: Date.now() + 3000 }),
  setBotName: (index, name) => set(state => {
    const newNames = [...state.botNames];
    newNames[index] = name;
    return { botNames: newNames };
  }),
  setLastStriker: (id) => set({ lastStriker: id })
}));
