// Afgeronde bedragen voor uitkomsten die op kentallen rusten: geen schijnnauwkeurigheid.
// Getallen gaan via src/lib/format.ts (nl-NL).

import { euro, getal } from '../../../lib/format';

/** Rondt af op een maat die past bij de grootte: tientallen, honderdtallen of duizendtallen. */
export function rond(n: number): number {
  const a = Math.abs(n);
  const stap = a >= 10_000 ? 1000 : a >= 1000 ? 100 : 10;
  return Math.round(n / stap) * stap || 0;
}

/** Bedrag afgerond, met "mln" vanaf een miljoen: "€ 1,85 mln", "€ 207.000", "€ 4.300". */
export function euroRond(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${n < 0 ? '−' : ''}€ ${getal(a / 1_000_000, a >= 10_000_000 ? 1 : 2)} mln`;
  return euro(rond(n));
}

/** Kosten of opbrengst in woorden, afgerond: "€ 1,52 mln kosten" of "€ 207.000 opbrengst". */
export function kostRond(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const r = Math.abs(n) >= 1_000_000 ? n : rond(n);
  if (r === 0) return '€ 0';
  return r < 0 ? `${euroRond(-r)} opbrengst` : `${euroRond(r)} kosten`;
}

/** Bandbreedte van kosten in woorden: "€ 1,53 mln tot € 3,09 mln kosten" of "€ 207.000 opbrengst tot € 1,52 mln kosten". */
export function kostBand(laag: number, hoog: number): string {
  const [a, b] = laag <= hoog ? [laag, hoog] : [hoog, laag];
  if (a >= 0) return `${euroRond(a)} tot ${euroRond(b)} kosten`;
  if (b <= 0) return `${euroRond(-b)} tot ${euroRond(-a)} opbrengst`;
  return `${euroRond(-a)} opbrengst tot ${euroRond(b)} kosten`;
}
