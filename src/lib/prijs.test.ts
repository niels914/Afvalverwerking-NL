import { describe, expect, it } from 'vitest';
import { staffels, voorwaarden } from '../data/lidmaatschap';
import {
  bepaalStaffel,
  berekenAanmelding,
  controleerStartdatum,
  eersteVanVolgendeMaand,
  isIsoDatum,
  laatsteStartdatum,
  looptijdVan,
  maakOrdernummer,
  metBtw,
  offerteGeldigTot,
  plusDagen,
  plusMaanden,
  prijsVoorStaffel,
  rondCenten,
  startdatumOpties,
  vandaagIso,
} from './prijs';

describe('bepaalStaffel', () => {
  it('kiest gemeente en verwerker direct', () => {
    expect(bepaalStaffel('gemeente')).toBe('gemeente');
    expect(bepaalStaffel('verwerker')).toBe('verwerker');
    expect(bepaalStaffel('verwerker', 12)).toBe('verwerker');
  });

  it('samenwerkingsverband van 2 of 3 gemeenten is klein', () => {
    expect(bepaalStaffel('samenwerkingsverband', 2)).toBe('samenwerkingsverband-klein');
    expect(bepaalStaffel('samenwerkingsverband', 3)).toBe('samenwerkingsverband-klein');
  });

  it('samenwerkingsverband vanaf 4 gemeenten is groot', () => {
    expect(bepaalStaffel('samenwerkingsverband', 4)).toBe('samenwerkingsverband-groot');
    expect(bepaalStaffel('samenwerkingsverband', 25)).toBe('samenwerkingsverband-groot');
  });

  it('geeft null bij een ongeldig aantal gemeenten', () => {
    expect(bepaalStaffel('samenwerkingsverband')).toBeNull();
    expect(bepaalStaffel('samenwerkingsverband', 1)).toBeNull();
    expect(bepaalStaffel('samenwerkingsverband', 0)).toBeNull();
    expect(bepaalStaffel('samenwerkingsverband', 2.5)).toBeNull();
    expect(bepaalStaffel('samenwerkingsverband', Number.NaN)).toBeNull();
  });

  it('accepteert hooguit alle 342 gemeenten van Nederland (CBS, 1 januari 2026)', () => {
    expect(bepaalStaffel('samenwerkingsverband', 342)).toBe('samenwerkingsverband-groot');
    expect(bepaalStaffel('samenwerkingsverband', 343)).toBeNull();
    expect(bepaalStaffel('samenwerkingsverband', 500)).toBeNull();
  });
});

describe('btw', () => {
  it('rekent 21 % btw over de jaarprijs', () => {
    expect(metBtw(2500)).toEqual({ exclBtw: 2500, btw: 525, inclBtw: 3025, btwPercentage: 21 });
    expect(metBtw(8500)).toEqual({ exclBtw: 8500, btw: 1785, inclBtw: 10285, btwPercentage: 21 });
  });

  it('rondt af op centen', () => {
    expect(metBtw(99.99).btw).toBe(21);
    expect(metBtw(0.05).btw).toBe(0.01);
    expect(rondCenten(1.005)).toBe(1.01);
  });

  it('accepteert een ander percentage', () => {
    expect(metBtw(1000, 9).inclBtw).toBe(1090);
  });

  it('weigert negatieve en ongeldige bedragen', () => {
    expect(() => metBtw(-1)).toThrow();
    expect(() => metBtw(Number.NaN)).toThrow();
  });

  it('elke staffel heeft een positieve prijs en een kloppend totaal', () => {
    for (const s of staffels) {
      const p = prijsVoorStaffel(s.id);
      expect(p.exclBtw).toBeGreaterThan(0);
      expect(rondCenten(p.exclBtw + p.btw)).toBe(p.inclBtw);
    }
  });
});

