import { describe, expect, it } from 'vitest';
import {
  factorTussen,
  gemeenschappelijkePerioden,
  indexFactor,
  indexInvoerNaarParams,
  indexInvoerUitParams,
  isPeriode,
  periodeBereik,
  kiesPeriode,
  nieuwTarief,
  periodeLabel,
  peilperiode,
  begrensStap,
  tariefPerContractjaar,
  tariefPerJaar,
  vergelijkJaren,
  waardeOp,
  wegingKlopt,
  rondAf,
  rondTarief,
  afrondingTekst,
  GEEN_AFRONDING,
  MAX_BASISTARIEF,
  EIGEN_REEKS_ID,
  eigenReeksNaarParam,
  eigenReeksUitParam,
  kiesContractjaren,
  leesEigenReeks,
  leesPeriode,
  type IndexInvoer,
} from './indexering';
import { indexreeksen, indexStandaardInvoer, reeksMetId } from '../../data/indexreeksen';

const onderdelen = [
  { naam: 'Loon', weging: 0.5, basis: 100, nu: 120 },
  { naam: 'Energie', weging: 0.3, basis: 100, nu: 150 },
  { naam: 'Prijzen', weging: 0.2, basis: 100, nu: 110 },
];

describe('indexering: formule', () => {
  it('berekent de gewogen indexfactor', () => {
    // 0,5 × 1,2 + 0,3 × 1,5 + 0,2 × 1,1 = 0,6 + 0,45 + 0,22 = 1,27
    expect(indexFactor(onderdelen)).toBeCloseTo(1.27, 10);
  });

  it('past de factor toe op het basistarief', () => {
    expect(nieuwTarief(100, onderdelen)).toBeCloseTo(127, 10);
  });

  it('geeft het basistarief terug als alle indexen gelijk blijven', () => {
    const gelijk = onderdelen.map((o) => ({ ...o, nu: o.basis }));
    expect(nieuwTarief(95.5, gelijk)).toBeCloseTo(95.5, 10);
  });

  it('rekent met een vast deel dat niet meebeweegt', () => {
    // 20 % vast + 80 % loon dat 25 % stijgt: 0,2 + 0,8 × 1,25 = 1,2
    expect(indexFactor([{ naam: 'Loon', weging: 0.8, basis: 100, nu: 125 }], 0.2)).toBeCloseTo(1.2, 10);
    expect(wegingKlopt([{ weging: 0.8 }], 1e-6, 0.2)).toBe(true);
  });

  it('controleert of de wegingen samen 100 % zijn', () => {
    expect(wegingKlopt(onderdelen)).toBe(true);
    expect(wegingKlopt([{ weging: 0.5 }, { weging: 0.4 }])).toBe(false);
  });

  it('weigert een basisindex van 0', () => {
    expect(() => indexFactor([{ naam: 'X', weging: 1, basis: 0, nu: 100 }])).toThrow();
  });

  it('maakt een reeks per jaar met stijging ten opzichte van het vorige jaar', () => {
    const reeksen = [
      { naam: 'A', weging: 0.5, waarden: { 2024: 100, 2025: 110, 2026: 121 } },
      { naam: 'B', weging: 0.5, waarden: { 2024: 100, 2025: 110, 2026: 121 } },
    ];
    const r = tariefPerJaar(200, reeksen, 2024, 2026);
    expect(r.map((j) => j.jaar)).toEqual([2024, 2025, 2026]);
    expect(r[0].tarief).toBeCloseTo(200);
    expect(r[0].stijgingPct).toBeNull();
    expect(r[1].tarief).toBeCloseTo(220);
    expect(r[2].stijgingPct).toBeCloseTo(10);
  });
});

const A = { maanden: { '2024-01': 100, '2024-09': 104, '2025-01': 106, '2025-09': 110 }, jaren: { '2023': 98, '2024': 102, '2025': 108 } };
const B = { maanden: { '2024-09': 50, '2025-09': 60 }, jaren: { '2024': 200, '2025': 220 } };

