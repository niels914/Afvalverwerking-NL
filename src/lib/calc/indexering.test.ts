import { describe, expect, it } from 'vitest';
import { indexFactor, nieuwTarief, tariefPerJaar, wegingKlopt } from './indexering';

const onderdelen = [
  { naam: 'Loon', weging: 0.5, basis: 100, nu: 120 },
  { naam: 'Energie', weging: 0.3, basis: 100, nu: 150 },
  { naam: 'Prijzen', weging: 0.2, basis: 100, nu: 110 },
];

describe('indexering', () => {
  it('berekent de gewogen indexfactor', () => {
    // 0,5 × 1,2 + 0,3 × 1,5 + 0,2 × 1,1 = 0,6 + 0,45 + 0,22 = 1,27
    expect(indexFactor(onderdelen)).toBeCloseTo(1.27, 10);
  });

  it('past de factor toe op het basistarief', () => {
    expect(nieuwTarief(100, onderdelen)).toBeCloseTo(127, 10);
  });

  it('geeft het basistarief terug als alle indexen gelijk blijven', () => {
    const gelijk = onderdelen.map((o) => ({ ...o, nu: o.basis }));
    expect(nieuwTarief(95.5, gelijk)).toBeCloseTo(95.5, 10);
  });

  it('controleert of de wegingen samen 100 % zijn', () => {
    expect(wegingKlopt(onderdelen)).toBe(true);
    expect(wegingKlopt([{ weging: 0.5 }, { weging: 0.4 }])).toBe(false);
  });

  it('weigert een basisindex van 0', () => {
    expect(() => indexFactor([{ naam: 'X', weging: 1, basis: 0, nu: 100 }])).toThrow();
  });

  it('maakt een reeks per contractjaar met stijging ten opzichte van het vorige jaar', () => {
    const reeksen = [
      { naam: 'A', weging: 0.5, waarden: { 2024: 100, 2025: 110, 2026: 121 } },
      { naam: 'B', weging: 0.5, waarden: { 2024: 100, 2025: 110, 2026: 121 } },
    ];
    const r = tariefPerJaar(200, reeksen, 2024, 2026);
    expect(r.map((j) => j.jaar)).toEqual([2024, 2025, 2026]);
    expect(r[0].tarief).toBeCloseTo(200);
    expect(r[0].stijgingPct).toBeNull();
    expect(r[1].tarief).toBeCloseTo(220);
    expect(r[2].stijgingPct).toBeCloseTo(10);
  });
});
