import data from './indexreeksen.json';
import type { IndexInvoer, Periodesoort } from '../lib/calc/indexering';

// ECHTE CBS-REEKSEN. Bron: CBS StatLine Open Data (opendata.cbs.nl), licentie CC BY 4.0.
// Bijwerken: NODE_USE_ENV_PROXY=1 node scripts/cbs-indexreeksen.mjs  (schrijft indexreeksen.json opnieuw).
// Welke reeksen en waarom: docs/stukken/tools-a.md.

export interface CbsReeks {
  id: string;
  naam: string;
  kort: string;
  /** Waarvoor contracten deze reeks meestal gebruiken. */
  gebruik: string;
  tabelId: string;
  tabelTitel: string;
  /** Gekozen dimensies, met de titel zoals CBS die geeft. */
  dimensies: Record<string, string>;
  onderwerp: string;
  eenheid: string;
  basisjaar: string;
  /** Laatste wijziging van de tabel bij CBS (ISO-datum en tijd). */
  tabelGewijzigd: string;
  /** Dag waarop deze reeks is opgehaald (ISO). */
  peildatum: string;
  bronUrl: string;
  apiUrl: string;
  eersteMaand: string;
  laatsteMaand: string;
  laatsteJaar: number | null;
  /** Perioden die CBS als voorlopig markeert. */
  voorlopig: string[];
  maanden: Record<string, number>;
  jaren: Record<string, number>;
}

export interface Indexbron {
  /** Dag waarop de reeksen zijn opgehaald (ISO). */
  peildatum: string;
  bron: string;
  licentie: string;
  script: string;
  reeksen: CbsReeks[];
}

export const indexbron = data as unknown as Indexbron;
export const indexreeksen: CbsReeks[] = indexbron.reeksen;

export function reeksMetId(id: string): CbsReeks | undefined {
  return indexreeksen.find((r) => r.id === id);
}

/** Is de waarde in deze periode door CBS als voorlopig gemarkeerd? */
export function isVoorlopig(reeks: CbsReeks, periode: string): boolean {
  return reeks.voorlopig.includes(periode);
}

/**
 * VOORBEELDWEGING (geen norm): loon 50 %, prijzen 30 %, energie 20 %.
 * Neem in de tool de weging uit uw eigen contract over.
 */
export const voorbeeldWegingPct: Record<string, number> = Object.fromEntries(
  indexreeksen.map((r) => [r.id, r.id === 'cao-afval' ? 50 : r.id === 'cpi' ? 30 : r.id === 'ppi-energie' ? 20 : 0]),
);

function laatsteJaarcijfer(): number {
  const cpi = reeksMetId('cpi');
  return cpi?.laatsteJaar ?? new Date().getFullYear() - 1;
}

/** Standaardinvoer van de Indexcalculator. Basistarief is een voorbeeldwaarde. */
export const indexStandaardInvoer: IndexInvoer = {
  soort: 'jaar' as Periodesoort,
  basistarief: 100,
  reeks: 'cpi',
  basisperiode: '2021',
  peilperiode: String(laatsteJaarcijfer()),
  wegingPct: voorbeeldWegingPct,
  vastPct: 0,
  eersteJaar: 2022,
  laatsteJaar: laatsteJaarcijfer() + 1,
  verschuiving: 1,
  peilmaand: 9,
  plafondPct: null,
  geenDaling: false,
  vergelijk: null,
  // Standaard: indexcijfers en factor zoals berekend, tarief op hele centen. De gebruiker kiest de afronding uit het contract.
  afronding: { indexDecimalen: null, factorDecimalen: null, tariefCenten: true },
};