describe('indexering: perioden', () => {
  it('leest waarden per maand en per jaar', () => {
    expect(waardeOp(A, 'maand', '2024-09')).toBe(104);
    expect(waardeOp(A, 'jaar', '2024')).toBe(102);
    expect(waardeOp(A, 'jaar', '2019')).toBeUndefined();
  });

  it('vindt de perioden die alle reeksen gemeen hebben', () => {
    expect(gemeenschappelijkePerioden([A, B], 'maand')).toEqual(['2024-09', '2025-09']);
    expect(gemeenschappelijkePerioden([A, B], 'jaar')).toEqual(['2024', '2025']);
    expect(gemeenschappelijkePerioden([], 'jaar')).toEqual([]);
  });

  it('kiest de dichtstbijzijnde geldige periode', () => {
    const p = ['2020-01', '2020-06', '2021-01'];
    expect(kiesPeriode(p, '2020-06')).toBe('2020-06');
    expect(kiesPeriode(p, '2020-05')).toBe('2020-06');
    expect(kiesPeriode(p, '2019')).toBe('2020-01');
    expect(kiesPeriode(p, undefined)).toBe('2021-01');
    expect(kiesPeriode([], '2020')).toBeUndefined();
  });

  it('maakt leesbare labels en controleert het formaat', () => {
    expect(periodeLabel('2024-03')).toBe('maart 2024');
    expect(periodeLabel('2024')).toBe('2024');
    expect(isPeriode('2024', 'jaar')).toBe(true);
    expect(isPeriode('2024-13', 'maand')).toBe(false);
    expect(isPeriode('2024-09', 'maand')).toBe(true);
  });

  it('schrijft een lijst perioden kort op', () => {
    expect(periodeBereik(['2026-03', '2026-01', '2026-02', '2026-06'])).toBe('januari 2026 t/m maart 2026, juni 2026');
    expect(periodeBereik(['2025-12', '2026-01'])).toBe('december 2025 t/m januari 2026');
    expect(periodeBereik(['2023', '2024', '2026'])).toBe('2023 t/m 2024, 2026');
    expect(periodeBereik([])).toBe('');
  });

  it('rekent een gewogen factor tussen twee perioden', () => {
    // 0,5 × 110/104 + 0,5 × 60/50
    const f = factorTussen(
      [
        { naam: 'A', weging: 0.5, reeks: A },
        { naam: 'B', weging: 0.5, reeks: B },
      ],
      'maand',
      '2024-09',
      '2025-09',
    );
    expect(f).toBeCloseTo(0.5 * (110 / 104) + 0.5 * 1.2, 10);
    // Ontbrekende maand bij B → geen uitkomst.
    expect(factorTussen([{ naam: 'B', weging: 1, reeks: B }], 'maand', '2024-01', '2025-09')).toBeUndefined();
    // Reeks met weging 0 telt niet mee, ook als die de periode mist.
    expect(factorTussen([{ naam: 'A', weging: 1, reeks: A }, { naam: 'B', weging: 0, reeks: B }], 'maand', '2024-01', '2025-01')).toBeCloseTo(1.06, 10);
  });
});

