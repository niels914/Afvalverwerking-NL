import { describe, expect, it } from 'vitest';
import { bodemas, bodemasInstallaties, gevoeligheid } from './bodemas';

const basis = { tonnageVerbrand: 100000, aandeelBodemasPct: 20, verwerkingskosten: 35, metaalopbrengst: 15 };

describe('bodemassencalculator', () => {
  it('berekent netto kosten: tonnage × aandeel × (kosten − opbrengst)', () => {
    // 100.000 × 20 % = 20.000 t bodemas × (35 − 15) = € 400.000
    const u = bodemas(basis);
    expect(u.bodemasTon).toBe(20000);
    expect(u.nettoKosten).toBe(400000);
    expect(u.perTonVerbrand).toBe(4);
  });

  it('geeft een negatieve uitkomst (opbrengst) als metalen meer opleveren dan de verwerking kost', () => {
    expect(bodemas({ ...basis, metaalopbrengst: 40 }).nettoKosten).toBe(-100000);
  });

  it('telt meerdere installaties op', () => {
    const { totaal, regels } = bodemasInstallaties([
      { id: 'a', naam: 'A', ...basis },
      { id: 'b', naam: 'B', ...basis, tonnageVerbrand: 50000 },
    ]);
    expect(regels).toHaveLength(2);
    expect(totaal.nettoKosten).toBe(600000);
  });

  it('sorteert de gevoeligheidsanalyse op invloed', () => {
    const g = gevoeligheid(basis, 0.2);
    expect(g).toHaveLength(4);
    // verwerkingskosten ±20 %: 20.000 t × € 35 × 0,4 = € 280.000 bandbreedte (grootste invloed)
    expect(g[0].parameter).toBe('verwerkingskosten');
    expect(g[0].bandbreedte).toBeCloseTo(280000);
    // tonnage werkt op het nettobedrag: € 400.000 × 0,4 = € 160.000
    expect(g.find((x) => x.parameter === 'tonnageVerbrand')!.bandbreedte).toBeCloseTo(160000);
    // hogere metaalopbrengst verlaagt de kosten: negatieve bandbreedte
    expect(g[g.length - 1].parameter).toBe('metaalopbrengst');
    expect(g[g.length - 1].bandbreedte).toBeCloseTo(-120000);
  });
});
