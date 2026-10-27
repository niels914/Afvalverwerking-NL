import { describe, expect, it } from 'vitest';
import {
  bandbreedte,
  buitenBand,
  inflatieInTarief,
  co2Heffing,
  co2InvoerNaarParams,
  co2InvoerUitParams,
  co2Jaar,
  parametersInJaar,
  restafvalBijScheiding,
  scanJaar,
  scanReeks,
  tariefInJaar,
  waardeInJaar,
  wettelijkVrijgesteldDeel,
  type Co2PaginaInvoer,
  type Co2Regels,
} from './co2';
import { co2StandaardInvoer, kentalEmissiefactor, procesemissiefactor, reductiefactor, tariefpaden, tariefpadPrijspeil2026 } from '../../data/co2-tarieven';

const regels = (id: 'geldend' | 'voorstel'): Co2Regels => ({ ...tariefpaden[id], reductiefactor, procesemissiefactor });

describe('CO2-heffingenscan: basis', () => {
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
    expect(() => restafvalBijScheiding(100, 100, 60)).toThrow();
  });
});

describe('CO2-heffingenscan: wettelijk tariefpad', () => {
  it('geeft de vastgestelde tarieven terug', () => {
    expect(tariefInJaar(tariefpaden.geldend, 2021)).toBeCloseTo(30.48, 2);
    expect(tariefInJaar(tariefpaden.geldend, 2026)).toBeCloseTo(103.66, 2);
  });

  it('volgt de NEa-tabel 2027–2030 zonder inflatiecorrectie (Wbm art. 71p lid 2)', () => {
    expect(tariefInJaar(tariefpaden.geldend, 2027)).toBeCloseTo(153.32, 2);
    expect(tariefInJaar(tariefpaden.geldend, 2028)).toBeCloseTo(203.74, 2);
    expect(tariefInJaar(tariefpaden.geldend, 2029)).toBeCloseTo(254.16, 2);
    expect(tariefInJaar(tariefpaden.geldend, 2030)).toBeCloseTo(303.55, 2);
    // Na 2030 geen verhoging meer, alleen inflatiecorrectie.
    expect(tariefInJaar(tariefpaden.geldend, 2033)).toBeCloseTo(303.55, 2);
  });

  it('telt eerst de verhoging op en corrigeert daarna voor inflatie', () => {
    // 2027: (103,66 + 49,66) × 1,02 = 156,3864
    expect(tariefInJaar(tariefpaden.geldend, 2027, 2)).toBeCloseTo(156.3864, 4);
    // 2028: de verhoging voor 2028 is per 1 januari 2027 zelf ook geïndexeerd (art. 90 Wbm noemt art. 71p lid 2):
    // (156,3864 + 50,42 × 1,02) × 1,02
    expect(tariefInJaar(tariefpaden.geldend, 2028, 2)).toBeCloseTo((156.3864 + 50.42 * 1.02) * 1.02, 4);
    // 2029: (t2028 + 50,42 × 1,02²) × 1,02
    const t2028 = (156.3864 + 50.42 * 1.02) * 1.02;
    expect(tariefInJaar(tariefpaden.geldend, 2029, 2)).toBeCloseTo((t2028 + 50.42 * 1.02 ** 2) * 1.02, 4);
  });

  it('indexeert de verhogingen in het wetsvoorstel niet apart (BP 2027, art. XXVII onderdeel D)', () => {
    // 2028: (129,15 + 22,79) × 1,02; 2029: (t2028 + 23,54) × 1,02
    const t2028 = (129.15 + 22.79) * 1.02;
    expect(tariefInJaar(tariefpaden.voorstel, 2028, 2)).toBeCloseTo(t2028, 4);
    expect(tariefInJaar(tariefpaden.voorstel, 2029, 2)).toBeCloseTo((t2028 + 23.54) * 1.02, 4);
    // Zonder vlag gedraagt het pad zich als niet-geïndexeerd.
    expect(tariefInJaar({ vast: { 2026: 100 }, verhogingen: { 2027: 10, 2028: 10 } }, 2028, 10)).toBeCloseTo((110 * 1.1 + 10) * 1.1, 6);
  });

  it('volgt het wetsvoorstel Belastingplan 2027 tot en met 2035', () => {
    expect(tariefInJaar(tariefpaden.voorstel, 2026)).toBeCloseTo(103.66, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2027)).toBeCloseTo(129.15, 2);
    // In 2027 geen inflatiecorrectie (art. LX): het vaste tarief blijft staan.
    expect(tariefInJaar(tariefpaden.voorstel, 2027, 3)).toBeCloseTo(129.15, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2028)).toBeCloseTo(151.94, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2035)).toBeCloseTo(328.01, 2);
  });

  it('past bij de tabel in prijspeil 2026 uit de memorie van toelichting (geldend recht, zonder inflatie)', () => {
    for (const r of tariefpadPrijspeil2026) {
      expect(Math.abs(tariefInJaar(regels('geldend'), r.jaar, 0) - r.geldend)).toBeLessThan(1);
    }
    // Beide paden komen in prijspeil 2026 uit op € 304: geldend in 2030, voorstel in 2035.
    expect(tariefpadPrijspeil2026.find((r) => r.jaar === 2030)!.geldend).toBe(304);
    expect(tariefpadPrijspeil2026.find((r) => r.jaar === 2035)!.voorstel).toBe(304);
  });

  it('zoekt waarden per jaar op met terugval op het laatste eerdere jaar', () => {
    expect(waardeInJaar(reductiefactor, 2026)).toBe(1.023);
    expect(waardeInJaar(reductiefactor, 2031)).toBe(1.023);
    expect(waardeInJaar(procesemissiefactor, 2027)).toBe(0.97);
    expect(waardeInJaar(procesemissiefactor, 2028)).toBe(0.91);
    expect(waardeInJaar(tariefpaden.geldend.correctiefactor, 2040)).toBe(0);
    expect(waardeInJaar(tariefpaden.voorstel.correctiefactor, 2033)).toBe(0.1);
    expect(() => waardeInJaar({}, 2026)).toThrow();
  });
});

