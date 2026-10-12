import { describe, expect, it } from 'vitest';
import { checklist, normaliseerWeging } from './aanbesteding';

describe('aanbestedingstool', () => {
  it('normaliseert de schuifjes naar 100 %', () => {
    const w = normaliseerWeging({ prijs: 60, co2: 20, kwaliteit: 10, circulariteit: 10 });
    expect(w.prijs).toBeCloseTo(60);
    const w2 = normaliseerWeging({ prijs: 30, co2: 30, kwaliteit: 0, circulariteit: 0 });
    expect(w2.prijs).toBeCloseTo(50);
    expect(w2.co2).toBeCloseTo(50);
    expect(Object.values(w2).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it('geeft gelijke weging als alles op 0 staat', () => {
    expect(normaliseerWeging({ prijs: 0, co2: 0, kwaliteit: 0, circulariteit: 0 }).kwaliteit).toBe(25);
  });

  it('voegt punten toe op basis van scope en weging', () => {
    const scope = { stroom: 'GFT', looptijdJaren: 4, verlengingJaren: 2, volumeTon: 20000 };
    const lijst = checklist(scope, { prijs: 50, co2: 20, kwaliteit: 30, circulariteit: 0 });
    expect(lijst.some((p) => p.includes('indexeringsclausule'))).toBe(true);
    expect(lijst.some((p) => p.includes('CO2-uitstoot'))).toBe(true);
    expect(lijst.some((p) => p.includes('piekaanvoer'))).toBe(true);
    expect(lijst.some((p) => p.includes('reststromen'))).toBe(false);
  });
});