describe('indexering: contractjaren', () => {
  it('bepaalt de peilperiode per contractjaar', () => {
    expect(peilperiode(2026, 'jaar', 1, 9)).toBe('2025');
    expect(peilperiode(2026, 'jaar', 0, 9)).toBe('2026');
    expect(peilperiode(2026, 'maand', 1, 9)).toBe('2025-09');
  });

  it('rekent het tarief per contractjaar en slaat jaren zonder cijfer over', () => {
    const rijen = tariefPerContractjaar({
      basistarief: 100,
      reeksen: [{ naam: 'A', weging: 1, reeks: A }],
      vastDeel: 0,
      soort: 'jaar',
      basisperiode: '2023',
      eersteJaar: 2024,
      laatsteJaar: 2027,
      verschuiving: 1,
      peilmaand: 1,
    });
    // 2024 → 2023 (98/98), 2025 → 2024 (102/98), 2026 → 2025 (108/98), 2027 → 2026 ontbreekt
    expect(rijen.map((r) => r.jaar)).toEqual([2024, 2025, 2026]);
    expect(rijen[0].tarief).toBeCloseTo(100, 10);
    expect(rijen[1].tarief).toBeCloseTo((100 * 102) / 98, 10);
    expect(rijen[2].stijgingPct).toBeCloseTo((108 / 102 - 1) * 100, 10);
    const v = vergelijkJaren(rijen, 2024, 2026)!;
    expect(v.verschil).toBeCloseTo((100 * 108) / 98 - 100, 10);
    expect(v.verschilPct).toBeCloseTo((108 / 98 - 1) * 100, 10);
    expect(vergelijkJaren(rijen, 2024, 2030)).toBeUndefined();
  });

  it('werkt met maandcijfers en een peilmaand', () => {
    const rijen = tariefPerContractjaar({
      basistarief: 200,
      reeksen: [{ naam: 'A', weging: 0.75, reeks: A }],
      vastDeel: 0.25,
      soort: 'maand',
      basisperiode: '2024-09',
      eersteJaar: 2025,
      laatsteJaar: 2026,
      verschuiving: 1,
      peilmaand: 9,
    });
    expect(rijen.map((r) => r.peilperiode)).toEqual(['2024-09', '2025-09']);
    expect(rijen[1].tarief).toBeCloseTo(200 * (0.25 + 0.75 * (110 / 104)), 10);
  });
});

describe('indexering: plafond en bodem', () => {
  // Contractjaar J gebruikt het jaarcijfer van J − 1; basis 2023 (98), 2024 (102), 2025 (108). Voor een daling een eigen reeks.
  const basisInvoer = {
    basistarief: 100,
    reeksen: [{ naam: 'A', weging: 1, reeks: A }],
    vastDeel: 0,
    soort: 'jaar' as const,
    basisperiode: '2023',
    eersteJaar: 2025,
    laatsteJaar: 2027,
    verschuiving: 1 as const,
    peilmaand: 1,
  };

  it('begrenst een stap met plafond en bodem', () => {
    expect(begrensStap(1.08, 3)).toBeCloseTo(1.03, 12);
    expect(begrensStap(1.02, 3)).toBeCloseTo(1.02, 12);
    expect(begrensStap(0.97, null, true)).toBe(1);
    expect(begrensStap(0.97, 3, false)).toBeCloseTo(0.97, 12);
    expect(begrensStap(1.05, 0, true)).toBe(1);
  });

  it('is zonder begrenzing gelijk aan basistarief × factor', () => {
    const zonder = tariefPerContractjaar(basisInvoer);
    const metNull = tariefPerContractjaar({ ...basisInvoer, plafondPct: null, geenDaling: false });
    expect(metNull.map((r) => r.tarief)).toEqual(zonder.map((r) => r.tarief));
    expect(zonder.every((r) => !r.begrensd && r.tarief === r.tariefZonderGrens)).toBe(true);
  });

  it('indexeert met plafond jaar op jaar', () => {
    const rijen = tariefPerContractjaar({ ...basisInvoer, plafondPct: 3 });
    // 2025: 102/98 = +4,08 % → +3 %; 2026: 108/102 = +5,88 % → +3 %; 2027 ontbreekt.
    expect(rijen.map((r) => r.jaar)).toEqual([2025, 2026]);
    expect(rijen[0].tarief).toBeCloseTo(103, 10);
    expect(rijen[0].begrensd).toBe(true);
    expect(rijen[0].tariefZonderGrens).toBeCloseTo((100 * 102) / 98, 10);
    expect(rijen[1].tarief).toBeCloseTo(103 * 1.03, 10);
    expect(rijen[1].stijgingPct).toBeCloseTo(3, 10);
  });

  it('past een daling niet toe als dat zo is afgesproken', () => {
    const D = { jaren: { '2023': 100, '2024': 104, '2025': 101, '2026': 103 }, maanden: {} };
    const inv = { ...basisInvoer, verschuiving: 0 as const, reeksen: [{ naam: 'D', weging: 1, reeks: D }], eersteJaar: 2024, laatsteJaar: 2026 };
    const rijen = tariefPerContractjaar({ ...inv, geenDaling: true });
    expect(rijen[0].tarief).toBeCloseTo(104, 10);
    expect(rijen[1].tarief).toBeCloseTo(104, 10); // 101/104 < 1 → blijft gelijk
    expect(rijen[1].begrensd).toBe(true);
    expect(rijen[2].tarief).toBeCloseTo(104 * (103 / 101), 10); // volgende stap rekent vanaf het vorige indexcijfer
    expect(tariefPerContractjaar(inv)[1].tarief).toBeCloseTo(101, 10);
  });
});

