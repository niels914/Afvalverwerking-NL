import { describe, expect, it } from 'vitest';
import { archiefZoekPad, leesStand } from './authOpen';

describe('openbare stand van het archief', () => {
  it('leest de rij uit de database, ook met getallen als tekst', () => {
    expect(
      leesStand([{ totaal: '1435', open: 39, oudste: '2013-03-28', laatste_verversing: '2026-10-27T18:17:01.391+00:00' }]),
    ).toEqual({ totaal: 1435, open: 39, oudste: '2013-03-28', laatsteVerversing: '2026-10-27T18:17:01.391+00:00' });
  });

  it('geeft null bij lege of onbruikbare antwoorden, zodat de pagina geen verzonnen getal toont', () => {
    expect(leesStand([])).toBeNull();
    expect(leesStand(null)).toBeNull();
    expect(leesStand([{ totaal: 'x', open: 1, oudste: null, laatste_verversing: null }])).toBeNull();
  });
});

describe('zoeken vanaf de inlogpagina', () => {
  it('stuurt door naar het archief met de zoekterm', () => {
    expect(archiefZoekPad('  textiel ')).toBe('/aanbestedingsarchief?zoek=textiel');
    expect(archiefZoekPad('gft & groen')).toBe('/aanbestedingsarchief?zoek=gft+%26+groen');
  });

  it('zonder zoekterm naar alle open aanbestedingen', () => {
    expect(archiefZoekPad('   ')).toBe('/aanbestedingsarchief');
  });

  it('kort een te lange zoekterm in tot 200 tekens', () => {
    expect(archiefZoekPad('a'.repeat(300))).toBe(`/aanbestedingsarchief?zoek=${'a'.repeat(200)}`);
  });
});
