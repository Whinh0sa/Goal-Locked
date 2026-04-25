/**
 * AudioController — sits outside the Canvas and bridges Zustand store
 * state changes to AudioManager sound triggers.
 *
 * Listens for:
 *   - gameStarted  → start ambient drone
 *   - impactPosition changes → trigger BOUNCE (strength from store)
 *   - eliminationLog changes → ELIMINATION or SHIELD_BREAK
 *   - remainingPlayers changes → ramp ambient intensity
 *   - pulseTrigger → PULSE sound
 *   - victory / reset → stop ambient
 */
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { AudioManager } from '../../audio/AudioManager';

export const AudioController = () => {
  const gameStarted      = useGameStore(s => s.gameStarted);
  const impactPosition   = useGameStore(s => s.impactPosition);
  const impactStrength   = useGameStore(s => s.impactStrength);
  const eliminationLog   = useGameStore(s => s.eliminationLog);
  const remainingPlayers = useGameStore(s => s.remainingPlayers);
  const pulseTrigger     = useGameStore(s => s.pulseTrigger);
  const victory          = useGameStore(s => s.victory);
  const tier             = useGameStore(s => s.tier);

  const prevLogLen = useRef(0);
  const prevTier = useRef(1);

  // Shuffle track and reset rate when transitioning across tiers
  useEffect(() => {
    if (tier > prevTier.current) {
      prevTier.current = tier;
      AudioManager.changeTier();
    }
  }, [tier]);

  // Start / stop ambient drone
  useEffect(() => {
    if (gameStarted) {
      AudioManager.startAmbient();
    } else {
      AudioManager.stopAmbient();
    }
  }, [gameStarted]);

  // Stop on victory
  useEffect(() => {
    if (victory) AudioManager.stopAmbient();
  }, [victory]);

  // Scale ambient intensity as players are eliminated
  useEffect(() => {
    AudioManager.setAmbientIntensity(remainingPlayers);
  }, [remainingPlayers]);

  // Bounce sound — triggered by impactPosition changes
  useEffect(() => {
    if (impactPosition && impactStrength !== undefined && impactStrength > 5) {
      AudioManager.playBounce(impactStrength);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactPosition]);

  // Elimination / shield-break sounds
  useEffect(() => {
    const newEntries = eliminationLog.slice(prevLogLen.current);
    newEntries.forEach(entry => {
      if (entry.id === -1) {
        // id -1 = shield broken (not a full elimination)
        AudioManager.playShieldBreak();
      } else {
        AudioManager.playElimination();
      }
    });
    prevLogLen.current = eliminationLog.length;
  }, [eliminationLog]);

  // Pulse bass-drop
  useEffect(() => {
    if (pulseTrigger) AudioManager.playPulse();
  }, [pulseTrigger]);

  return null;
};
