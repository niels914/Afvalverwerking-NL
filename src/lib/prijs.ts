// Prijs- en looptijdberekening voor het lidmaatschap. Pure functies, zonder React of browser.
//
// Formules:
//   staffel   = gemeente | verwerker | samenwerkingsverband klein (2–3 gemeenten) | groot (4 of meer)
//   btw       = afronden op centen(prijs excl. btw × btw-percentage / 100)
//   incl. btw = prijs excl. btw + btw
//   einddatum = startdatum + looptijd (maanden) − 1 dag
//   opzeggen uiterlijk = einddatum − opzegtermijn (maanden)
//   vervaldatum factuur = factuurdatum (= startdatum) + betaaltermijn (dagen)
//
// Datums zijn ISO-teksten (jjjj-mm-dd) en worden in UTC gerekend, zodat zomertijd geen dag kan verschuiven.
// Prijzen en voorwaarden komen uit src/data/lidmaatschap.ts.

import {
  btwPercentage as standaardBtw,
  grensGrootSamenwerkingsverband,
  staffelVan,
  voorwaarden as standaardVoorwaarden,
  type Organisatietype,
  type Staffel,
  type StaffelId,
} from '../data/lidmaatschap';

/** Minimaal aantal gemeenten in een samenwerkingsverband. */
export const minimumGemeentenSamenwerkingsverband = 2;

/**
 * Staffel bij een organisatietype. Voor een samenwerkingsverband telt het aantal deelnemende gemeenten.
 * Geeft null als de staffel niet te bepalen is (samenwerkingsverband zonder geldig aantal gemeenten).
 */
export function bepaalStaffel(type: Organisatietype, aantalGemeenten?: number): StaffelId | null {
  if (type === 'gemeente') return 'gemeente';
  if (type === 'verwerker') return 'verwerker';
  if (aantalGemeenten === undefined || !Number.isInteger(aantalGemeenten) || aantalGemeenten < minimumGemeentenSamenwerkingsverband) {
    return null;
  }
  return aantalGemeenten >= grensGrootSamenwerkingsverband ? 'samenwerkingsverband-groot' : 'samenwerkingsverband-klein';
}

/** Rondt af op hele centen (half naar boven). */
export function rondCenten(bedrag: number): number {
  return Math.round((bedrag + Number.EPSILON) * 100) / 100;
}

export interface Prijs {
  exclBtw: number;
  btw: number;
  inclBtw: number;
  btwPercentage: number;
}

/** Prijs inclusief btw bij een bedrag exclusief btw. */
export function metBtw(exclBtw: number, btwPercentage = standaardBtw): Prijs {
  if (!Number.isFinite(exclBtw) || exclBtw < 0) throw new Error('Bedrag moet 0 of hoger zijn.');
  const btw = rondCenten((exclBtw * btwPercentage) / 100);
  return { exclBtw: rondCenten(exclBtw), btw, inclBtw: rondCenten(exclBtw + btw), btwPercentage };
}

/** Jaarprijs voor een staffel. */
export function prijsVoorStaffel(id: StaffelId, btwPercentage = standaardBtw): Prijs {
  return metBtw(staffelVan(id).prijsExclBtw, btwPercentage);
}

/* ---------- Datums ---------- */

const isoPatroon = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Is dit een bestaande kalenderdatum in de vorm jjjj-mm-dd? */
export function isIsoDatum(iso: string): boolean {
  const m = isoPatroon.exec(iso);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function leesIso(iso: string): Date {
  if (!isIsoDatum(iso)) throw new Error(`Geen geldige datum: ${iso}`);
  const [j, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, d));
}

function naarIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Telt dagen op (of af bij een negatief getal). */
export function plusDagen(iso: string, dagen: number): string {
  const d = leesIso(iso);
  d.setUTCDate(d.getUTCDate() + dagen);
  return naarIso(d);
}

/** Telt maanden op. Bestaat de dag niet in de doelmaand (31 januari + 1 maand), dan wordt het de laatste dag. */
export function plusMaanden(iso: string, maanden: number): string {
  const d = leesIso(iso);
  const doel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + maanden, 1));
  const laatsteDag = new Date(Date.UTC(doel.getUTCFullYear(), doel.getUTCMonth() + 1, 0)).getUTCDate();
  doel.setUTCDate(Math.min(d.getUTCDate(), laatsteDag));
  return naarIso(doel);
}

