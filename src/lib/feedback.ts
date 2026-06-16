type Prefs = { sound: boolean; haptics: boolean };

export type CelebrationTier = 'leg' | 'win';

type AudioCtxCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor: AudioCtxCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 1.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  start: number,
  duration: number,
  peak: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playTap(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    /* WebAudio failures are non-essential. */
  }
}

export function vibrateTap(hapticsEnabled: boolean): void {
  if (!hapticsEnabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(40);
  } catch {
    /* navigator.vibrate is best-effort. */
  }
}

export function dartFeedback(prefs: Prefs): void {
  playTap(prefs.sound);
  vibrateTap(prefs.haptics);
}

/** A missed dart: metallic clank plus the usual haptic tick. */
export function missFeedback(prefs: Prefs): void {
  playMiss(prefs.sound);
  vibrateTap(prefs.haptics);
}

/** Trash-can whoosh: a downward-swept band of noise. Used for X01 busts. */
export function playBust(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.34);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.4);
  } catch {
    /* WebAudio failures are non-essential. */
  }
}

/** Short metallic clank for a missed dart. */
export function playMiss(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    tone(ctx, 'square', 220, now, 0.06, 0.12);
    tone(ctx, 'triangle', 1650, now, 0.09, 0.07);
    tone(ctx, 'triangle', 2490, now, 0.07, 0.04);
  } catch {
    /* WebAudio failures are non-essential. */
  }
}

/**
 * Celebration jingle. `leg` is a brief two-note chime; `win` is a longer
 * ascending arpeggio with sparkle. The visual celebration plays regardless;
 * this only fires when sound is enabled.
 */
export function playCelebration(tier: CelebrationTier, soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    if (tier === 'leg') {
      tone(ctx, 'sine', 784, now, 0.18, 0.12);
      tone(ctx, 'sine', 1047, now + 0.11, 0.22, 0.12);
      return;
    }
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      tone(ctx, 'sine', freq, now + i * 0.12, 0.4, 0.12);
      tone(ctx, 'triangle', freq * 2, now + i * 0.12, 0.25, 0.04);
    });
    tone(ctx, 'sine', 1567.98, now + 0.56, 0.6, 0.12);
  } catch {
    /* WebAudio failures are non-essential. */
  }
}
