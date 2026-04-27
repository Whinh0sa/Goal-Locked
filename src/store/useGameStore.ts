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
  impactColor: string;
  impactVelocity: number;
  impactStrength: number;
  eliminationLog: EliminationEntry[];
  currentRadius: number;
  playerShields: number;
  playerRingColor: string | null;
  entryPortalActive: boolean;
  playerSpeedUntil: number;
  playerGhostUntil: number;
  playerJuggernautUntil: number;
  freezeBotsUntil: number;
  empUntil: number;
  dashCooldownUntil: number;
  tier: number;
  gameStartTime: number;
  playerKills: number;
  botNames: string[];
  botPositions: [number, number, number][];
  lastStriker: number | null;
  botBuffs: Record<number, { speedUntil: number, juggernautUntil: number, ghostUntil: number }>;
  activePowerUp: { position: [number, number, number], type: string } | null;
  cameraMode: 'DYNAMIC' | 'TACTICAL' | 'ORBIT';
  zoomOffset: number;
  isHudOpen: boolean;
  isPaused: boolean;

  // Actions
  startGame: () => void;
  registerGoal: (playerIndex: number) => void;
  resetGame: () => void;
  updateBallPosition: (pos: [number, number, number]) => void;
  updatePlayerPosition: (pos: [number, number, number]) => void;
  setMoveDirection: (dir: [number, number]) => void;
  triggerPulse: () => void;
  setImpactPosition: (pos: [number, number, number] | null, vel?: number, color?: string) => void;
  setSpeedMultiplier: (m: number) => void;
  setPlayerRingColor: (color: string | null) => void;
  triggerEntryPortal: () => void;
  triggerBotFreeze: () => void;
  triggerEMP: () => void;
  triggerDashCD: () => void;
  triggerDash: () => void;
  triggerGhostBall: () => void;
  triggerFreeze: () => void;
  setBotName: (index: number, name: string) => void;
  setLastStriker: (id: number | null) => void;
  advanceToNextTier: () => void;
  resetPositions: () => void;
  setActivePowerUp: (powerUp: { position: [number, number, number], type: string } | null) => void;
  triggerPowerUp: (type: 'speed' | 'ghost' | 'freeze' | 'juggernaut', entityId: number) => void;
  cycleCameraMode: () => void;
  setZoomOffset: (val: number) => void;
  toggleHud: () => void;
  togglePause: () => void;
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
  playerSpeedUntil: 0,
  playerGhostUntil: 0,
  playerJuggernautUntil: 0,
  freezeBotsUntil: 0,
  empUntil: 0,
  dashCooldownUntil: 0,
  tier: 1,
  gameStartTime: 0,
  playerKills: 0,
  botNames: new Array(GOAL_COUNT).fill(''),
  botPositions: new Array(GOAL_COUNT).fill(null).map(() => [0, 10, 0] as [number, number, number]),
  lastStriker: null,
  botBuffs: {},
  activePowerUp: null,
  cameraMode: 'DYNAMIC',
  zoomOffset: 0,
  isHudOpen: window.innerWidth >= 768,
  isPaused: false,
  lastGoal: null,
  victory: false,
  gameOver: false,
  score: 0,
  highScore: Stats.load().highestScore,
  maxTier: Stats.load().highestTier,
  remainingPlayers: GOAL_COUNT,
  ballPosition: [0, 5, 0],
  playerPosition: [ARENA_RADIUS - 3, 1, 0],
  moveDirection: [0, 0],
  pulseTrigger: false,
  impactPosition: null,
  impactColor: '#FFBF00',
  impactVelocity: 0,
  impactStrength: 0,
  eliminationLog: [],
  currentRadius: ARENA_RADIUS,
  playerShields: 3,
  playerRingColor: null,
  entryPortalActive: false,

  startGame: () => {
    get().resetPositions();
    set({ 
      gameStarted: true, 
      gameStartTime: Date.now(),
      score: 0,
      playerKills: 0,
      lastStriker: null,
      eliminationLog: [],
      remainingPlayers: GOAL_COUNT,
      victory: false,
      gameOver: false,
      eliminated: new Array(GOAL_COUNT).fill(false)
    });
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
    const victimName = isPlayer ? "PLAYER" : (state.botNames[playerIndex] || `BOT ${playerIndex + 1}`);

    // Determine the striker
    const strikerId = state.lastStriker;
    let strikerName = "THE ARENA";
    if (strikerId === 0) strikerName = "PLAYER";
    else if (strikerId !== null && strikerId > 0) {
      strikerName = state.botNames[strikerId] || `BOT ${strikerId + 1}`;
    }

    const message = (isPlayer && strikerId === null) 
      ? "GAME OVER — You've been eliminated" 
      : `${strikerName} eliminated ${victimName}`;

    // Scoring & Kill tracking: Only if player (0) hit it and a bot (not 0) died
    const isPlayerKill = strikerId === 0 && !isPlayer;
    const newScore = isPlayerKill ? state.score + 10 : state.score;
    const newPlayerKills = isPlayerKill ? state.playerKills + 1 : state.playerKills;

    const newEntry: EliminationEntry = {
      id: playerIndex,
      message,
      timestamp: Date.now(),
    };

    // Persist bot deletions to localStorage
    if (!isPlayer) {
      Stats.recordBotElimination();
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
        lastStriker: null, // Reset memory
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
      Stats.recordScore(newScore);
      // Refresh highScore from disk
      state.highScore = Stats.load().highestScore;
    }

    return {
      eliminated: newEliminated,
      lastGoal: playerIndex,
      remainingPlayers: remainingCount,
      victory: isVictory,
      gameOver: isVictory || isPlayer || state.eliminated[0],
      score: newScore,
      tier: isVictory ? state.tier + 1 : state.tier,
      eliminationLog: [...state.eliminationLog, newEntry],
      currentRadius: state.currentRadius * 0.9,
      playerKills: newPlayerKills,
      lastStriker: null, // Reset memory
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
    impactColor: '#FFBF00',
    impactVelocity: 0,
    impactStrength: 0,
    eliminationLog: [],
    currentRadius: ARENA_RADIUS,
    playerShields: 3,
    playerSpeedUntil: 0,
    playerGhostUntil: 0,
    playerJuggernautUntil: 0,
    freezeBotsUntil: 0,
    empUntil: 0,
    gameStartTime: 0,
    playerKills: 0,
    lastStriker: null,
    botBuffs: {},
    activePowerUp: null,
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
      gameStartTime: Date.now(),
      playerShields: Math.min(state.playerShields + 1, 3),
      // score, tier, playerKills are INHERITED/PERSISTED
    }));
  },

  resetPositions: () => set((state) => {
    const safeRadius = (state.currentRadius || ARENA_RADIUS) * 0.8;
    const clamp = (val: number) => Math.sign(val) * Math.min(Math.abs(val), safeRadius);

    const getPos = (scatter = 20): [number, number, number] => {
      const x = (Math.random() - 0.5) * scatter;
      const z = (Math.random() - 0.5) * scatter;
      const y = 10 + Math.random() * 5; // Drop from height
      return [clamp(x), y, clamp(z)];
    };
    return {
      playerPosition: [0, 1, (state.currentRadius || ARENA_RADIUS) * 0.4], // Fixed dynamic start for player
      ballPosition: [0, 5, 0],    // Fixed start for ball
      impactPosition: null,
      impactColor: '#FFBF00',
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
  setImpactPosition: (pos, vel = 0, color = '#FFBF00') => set({ 
    impactPosition: pos, 
    impactVelocity: vel,
    impactColor: color 
  }),
  setSpeedMultiplier: (m) => set({ playerSpeedUntil: m > 1 ? Date.now() + 5000 : 0 }),
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
  triggerBotFreeze: () => set({ freezeBotsUntil: Date.now() + 5000 }),
  triggerEMP: () => set({ empUntil: Date.now() + 10000 }),
  triggerDashCD: () => set({ dashCooldownUntil: Date.now() + 1000 }),
  triggerGhostBall: () => set({ playerGhostUntil: Date.now() + 5000 }),
  triggerFreeze: () => set({ freezeBotsUntil: Date.now() + 3000 }),
  setBotName: (index, name) => set(state => {
    const newNames = [...state.botNames];
    newNames[index] = name;
    return { botNames: newNames };
  }),
  setLastStriker: (id) => set({ lastStriker: id }),

  triggerPowerUp: (type, entityId) => set(state => {
    const isPlayer = entityId === 0;
    const now = Date.now();
    const duration = 5000;

    if (type === 'speed') {
      if (isPlayer) return { playerSpeedUntil: now + duration };
      const newBuffs = { ...state.botBuffs };
      newBuffs[entityId] = { ...(newBuffs[entityId] || { speedUntil: 0, juggernautUntil: 0, ghostUntil: 0 }), speedUntil: now + duration };
      return { botBuffs: newBuffs };
    }

    if (type === 'ghost') {
      if (isPlayer) return { playerGhostUntil: now + duration };
      const newBuffs = { ...state.botBuffs };
      newBuffs[entityId] = { ...(newBuffs[entityId] || { speedUntil: 0, juggernautUntil: 0, ghostUntil: 0 }), ghostUntil: now + duration };
      return { botBuffs: newBuffs };
    }

    if (type === 'freeze') {
      return { freezeBotsUntil: now + 3000 };
    }

    if (type === 'juggernaut') {
      if (isPlayer) return { playerJuggernautUntil: now + duration, playerSpeedUntil: now + duration };
      const newBuffs = { ...state.botBuffs };
      newBuffs[entityId] = { 
        ...(newBuffs[entityId] || { speedUntil: 0, juggernautUntil: 0, ghostUntil: 0 }), 
        juggernautUntil: now + duration,
        speedUntil: now + duration 
      };
      return { botBuffs: newBuffs };
    }
    return state;
  }),

  setActivePowerUp: (powerUp) => set({ activePowerUp: powerUp }),
  cycleCameraMode: () => set(state => {
    const modes: ('DYNAMIC' | 'TACTICAL' | 'ORBIT')[] = ['DYNAMIC', 'TACTICAL', 'ORBIT'];
    const nextIdx = (modes.indexOf(state.cameraMode) + 1) % modes.length;
    return { cameraMode: modes[nextIdx] };
  }),
  setZoomOffset: (val) => set({ zoomOffset: val }),
  toggleHud: () => set(state => ({ isHudOpen: !state.isHudOpen })),
  togglePause: () => set(state => ({ isPaused: !state.isPaused })),
}));
