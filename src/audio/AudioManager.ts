/**
 * AudioManager — Howler.js implementation for Goal-Locked.
 *
 * ── SOUND FILES: place all files in goal-locked/public/sounds/ ──────────────
 *   bounce.mp3
 *   pulse.mp3
 *   elimination.mp3
 *   shield.mp3
 *
 * ── BGM PLAYLIST ────────────────────────────────────────────────────────────
 *   Name your tracks bgm1.mp3, bgm2.mp3, bgm3.mp3 … (as many as you like).
 *   Update BGM_COUNT below to match. They will shuffle and chain automatically.
 */
import { Howl, Howler } from 'howler';

// ── How many BGM tracks you have (bgm1.mp3 … bgmN.mp3) ──────────────────────
const BGM_COUNT = 3; // ← change this to match your file count

// ── Sound dictionary ─────────────────────────────────────────────────────────
const sounds: Record<string, Howl> = {
  bounce: new Howl({ src: ['/sounds/bounce.mp3'], volume: 0.5, preload: true }),
  pulse:  new Howl({ src: ['/sounds/pulse.mp3'],  volume: 0.8, preload: true }),
  elimination: new Howl({ src: ['/sounds/elimination.mp3'], volume: 0.9, preload: true }),
  shield: new Howl({ src: ['/sounds/shield.mp3'], volume: 0.7, preload: true }),
};

// ── BGM playlist ─────────────────────────────────────────────────────────────
// Build one Howl per track. html5: true = streaming decode (no long stall).
const bgmTracks: Howl[] = Array.from({ length: BGM_COUNT }, (_, i) =>
  new Howl({
    src: [`/sounds/bgm${i + 1}.mp3`],
    loop: false,        // we chain manually so we can shuffle
    volume: 0,          // start silent; fade in on first play
    preload: true,
    html5: true,
    autoplay: false,    // Critical for mobile: must be triggered by interaction
  }),
);

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Master volume ─────────────────────────────────────────────────────────────
Howler.volume(1.0);

// ── Manager class ─────────────────────────────────────────────────────────────
class AudioManagerClass {
  private playlist: Howl[]  = [];
  private trackIndex        = 0;
  private currentId: number | null = null;
  private currentTrack: Howl | null = null;
  private bgmStarted        = false;
  private stopped           = false;
  private currentRate       = 1.0;

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
    // Stop everything before starting fresh
    this.stopAmbient();
    this.bgmStarted = true;
    this.stopped = false;

    // Fresh shuffle every game
    this.playlist   = shuffle([...bgmTracks]);
    this.trackIndex = 0;
    this._playTrack(this.playlist[0], true /* fade in */);
  }

  private _playTrack(track: Howl, fadeIn: boolean) {
    if (this.stopped) return;
    
    // Stop ANY current track before playing a new one
    if (this.currentTrack) {
        this.currentTrack.stop();
        // this.currentTrack.unload(); // intentional avoid unload to keep memory warm, stop() is enough for overlap
    }

    this.currentTrack = track;
    track.volume(fadeIn ? 0 : 0.2);
    const id = track.play();
    this.currentId = id;

    // Apply current rate immediately
    track.rate(this.currentRate, id);

    if (fadeIn) {
      track.fade(0, 0.2, 1000, id);
    }

    // When this track ends, advance to the next (loop whole playlist on exhaust)
    track.once('end', () => {
      if (this.stopped) return;
      this.trackIndex = (this.trackIndex + 1) % this.playlist.length;
      // Re-shuffle after a full cycle for variety
      if (this.trackIndex === 0) shuffle(this.playlist);
      this._playTrack(this.playlist[this.trackIndex], false);
    });
  }

  /**
   * Scale BGM rate as players are eliminated.
   * remainingPlayers 8→1 maps rate 1.0→1.4
   */
  setAmbientIntensity(remainingPlayers: number, totalPlayers = 8) {
    const t = 1 - (remainingPlayers - 1) / (totalPlayers - 1);
    this.currentRate = Math.min(1.0 + t * 0.4, 1.6);
    if (this.currentTrack && this.currentId !== null) {
      this.currentTrack.rate(this.currentRate, this.currentId);
    }
  }

  changeTier() {
    this.stopAmbient();

    // 2. Shuffle
    this.playlist = shuffle([...bgmTracks]);
    this.trackIndex = 0;

    // 3. Reset Speed and State
    this.currentRate = 1.0;
    this.bgmStarted = true;
    this.stopped = false;

    // 4. Fade (handled by _playTrack's 1000ms fadeIn flag)
    this._playTrack(this.playlist[0], true);
  }

  stopAmbient() {
    if (!this.bgmStarted) return;
    this.stopped = true;

    if (this.currentTrack && this.currentId !== null) {
      const vol = this.currentTrack.volume() as number;
      this.currentTrack.fade(vol, 0, 2000, this.currentId);
      const track = this.currentTrack;
      const id    = this.currentId;
      setTimeout(() => { track.stop(id); }, 2100);
    }

    this.currentId    = null;
    this.currentTrack = null;
    this.bgmStarted   = false;
    this.currentRate  = 1.0;
  }
}

// Singleton export — same API surface as before, AudioController.tsx unchanged
export const AudioManager = new AudioManagerClass();
