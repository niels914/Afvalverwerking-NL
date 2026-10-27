import { describe, expect, it } from 'vitest';
import { bodemasStandaard } from '../../data/standaardwaarden';
import {
  bodemasBereik,
  bodemasJaren,
  bodemasKental,
  bodemasKostenBron,
  bodemasScenario,
  cpiFactor2021naar2025,
  gemiddeldPerAvi,
  kentallenUit,
  kentalNettoOpwerking,
  kentalStortkosten,
  stortbelasting2026,
} from '../../data/tools-b-bodemas';
import {
  bandbreedte,
  bodemas,
  bodemasConclusieMogelijk,
  bodemasInstallaties,
  bodemasNaarParams,
  bodemasUitParams,
  controleerBodemas,
  gevoeligheid,
  gevoeligheidsParameters,
  ontbrekendeBedragen,
  type BodemasInvoer,
} from './bodemas';

/** Contractinvoer met ronde getallen, residu 0 zodat de oude rekenregels gelden. */
const contract: BodemasInvoer = {
  tonnageVerbrand: 100000,
  aandeelBodemasPct: 20,
  ferroPct: 10,
  nonFerroPct: 2,
  rekenwijze: 'contract',
  nettoOpwerking: 12,
  residuPct: 0,
  stortkosten: 40,
  stortbelasting: 40,
  verwerkingstarief: 30,
  prijsFerro: 100,
  prijsNonFerro: 1000,
  aandeelOpbrengstPct: 100,
};

/** Kentalinvoer met ronde getallen. */
const kental: BodemasInvoer = { ...contract, rekenwijze: 'kental', nettoOpwerking: 10, residuPct: 5, stortkosten: 35, stortbelasting: 40 };

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

  it('bepaalt het landelijke bereik 2022–2024', () => {
    // 2022: 1.678 / 7.392 = 22,7 % ; 2023: 1.766 / 6.841 = 25,8 %
    expect(bodemasBereik.aandeelBodemasPct).toEqual([22.7, 25.8]);
    expect(bodemasBereik.ferroPct[0]).toBeLessThanOrEqual(bodemasBereik.ferroPct[1]);
  });

  it('rekent het gemiddelde per AVI uit: 6.422 kton in 13 installaties = 494.000 ton', () => {
    expect(gemiddeldPerAvi).toBe(494000);
  });
});

describe('kostenkentallen (Staatsblad 2021, 235; CBS-CPI; Belastingdienst)', () => {
  it('indexeert € 10 per ton van 2021 naar 2025 met de CPI (110,39 → 134,56)', () => {
    expect(cpiFactor2021naar2025).toBeCloseTo(1.21895, 4);
    expect(kentalNettoOpwerking).toBe(12.19);
    // midden van € 30–40 = € 35 × 1,21895 = € 42,66
    expect(kentalStortkosten).toBe(42.66);
  });

  it('heeft een lage, middelste en hoge set waarden met de bronbedragen', () => {
    expect(bodemasScenario.laag).toEqual({ nettoOpwerking: 10, residuPct: 3.8, stortkosten: 30 });
    expect(bodemasScenario.midden).toEqual({ nettoOpwerking: 12.19, residuPct: 3.8, stortkosten: 42.66 });
    expect(bodemasScenario.hoog).toEqual({ nettoOpwerking: 12.19, residuPct: bodemasKostenBron.residuVolgensBesluitPct, stortkosten: 48.76 });
    expect(stortbelasting2026).toBe(40.85);
  });

  it('standaardinvoer = midden van de bandbreedte, rekenwijze kental, zonder lege velden', () => {
    expect(bodemasStandaard.rekenwijze).toBe('kental');
    expect(bodemasStandaard.nettoOpwerking).toBe(12.19);
    expect(bodemas(bodemasStandaard).nettoKosten).not.toBeNull();
  });
});

