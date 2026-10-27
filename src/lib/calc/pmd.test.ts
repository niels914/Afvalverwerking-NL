import { describe, expect, it } from 'vitest';
import {
  asb2026,
  cbsGemeenten,
  cbsPmd,
  kentalNascheidingskosten,
  kentalVerbrandingstarief,
  kostenbasisBron,
  nascheiding,
  nascheidingRendement,
  nascheidingskostenBand,
  nascheidingskostenLezingen,
  pmdGrenzen,
  pmdVarianten,
  staffel,
  staffelPerCategorie,
} from '../../data/tools-b-pmd';
import { pmdStandaard } from '../../data/standaardwaarden';
import {
  breakEvenTeruggewonnen,
  controleerPmd,
  omslagNascheidingskosten,
  pmdBandbreedte,
  pmdCombinaties,
  pmdConclusieMogelijk,
  pmdNaarParams,
  pmdUitParams,
  pmdVergelijking,
  routeBron,
  routeNa,
  type PmdInvoer,
} from './pmd';

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
    expect(staffelPerCategorie['3b'].euroPerTon).toEqual({
      2026: 195,
      2027: 179,
      2028: 163,
    });
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

describe('kentallen nascheiding en verbranding (ronde 2)', () => {
  it('heeft een bandbreedte voor teruggewonnen PMD van 15 tot 25 kg per inwoner (IPR Normag 2021)', () => {
    expect(nascheidingRendement).toEqual({ laag: 15, midden: 20, hoog: 25 });
    expect(pmdStandaard.teruggewonnenNa).toBe(20);
  });

  it('heeft een verbrandingstarief van 95,85 tot 110,85 (poorttarief 55–70 plus ASB 2026)', () => {
    expect(pmdVarianten.verbrandingstarief).toEqual({
      laag: 95.85,
      midden: 103.35,
      hoog: 110.85,
    });
  });

  it('rekent bij binnenkomst beide routes uit', () => {
    const v = pmdVergelijking(pmdStandaard);
    expect(v.bron.netto).not.toBeNull();
    expect(v.na.netto).not.toBeNull();
    expect(v.verschil).not.toBeNull();
  });
});

describe('controle van de invoer', () => {
  it('geeft geen meldingen bij de standaard', () => {
    expect(controleerPmd(pmdStandaard, pmdGrenzen)).toEqual({
      fouten: [],
      signalen: [],
    });
  });

  it('meldt 0 of minder inwoners als fout', () => {
    expect(controleerPmd({ ...invoer, inwoners: 0 }, pmdGrenzen).fouten).toHaveLength(1);
  });

  it('meldt meer teruggewonnen PMD dan restafval als fout', () => {
    const c = controleerPmd({ ...invoer, teruggewonnenNa: 200 }, pmdGrenzen);
    expect(c.fouten[0]).toContain('Dat kan niet');
  });

  it('signaleert teruggewonnen PMD boven de praktijkwaarde en boven het PMD-aandeel in restafval', () => {
    const c = controleerPmd({ ...invoer, teruggewonnenNa: 40 }, pmdGrenzen);
    expect(c.fouten).toEqual([]);
    expect(c.signalen.some((s) => s.includes('hoogste praktijkwaarde'))).toBe(true);
    // 170 kg × 14,4 % = 24,5 kg
    expect(c.signalen.some((s) => s.includes('24,5 kg PMD'))).toBe(true);
  });

  it('signaleert een onwaarschijnlijk hoge respons en meer inwoners dan Nederland', () => {
    const c = controleerPmd({ ...invoer, responsBron: 500, inwoners: 30_000_000 }, pmdGrenzen);
    expect(c.signalen).toHaveLength(2);
    expect(pmdGrenzen.inwonersNl).toBeGreaterThan(17_000_000);
  });
});

describe('bandbreedte', () => {
  const varianten = {
    teruggewonnenNa: { laag: 5, midden: 10, hoog: 15 },
    verbrandingstarief: { laag: 90, midden: 100, hoog: 110 },
  };

  it('rekent alle combinaties van laag en hoog door', () => {
    const b = pmdBandbreedte(invoer, varianten)!;
    expect(b.volgt).toEqual(['teruggewonnenNa', 'verbrandingstarief']);
    // bron: 2.000 t × (325 − 228 − tarief): tarief 110 → −26.000 ; tarief 90 → 14.000
    expect(b.bron).toEqual({ laag: -26000, hoog: 14000 });
    // na: 17.000 × 103 = 1.751.000 − PMD × tarief ; meeste vermeden: 1.500 t × 110 = 165.000 ; minste: 500 × 90 = 45.000
    expect(b.na).toEqual({ laag: 1751000 - 165000, hoog: 1751000 - 45000 });
    expect(b.verschil!.laag).toBeLessThan(b.verschil!.hoog);
  });

  it('laat zelf ingevulde waarden staan en geeft null als niets meevariëert', () => {
    const b = pmdBandbreedte({ ...invoer, verbrandingstarief: 123 }, varianten)!;
    expect(b.volgt).toEqual(['teruggewonnenNa']);
    expect(pmdBandbreedte({ ...invoer, verbrandingstarief: 123, teruggewonnenNa: 11 }, varianten)).toBeNull();
  });
});

