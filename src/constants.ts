// Global game constants — single source of truth used by all systems
export const ARENA_RADIUS = 20;
export const GOALS = 8;
export const SLOW_MO_DIST = 5.0;

// Player is always goal slot 0 — position at angle 0 on the perimeter
export const PLAYER_GOAL_ANGLE = 0;
export const PLAYER_START_POS: [number, number, number] = [ARENA_RADIUS, 1, 0];

// A unique tag attached to the player's Cannon body so other systems can identify it
export const PLAYER_BODY_TAG = '__player__';
