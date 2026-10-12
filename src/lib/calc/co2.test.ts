import { describe, expect, it } from 'vitest';
import { co2Heffing, co2Meerjarig, restafvalBijScheiding } from './co2';

describe('CO2-heffingenscan', () => {
  it('berekent de heffing na aftrek van de vrijstelling', () => {
    // 50.000 t × 0,5 = 25.000 t CO2; −10.000 vrijgesteld = 15.000 t × € 50 = € 750.000
    const u = co2Heffing({ tonnage: 50000, emissiefactor: 0.5, heffing: 50, vrijstelling: 10000 });
    expect(u.uitstoot).toBe(25000);
    expect(u.belastbaar).toBe(15000);
    expect(u.kosten).toBe(750000);
  });

  it('wordt nooit negatief als de vrijstelling groter is dan de uitstoot', () => {
    const u = co2Heffing({ tonnage: 1000, emissiefactor: 0.5, heffing: 50, vrijstelling: 10000 });
    expect(u.belastbaar).toBe(0);
    expect(u.kosten).toBe(0);
  });

  it('schaalt het restafval mee met het scheidingspercentage', () => {
    // 60 % gescheiden → 40 % rest. Bij 70 % → 30 % rest: 100 × 30/40 = 75
    expect(restafvalBijScheiding(100, 60, 70)).toBeCloseTo(75);
    expect(restafvalBijScheiding(100, 60, 60)).toBeCloseTo(100);
  });

  it('laat de heffing per jaar oplopen', () => {
    const r = co2Meerjarig(
      { tonnage: 50000, emissiefactor: 0.5, vrijstelling: 0, inwoners: 100000, scheidingNuPct: 60, startjaar: 2027, aantalJaren: 3, startHeffing: 50, stijgingPerJaar: 10 },
      60,
    );
    expect(r.map((j) => j.heffing)).toEqual([50, 60, 70]);
    expect(r[2].kosten).toBe(25000 * 70);
    expect(r[0].perInwoner).toBeCloseTo(12.5);
  });
});
