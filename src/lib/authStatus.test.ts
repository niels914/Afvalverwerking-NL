import { describe, expect, it } from 'vitest';
import { beschrijfLidmaatschap, dagenTot, vandaagIso, type Lidmaatschap } from './authStatus';

const basis: Lidmaatschap = {
  organisatie: 'Voorbeeldverband',
  organisatietype: 'samenwerkingsverband-groot',
  status: 'actief',
  effectieve_status: 'actief',
  geldig_tot: null,
  domein: 'voorbeeld.nl',
  is_lid: true,
};

describe('dagenTot en vandaagIso', () => {
  it('telt dagen over maandgrenzen heen', () => {
    expect(dagenTot('2026-11-01', '2026-10-15')).toBe(17);
    expect(dagenTot('2026-10-14', '2026-10-15')).toBe(-1);
  });
  it('geeft jjjj-mm-dd', () => {
    expect(vandaagIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('beschrijfLidmaatschap', () => {
  it('zonder organisatie: geen lidmaatschap, met het domein in de uitleg', () => {
    const b = beschrijfLidmaatschap(null, 'gmail.com', '2026-10-15');
    expect(b.label).toBe('Geen lidmaatschap');
    expect(b.uitleg).toContain('gmail.com');
  });
  it('actief zonder einddatum: doorlopend', () => {
    const b = beschrijfLidmaatschap(basis, 'voorbeeld.nl', '2026-10-15');
    expect(b.soort).toBe('actief');
    expect(b.geldigTot).toMatch(/Doorlopend/);
  });
  it('actief met einddatum ver weg', () => {
    const b = beschrijfLidmaatschap({ ...basis, geldig_tot: '2027-12-31' }, 'voorbeeld.nl', '2026-10-15');
    expect(b.label).toBe('Actief');
    expect(b.geldigTot).toBe('31 december 2027');
  });
  it('waarschuwt in de laatste 30 dagen', () => {
    const b = beschrijfLidmaatschap({ ...basis, geldig_tot: '2026-10-25' }, 'voorbeeld.nl', '2026-10-15');
    expect(b.soort).toBe('let-op');
    expect(b.label).toBe('Actief, loopt over 10 dagen af');
    expect(beschrijfLidmaatschap({ ...basis, geldig_tot: '2026-10-15' }, '', '2026-10-15').label).toMatch(/vandaag/);
  });
  it('verlopen: legt uit dat het account blijft bestaan', () => {
    const b = beschrijfLidmaatschap({ ...basis, effectieve_status: 'verlopen', geldig_tot: '2026-09-30', is_lid: false }, 'voorbeeld.nl', '2026-10-15');
    expect(b.label).toBe('Verlopen');
    expect(b.uitleg).toMatch(/30 september 2026/);
    expect(b.uitleg).toMatch(/account blijft bestaan/);
  });
  it('aangevraagd en opgezegd', () => {
    expect(beschrijfLidmaatschap({ ...basis, status: 'aangevraagd', effectieve_status: 'aangevraagd', is_lid: false }, '', '2026-10-15').label).toMatch(/Aangevraagd/);
    expect(beschrijfLidmaatschap({ ...basis, status: 'opgezegd', effectieve_status: 'opgezegd', is_lid: false }, '', '2026-10-15').label).toBe('Opgezegd');
  });
});
