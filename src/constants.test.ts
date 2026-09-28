import { describe, it, expect } from 'vitest';
import {
  ARENA_RADIUS,
  GOALS,
  SLOW_MO_DIST,
  PLAYER_GOAL_ANGLE,
  PLAYER_START_POS,
  PLAYER_BODY_TAG,
} from './constants';

describe('Game Constants', () => {
  it('should have the correct ARENA_RADIUS', () => {
    expect(ARENA_RADIUS).toBe(45);
  });

  it('should have the correct GOALS count', () => {
    expect(GOALS).toBe(8);
  });

  it('should have the correct SLOW_MO_DIST', () => {
    expect(SLOW_MO_DIST).toBe(5.0);
  });

  it('should have the correct PLAYER_GOAL_ANGLE', () => {
    expect(PLAYER_GOAL_ANGLE).toBe(0);
  });

  it('should have the correct PLAYER_START_POS', () => {
    expect(PLAYER_START_POS).toStrictEqual([45, 1, 0]);
  });

  it('should have the correct PLAYER_BODY_TAG', () => {
    expect(PLAYER_BODY_TAG).toBe('__player__');
  });
});