describe('indexering: afronding', () => {
  it('rondt rekenkundig af, ook bij randgevallen van zwevende komma', () => {
    expect(rondAf(1.005, 2)).toBe(1.01);
    expect(rondAf(1.0049, 2)).toBe(1);
    expect(rondAf(103.45, 1)).toBe(103.5);
    expect(rondAf(1.23456, 4)).toBe(1.2346);
    expect(rondAf(-1.005, 2)).toBe(-1.01);
    expect(rondAf(1.23456, null)).toBe(1.23456);
    expect(rondAf(1e-7, 4)).toBe(0);
    expect(rondTarief(117.235, { ...GEEN_AFRONDING, tariefCenten: true })).toBe(117.24);
    expect(rondTarief(117.235)).toBe(117.235);
  });

  it('rondt indexcijfers af voor het rekenen en de factor erna', () => {
    const R = { jaren: { '2021': 98.44, '2025': 117.26 }, maanden: {} };
    const reeks = [{ naam: 'R', weging: 1, reeks: R }];
    // Zonder afronding: 117,26 / 98,44
    expect(factorTussen(reeks, 'jaar', '2021', '2025')).toBeCloseTo(117.26 / 98.44, 12);
    // Indexcijfers op 1 decimaal: 117,3 / 98,4 = 1,19207…
    expect(factorTussen(reeks, 'jaar', '2021', '2025', 0, { ...GEEN_AFRONDING, indexDecimalen: 1 })).toBeCloseTo(117.3 / 98.4, 12);
    // Factor op 3 decimalen
    expect(factorTussen(reeks, 'jaar', '2021', '2025', 0, { ...GEEN_AFRONDING, factorDecimalen: 3 })).toBe(1.191);
    // Beide: 1,19207 → 1,192
    expect(factorTussen(reeks, 'jaar', '2021', '2025', 0, { indexDecimalen: 1, factorDecimalen: 3, tariefCenten: false })).toBe(1.192);
  });

  it('rondt het tarief per contractjaar op centen af en bouwt jaar op jaar voort op het afgeronde tarief', () => {
    const R = { jaren: { '2022': 100, '2023': 103.333, '2024': 106.777 }, maanden: {} };
    const basis = {
      basistarief: 87.65,
      reeksen: [{ naam: 'R', weging: 1, reeks: R }],
      vastDeel: 0,
      soort: 'jaar' as const,
      basisperiode: '2022',
      eersteJaar: 2024,
      laatsteJaar: 2025,
      verschuiving: 1 as const,
      peilmaand: 1,
    };
    const centen = { indexDecimalen: null, factorDecimalen: 4, tariefCenten: true };
    const zonder = tariefPerContractjaar(basis);
    const met = tariefPerContractjaar({ ...basis, afronding: centen });
    expect(zonder[0].tarief).toBeCloseTo(87.65 * 1.03333, 10);
    expect(met[0].factor).toBe(1.0333);
    expect(met[0].tarief).toBe(90.57); // 87,65 × 1,0333 = 90,568…
    expect(met[1].tarief).toBe(rondAf(87.65 * 1.0678, 2));
    // Met plafond (jaar op jaar): stap 2025 = 106,777 / 103,333 = 1,03333 → afgerond 1,0333; plafond 10 % raakt niet.
    const keten = tariefPerContractjaar({ ...basis, afronding: centen, plafondPct: 10 });
    expect(keten[0].tarief).toBe(90.57);
    const stap = rondAf(1.0678 / 1.0333, 4);
    expect(keten[1].tarief).toBe(rondAf(90.57 * stap, 2));
  });

  it('beschrijft de afronding in woorden', () => {
    expect(afrondingTekst(GEEN_AFRONDING)).toBe('indexcijfers zoals CBS ze publiceert, indexfactor niet afgerond, tarief niet afgerond');
    expect(afrondingTekst({ indexDecimalen: 1, factorDecimalen: 4, tariefCenten: true })).toBe(
      'indexcijfers op 1 decimaal, indexfactor op 4 decimalen, tarief op hele centen',
    );
  });
});