describe('datums', () => {
  it('herkent geldige en ongeldige datums', () => {
    expect(isIsoDatum('2027-02-28')).toBe(true);
    expect(isIsoDatum('2028-02-29')).toBe(true);
    expect(isIsoDatum('2027-02-29')).toBe(false);
    expect(isIsoDatum('2027-13-01')).toBe(false);
    expect(isIsoDatum('1-1-2027')).toBe(false);
    expect(isIsoDatum('')).toBe(false);
  });

  it('telt dagen en maanden op over jaar- en maandgrenzen', () => {
    expect(plusDagen('2026-12-31', 1)).toBe('2027-01-01');
    expect(plusDagen('2027-01-01', -1)).toBe('2026-12-31');
    expect(plusMaanden('2026-11-15', 2)).toBe('2027-01-15');
    expect(plusMaanden('2027-01-31', 1)).toBe('2027-02-28');
    expect(plusMaanden('2028-01-31', 1)).toBe('2028-02-29');
    expect(plusMaanden('2027-03-31', -1)).toBe('2027-02-28');
  });

  it('eerste dag van de volgende maand', () => {
    expect(eersteVanVolgendeMaand('2026-10-15')).toBe('2026-11-01');
    expect(eersteVanVolgendeMaand('2026-12-31')).toBe('2027-01-01');
  });

  it('vandaagIso gebruikt de lokale kalenderdag', () => {
    expect(vandaagIso(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
  });
});

describe('looptijd', () => {
  it('jaarabonnement vanaf 1 januari', () => {
    expect(looptijdVan('2027-01-01')).toEqual({
      startdatum: '2027-01-01',
      einddatum: '2027-12-31',
      opzeggenUiterlijk: '2027-11-30',
      verlengdTot: '2028-12-31',
      factuurdatum: '2027-01-01',
      vervaldatum: '2027-01-31',
    });
  });

  it('start halverwege de maand', () => {
    const l = looptijdVan('2026-11-15');
    expect(l.einddatum).toBe('2027-11-14');
    expect(l.opzeggenUiterlijk).toBe('2027-10-14');
    expect(l.verlengdTot).toBe('2028-11-14');
    expect(l.vervaldatum).toBe('2026-12-15');
  });

  it('volgt de voorwaarden uit het databestand', () => {
    const anders = { ...voorwaarden, looptijdMaanden: 24, opzegtermijnMaanden: 3, betaaltermijnDagen: 14 };
    const l = looptijdVan('2027-01-01', anders);
    expect(l.einddatum).toBe('2028-12-31');
    expect(l.opzeggenUiterlijk).toBe('2028-09-30');
    expect(l.vervaldatum).toBe('2027-01-15');
  });
});

describe('controleerStartdatum', () => {
  const vandaag = '2026-10-15';
  it('accepteert vandaag en de uiterste datum', () => {
    expect(controleerStartdatum('2026-10-15', vandaag)).toBeNull();
    expect(laatsteStartdatum(vandaag)).toBe('2027-04-15');
    expect(controleerStartdatum('2027-04-15', vandaag)).toBeNull();
  });
  it('weigert leeg, ongeldig, verleden en te ver vooruit', () => {
    expect(controleerStartdatum('', vandaag)).toMatch(/Kies/);
    expect(controleerStartdatum('2026-02-30', vandaag)).toMatch(/geldige/);
    expect(controleerStartdatum('2026-10-14', vandaag)).toMatch(/verleden/);
    expect(controleerStartdatum('2027-04-16', vandaag)).toMatch(/6 maanden/);
  });
});

describe('startdatumOpties', () => {
  it('geeft de eerste van elke maand tot de uiterste startdatum', () => {
    expect(startdatumOpties('2026-10-27')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01']);
  });
  it('zet vandaag vooraan als vandaag de eerste van de maand is, en neemt de uiterste datum mee', () => {
    const opties = startdatumOpties('2026-11-01');
    expect(opties[0]).toBe('2026-11-01');
    expect(opties[opties.length - 1]).toBe('2027-05-01');
    expect(opties).toHaveLength(7);
  });
  it('elke optie is een geldige startdatum', () => {
    for (const d of startdatumOpties('2026-12-31')) expect(controleerStartdatum(d, '2026-12-31')).toBeNull();
  });
});

describe('berekenAanmelding', () => {
  it('combineert staffel, prijs en looptijd', () => {
    const b = berekenAanmelding({ type: 'samenwerkingsverband', aantalGemeenten: 3, startdatum: '2027-01-01' });
    expect(b?.staffel.id).toBe('samenwerkingsverband-klein');
    expect(b?.exclBtw).toBe(2500);
    expect(b?.inclBtw).toBe(3025);
    expect(b?.einddatum).toBe('2027-12-31');
  });
  it('geeft null zolang gegevens ontbreken', () => {
    expect(berekenAanmelding({ type: '', startdatum: '2027-01-01' })).toBeNull();
    expect(berekenAanmelding({ type: 'samenwerkingsverband', startdatum: '2027-01-01' })).toBeNull();
    expect(berekenAanmelding({ type: 'gemeente', startdatum: '' })).toBeNull();
  });
});

describe('maakOrdernummer', () => {
  it('maakt een leesbaar nummer met datum', () => {
    expect(maakOrdernummer('2026-10-15', 'k7q3x')).toBe('LID-20261015-K7Q3X');
    expect(maakOrdernummer('2026-10-15', 'a-b')).toBe('LID-20261015-AB000');
  });
  it('een offerteaanvraag krijgt het voorvoegsel OFF', () => {
    expect(maakOrdernummer('2026-10-15', 'k7q3x', 'offerte')).toBe('OFF-20261015-K7Q3X');
  });
});

describe('offerteGeldigTot', () => {
  it('telt de geldigheid in dagen op, over de maandgrens', () => {
    expect(offerteGeldigTot('2026-10-15')).toBe('2026-11-14');
    expect(offerteGeldigTot('2026-12-15')).toBe('2027-01-14');
  });
});