describe('nascheidingskosten: eenheid onzeker (ronde 3)', () => {
  it('kent twee lezingen van het kental: per ton restafval en per ton PMD', () => {
    expect(nascheidingskostenLezingen.perTonRestafval).toBe(119.85);
    // 119,85 × 14,4 % = 17,26: precies de vergoeding, want die dekt het PMD-deel van de kosten
    expect(nascheidingskostenLezingen.perTonPmd).toBe(17.26);
    expect(nascheidingskostenLezingen.perTonPmd).toBe(nascheiding.vergoeding2026);
    // € 3 mln opslag / € 6,79 per ton ≈ 442 kton: past bij nagescheiden restafval
    expect(nascheidingskostenLezingen.tonnageOpslagKton).toBe(442);
    expect(nascheidingskostenBand).toEqual({
      laag: 17.26,
      midden: 119.85,
      hoog: 119.85,
    });
    expect(pmdVarianten.nascheidingskosten).toBe(nascheidingskostenBand);
  });

  it('trekt alleen een conclusie met een eigen nascheidingstarief', () => {
    expect(pmdConclusieMogelijk(pmdStandaard, kentalNascheidingskosten)).toBe(false);
    expect(pmdConclusieMogelijk({ ...pmdStandaard, nascheidingskosten: 45 }, kentalNascheidingskosten)).toBe(true);
    expect(pmdConclusieMogelijk({ ...pmdStandaard, nascheidingskosten: 0 }, kentalNascheidingskosten)).toBe(true);
  });

  it('laat de standaarduitkomst omslaan tussen de twee lezingen', () => {
    const b = pmdBandbreedte(pmdStandaard, pmdVarianten)!;
    expect(b.volgt).toContain('nascheidingskosten');
    // per ton PMD: nascheiding goedkoper; per ton restafval: bronscheiding goedkoper
    expect(b.verschil!.laag).toBeLessThan(0);
    expect(b.verschil!.hoog).toBeGreaterThan(0);
    const laag = pmdVergelijking({
      ...pmdStandaard,
      nascheidingskosten: 17.26,
    });
    const hoog = pmdVergelijking({
      ...pmdStandaard,
      nascheidingskosten: 119.85,
    });
    expect(b.na!.laag).toBeLessThanOrEqual(laag.na.netto as number);
    expect(b.na!.hoog).toBeGreaterThanOrEqual(hoog.na.netto as number);
  });

  it('variëert een eigen nascheidingstarief niet mee', () => {
    const b = pmdBandbreedte({ ...pmdStandaard, nascheidingskosten: 40 }, pmdVarianten)!;
    expect(b.volgt).toEqual(['teruggewonnenNa', 'verbrandingstarief']);
    expect(pmdCombinaties({ ...pmdStandaard, nascheidingskosten: 40 }, pmdVarianten)).toHaveLength(4);
    expect(pmdCombinaties(pmdStandaard, pmdVarianten)).toHaveLength(8);
  });

  it('berekent het omslagpunt in nascheidingstarief', () => {
    // bron: 2.000 t × (325 − 228 − 100) = −6.000 ; PMD terug 1.000 t × 100 = 100.000 ; restafval 17.000 t
    // k = (−6.000 + 100.000) / 17.000 + 17 = 22,529…
    const k = omslagNascheidingskosten(invoer)!;
    expect(k).toBeCloseTo(94000 / 17000 + 17, 6);
    // bij dat tarief zijn beide routes even duur
    const v = pmdVergelijking({ ...invoer, nascheidingskosten: k });
    expect(v.verschil!).toBeCloseTo(0, 6);
    // lager tarief: nascheiding goedkoper (verschil negatief)
    expect(pmdVergelijking({ ...invoer, nascheidingskosten: k - 1 }).verschil!).toBeLessThan(0);
  });

  it('geeft geen omslagpunt zonder restafval of teruggewonnen PMD', () => {
    expect(omslagNascheidingskosten({ ...invoer, restafvalNa: 0 })).toBeNull();
    expect(omslagNascheidingskosten({ ...invoer, teruggewonnenNa: null })).toBeNull();
  });

  it('geeft een bandbreedte van het omslagpunt bij de standaard', () => {
    const b = pmdBandbreedte(pmdStandaard, pmdVarianten)!;
    expect(b.omslagTarief!.laag).toBeLessThan(b.omslagTarief!.hoog);
    const midden = omslagNascheidingskosten(pmdStandaard)!;
    expect(midden).toBeGreaterThan(b.omslagTarief!.laag);
    expect(midden).toBeLessThan(b.omslagTarief!.hoog);
  });
});