describe('indexering: CBS-data', () => {
  it('bevat echte reeksen met bron, tabel-id en peildatum', () => {
    expect(indexreeksen.length).toBeGreaterThanOrEqual(5);
    for (const r of indexreeksen) {
      expect(r.tabelId).toMatch(/^\d{5}(NED|ned)$/);
      expect(r.bronUrl).toContain('opendata.cbs.nl');
      expect(Object.keys(r.maanden).length).toBeGreaterThan(12);
    }
    expect(reeksMetId('cpi')!.jaren['2025']).toBe(100); // CPI 2025=100
    expect(reeksMetId('cao-afval')!.jaren['2020']).toBe(100); // cao-lonen 2020=100
  });

  it('heeft standaardinvoer die op de data past', () => {
    const cpi = reeksMetId(indexStandaardInvoer.reeks)!;
    expect(waardeOp(cpi, 'jaar', indexStandaardInvoer.basisperiode)).toBeDefined();
    expect(waardeOp(cpi, 'jaar', indexStandaardInvoer.peilperiode)).toBeDefined();
  });
});

describe('indexering: deellink', () => {
  const ids = indexreeksen.map((r) => r.id);
  it('zet invoer heen en terug zonder verlies', () => {
    const inv: IndexInvoer = {
      ...indexStandaardInvoer,
      soort: 'maand',
      basistarief: 87.25,
      reeks: 'cao-afval',
      basisperiode: '2022-09',
      peilperiode: '2026-09',
      wegingPct: Object.fromEntries(ids.map((id) => [id, id === 'cpi' ? 40 : id === 'pomp-diesel' ? 35 : 0])),
      vastPct: 25,
      eersteJaar: 2023,
      laatsteJaar: 2027,
      verschuiving: 0,
      peilmaand: 6,
      plafondPct: 2.5,
      geenDaling: true,
      vergelijk: [2024, 2027],
      afronding: { indexDecimalen: 1, factorDecimalen: 4, tariefCenten: false },
    };
    expect(indexInvoerUitParams(indexInvoerNaarParams(inv), indexStandaardInvoer, ids)).toEqual(inv);
    expect(indexInvoerNaarParams(inv).get('vgl')).toBe('2024-2027');
    const zonder: IndexInvoer = { ...inv, plafondPct: null, geenDaling: false, vergelijk: null };
    const p = indexInvoerNaarParams(zonder);
    expect(p.has('max')).toBe(false);
    expect(p.has('vgl')).toBe(false);
    expect(indexInvoerUitParams(p, indexStandaardInvoer, ids)).toEqual(zonder);
  });

  it('negeert onbekende reeksen en ongeldige waarden', () => {
    const p = new URLSearchParams('soort=maand&tarief=-5&reeks=onbekend&basis=2021&weging=cpi:60,nep:40,cao-afval:500&maand=13&verschuiving=7');
    const uit = indexInvoerUitParams(p, indexStandaardInvoer, ids);
    expect(uit.soort).toBe('maand');
    expect(uit.basistarief).toBe(indexStandaardInvoer.basistarief);
    expect(uit.reeks).toBe(indexStandaardInvoer.reeks);
    expect(uit.basisperiode).toBe(''); // "2021" is geen maandperiode
    expect(uit.wegingPct.cpi).toBe(60);
    expect(uit.wegingPct['cao-afval']).toBe(0);
    expect('nep' in uit.wegingPct).toBe(false);
    expect(uit.peilmaand).toBe(indexStandaardInvoer.peilmaand);
    expect(uit.verschuiving).toBe(indexStandaardInvoer.verschuiving);
    expect(uit.plafondPct).toBeNull();
    expect(uit.vergelijk).toBeNull();
    expect(indexInvoerUitParams(new URLSearchParams('vgl=2024-1999'), indexStandaardInvoer, ids).vergelijk).toBeNull();
    expect(indexInvoerUitParams(new URLSearchParams('vgl=24-26'), indexStandaardInvoer, ids).vergelijk).toBeNull();
    expect(new URLSearchParams('max=150').has('max') && indexInvoerUitParams(new URLSearchParams('max=150'), indexStandaardInvoer, ids).plafondPct).toBeNull();
  });

  it('leest de afronding en begrenst het basistarief', () => {
    const uit = (q: string) => indexInvoerUitParams(new URLSearchParams(q), indexStandaardInvoer, ids);
    expect(uit('rindex=cbs&rfactor=nee&rtarief=nee').afronding).toEqual(GEEN_AFRONDING);
    expect(uit('rindex=2&rfactor=3&rtarief=cent').afronding).toEqual({ indexDecimalen: 2, factorDecimalen: 3, tariefCenten: true });
    // Onbekende waarden en oude links zonder afronding: standaard.
    expect(uit('rindex=9&rfactor=x').afronding).toEqual(indexStandaardInvoer.afronding);
    expect(uit('soort=jaar').afronding).toEqual(indexStandaardInvoer.afronding);
    expect(uit(`tarief=${MAX_BASISTARIEF}`).basistarief).toBe(MAX_BASISTARIEF);
    expect(uit(`tarief=${MAX_BASISTARIEF + 1}`).basistarief).toBe(indexStandaardInvoer.basistarief);
  });
});