describe('CO2-heffingenscan: vrijgesteld deel', () => {
  it('rekent de NEa-formule voor AVI’s', () => {
    // 2026: 0,97 × 1,023 × 0,85
    const p = parametersInJaar(regels('geldend'), 2026);
    expect(wettelijkVrijgesteldDeel(p)).toBeCloseTo(0.97 * 1.023 * 0.85, 10);
    // 2028: procesemissiefactor 0,91, correctiefactor 0,55
    expect(wettelijkVrijgesteldDeel(parametersInJaar(regels('geldend'), 2028))).toBeCloseTo(0.91 * 1.023 * 0.55, 10);
    // 2033 geldend recht: geen vrijstelling meer
    expect(wettelijkVrijgesteldDeel(parametersInJaar(regels('geldend'), 2033))).toBe(0);
  });

  it('houdt rekening met een lagere uitstoot dan het historisch niveau, binnen 15 %', () => {
    const f = { procesemissiefactor: 1, reductiefactor: 1, correctiefactor: 0.5 };
    expect(wettelijkVrijgesteldDeel(f, 0.9)).toBeCloseTo(0.5 / 0.9, 10);
    // Buiten de band rekent de NEa met het actuele niveau: verhouding 1.
    expect(wettelijkVrijgesteldDeel(f, 0.7)).toBeCloseTo(0.5, 10);
    expect(wettelijkVrijgesteldDeel(f, 1.2)).toBeCloseTo(0.5, 10);
  });

  it('rekent één jaar door naar uw tonnage', () => {
    const u = co2Jaar({ tonnage: 1000, emissiefactor: 0.4, tarief: 100, vrijgesteldDeel: 0.25 });
    expect(u.uitstoot).toBeCloseTo(400);
    expect(u.vrijgesteld).toBeCloseTo(100);
    expect(u.belastbaar).toBeCloseTo(300);
    expect(u.kosten).toBeCloseTo(30000);
    expect(u.perTon).toBeCloseTo(30);
    // Overschot aan dispensatierechten: geen heffing, niet negatief.
    expect(co2Jaar({ tonnage: 1000, emissiefactor: 0.4, tarief: 100, vrijgesteldDeel: 1.1 }).kosten).toBe(0);
    expect(co2Jaar({ tonnage: 0, emissiefactor: 0.4, tarief: 100, vrijgesteldDeel: 0 }).perTon).toBe(0);
  });

  it('scant een jaar met wettelijke of eigen vrijstelling', () => {
    const inv = { ...co2StandaardInvoer, tonnage: 10000, emissiefactor: 0.4, inflatiePct: 0 };
    const wettelijk = scanJaar(regels('geldend'), inv, 2027);
    const deel = 0.97 * 1.023 * 0.7;
    expect(wettelijk.vrijgesteldDeel).toBeCloseTo(deel, 10);
    expect(wettelijk.kosten).toBeCloseTo(4000 * (1 - deel) * 153.32, 4);

    const eigen = scanJaar(regels('geldend'), { ...inv, vrijstelling: 'eigen', eigenVrijgesteldPct: 40 }, 2027);
    expect(eigen.kosten).toBeCloseTo(4000 * 0.6 * 153.32, 4);
  });

  it('maakt een reeks jaren per scheidingsscenario', () => {
    const inv = { ...co2StandaardInvoer, tonnage: 10000, emissiefactor: 0.4 };
    const r = scanReeks(regels('voorstel'), inv, 2026, 2035, { nuPct: 60, scenarioPct: 70 });
    expect(r).toHaveLength(10);
    expect(r[0].uitstoot).toBeCloseTo(7500 * 0.4);
    expect(r[9].correctiefactor).toBe(0);
    // Zonder vrijstelling in 2035: alles belast.
    expect(r[9].belastbaar).toBeCloseTo(r[9].uitstoot);
  });

  it('gebruikt een kental dat volgt uit de lijst van energiedragers 2026', () => {
    // 9,6 GJ/ton × 107,1 kg CO2/GJ × (1 − 0,63 biogeen) = 380,4 kg fossiel CO2 per ton
    expect(kentalEmissiefactor.waarde).toBe(0.38);
    expect(kentalEmissiefactor.waarde).toBeCloseTo((9.6 * 107.1 * 0.37) / 1000, 3);
  });

  it('vergelijkt geldend recht en voorstel eerlijk met de standaardinflatie', () => {
    // Standaard 2,6 % per jaar: beide paden komen in 2035 uit op hetzelfde reële niveau (MvT tabel 12: € 304 in prijspeil 2026).
    expect(co2StandaardInvoer.inflatiePct).toBe(2.6);
    const f = 1.026;
    const geldend = tariefInJaar(regels('geldend'), 2035, co2StandaardInvoer.inflatiePct) / f ** 9;
    const voorstel = tariefInJaar(regels('voorstel'), 2035, co2StandaardInvoer.inflatiePct) / f ** 9;
    expect(geldend).toBeCloseTo(303.55, 0);
    expect(Math.abs(voorstel / geldend - 1)).toBeLessThan(0.02);
    // Tarief 2027 geldend recht: (103,66 + 49,66) × 1,026; voorstel staat vast op 129,15.
    expect(tariefInJaar(regels('geldend'), 2027, 2.6)).toBeCloseTo((103.66 + 49.66) * 1.026, 8);
    expect(tariefInJaar(regels('voorstel'), 2027, 2.6)).toBe(129.15);
  });
});

