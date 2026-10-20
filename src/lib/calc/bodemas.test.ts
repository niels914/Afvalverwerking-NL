import { describe, expect, it } from 'vitest';
import { bodemasJaren, bodemasKental, kentallenUit } from '../../data/tools-b-bodemas';
import { bodemas, bodemasInstallaties, bodemasNaarParams, bodemasUitParams, gevoeligheid, ontbrekendeBedragen, type BodemasInvoer } from './bodemas';

const basis: BodemasInvoer = {
  tonnageVerbrand: 100000,
  aandeelBodemasPct: 20,
  ferroPct: 10,
  nonFerroPct: 2,
  verwerkingstarief: 30,
  prijsFerro: 100,
  prijsNonFerro: 1000,
  aandeelOpbrengstPct: 100,
};

describe('kentallen uit Rijkswaterstaat, Afvalverwerking in Nederland 2024', () => {
  it('rekent de landelijke hoeveelheden om naar percentages', () => {
    const k2024 = kentallenUit(bodemasJaren.find((j) => j.jaar === 2024)!);
    // 1.570 kton ruwe bodemas / 6.422 kton verbrand = 24,45 %
    expect(k2024.aandeelBodemasPct).toBe(24.4);
    // 109 / 1.570 = 6,94 % ferro ; 38 / 1.570 = 2,42 % non-ferro ; 60 / 1.570 = 3,82 % gestort
    expect(k2024.ferroPct).toBe(6.9);
    expect(k2024.nonFerroPct).toBe(2.4);
    expect(k2024.gestortPct).toBe(3.8);
  });

  it('gebruikt het laatste jaar als standaard', () => {
    expect(bodemasKental.jaar).toBe(2024);
    expect(bodemasJaren.map((j) => j.jaar)).toEqual([2022, 2023, 2024]);
  });

  it('heeft aandelen binnen de bandbreedte die Strategy& noemt (circa 25 % bodemas, circa 10 % metalen)', () => {
    for (const j of bodemasJaren) {
      const k = kentallenUit(j);
      expect(k.aandeelBodemasPct).toBeGreaterThan(20);
      expect(k.aandeelBodemasPct).toBeLessThan(30);
      expect(k.ferroPct + k.nonFerroPct).toBeLessThan(12);
    }
  });
});

describe('bodemassencalculator', () => {
  it('berekent hoeveelheden en netto kosten', () => {
    // 100.000 t × 20 % = 20.000 t bodemas ; ferro 2.000 t ; non-ferro 400 t
    // kosten 20.000 × 30 = 600.000 ; opbrengst 2.000 × 100 + 400 × 1.000 = 600.000 → netto 0
    const u = bodemas(basis);
    expect(u.bodemasTon).toBe(20000);
    expect(u.ferroTon).toBe(2000);
    expect(u.nonFerroTon).toBe(400);
    expect(u.overigTon).toBe(17600);
    expect(u.brutoKosten).toBe(600000);
    expect(u.opbrengst).toBe(600000);
    expect(u.nettoKosten).toBe(0);
    expect(u.ontbrekend).toEqual([]);
  });

  it('telt alleen het deel van de metaalopbrengst dat de opdrachtgever ontvangt', () => {
    const u = bodemas({ ...basis, aandeelOpbrengstPct: 50 });
    expect(u.opbrengst).toBe(300000);
    expect(u.nettoKosten).toBe(300000);
    expect(u.perTonVerbrand).toBe(3);
    expect(u.perTonBodemas).toBe(15);
  });

  it('geeft een negatieve uitkomst (netto opbrengst) als metalen meer opleveren dan de opwerking kost', () => {
    expect(bodemas({ ...basis, prijsNonFerro: 2000 }).nettoKosten).toBe(-400000);
  });

  it('geeft geen bedragen zolang een prijs of tarief ontbreekt', () => {
    const u = bodemas({ ...basis, prijsFerro: null });
    expect(u.bodemasTon).toBe(20000);
    expect(u.nettoKosten).toBeNull();
    expect(u.perTonVerbrand).toBeNull();
    expect(u.ontbrekend).toEqual(['prijsFerro']);
    expect(ontbrekendeBedragen({ ...basis, verwerkingstarief: null, prijsNonFerro: NaN })).toEqual(['verwerkingstarief', 'prijsNonFerro']);
  });

  it('geeft 0 per ton bij 0 ton verbrand', () => {
    const u = bodemas({ ...basis, tonnageVerbrand: 0 });
    expect(u.nettoKosten).toBe(0);
    expect(u.perTonVerbrand).toBe(0);
    expect(u.perTonBodemas).toBe(0);
  });
});

