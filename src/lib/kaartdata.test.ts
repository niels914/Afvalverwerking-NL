import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gemeenten, afvalBron, grenzenBron, type GemeenteAfval } from '../data/gemeenten';
import { publicaties, kennisbankThemas } from '../data/kennisbank';
import { nieuws, nieuwsBronnen } from '../data/nieuws';
import {
  gewogenGemiddelde,
  kerncijfers,
  klasseVan,
  klassen,
  naarCsv,
  normaliseer,
  rangVan,
  vindGemeente,
  zoekGemeenten,
} from './kaartdata';

const g = (code: string, naam: string, inwoners: number, restafval: number, totaal: number | null, scheidingsPct: number | null): GemeenteAfval => ({
  code,
  naam,
  provincie: 'Test',
  inwoners,
  totaal,
  fijnRest: restafval,
  grofRest: 0,
  verbouwingRest: 0,
  restafval,
  scheidingsPct,
  gft: null,
  papier: null,
  glas: null,
  textiel: null,
  pmd: 0,
  restafvalVorigJaar: null,
});

const lijst = [g('GM0001', 'Aa', 1000, 100, 400, 75), g('GM0002', "'s-Hertogenbosch", 3000, 200, 500, 60), g('GM0003', 'Súdwest', 1000, 50, null, null)];

describe('klassen en kleuren', () => {
  it('deelt waarden in op vaste grenzen', () => {
    expect(klasseVan(99.9, [100, 150, 200, 250])).toBe(0);
    expect(klasseVan(100, [100, 150, 200, 250])).toBe(1);
    expect(klasseVan(260, [100, 150, 200, 250])).toBe(4);
    expect(klasseVan(null, [100, 150, 200, 250])).toBeNull();
  });
  it('telt gemeenten per klasse en slaat ontbrekende waarden over', () => {
    const k = klassen(lijst, 'scheidingsPct');
    expect(k.map((x) => x.aantal)).toEqual([0, 0, 1, 1, 0]);
    expect(k[0].van).toBeNull();
    expect(k[4].tot).toBeNull();
  });
});

describe('gemiddelden en rangorde', () => {
  it('weegt restafval naar inwoners', () => {
    expect(gewogenGemiddelde(lijst, 'restafval')).toBeCloseTo((100 * 1000 + 200 * 3000 + 50 * 1000) / 5000, 6);
  });
  it('weegt het scheidingspercentage naar de hoeveelheid afval', () => {
    const verwacht = (75 * 1000 * 400 + 60 * 3000 * 500) / (1000 * 400 + 3000 * 500);
    expect(gewogenGemiddelde(lijst, 'scheidingsPct')).toBeCloseTo(verwacht, 6);
  });
  it('geeft plaats 1 aan de gunstigste waarde', () => {
    expect(rangVan(lijst[2], lijst, 'restafval')).toEqual({ plaats: 1, van: 3 });
    expect(rangVan(lijst[0], lijst, 'scheidingsPct')).toEqual({ plaats: 1, van: 2 });
    expect(rangVan(lijst[2], lijst, 'scheidingsPct')).toBeNull();
  });
  it('berekent kerncijfers en tonnen', () => {
    const k = kerncijfers(lijst);
    expect(k.inwoners).toBe(5000);
    expect(k.restafvalTon).toBeCloseTo((100 * 1000 + 200 * 3000 + 50 * 1000) / 1000, 6);
  });
});

describe('zoeken', () => {
  it('negeert accenten, hoofdletters en "\'s-"', () => {
    expect(normaliseer("'s-Hertogenbosch")).toBe('hertogenbosch');
    expect(zoekGemeenten('sud', lijst).map((x) => x.code)).toEqual(['GM0003']);
    expect(zoekGemeenten('hertog', lijst).map((x) => x.code)).toEqual(['GM0002']);
    expect(vindGemeente('gm0001', lijst)?.naam).toBe('Aa');
  });
  it('maakt een CSV met puntkomma en decimale komma', () => {
    const csv = naarCsv([g('GM0001', 'Aa', 1000, 100.5, 400, 75.2)], 2024).split('\r\n');
    expect(csv[0]).toContain('Restafval kg/inw 2024');
    expect(csv[1]).toContain(';100,5;');
  });
});

describe('echte data', () => {
  it('bevat alle gemeenten van het peiljaar met bron en peildatum', () => {
    expect(gemeenten.length).toBeGreaterThanOrEqual(340);
    expect(afvalBron.bron.url).toMatch(/^https:\/\/opendata\.cbs\.nl\//);
    expect(afvalBron.opgehaald).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(gemeenten.map((x) => x.code)).size).toBe(gemeenten.length);
    for (const x of gemeenten) {
      expect(x.code).toMatch(/^GM\d{4}$/);
      expect(x.restafval).toBeGreaterThan(0);
      if (x.scheidingsPct !== null) expect(x.scheidingsPct).toBeGreaterThanOrEqual(0);
    }
  });
  it('komt landelijk overeen met het CBS-cijfer (binnen afronding)', () => {
    const c = afvalBron.controle!;
    expect(Math.abs(c.landelijkScheidingsPctBerekend - c.landelijkScheidingsPctCbs)).toBeLessThanOrEqual(1);
    const eigen = gewogenGemiddelde(gemeenten, 'restafval')!;
    expect(Math.abs(eigen - c.landelijkRestafvalKgPerInw)).toBeLessThan(3);
    expect(afvalBron.samenvatting.aantalGemeenten).toBe(gemeenten.length);
    expect(afvalBron.samenvatting.restafvalOnder100).toBe(gemeenten.filter((x) => x.restafval < 100).length);
  });
  it('heeft grenzen voor dezelfde gemeenten', () => {
    const geo = JSON.parse(readFileSync(new URL('../../public/data/gemeentegrenzen.geojson', import.meta.url), 'utf8'));
    const codes = new Set<string>(geo.features.map((f: { properties: { code: string } }) => f.properties.code));
    expect(grenzenBron.jaar).toBe(afvalBron.peiljaar);
    expect(codes.size).toBe(gemeenten.length);
    for (const x of gemeenten) expect(codes.has(x.code)).toBe(true);
  });
});

describe('kennisbank en nieuws', () => {
  it('heeft per publicatie een https-link, uitgever, samenvatting en geldig thema', () => {
    expect(publicaties.length).toBeGreaterThanOrEqual(12);
    for (const p of publicaties) {
      expect(p.url).toMatch(/^https:\/\//);
      expect(p.uitgever.length).toBeGreaterThan(2);
      expect(p.samenvatting.length).toBeGreaterThan(60);
      for (const t of p.themas) expect(kennisbankThemas).toContain(t);
    }
    expect(new Set(publicaties.map((p) => p.id)).size).toBe(publicaties.length);
  });
  it('heeft nieuws met datum, bron en link naar het origineel', () => {
    expect(nieuwsBronnen.length).toBeGreaterThan(0);
    for (const n of nieuws) {
      expect(n.datum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.link).toMatch(/^https?:\/\//);
      expect(n.inleiding.length).toBeLessThanOrEqual(225);
    }
  });
});