describe('bodemas, rekenwijze kental', () => {
  it('rekent hoeveelheden, opwerking en storten', () => {
    const u = bodemas(kental);
    expect(u.bodemasTon).toBe(20000);
    expect(u.ferroTon).toBe(2000);
    expect(u.nonFerroTon).toBe(400);
    expect(u.residuTon).toBe(1000);
    expect(u.overigTon).toBe(16600);
    // opwerking 20.000 × 10 = 200.000 ; storten 1.000 × (35 + 40) = 75.000
    expect(u.brutoKosten).toBe(200000);
    expect(u.kostenStorten).toBe(75000);
    expect(u.opbrengst).toBeNull();
    expect(u.nettoKosten).toBe(275000);
    expect(u.perTonVerbrand).toBeCloseTo(2.75, 10);
    expect(u.perTonBodemas).toBeCloseTo(13.75, 10);
    expect(u.ontbrekend).toEqual([]);
  });

  it('heeft geen contractbedragen nodig', () => {
    const u = bodemas({ ...kental, verwerkingstarief: null, prijsFerro: null, prijsNonFerro: null });
    expect(u.nettoKosten).toBe(275000);
  });

  it('rekent de standaard (gemiddelde AVI) met het verwachte bedrag', () => {
    const u = bodemas(bodemasStandaard);
    // 494.000 × 24,4 % = 120.536 t ; × 12,19 = 1.469.333,84 ; residu 3,8 % = 4.580,368 t × (42,66 + 40,85) = 382.496,53
    expect(u.bodemasTon).toBeCloseTo(120536, 6);
    expect(u.nettoKosten).toBeCloseTo(1469333.84 + 4580.368 * 83.51, 2);
  });

  it('geeft 0 per ton bij 0 ton', () => {
    const u = bodemas({ ...kental, tonnageVerbrand: 0 });
    expect(u.nettoKosten).toBe(0);
    expect(u.perTonVerbrand).toBe(0);
    expect(u.perTonBodemas).toBe(0);
  });
});

describe('bodemas, rekenwijze contract', () => {
  it('rekent hoeveelheden, kosten en opbrengst', () => {
    const u = bodemas(contract);
    expect(u.bodemasTon).toBe(20000);
    expect(u.overigTon).toBe(17600);
    expect(u.brutoKosten).toBe(600000);
    expect(u.opbrengst).toBe(600000);
    expect(u.nettoKosten).toBe(0);
    expect(u.ontbrekend).toEqual([]);
  });

  it('telt het deel van de opbrengst en de stortkosten mee', () => {
    const u = bodemas({ ...contract, aandeelOpbrengstPct: 50, residuPct: 5 });
    // opbrengst 600.000 × 50 % = 300.000 ; storten 1.000 × 80 = 80.000 → netto 600.000 − 300.000 + 80.000
    expect(u.opbrengst).toBe(300000);
    expect(u.nettoKosten).toBe(380000);
    expect(u.perTonVerbrand).toBe(3.8);
  });

  it('negatief netto = opbrengst', () => {
    const u = bodemas({ ...contract, verwerkingstarief: 20 });
    expect(u.nettoKosten).toBe(-200000);
    expect(u.perTonVerbrand).toBe(-2);
  });

  it('geeft geen bedragen zolang tarief of prijzen ontbreken, wel hoeveelheden en stortkosten', () => {
    const u = bodemas({ ...contract, verwerkingstarief: null, residuPct: 5 });
    expect(u.bodemasTon).toBe(20000);
    expect(u.kostenStorten).toBe(80000);
    expect(u.brutoKosten).toBeNull();
    expect(u.nettoKosten).toBeNull();
    expect(u.perTonVerbrand).toBeNull();
    expect(u.ontbrekend).toEqual(['verwerkingstarief']);
  });

  it('noemt alle ontbrekende bedragen, alleen bij rekenwijze contract', () => {
    const leeg = { ...contract, verwerkingstarief: null, prijsFerro: null, prijsNonFerro: null };
    expect(ontbrekendeBedragen(leeg)).toEqual(['verwerkingstarief', 'prijsFerro', 'prijsNonFerro']);
    expect(ontbrekendeBedragen({ ...leeg, rekenwijze: 'kental' })).toEqual([]);
    expect(ontbrekendeBedragen({ ...contract, prijsFerro: NaN })).toEqual(['prijsFerro']);
  });

  it('houdt overig niet negatief bij onmogelijke percentages', () => {
    expect(bodemas({ ...contract, ferroPct: 80, nonFerroPct: 30 }).overigTon).toBe(0);
  });
});

