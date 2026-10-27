import { describe, expect, it } from 'vitest';
import { euroRond, kostBand, kostRond, rond } from './opmaak';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('afgeronde bedragen', () => {
  it('rondt af naar grootte', () => {
    expect(rond(1_234_567)).toBe(1_235_000);
    expect(rond(206_700)).toBe(207_000);
    expect(rond(4_321)).toBe(4_300);
    expect(rond(987)).toBe(990);
    expect(rond(-13_335)).toBe(-13_000);
  });

  it('schrijft miljoenen als mln', () => {
    expect(nbsp(euroRond(1_516_812))).toBe('€ 1,52 mln');
    expect(nbsp(euroRond(12_345_678))).toBe('€ 12,3 mln');
    expect(nbsp(euroRond(206_700))).toBe('€ 207.000');
  });

  it('zegt kosten of opbrengst in woorden', () => {
    expect(nbsp(kostRond(-13_335))).toBe('€ 13.000 opbrengst');
    expect(nbsp(kostRond(1_851_000))).toBe('€ 1,85 mln kosten');
    expect(kostRond(2)).toBe('€ 0');
  });

  it('beschrijft een bandbreedte die door nul gaat', () => {
    expect(nbsp(kostBand(1_516_812, -206_700))).toBe('€ 207.000 opbrengst tot € 1,52 mln kosten');
    expect(nbsp(kostBand(1_530_000, 3_090_000))).toBe('€ 1,53 mln tot € 3,09 mln kosten');
    expect(nbsp(kostBand(-30_000, -10_000))).toBe('€ 10.000 tot € 30.000 opbrengst');
  });
});