describe('indexering: tegel volgt het contractjaar (ronde 3)', () => {
  const reeks = { maanden: {}, jaren: { '2021': 100, '2022': 110, '2023': 121, '2024': 133.1, '2025': 140 } };
  const basis = {
    basistarief: 100,
    reeksen: [{ naam: 'X', weging: 1, reeks }],
    vastDeel: 0,
    soort: 'jaar' as const,
    basisperiode: '2021',
    eersteJaar: 2022,
    laatsteJaar: 2026,
    verschuiving: 1 as const,
    peilmaand: 9,
  };

  it('toont het tarief van het gekozen contractjaar, met verschuiving van de peilperiode', () => {
    const rijen = tariefPerContractjaar(basis);
    const { a, b, verschil } = kiesContractjaren(rijen, null);
    // Standaard: eerste en laatste contractjaar. Contractjaar 2026 rekent met het jaarcijfer 2025.
    expect(a?.jaar).toBe(2022);
    expect(b?.jaar).toBe(2026);
    expect(b?.peilperiode).toBe('2025');
    expect(b?.tarief).toBeCloseTo(140, 10);
    // Het tarief bij peilperiode 2025 is niet het tarief van contractjaar 2025.
    const j2025 = kiesContractjaren(rijen, [2022, 2025]).b!;
    expect(j2025.peilperiode).toBe('2024');
    expect(j2025.tarief).toBeCloseTo(133.1, 10);
    expect(verschil?.verschilPct).toBeCloseTo((140 / 100 - 1) * 100, 10);
  });

  it('neemt de begrenzing mee in het getoonde tarief', () => {
    const rijen = tariefPerContractjaar({ ...basis, plafondPct: 5 });
    const { b } = kiesContractjaren(rijen, [2022, 2024]);
    // 2022: stap 1,0 → 100; 2023: 1,10 → 1,05 → 105; 2024: 1,10 → 1,05 → 110,25.
    expect(b?.tarief).toBeCloseTo(110.25, 10);
    expect(b?.begrensd).toBe(true);
    expect(b?.tariefZonderGrens).toBeCloseTo(121, 10);
  });

  it('valt terug op eerste en laatste jaar bij een onbekend contractjaar, en is leeg zonder rijen', () => {
    const rijen = tariefPerContractjaar(basis);
    expect(kiesContractjaren(rijen, [1999, 2050])).toMatchObject({ a: { jaar: 2022 }, b: { jaar: 2026 } });
    expect(kiesContractjaren([], [2022, 2026])).toEqual({});
  });
});