describe('controle van de invoer', () => {
  const bereik = { aandeelBodemasPct: [22.7, 25.8] as [number, number], ferroPct: [6, 6.9] as [number, number], nonFerroPct: [2, 2.7] as [number, number] };
  it('geeft geen meldingen bij de standaard', () => {
    expect(controleerBodemas(bodemasStandaard, bodemasBereik, 15)).toEqual({ fouten: [], signalen: [] });
  });
  it('meldt een fout als ferro, non-ferro en residu samen meer dan 100 % zijn', () => {
    const c = controleerBodemas({ ...kental, ferroPct: 70, nonFerroPct: 40 }, bereik, 15);
    expect(c.fouten).toHaveLength(1);
    expect(c.fouten[0]).toContain('115 %');
  });
  it('signaleert een aandeel bodemas ver buiten het landelijke beeld', () => {
    expect(controleerBodemas({ ...kental, aandeelBodemasPct: 24 }, bereik, 15).signalen).toEqual([]);
    expect(controleerBodemas({ ...kental, aandeelBodemasPct: 40 }, bereik, 15).signalen[0]).toContain('wijkt sterk af');
    expect(controleerBodemas({ ...kental, aandeelBodemasPct: 10 }, bereik, 15).signalen).toHaveLength(1);
  });
  it('signaleert ongewone metaalpercentages en residu boven het maximum', () => {
    const c = controleerBodemas({ ...kental, ferroPct: 30, nonFerroPct: 5, residuPct: 20 }, bereik, 15);
    expect(c.signalen.some((s) => s.startsWith('Metalen samen 35 %'))).toBe(true);
    expect(c.signalen.some((s) => s.includes('boven het maximum van 15 %'))).toBe(true);
  });
});

describe('bandbreedte', () => {
  it('rekent laag en hoog met de scenario’s als de gebruiker de kentallen niet aanpast', () => {
    const b = bandbreedte(bodemasStandaard, bodemasScenario)!;
    const t = bodemas(bodemasStandaard).bodemasTon;
    expect(b.laag).toBeCloseTo(t * 10 + t * 0.038 * (30 + 40.85), 4);
    expect(b.midden).toBeCloseTo(bodemas(bodemasStandaard).nettoKosten as number, 6);
    expect(b.hoog).toBeCloseTo(t * 12.19 + t * 0.15 * (48.76 + 40.85), 4);
    expect(b.laag).toBeLessThan(b.midden);
    expect(b.hoog).toBeGreaterThan(b.midden);
    expect(b.volgtScenario).toEqual(['nettoOpwerking', 'residuPct', 'stortkosten']);
  });

  it('laat zelf ingevulde waarden staan', () => {
    const eigen = { ...bodemasStandaard, nettoOpwerking: 20 };
    const b = bandbreedte(eigen, bodemasScenario)!;
    const t = bodemas(eigen).bodemasTon;
    expect(b.laag).toBeCloseTo(t * 20 + t * 0.038 * (30 + 40.85), 4);
    expect(b.volgtScenario).toEqual(['residuPct', 'stortkosten']);
  });

  it('geeft null als de netto kosten niet te berekenen zijn', () => {
    expect(bandbreedte({ ...contract, verwerkingstarief: null }, bodemasScenario)).toBeNull();
  });
});

describe('meerdere installaties (Pro)', () => {
  it('telt hoeveelheden en bedragen op', () => {
    const { regels, totaal } = bodemasInstallaties([
      { ...kental, id: 'a', naam: 'A' },
      { ...kental, id: 'b', naam: 'B', tonnageVerbrand: 50000 },
    ]);
    expect(regels).toHaveLength(2);
    expect(totaal.tonnageVerbrand).toBe(150000);
    expect(totaal.bodemasTon).toBe(30000);
    expect(totaal.residuTon).toBe(1500);
    expect(totaal.nettoKosten).toBe(275000 + 137500);
    expect(totaal.opbrengst).toBeNull();
    expect(totaal.volledig).toBe(true);
  });

  it('zet het totaal op onvolledig als één installatie geen tarief heeft', () => {
    const { totaal } = bodemasInstallaties([
      { ...contract, id: 'a', naam: 'A' },
      { ...contract, id: 'b', naam: 'B', verwerkingstarief: null },
    ]);
    expect(totaal.bodemasTon).toBe(40000);
    expect(totaal.nettoKosten).toBeNull();
    expect(totaal.volledig).toBe(false);
  });
});

