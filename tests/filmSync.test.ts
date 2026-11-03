import { describe, expect, it } from 'vitest';
import { BEAT, CAMPUS_FILMS, FILM_ORDER, FILM_SECONDS } from '../src/content/campusFilms';
import { beatPulse, followerCorrection, formatTime } from '../src/lib/filmSync';

describe('campus films', () => {
  it('shows times as minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9.9)).toBe('0:09');
    expect(formatTime(FILM_SECONDS)).toBe('1:04');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it('pulses on the beat and fades within a quarter beat', () => {
    expect(beatPulse(0, BEAT)).toBe(0);
    expect(beatPulse(BEAT.first, BEAT)).toBeCloseTo(1);
    expect(beatPulse(BEAT.first + 10 * BEAT.length, BEAT)).toBeCloseTo(1);
    expect(beatPulse(BEAT.first + BEAT.length / 8, BEAT)).toBeCloseTo(0.5);
    expect(beatPulse(BEAT.first + BEAT.length / 2, BEAT)).toBe(0);
  });

  it('keeps the second film in step with the first', () => {
    expect(followerCorrection(10, 10.01)).toEqual({ rate: 1 });
    expect(followerCorrection(10, 10.1)).toEqual({ rate: 0.94 });
    expect(followerCorrection(10, 9.9)).toEqual({ rate: 1.06 });
    expect(followerCorrection(10, 11)).toEqual({ seekTo: 10, rate: 1 });
    expect(followerCorrection(10, 8)).toEqual({ seekTo: 10, rate: 1 });
  });

  it('has both campuses, each with its films, poster and what the film shows', () => {
    expect(FILM_ORDER).toEqual(['selangor', 'kl']);
    for (const id of FILM_ORDER) {
      const f = CAMPUS_FILMS[id];
      expect(f.id).toBe(id);
      expect(f.film.webm).toMatch(new RegExp(`media/campus-${id}\\.webm$`));
      expect(f.film.mp4).toMatch(new RegExp(`media/campus-${id}\\.mp4$`));
      expect(f.loop.mp4).toMatch(new RegExp(`media/campus-${id}-loop\\.mp4$`));
      expect(f.inFilm.length).toBeGreaterThan(3);
      expect(f.tagline.length).toBeGreaterThan(20);
    }
  });
});