describe('CO2-heffingenscan: deellink', () => {
  const grenzen = { paden: ['geldend', 'voorstel'], eersteJaar: 2026, laatsteJaar: 2035 };
  const standaard = co2StandaardInvoer as Co2PaginaInvoer;

  it('zet invoer heen en terug zonder verlies', () => {
    const inv: Co2PaginaInvoer = { ...standaard, tonnage: 12345.5, jaar: 2031, pad: 'voorstel', vrijstelling: 'eigen', eigenVrijgesteldPct: 33 };
    expect(co2InvoerUitParams(co2InvoerNaarParams(inv), standaard, grenzen)).toEqual(inv);
  });

  it('valt terug op de standaard bij ongeldige waarden', () => {
    const p = new URLSearchParams('ton=abc&jaar=2050&pad=onzin&vrij=x&verh=500&sch=120');
    const uit = co2InvoerUitParams(p, standaard, grenzen);
    expect(uit.tonnage).toBe(standaard.tonnage);
    expect(uit.jaar).toBe(standaard.jaar);
    expect(uit.pad).toBe(standaard.pad);
    expect(uit.vrijstelling).toBe(standaard.vrijstelling);
    expect(uit.uitstootVerhoudingPct).toBe(standaard.uitstootVerhoudingPct);
    expect(uit.scheidingNuPct).toBe(standaard.scheidingNuPct);
  });
});

