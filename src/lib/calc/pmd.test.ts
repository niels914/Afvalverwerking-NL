import { describe, expect, it } from 'vitest';
import {
  asb2026,
  cbsGemeenten,
  cbsPmd,
  kentalNascheidingskosten,
  kentalVerbrandingstarief,
  kostenbasisBron,
  nascheiding,
  staffel,
  staffelPerCategorie,
} from '../../data/tools-b-pmd';
import { breakEvenTeruggewonnen, pmdNaarParams, pmdUitParams, pmdVergelijking, routeBron, routeNa, type PmdInvoer } from './pmd';

const invoer: PmdInvoer = {
  inwoners: 100000,
  responsBron: 20,
  inzamelkostenBron: 325,
  overigeKostenBron: 0,
  vergoedingBron: 228,
  restafvalNa: 170,
  nascheidingskosten: 120,
  vergoedingNa: 17,
  teruggewonnenNa: 10,
  verbrandingstarief: 100,
};

describe('gegevens uit het akkoord Verpact, VNG en NVRD', () => {
  it('heeft de staffel 2026 zoals gepubliceerd', () => {
    expect(staffel.map((s) => s.euroPerTon[2026])).toEqual([325, 277, 228, 195, 0]);
    expect(staffel.map((s) => s.pctKostenbasis[2026])).toEqual([100, 85, 70, 60, 0]);
    expect(staffelPerCategorie['3b'].euroPerTon).toEqual({ 2026: 195, 2027: 179, 2028: 163 });
    expect(kostenbasisBron).toBe(325);
  });

  it('bedragen in de staffel volgen uit de kostenbasis (afgerond in de bron)', () => {
    for (const s of staffel) {
      for (const j of [2026, 2027, 2028] as const) {
        expect(Math.abs(s.euroPerTon[j] - (kostenbasisBron * s.pctKostenbasis[j]) / 100)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('reproduceert de nascheidingsvergoeding 2026 van € 17,26 per ton restafval', () => {
    // (93,47 + 6,79) × 0,144 × 1,1954 = 17,26
    const v = (nascheiding.kosten2021 + nascheiding.opslagTransport) * nascheiding.pmdAandeel * nascheiding.inflatiefactor;
    expect(Math.round(v * 100) / 100).toBe(nascheiding.vergoeding2026);
    expect(kentalNascheidingskosten).toBe(119.85);
  });

  it('kental verbrandingstarief = midden poorttarief 55–70 + afvalstoffenbelasting 2026', () => {
    expect(asb2026).toBe(40.85);
    expect(kentalVerbrandingstarief).toBe(103.35);
  });
});

describe('CBS-gegevens per gemeente', () => {
  it('bevat alle gemeenten met inwoners en restafval', () => {
    expect(cbsGemeenten.length).toBeGreaterThan(300);
    for (const g of cbsGemeenten) {
      expect(g.code).toMatch(/^GM\d{4}$/);
      expect(g.restafvalKgPerInw).not.toBeNull();
    }
    expect(cbsPmd.bronnen.gemeente.tabelId).toBe('83452NED');
    expect(cbsPmd.landelijk.pmdKgPerInw).toBeGreaterThan(0);
  });
});

describe('rekenmodel bron- en nascheiding PMD', () => {
  it('berekent bronscheiding', () => {
    // 100.000 × 20 kg = 2.000 t ; kosten 2.000 × 325 = 650.000 ; vergoeding 2.000 × 228 = 456.000 ;
    // vermeden verbranding 2.000 × 100 = 200.000 → netto −6.000
    const b = routeBron(invoer);
    expect(b.pmdTon).toBe(2000);
    expect(b.kosten).toBe(650000);
    expect(b.vergoeding).toBe(456000);
    expect(b.vermedenVerbranding).toBe(200000);
    expect(b.netto).toBe(-6000);
    expect(b.perInwoner).toBeCloseTo(-0.06);
    expect(b.perTonPmd).toBeCloseTo(-3);
  });

  it('berekent nascheiding', () => {
    // restafval 100.000 × 170 kg = 17.000 t ; kosten 17.000 × 120 = 2.040.000 ; vergoeding 17.000 × 17 = 289.000
    // teruggewonnen 1.000 t × 100 = 100.000 vermeden → netto 1.651.000
    const n = routeNa(invoer);
    expect(n.grondslagTon).toBe(17000);
    expect(n.pmdTon).toBe(1000);
    expect(n.kosten).toBe(2040000);
    expect(n.vergoeding).toBe(289000);
    expect(n.netto).toBe(1651000);
    expect(n.perTonPmd).toBeCloseTo(1651);
  });

  it('geeft het verschil tussen de routes', () => {
    expect(pmdVergelijking(invoer).verschil).toBe(1657000);
  });

  it('laat nascheiding open zolang het teruggewonnen PMD onbekend is', () => {
    const v = pmdVergelijking({ ...invoer, teruggewonnenNa: null });
    expect(v.na.netto).toBeNull();
    expect(v.na.perInwoner).toBeNull();
    expect(v.na.kosten).toBe(2040000);
    expect(v.verschil).toBeNull();
    expect(v.bron.netto).toBe(-6000);
  });

  it('geeft 0 per inwoner en per ton bij 0 inwoners', () => {
    const v = pmdVergelijking({ ...invoer, inwoners: 0 });
    expect(v.bron.perInwoner).toBe(0);
    expect(v.bron.perTonPmd).toBe(0);
  });

  it('vindt het teruggewonnen PMD waarbij beide routes even duur zijn', () => {
    const x = breakEvenTeruggewonnen(invoer)!;
    const v = pmdVergelijking({ ...invoer, teruggewonnenNa: x });
    expect(v.verschil).toBeCloseTo(0, 6);
    expect(breakEvenTeruggewonnen({ ...invoer, verbrandingstarief: 0 })).toBeNull();
  });
});

describe('deellink', () => {
  it('zet invoer om en terug, ook met extra parameters', () => {
    const p = pmdNaarParams(invoer, { gm: 'GM0363', cat: '3a' });
    expect(p.get('gm')).toBe('GM0363');
    expect(pmdUitParams(p, { ...invoer, inwoners: 1 })).toEqual(invoer);
  });

  it('laat een lege waarde weg en negeert ongeldige invoer', () => {
    expect(pmdNaarParams({ ...invoer, teruggewonnenNa: null }).has('tn')).toBe(false);
    const t = pmdUitParams(new URLSearchParams('inw=-5&rb=x&tn=7,5&vt=90'), invoer);
    expect(t.inwoners).toBe(invoer.inwoners);
    expect(t.responsBron).toBe(invoer.responsBron);
    expect(t.teruggewonnenNa).toBe(invoer.teruggewonnenNa);
    expect(t.verbrandingstarief).toBe(90);
  });
});
