import { describe, expect, it } from 'vitest';
import { csvGetal, deelUrl, naarCsv, veiligeBestandsnaam } from './export';

describe('export', () => {
  it('schrijft getallen met decimale komma en zonder duizendtallen', () => {
    expect(csvGetal(1234.5)).toBe('1234,5');
    expect(csvGetal(0.1 + 0.2)).toBe('0,3');
    expect(csvGetal(NaN)).toBe('');
  });

  it('maakt CSV met puntkomma en quotes waar nodig', () => {
    const csv = naarCsv([
      ['Naam', 'Waarde'],
      ['Tarief; per ton', 103.66],
      ['Tekst met "quote"', null],
    ]);
    expect(csv).toBe('Naam;Waarde\r\n"Tarief; per ton";103,66\r\n"Tekst met ""quote""";');
  });

  it('maakt veilige bestandsnamen', () => {
    expect(veiligeBestandsnaam('CO2-heffingenscan Pro')).toBe('co2-heffingenscan-pro');
    expect(veiligeBestandsnaam('Één ±')).toBe('een');
    expect(veiligeBestandsnaam('***')).toBe('export');
  });

  it('bouwt een deellink', () => {
    expect(deelUrl('https://x.nl', '/tools/a', new URLSearchParams('b=1&c=2'))).toBe('https://x.nl/tools/a?b=1&c=2');
    expect(deelUrl('https://x.nl', '/tools/a', new URLSearchParams())).toBe('https://x.nl/tools/a');
  });
});