describe('CO2-heffingenscan: ronde 3', () => {
  const grenzen = { paden: ['geldend', 'voorstel'], eersteJaar: 2026, laatsteJaar: 2035 };
  const standaard = co2StandaardInvoer as Co2PaginaInvoer;

  it('accepteert een uitstoot van 1 tot 300 % van het historisch niveau in de deellink', () => {
    const uit = (v: string) => co2InvoerUitParams(new URLSearchParams(`verh=${v}`), standaard, grenzen).uitstootVerhoudingPct;
    expect(uit('70')).toBe(70);
    expect(uit('250')).toBe(250);
    expect(uit('0')).toBe(standaard.uitstootVerhoudingPct);
    expect(uit('301')).toBe(standaard.uitstootVerhoudingPct);
  });

  it('benadert buiten de band van 15 % met het actuele niveau', () => {
    const f = { procesemissiefactor: 0.97, reductiefactor: 1.023, correctiefactor: 0.7 };
    expect(buitenBand(0.7)).toBe(true);
    expect(buitenBand(0.85)).toBe(false);
    expect(buitenBand(1.15)).toBe(false);
    expect(buitenBand(1.2)).toBe(true);
    expect(wettelijkVrijgesteldDeel(f, 0.7)).toBeCloseTo(wettelijkVrijgesteldDeel(f, 1), 12);
    expect(wettelijkVrijgesteldDeel(f, 0.9)).toBeCloseTo((0.97 * 1.023 * 0.7) / 0.9, 12);
  });

  it('weet wanneer het tarief een inflatieaanname bevat', () => {
    expect(inflatieInTarief(regels('geldend'), 2026, 2.6)).toBe(false); // vast in de wet
    expect(inflatieInTarief(regels('geldend'), 2027, 2.6)).toBe(true);
    expect(inflatieInTarief(regels('geldend'), 2027, 0)).toBe(false);
    expect(inflatieInTarief(regels('voorstel'), 2027, 2.6)).toBe(false); // € 129,15 staat in het voorstel
    expect(inflatieInTarief(regels('voorstel'), 2028, 2.6)).toBe(true);
  });

  it('geeft een onder- en bovengrens over beide tariefpaden en inflatie ± 1 procentpunt', () => {
    const inv = { ...standaard, tonnage: 10000, emissiefactor: 0.4, inflatiePct: 2.6 };
    const b = bandbreedte([regels('geldend'), regels('voorstel')], inv, 2030);
    expect(b.inflatie[0]).toBeCloseTo(1.6, 12);
    expect(b.inflatie[1]).toBeCloseTo(3.6, 12);
    const kandidaten = [regels('geldend'), regels('voorstel')].flatMap((r) => [1.6, 3.6].map((i) => scanJaar(r, { ...inv, inflatiePct: i }, 2030).kosten));
    expect(b.laag.kosten).toBeCloseTo(Math.min(...kandidaten), 6);
    expect(b.hoog.kosten).toBeCloseTo(Math.max(...kandidaten), 6);
    // De uitkomst met de eigen aannames ligt ertussen.
    for (const pad of ['geldend', 'voorstel'] as const) {
      const k = scanJaar(regels(pad), inv, 2030).kosten;
      expect(k).toBeGreaterThanOrEqual(b.laag.kosten);
      expect(k).toBeLessThanOrEqual(b.hoog.kosten);
    }
    // 2026 ligt vast: geen bandbreedte. Inflatie gaat niet onder 0 %.
    const vast = bandbreedte([regels('geldend'), regels('voorstel')], inv, 2026);
    expect(vast.hoog.kosten).toBeCloseTo(vast.laag.kosten, 6);
    expect(bandbreedte([regels('geldend')], { ...inv, inflatiePct: 0.5 }, 2028).inflatie[0]).toBe(0);
  });
});
