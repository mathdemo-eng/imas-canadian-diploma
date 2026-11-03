// Small rules used by the campus films player, kept apart so they can be tested.

/** 64.09 → "1:04". */
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * How strongly to pulse on the music's beat at time t: 1 right on a beat, fading to 0 a quarter
 * of a beat later. Before the first beat it is 0.
 */
export function beatPulse(t: number, beat: { first: number; length: number }) {
  if (t < beat.first) return 0;
  const phase = ((t - beat.first) / beat.length) % 1;
  return Math.max(0, 1 - phase * 4);
}

/**
 * Keeps the second film in step with the first when both play side by side. A large gap is
 * closed by jumping; a small one by playing the second film slightly faster or slower.
 */
export function followerCorrection(leadTime: number, followerTime: number): { seekTo?: number; rate: number } {
  const drift = followerTime - leadTime;
  if (Math.abs(drift) > 0.25) return { seekTo: leadTime, rate: 1 };
  if (Math.abs(drift) > 0.04) return { rate: drift > 0 ? 0.94 : 1.06 };
  return { rate: 1 };
}