describe('gevoeligheid', () => {
  it('kiest de parameters bij de rekenwijze', () => {
    expect(gevoeligheidsParameters('kental')).toEqual(['tonnageVerbrand', 'nettoOpwerking', 'residuPct', 'stortkosten']);
    expect(gevoeligheidsParameters('contract')).toContain('prijsNonFerro');
    // geen dubbele balken: parameters met hetzelfde effect staan er één keer in
    expect(gevoeligheidsParameters('contract')).not.toContain('aandeelBodemasPct');
    expect(gevoeligheidsParameters('contract')).not.toContain('ferroPct');
    expect(gevoeligheidsParameters('contract')).not.toContain('nonFerroPct');
  });

  it('varieert elke parameter en sorteert op invloed', () => {
    const g = gevoeligheid(kental, 0.2);
    expect(g).toHaveLength(4);
    // de hoeveelheid bodemas werkt op het hele bedrag (275.000 × 0,4 = 110.000)
    expect(Math.abs(g[0].bandbreedte)).toBeCloseTo(110000, 6);
    const opw = g.find((x) => x.parameter === 'nettoOpwerking')!;
    expect(opw.hoog - opw.laag).toBeCloseTo(80000, 6);
    for (let n = 1; n < g.length; n++) expect(Math.abs(g[n - 1].bandbreedte)).toBeGreaterThanOrEqual(Math.abs(g[n].bandbreedte));
  });

  it('is leeg zonder contractbedragen', () => {
    expect(gevoeligheid({ ...contract, prijsFerro: null })).toEqual([]);
  });
});

describe('deellink', () => {
  it('zet invoer om en terug, ook de rekenwijze', () => {
    const p = bodemasNaarParams(contract);
    expect(p.get('wijze')).toBe('contract');
    expect(bodemasUitParams(p, bodemasStandaard)).toEqual(contract);
    const k = bodemasNaarParams(kental, { gm: 'GM0363' });
    expect(k.get('wijze')).toBe('kental');
    expect(k.get('gm')).toBe('GM0363');
    expect(bodemasUitParams(k, { ...bodemasStandaard, rekenwijze: 'kental' })).toEqual(kental);
  });

  it('laat lege bedragen leeg en negeert ongeldige waarden', () => {
    const p = bodemasNaarParams({ ...contract, verwerkingstarief: null });
    expect(p.has('tarief')).toBe(false);
    const uit = bodemasUitParams(new URLSearchParams('ton=-5&as=150&fe=abc&res=7&deel=120'), bodemasStandaard);
    expect(uit.tonnageVerbrand).toBe(bodemasStandaard.tonnageVerbrand);
    expect(uit.aandeelBodemasPct).toBe(bodemasStandaard.aandeelBodemasPct);
    expect(uit.ferroPct).toBe(bodemasStandaard.ferroPct);
    expect(uit.residuPct).toBe(7);
    expect(uit.aandeelOpbrengstPct).toBe(100);
  });

  it('leest een oude link met tarief als rekenwijze contract', () => {
    const uit = bodemasUitParams(new URLSearchParams('ton=100000&tarief=30&pfe=150&pnf=900'), bodemasStandaard);
    expect(uit.rekenwijze).toBe('contract');
    expect(uit.verwerkingstarief).toBe(30);
  });
});

describe('stellige uitkomst alleen met eigen tarief (ronde 3)', () => {
  it('geeft bij het kental voor opwerking alleen een indicatie', () => {
    expect(bodemasConclusieMogelijk(bodemasStandaard, kentalNettoOpwerking)).toBe(false);
    expect(bodemasConclusieMogelijk({ ...bodemasStandaard, nettoOpwerking: 18 }, kentalNettoOpwerking)).toBe(true);
  });
  it('geeft bij de rekenwijze contract pas een uitkomst als tarief en prijzen zijn ingevuld', () => {
    expect(bodemasConclusieMogelijk(contract, kentalNettoOpwerking)).toBe(true);
    expect(bodemasConclusieMogelijk({ ...contract, verwerkingstarief: null }, kentalNettoOpwerking)).toBe(false);
  });
  it('signaleert meer verbrand afval dan heel Nederland', () => {
    const bereik = { ...bodemasBereik, verbrandMaxTon: 6_422_000 };
    expect(controleerBodemas({ ...bodemasStandaard, tonnageVerbrand: 99_000_000_000 }, bereik, 15).signalen[0]).toContain('meer dan alles wat in Nederland');
    expect(controleerBodemas({ ...bodemasStandaard, tonnageVerbrand: 6_422_000 }, bereik, 15).signalen).toEqual([]);
  });
});
