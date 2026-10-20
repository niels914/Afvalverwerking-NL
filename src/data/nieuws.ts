// Nieuws uit openbare RSS-feeds, opgehaald door scripts/nieuws.mjs (draait vóór elke build).
// Alleen titel, datum, bron, link en de korte inleiding uit de feed; nooit het volledige artikel.

import data from './nieuws.json';

export interface Nieuwsbericht {
  id: string;
  titel: string;
  /** Link naar het originele bericht. */
  link: string;
  /** Korte inleiding zoals de feed die geeft, hooguit 220 tekens. */
  inleiding: string;
  /** jjjj-mm-dd */
  datum: string;
  bron: string;
  bronId: string;
  thema: string;
}

export interface NieuwsBron {
  id: string;
  naam: string;
  site: string;
  feed: string;
  status: 'ok' | 'mislukt';
  laatstGelukt: string | null;
  aantal: number;
}

export const nieuws: Nieuwsbericht[] = data.berichten as Nieuwsbericht[];
export const nieuwsBronnen: NieuwsBron[] = data.bronnen as NieuwsBron[];
/** Datum waarop voor het laatst minstens één feed is gelukt. */
export const nieuwsBijgewerkt: string | null = data.bijgewerkt;

const VOLGORDE = ['Verbranding en heffingen', 'Verpakkingen en statiegeld', 'Circulaire economie', 'Textiel', 'Aanbesteden', 'Cijfers', 'Afval algemeen'];
/** Thema's die in de huidige berichten voorkomen, in vaste volgorde. */
const aanwezig = new Set(nieuws.map((n) => n.thema));
export const nieuwsThemas: string[] = [
  ...VOLGORDE.filter((t) => aanwezig.has(t)),
  ...[...aanwezig].filter((t) => !VOLGORDE.includes(t)),
];
/** Unieke bronnamen (Rijksoverheid, PIANOo, CBS). */
export const nieuwsBronNamen: string[] = [...new Set(nieuwsBronnen.map((b) => b.naam))];
