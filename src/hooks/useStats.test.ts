import { describe, it, expect } from 'vitest';
import { Stats } from './useStats';

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
