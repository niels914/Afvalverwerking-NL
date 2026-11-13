import { describe, expect, it } from 'vitest';
import {
  aandeelVanTotaal,
  gewogenGemiddelde,
  klasseGrenzen,
  klasseVan,
  landelijk,
  naarCsv,
  percentiel,
  plaatsVanHoogNaarLaag,
  punten,
  sorteerRijen,
  spreiding,
  statusVanJaar,
  trimNullen,
  verandering,
  zoekRijen,
  type StroomRij,
} from './stromen';
import { STROOM_IDS } from '../data/stromen';
import fracties from '../data/stromen-fracties.json';

const rij = (code: string, naam: string, inwoners: number | null, gft: number | null, provincie: string | null = 'Utrecht'): StroomRij => ({
  code,
  naam,
  provincie,
  inwoners,
  restafval: null,
  gft,
  papier: null,
  pmd: null,
  textiel: null,
  glas: null,
  grof: null,
  luiers: null,
  kca: null,
});

describe('tijdreeks', () => {
  it('slaat jaren zonder cijfer over', () => {
    expect(punten([2020, 2021, 2022], [10, null, 12])).toEqual([
      { jaar: 2020, waarde: 10 },
      { jaar: 2022, waarde: 12 },
    ]);
  });
  it('rekent de verandering over tien jaar vanaf het laatste jaar', () => {
    const reeks = punten([2015, 2018, 2020, 2025], [200, 180, 160, 150]);
    const v = verandering(reeks, 10)!;
    expect(v.van.jaar).toBe(2015);
    expect(v.naar.jaar).toBe(2025);
    expect(v.verschil).toBe(-50);
    expect(v.pct).toBe(-25);
  });
  it('valt terug op het oudste jaar binnen het venster en geeft null zonder twee punten', () => {
    const v = verandering(punten([2019, 2025], [10, 20]), 10)!;
    expect(v.van.jaar).toBe(2019);
    expect(verandering(punten([2025], [10]))).toBeNull();
    expect(verandering([])).toBeNull();
  });
  it('geeft geen percentage als het beginjaar 0 is', () => {
    expect(verandering(punten([2015, 2025], [0, 5]))!.pct).toBeNull();
  });
  it('rekent een aandeel en weigert een totaal van 0', () => {
    expect(aandeelVanTotaal(50, 200)).toBe(25);
    expect(aandeelVanTotaal(5, 0)).toBeNull();
    expect(aandeelVanTotaal(null, 10)).toBeNull();
  });
});

describe('reeks opschonen en status', () => {
  it('haalt nullen aan het begin weg maar laat nullen midden in de reeks staan', () => {
    const r = punten([2005, 2006, 2007, 2008], [0, 0, 3, 0]);
    expect(trimNullen(r).map((p) => p.jaar)).toEqual([2007, 2008]);
    expect(trimNullen(punten([2005, 2006], [4, 5]))).toHaveLength(2);
    expect(trimNullen(punten([2005], [0]))).toHaveLength(1);
  });
  it('leest de status van een jaar uit de CBS-tekst', () => {
    const t = 'De cijfers over 2025 zijn voorlopig. De cijfers over 2022, 2023 en 2024 zijn nader voorlopig; alle overige cijfers zijn definitief.';
    expect(statusVanJaar(t, 2025)).toBe('voorlopig');
    expect(statusVanJaar(t, 2024)).toBe('nader voorlopig');
    expect(statusVanJaar(t, 2020)).toBe('definitief');
  });
});

