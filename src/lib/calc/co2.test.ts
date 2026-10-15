import { describe, expect, it } from 'vitest';
import {
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
import { co2StandaardInvoer, kentalEmissiefactor, procesemissiefactor, reductiefactor, tariefpaden } from '../../data/co2-tarieven';

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
    // 2028: (156,3864 + 50,42) × 1,02
    expect(tariefInJaar(tariefpaden.geldend, 2028, 2)).toBeCloseTo((156.3864 + 50.42) * 1.02, 4);
  });

  it('volgt het wetsvoorstel Belastingplan 2027 tot en met 2035', () => {
    expect(tariefInJaar(tariefpaden.voorstel, 2026)).toBeCloseTo(103.66, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2027)).toBeCloseTo(129.15, 2);
    // In 2027 geen inflatiecorrectie (art. LX): het vaste tarief blijft staan.
    expect(tariefInJaar(tariefpaden.voorstel, 2027, 3)).toBeCloseTo(129.15, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2028)).toBeCloseTo(151.94, 2);
    expect(tariefInJaar(tariefpaden.voorstel, 2035)).toBeCloseTo(328.01, 2);
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

  it('gebruikt een kental dat volgt uit de NIR-standaardwaarden', () => {
    expect(kentalEmissiefactor.waarde).toBeCloseTo((9.4 * 107.4 * 0.36) / 1000, 3);
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
    const p = new URLSearchParams('ton=abc&jaar=2050&pad=onzin&vrij=x&verh=50&sch=120');
    const uit = co2InvoerUitParams(p, standaard, grenzen);
    expect(uit.tonnage).toBe(standaard.tonnage);
    expect(uit.jaar).toBe(standaard.jaar);
    expect(uit.pad).toBe(standaard.pad);
    expect(uit.vrijstelling).toBe(standaard.vrijstelling);
    expect(uit.uitstootVerhoudingPct).toBe(standaard.uitstootVerhoudingPct);
    expect(uit.scheidingNuPct).toBe(standaard.scheidingNuPct);
  });
});