describe('indexering: eigen reeks (ronde 3)', () => {
  it('leest perioden in verschillende schrijfwijzen', () => {
    expect(leesPeriode('2024')).toBe('2024');
    expect(leesPeriode('2024-9')).toBe('2024-09');
    expect(leesPeriode('2024/10')).toBe('2024-10');
    expect(leesPeriode('2024M03')).toBe('2024-03');
    expect(leesPeriode('2024 september')).toBe('2024-09');
    expect(leesPeriode('mrt 2025')).toBe('2025-03');
    expect(leesPeriode('2024 september*')).toBe('2024-09'); // CBS markeert voorlopige cijfers met *
    expect(leesPeriode('2024-13')).toBeUndefined();
    expect(leesPeriode('vorig jaar')).toBeUndefined();
  });

  it('leest regels met spatie, tab, puntkomma of dubbele punt en meldt de rest', () => {
    const { waarden, fouten } = leesEigenReeks('2023 100\n2024\t102,5\n2025;1.024,5\n2024-09: 103.1\n\nonzin\n2026 -3');
    expect(waarden.jaren).toEqual({ '2023': 100, '2024': 102.5, '2025': 1024.5 });
    expect(waarden.maanden).toEqual({ '2024-09': 103.1 });
    expect(fouten).toHaveLength(2);
    expect(fouten[0]).toContain('regel 6');
  });

  it('rekent met een eigen reeks zoals met een CBS-reeks', () => {
    const { waarden } = leesEigenReeks('2021 80\n2025 100');
    expect(factorTussen([{ naam: 'eigen', weging: 1, reeks: waarden }], 'jaar', '2021', '2025')).toBeCloseTo(1.25, 12);
  });

  it('zet een eigen reeks in de deellink en terug', () => {
    const ids = [...indexreeksen.map((r) => r.id), EIGEN_REEKS_ID];
    const inv: IndexInvoer = {
      ...indexStandaardInvoer,
      reeks: EIGEN_REEKS_ID,
      eigenNaam: 'DPI reiniging',
      eigenTekst: '2021 95,5\n2025 104\n2025-06 103,2',
      wegingPct: { ...indexStandaardInvoer.wegingPct, [EIGEN_REEKS_ID]: 10 },
    };
    const p = indexInvoerNaarParams(inv);
    expect(p.get('ereeks')).toBe('2021:95.5,2025:104,2025-06:103.2');
    expect(p.get('enaam')).toBe('DPI reiniging');
    const terug = indexInvoerUitParams(p, indexStandaardInvoer, ids);
    expect(terug.reeks).toBe(EIGEN_REEKS_ID);
    expect(terug.eigenNaam).toBe('DPI reiniging');
    expect(leesEigenReeks(terug.eigenTekst).waarden).toEqual(leesEigenReeks(inv.eigenTekst).waarden);
    expect(terug.wegingPct[EIGEN_REEKS_ID]).toBe(10);
    // Zonder eigen cijfers geen parameters; ongeldige delen vallen weg.
    expect(indexInvoerNaarParams(indexStandaardInvoer).has('ereeks')).toBe(false);
    expect(eigenReeksUitParam('2021:100,abc:5,2022:-1,2023-02:101.5')).toBe('2021 100\n2023-02 101,5');
    expect(eigenReeksNaarParam({ maanden: {}, jaren: {} })).toBe('');
  });
});
