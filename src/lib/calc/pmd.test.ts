import { describe, expect, it } from 'vitest';
import { pmdVergelijking } from './pmd';

const invoer = {
  inwoners: 100000,
  responsBron: 15,
  responsNa: 22,
  kostenInzameling: 250,
  kostenSortering: 150,
  kostenNascheiding: 320,
  vergoeding: 250,
};

describe('rekenmodel bron- en nascheiding PMD', () => {
  it('berekent het ingezamelde tonnage per route', () => {
    const { bron, na } = pmdVergelijking(invoer);
    expect(bron.tonnage).toBe(1500);
    expect(na.tonnage).toBe(2200);
  });

  it('berekent totale kosten en kosten per inwoner', () => {
    const { bron, na, verschil } = pmdVergelijking(invoer);
    // bron: 1.500 × (250 + 150 − 250) = € 225.000 ; na: 2.200 × (320 − 250) = € 154.000
    expect(bron.totaleKosten).toBe(225000);
    expect(bron.perInwoner).toBeCloseTo(2.25);
    expect(na.totaleKosten).toBe(154000);
    expect(verschil).toBe(-71000);
  });

  it('geeft 0 per inwoner bij 0 inwoners', () => {
    expect(pmdVergelijking({ ...invoer, inwoners: 0 }).bron.perInwoner).toBe(0);
  });
});
