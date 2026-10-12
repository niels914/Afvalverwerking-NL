import { describe, expect, it } from 'vitest';
import { euro, leesGetal, procent } from './format';

// Intl gebruikt een harde spatie (U+00A0) tussen € en bedrag.
const normaal = (s: string) => s.replace(/ /g, ' ');

describe('Nederlandse notatie', () => {
  it('formatteert euro’s', () => {
    expect(normaal(euro(1234.56, 2))).toBe('€ 1.234,56');
  });
  it('formatteert procenten met spatie', () => {
    expect(normaal(procent(12.5))).toBe('12,5 %');
  });
  it('leest komma en punt', () => {
    expect(leesGetal('1.234,5')).toBe(1234.5);
    expect(leesGetal('12,5')).toBe(12.5);
    expect(leesGetal('12.5')).toBe(12.5);
    expect(Number.isNaN(leesGetal('abc'))).toBe(true);
  });
});