/** Eerste dag van de maand na de gegeven datum. Standaard startdatum in het aanmeldformulier. */
export function eersteVanVolgendeMaand(iso: string): string {
  const d = leesIso(iso);
  return naarIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
}

/** Datum van vandaag in de tijdzone van de browser, als jjjj-mm-dd. */
export function vandaagIso(nu: Date = new Date()): string {
  const j = nu.getFullYear();
  const m = String(nu.getMonth() + 1).padStart(2, '0');
  const d = String(nu.getDate()).padStart(2, '0');
  return `${j}-${m}-${d}`;
}

export type Voorwaarden = typeof standaardVoorwaarden;

export interface Looptijd {
  startdatum: string;
  /** Laatste dag van het eerste contractjaar. */
  einddatum: string;
  /** Laatste dag waarop opzeggen per de einddatum kan. */
  opzeggenUiterlijk: string;
  /** Einddatum na de eerste stilzwijgende verlenging. */
  verlengdTot: string;
  /** De eerste factuur wordt op de startdatum gedateerd. */
  factuurdatum: string;
  /** Uiterste betaaldatum van de eerste factuur. */
  vervaldatum: string;
}

export function looptijdVan(startdatum: string, v: Voorwaarden = standaardVoorwaarden): Looptijd {
  const einddatum = plusDagen(plusMaanden(startdatum, v.looptijdMaanden), -1);
  return {
    startdatum,
    einddatum,
    opzeggenUiterlijk: plusMaanden(einddatum, -v.opzegtermijnMaanden),
    verlengdTot: plusDagen(plusMaanden(startdatum, v.looptijdMaanden + v.verlengingMaanden), -1),
    factuurdatum: startdatum,
    vervaldatum: plusDagen(startdatum, v.betaaltermijnDagen),
  };
}

/** Uiterste startdatum die je vandaag kunt kiezen. */
export function laatsteStartdatum(vandaag: string, v: Voorwaarden = standaardVoorwaarden): string {
  return plusMaanden(vandaag, v.maxStartVooruitMaanden);
}

/** Controleert de gewenste startdatum. Geeft een foutmelding of null. */
export function controleerStartdatum(startdatum: string, vandaag: string, v: Voorwaarden = standaardVoorwaarden): string | null {
  if (!startdatum) return 'Kies een startdatum.';
  if (!isIsoDatum(startdatum)) return 'Vul een geldige datum in.';
  if (startdatum < vandaag) return 'De startdatum kan niet in het verleden liggen.';
  if (startdatum > laatsteStartdatum(vandaag, v)) {
    return `De startdatum mag maximaal ${v.maxStartVooruitMaanden} maanden vooruit liggen.`;
  }
  return null;
}

/* ---------- Alles samen ---------- */

export interface Berekening extends Prijs, Looptijd {
  staffel: Staffel;
}

/**
 * Prijs en looptijd voor een aanmelding. Geeft null zolang de staffel of de startdatum niet vaststaat.
 */
export function berekenAanmelding(invoer: {
  type: Organisatietype | '';
  aantalGemeenten?: number;
  startdatum: string;
}): Berekening | null {
  if (!invoer.type) return null;
  const id = bepaalStaffel(invoer.type, invoer.aantalGemeenten);
  if (!id || !isIsoDatum(invoer.startdatum)) return null;
  return { staffel: staffelVan(id), ...prijsVoorStaffel(id), ...looptijdVan(invoer.startdatum) };
}

/**
 * Ordernummer voor de bevestiging, bijvoorbeeld "LID-20261015-7K3QX" (aanmelding) of "OFF-20261015-7K3QX" (offerte).
 * `willekeurig` levert de laatste tekens; geef in tests een vaste waarde mee.
 */
export function maakOrdernummer(vandaag: string, willekeurig: string, soort: 'aanmelding' | 'offerte' = 'aanmelding'): string {
  const code = willekeurig.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(5, '0');
  return `${soort === 'offerte' ? 'OFF' : 'LID'}-${vandaag.replace(/-/g, '')}-${code}`;
}

/** Laatste dag waarop een offerte van vandaag geldig is. */
export function offerteGeldigTot(vandaag: string, v: Voorwaarden = standaardVoorwaarden): string {
  return plusDagen(vandaag, v.offerteGeldigDagen);
}
