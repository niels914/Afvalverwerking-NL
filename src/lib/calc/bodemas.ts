// Bodemassencalculator.
// Formule: netto kosten = verbrand tonnage × aandeel bodemas × (verwerkingskosten − opbrengst metalen)
// Verwerkingskosten en metaalopbrengst zijn in € per ton bodemas.
// DUMMY: voorbeeldwaarden, indicatief en fictief.

export interface BodemasInvoer {
  /** Verbrand afval in ton per jaar. */
  tonnageVerbrand: number;
  /** Aandeel bodemas in procent van het verbrande tonnage (0–100). */
  aandeelBodemasPct: number;
  /** € per ton bodemas. */
  verwerkingskosten: number;
  /** Opbrengst teruggewonnen metalen, € per ton bodemas. */
  metaalopbrengst: number;
}

export interface BodemasUitkomst {
  bodemasTon: number;
  brutoKosten: number;
  opbrengst: number;
  nettoKosten: number;
  /** Netto kosten per ton verbrand afval. */
  perTonVerbrand: number;
}

export function bodemas(i: BodemasInvoer): BodemasUitkomst {
  const bodemasTon = (i.tonnageVerbrand * i.aandeelBodemasPct) / 100;
  const brutoKosten = bodemasTon * i.verwerkingskosten;
  const opbrengst = bodemasTon * i.metaalopbrengst;
  const nettoKosten = brutoKosten - opbrengst;
  return { bodemasTon, brutoKosten, opbrengst, nettoKosten, perTonVerbrand: i.tonnageVerbrand > 0 ? nettoKosten / i.tonnageVerbrand : 0 };
}

export interface Installatie extends BodemasInvoer {
  id: string;
  naam: string;
}

/** Netto kosten voor meerdere installaties plus het totaal. */
export function bodemasInstallaties(installaties: Installatie[]) {
  const regels = installaties.map((inst) => ({ id: inst.id, naam: inst.naam, ...bodemas(inst) }));
  const totaal = regels.reduce(
    (s, r) => ({
      bodemasTon: s.bodemasTon + r.bodemasTon,
      brutoKosten: s.brutoKosten + r.brutoKosten,
      opbrengst: s.opbrengst + r.opbrengst,
      nettoKosten: s.nettoKosten + r.nettoKosten,
    }),
    { bodemasTon: 0, brutoKosten: 0, opbrengst: 0, nettoKosten: 0 },
  );
  return { regels, totaal };
}

export type BodemasParameter = keyof BodemasInvoer;

export interface Gevoeligheid {
  parameter: BodemasParameter;
  laag: number;
  hoog: number;
  /** Verschil hoog − laag in netto kosten. */
  bandbreedte: number;
}

/**
 * Gevoeligheidsanalyse: elke parameter apart −/+ variatie (standaard 20 %), de rest gelijk.
 * Gesorteerd van grootste naar kleinste invloed.
 */
export function gevoeligheid(i: BodemasInvoer, variatie = 0.2): Gevoeligheid[] {
  const parameters: BodemasParameter[] = ['tonnageVerbrand', 'aandeelBodemasPct', 'verwerkingskosten', 'metaalopbrengst'];
  return parameters
    .map((p) => {
      const laag = bodemas({ ...i, [p]: i[p] * (1 - variatie) }).nettoKosten;
      const hoog = bodemas({ ...i, [p]: i[p] * (1 + variatie) }).nettoKosten;
      return { parameter: p, laag, hoog, bandbreedte: hoog - laag };
    })
    .sort((a, b) => Math.abs(b.bandbreedte) - Math.abs(a.bandbreedte));
}
