import { describe, expect, it } from 'vitest';
import { gratisOnderdelen, ledenOnderdelen, vergelijking } from '../../data/lidmaatschap';
import { tools } from '../../data/tools';

// De vergelijking gratis/lid moet gelijk blijven aan wat de rekentools zelf vrij en betaald maken.
describe('vergelijking gratis en lid', () => {
  it('heeft een rij voor elke rekentool, met de toegang uit tools.ts', () => {
    for (const t of tools) {
      const rij = vergelijking.find((r) => r.onderdeel === t.titel);
      expect(rij, t.titel).toBeDefined();
      if (t.toegang === 'leden') expect(rij!.gratis).toBe('Nee');
      if (t.toegang === 'gratis') expect([rij!.gratis, rij!.lid]).toEqual(['Ja', 'Ja']);
      if (t.toegang === 'gratis+pro') {
        expect(rij!.gratis).toBe(t.gratisDeel ?? 'Beperkt');
        expect(rij!.lid).toBe(t.proDeel ?? 'Volledig');
      }
    }
  });

  it('leden krijgen nooit minder dan gratis gebruikers', () => {
    for (const r of vergelijking) expect(r.lid, r.onderdeel).not.toBe('Nee');
  });

  it('de korte lijsten bevatten geen rij over het aantal gebruikers', () => {
    expect(gratisOnderdelen).not.toContain('Aantal gebruikers');
    expect(ledenOnderdelen).not.toContain('Aantal gebruikers');
    expect(ledenOnderdelen).toContain('Aanbestedingsarchief met filters');
  });
});
