import { describe, expect, it } from 'vitest';
import { buildJourney, contentProblems, findTrack } from '../src/content/derive';
import { seedBundle } from '../src/content/seed';
import { loadContent } from '../src/content/source';

const { tracks, placements, courses, settings } = seedBundle;

describe('built-in content', () => {
  it('has six cohort tracks with the course totals IMAS publishes', () => {
    const totals = Object.fromEntries(tracks.map((t) => [t.id, t.stated_total]));
    expect(totals).toEqual({
      'can-g10': 21,
      'can-g11': 19,
      'cad-sci-g10': 21,
      'cad-com-g10': 22,
      'cad-sci-g11': 19,
      'cad-com-g11': 21,
    });
  });

  it('has no broken references', () => {
    expect(contentProblems(tracks, placements, courses)).toEqual([]);
  });

  it('uses unique ids', () => {
    for (const list of [courses, tracks, placements, seedBundle.partners, seedBundle.faqs]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('keeps the IMAS rules the user set', () => {
    expect(settings.ielts_min_band).toBe(6);
    expect(settings.ca_weight).toBe(60);
    expect(settings.exam_weight).toBe(40);
    expect(settings.ca_weight + settings.exam_weight).toBe(100);
  });

  it('lists the three AEI partner universities', () => {
    expect(seedBundle.partners.map((p) => p.name)).toEqual(['St. Thomas University', 'Mount Allison University', 'Saint Mary’s University']);
  });

  it('never mentions midterms as part of CAN assessment', () => {
    const text = JSON.stringify(seedBundle).toLowerCase();
    expect(text).not.toMatch(/midterm (exam|test)s? (are|is) (held|part)/);
    expect(text).not.toContain('70%');
    expect(text).not.toContain('band 5');
  });
});

describe('academic plan', () => {
  it('orders a CAN Grade 10 journey Grade 10 → 11 → 12 with the preparation semester', () => {
    const t = findTrack(tracks, 'CAN', null, 10)!;
    const j = buildJourney(t, placements, courses);
    expect(j.map((g) => g.grade)).toEqual([10, 11, 12]);
    expect(j[1].terms.map((x) => x.term)).toEqual(['S1', 'S2']);
    expect(j[1].terms[1].isPrep).toBe(true);
    expect(j[1].terms[0].isPrep).toBe(false);
  });

  it('marks Grade 11 continuations as extensions, not new subjects', () => {
    const t = findTrack(tracks, 'CAN', null, 10)!;
    const g11 = buildJourney(t, placements, courses)[1].terms[0];
    const ext = g11.cards.flatMap((c) => c.items).filter((i) => i.extension).map((i) => i.course.id);
    expect(ext).toEqual(['biology-111', 'chemistry-111', 'physics-111', 'arabic-110', 'computer-science-110']);
  });

  it('shows paired courses on one card for Grade 11 entrants', () => {
    const t = findTrack(tracks, 'CAN', null, 11)!;
    const first = buildJourney(t, placements, courses)[0].terms[0].cards[0];
    expect(first.items.map((i) => i.course.id)).toEqual(['precalc-110', 'nrf-10']);
  });

  it('gives Dual Commerce students Human Physiology in Grade 12', () => {
    const t = findTrack(tracks, 'CAD', 'commerce', 10)!;
    const g12 = buildJourney(t, placements, courses).find((g) => g.grade === 12)!;
    const ids = g12.terms.flatMap((x) => x.cards.flatMap((c) => c.items.map((i) => i.course.id)));
    expect(ids).toContain('human-physiology');
  });

  it('finds a track for every stream and entry grade', () => {
    for (const [stream, focus] of [['CAN', null], ['CAD', 'science'], ['CAD', 'commerce']] as const) {
      for (const entry of [10, 11] as const) expect(findTrack(tracks, stream, focus, entry)).toBeDefined();
    }
  });
});

describe('content source', () => {
  it('falls back to built-in content when no database is configured', async () => {
    const c = await loadContent();
    expect(c.source).toBe('built-in');
    expect(c.courses).toHaveLength(courses.length);
    // A fresh copy each time, so demo edits never change the built-in data.
    c.courses[0].name = 'Changed';
    expect(seedBundle.courses[0].name).not.toBe('Changed');
  });
});
