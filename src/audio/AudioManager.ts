/**
 * AudioManager — Howler.js implementation for Goal-Locked.
 * 
 * NUCLEAR SINGLETON ARCHITECTURE:
 * To prevent memory leaks and overlapping tracks, we never keep a playlist array.
 * We load ONE track at a time and physically UNLOAD it from memory when finished.
 */
import { Howl, Howler } from 'howler';

const BGM_COUNT = 7; 

// ── Sound dictionary (SFX) ──────────────────────────────────────────────────
const sounds: Record<string, Howl> = {
  bounce: new Howl({ src: ['/sounds/bounce.mp3'], volume: 0.5, preload: true }),
  pulse:  new Howl({ src: ['/sounds/pulse.mp3'],  volume: 0.8, preload: true }),
  elimination: new Howl({ src: ['/sounds/elimination.mp3'], volume: 0.9, preload: true }),
  shield: new Howl({ src: ['/sounds/shield.mp3'], volume: 0.7, preload: true }),
};

Howler.volume(1.0);

class AudioManagerClass {
  private currentBgm: Howl | null = null;
  private currentId: number | null = null;
  private currentRate = 1.0;
  private stopped = false;

  // ── SFX ──────────────────────────────────────────────────────────────────
  playBounce(strength: number) {
    if (strength < 5) return;
    const vol = Math.min(strength / 20, 1.0);
    const id = sounds.bounce.play();
    sounds.bounce.volume(vol, id);
  }

  playPulse()       { sounds.pulse.play(); }
  playElimination() { sounds.elimination.play(); }
  playShieldBreak() { sounds.shield.play(); }

  // ── BGM ──────────────────────────────────────────────────────────────────
  startAmbient() {
    this.stopAmbient();
    this.stopped = false;

    // Pick a truly random track
    const randomIdx = Math.floor(Math.random() * BGM_COUNT) + 1;
    
    this.currentBgm = new Howl({
      src: [`/sounds/bgm${randomIdx}.mp3`],
      volume: 0, // start silent for fade
      loop: true,
      html5: true,
      autoplay: false,
    });

    const id = this.currentBgm.play();
    this.currentId = id;
    this.currentBgm.fade(0, 0.2, 1000, id);
    this.currentBgm.rate(this.currentRate, id);
  }

  /**
   * Scale BGM rate as players are eliminated.
   */
  setAmbientIntensity(remainingPlayers: number, totalPlayers = 8) {
    const t = 1 - (remainingPlayers - 1) / (totalPlayers - 1);
    this.currentRate = Math.min(1.0 + t * 0.4, 1.6);
    if (this.currentBgm && this.currentId !== null) {
      this.currentBgm.rate(this.currentRate, this.currentId);
    }
  }

  changeTier() {
    // Exact same as startAmbient but ensures we reset the speed
    this.currentRate = 1.0;
    this.startAmbient();
  }

  stopAmbient() {
    this.stopped = true;
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.unload(); // Nuclear: destroy the instance from memory
      this.currentBgm = null;
    }
    this.currentId = null;
  }
}

export const AudioManager = new AudioManagerClass();