describe('spreiding en gemiddelde', () => {
  const rijen = [rij('GM1', 'A', 100, 10), rij('GM2', 'B', 300, 20), rij('GM3', 'C', 100, 30), rij('GM4', 'D', null, 40), rij('GM5', 'E', 50, null)];
  it('weegt naar inwoners en negeert gemeenten zonder cijfer of inwonertal', () => {
    // (10*100 + 20*300 + 30*100) / 500 = 20
    expect(gewogenGemiddelde(rijen, 'gft')).toBe(20);
    expect(gewogenGemiddelde([rij('GM9', 'Z', null, 5)], 'gft')).toBeNull();
  });
  it('rekent percentielen met interpolatie', () => {
    expect(percentiel([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentiel([0, 10], 25)).toBe(2.5);
    expect(percentiel([7], 90)).toBe(7);
    expect(percentiel([], 50)).toBeNull();
  });
  it('geeft laagste, hoogste, mediaan en factor', () => {
    const s = spreiding(rijen, 'gft')!;
    expect(s.n).toBe(4);
    expect(s.min).toEqual({ naam: 'A', waarde: 10 });
    expect(s.max).toEqual({ naam: 'D', waarde: 40 });
    expect(s.mediaan).toBe(25);
    expect(s.p10).toBeCloseTo(13, 5);
    expect(s.p90).toBeCloseTo(37, 5);
    expect(s.factor).toBeCloseTo(37 / 13, 5);
  });
  it('geeft null zonder cijfers en geen factor bij een 10e percentiel van 0', () => {
    expect(spreiding([rij('GM1', 'A', 1, null)], 'gft')).toBeNull();
    expect(spreiding([rij('GM1', 'A', 1, 0), rij('GM2', 'B', 1, 0), rij('GM3', 'C', 1, 8)], 'gft')!.factor).toBeNull();
  });
  it('geeft de plaats van hoog naar laag, met gelijke plaats bij gelijke waarden', () => {
    const lijst = [rij('GM1', 'A', 1, 10), rij('GM2', 'B', 1, 30), rij('GM3', 'C', 1, 30), rij('GM4', 'D', 1, null)];
    expect(plaatsVanHoogNaarLaag(lijst[1], lijst, 'gft')).toEqual({ plaats: 1, van: 3 });
    expect(plaatsVanHoogNaarLaag(lijst[2], lijst, 'gft')).toEqual({ plaats: 1, van: 3 });
    expect(plaatsVanHoogNaarLaag(lijst[0], lijst, 'gft')).toEqual({ plaats: 3, van: 3 });
    expect(plaatsVanHoogNaarLaag(lijst[3], lijst, 'gft')).toBeNull();
  });
});

describe('kaartklassen', () => {
  it('maakt strikt oplopende grenzen op twee significante cijfers', () => {
    const waarden = Array.from({ length: 100 }, (_, i) => 50 + i * 2.3);
    const g = klasseGrenzen(waarden);
    expect(g).toHaveLength(4);
    g.forEach((x, i) => i > 0 && expect(x).toBeGreaterThan(g[i - 1]));
    g.forEach((x) => expect(String(x).replace('.', '').replace(/0+$/, '').length).toBeLessThanOrEqual(2));
  });
  it('blijft oplopend bij veel gelijke waarden', () => {
    const g = klasseGrenzen([0, 0, 0, 0, 0, 0, 0, 0, 0.1, 5]);
    g.forEach((x, i) => i > 0 && expect(x).toBeGreaterThan(g[i - 1]));
  });
  it('deelt in klassen in met een ondergrens die in de hogere klasse valt', () => {
    expect(klasseVan(5, [10, 20, 30, 40])).toBe(0);
    expect(klasseVan(10, [10, 20, 30, 40])).toBe(1);
    expect(klasseVan(99, [10, 20, 30, 40])).toBe(4);
    expect(klasseVan(null, [10, 20, 30, 40])).toBeNull();
  });
});

describe('zoeken, sorteren en export', () => {
  const rijen = [rij('GM1', 'Súdwest-Fryslân', 90, 5, 'Fryslân'), rij('GM2', 'Utrecht', 360, 50), rij('GM3', "'s-Hertogenbosch", 160, null, 'Noord-Brabant')];
  it('zoekt zonder accenten en hoofdletters, ook op provincie', () => {
    expect(zoekRijen('sudwest', rijen).map((r) => r.code)).toEqual(['GM1']);
    expect(zoekRijen('BRABANT', rijen).map((r) => r.code)).toEqual(['GM3']);
    expect(zoekRijen('  ', rijen)).toHaveLength(3);
  });
  it('zet gemeenten zonder cijfer onderaan, ook bij aflopend sorteren', () => {
    expect(sorteerRijen(rijen, 'gft', 'waarde', true).map((r) => r.code)).toEqual(['GM1', 'GM2', 'GM3']);
    expect(sorteerRijen(rijen, 'gft', 'waarde', false).map((r) => r.code)).toEqual(['GM2', 'GM1', 'GM3']);
    expect(sorteerRijen(rijen, 'gft', 'inwoners', false).map((r) => r.code)).toEqual(['GM2', 'GM3', 'GM1']);
  });
  it('maakt een csv met puntkomma en decimale komma', () => {
    const csv = naarCsv([rij('GM1', 'A;B', 10, 12.5)], 'gft', 2024);
    expect(csv.split('\r\n')[1]).toBe('GM1;"A;B";Utrecht;10;12,5');
  });
});

describe('gegevens', () => {
  it('heeft voor elke stroom een landelijke reeks met evenveel punten als jaren, over minstens tien jaar', () => {
    expect(landelijk.jaren.length).toBeGreaterThanOrEqual(11);
    for (const id of STROOM_IDS) {
      expect(landelijk.reeksen[id].kg).toHaveLength(landelijk.jaren.length);
      expect(landelijk.reeksen[id].kton).toHaveLength(landelijk.jaren.length);
      expect(punten(landelijk.jaren, landelijk.reeksen[id].kg).length, id).toBeGreaterThanOrEqual(11);
    }
  });
  it('koppelt elke stroom aan bestaande CBS-fracties', () => {
    for (const id of STROOM_IDS) {
      const sleutels = (fracties.stromen as Record<string, string[]>)[id];
      expect(sleutels?.length, id).toBeGreaterThan(0);
      for (const k of sleutels) expect((fracties.fracties as Record<string, unknown>)[k], k).toBeDefined();
    }
  });
  it('houdt het landelijke restafval in lijn met het totaal van het laatste jaar', () => {
    const i = landelijk.jaren.length - 1;
    const som = STROOM_IDS.reduce((s, id) => s + (landelijk.reeksen[id].kg[i] ?? 0), 0);
    // De negen stromen zijn niet het hele huishoudelijke afval (puin, AEEA e.d. ontbreken) maar mogen het totaal niet overschrijden.
    expect(som).toBeLessThanOrEqual((landelijk.totaal.kg[i] ?? 0) + 1);
  });
});