describe('meerdere installaties', () => {
  it('telt installaties op', () => {
    const { totaal, regels } = bodemasInstallaties([
      { id: 'a', naam: 'A', ...basis, aandeelOpbrengstPct: 50 },
      { id: 'b', naam: 'B', ...basis, tonnageVerbrand: 50000, aandeelOpbrengstPct: 50 },
    ]);
    expect(regels).toHaveLength(2);
    expect(totaal.tonnageVerbrand).toBe(150000);
    expect(totaal.bodemasTon).toBe(30000);
    expect(totaal.nettoKosten).toBe(450000);
    expect(totaal.volledig).toBe(true);
  });

  it('geeft geen totaalbedrag als één installatie onvolledig is', () => {
    const { totaal } = bodemasInstallaties([
      { id: 'a', naam: 'A', ...basis },
      { id: 'b', naam: 'B', ...basis, verwerkingstarief: null },
    ]);
    expect(totaal.bodemasTon).toBe(40000);
    expect(totaal.nettoKosten).toBeNull();
    expect(totaal.volledig).toBe(false);
  });
});

describe('gevoeligheidsanalyse', () => {
  const invoer = { ...basis, aandeelOpbrengstPct: 50 }; // netto € 300.000

  it('sorteert op invloed en klopt per parameter', () => {
    const g = gevoeligheid(invoer, 0.2);
    expect(g).toHaveLength(7);
    // verwerkingstarief ±20 %: 20.000 t × € 30 × 0,4 = € 240.000
    expect(g.find((x) => x.parameter === 'verwerkingstarief')!.bandbreedte).toBeCloseTo(240000);
    // tonnage en aandeel bodemas werken op het nettobedrag: € 300.000 × 0,4 = € 120.000
    expect(g.find((x) => x.parameter === 'tonnageVerbrand')!.bandbreedte).toBeCloseTo(120000);
    expect(g.find((x) => x.parameter === 'aandeelBodemasPct')!.bandbreedte).toBeCloseTo(120000);
    // non-ferro: 400 t × € 1.000 × 50 % × 0,4 = € 80.000 lager → negatieve bandbreedte
    expect(g.find((x) => x.parameter === 'prijsNonFerro')!.bandbreedte).toBeCloseTo(-80000);
    expect(g[0].parameter).toBe('verwerkingstarief');
    for (let k = 1; k < g.length; k++) expect(Math.abs(g[k - 1].bandbreedte)).toBeGreaterThanOrEqual(Math.abs(g[k].bandbreedte));
  });

  it('is leeg zolang een bedrag ontbreekt', () => {
    expect(gevoeligheid({ ...invoer, prijsNonFerro: null })).toEqual([]);
  });
});

describe('deellink', () => {
  it('zet invoer om naar parameters en terug', () => {
    const p = bodemasNaarParams({ ...basis, prijsFerro: 112.5 });
    expect(p.get('pfe')).toBe('112.5');
    expect(bodemasUitParams(p, { ...basis, prijsFerro: null })).toEqual({ ...basis, prijsFerro: 112.5 });
  });

  it('laat lege bedragen weg en negeert ongeldige waarden', () => {
    const p = bodemasNaarParams({ ...basis, verwerkingstarief: null });
    expect(p.has('tarief')).toBe(false);
    const terug = bodemasUitParams(new URLSearchParams('ton=abc&as=150&fe=-1&tarief=25'), { ...basis, verwerkingstarief: null });
    expect(terug.tonnageVerbrand).toBe(basis.tonnageVerbrand);
    expect(terug.aandeelBodemasPct).toBe(basis.aandeelBodemasPct);
    expect(terug.ferroPct).toBe(basis.ferroPct);
    expect(terug.verwerkingstarief).toBe(25);
  });
});
