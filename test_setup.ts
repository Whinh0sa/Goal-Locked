import { vi } from 'vitest';

// Supress standard react three fiber console errors in jsdom
const consoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('is using incorrect casing') ||
      args[0].includes('is unrecognized in this browser') ||
      args[0].includes('React does not recognize the'))
  ) {
    return;
  }
  consoleError(...args);
};

// We also need to spy on crypto.randomUUID
if (!global.crypto) {
  (global as any).crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid-1234-5678-90ab-cdef01234567';
}

// Ensure deterministic Math.random for tests since we have time-based random stuff inside PowerUp
const globalRandom = Math.random;
let randomCallCount = 0;
Math.random = () => {
    randomCallCount++;
    return (randomCallCount % 10) / 10;
};
