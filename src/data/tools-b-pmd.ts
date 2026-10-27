// Gegevens voor het Rekenmodel bron- en nascheiding PMD (onderdeel tools-b).
// - Vergoedingen 2026: onderhandelingsresultaat Verpact, VNG en NVRD (aanbiedingsbrief 28 mei 2025, par. 6.2 en 7),
//   ingestemd door de ALV's van VNG en NVRD in juni 2025.
// - Respons en restafval per gemeente: CBS, opgehaald met scripts/tools-b-cbs-pmd.mjs (tools-b-cbs-pmd.json).
// - Verbrandingstarief: kental uit Strategy& (2025) plus afvalstoffenbelasting 2026 (Belastingdienst).

import cbs from './tools-b-cbs-pmd.json';
import { bronnen, PEILDATUM } from './tools-b-bronnen';

export { PEILDATUM };

export type StaffelCategorie = '1' | '2' | '3a' | '3b' | '4';

export interface StaffelRegel {
  categorie: StaffelCategorie;
  /** Omschrijving van het aandeel PMD-verpakkingen in het ingezamelde materiaal. */
  aandeel: string;
  /** Vergoeding als % van de kostenbasis, per jaar. */
  pctKostenbasis: Record<2026 | 2027 | 2028, number>;
  /** Vergoeding in euro per ton ingezameld PMD, per jaar (afgerond, zoals in de bron). */
  euroPerTon: Record<2026 | 2027 | 2028, number>;
  toelichting: string;
}

/** Jaren waarvoor de staffel is afgesproken. */
export const staffelJaren = [2026, 2027, 2028] as const;
export type StaffelJaar = (typeof staffelJaren)[number];

/**
 * Staffel inzamelvergoeding bronscheiding 2026 (euro per ton ingezameld PMD).
 * Alleen categorie 3b daalt per jaar volgens het akkoord. De overige bedragen voor 2027 en 2028 worden
 * geïndexeerd met een methode die nog niet in euro's is gepubliceerd; de tool houdt dan het bedrag van 2026 aan
 * en zegt dat.
 */
export const staffel: StaffelRegel[] = [
  {
    categorie: '1',
    aandeel: '85–100 % PMD-verpakkingen',
    pctKostenbasis: { 2026: 100, 2027: 100, 2028: 100 },
    euroPerTon: { 2026: 325, 2027: 325, 2028: 325 },
    toelichting: 'Goed presterende routes krijgen de volledige kostenbasis.',
  },
  {
    categorie: '2',
    aandeel: '75–85 % PMD-verpakkingen',
    pctKostenbasis: { 2026: 85, 2027: 85, 2028: 85 },
    euroPerTon: { 2026: 277, 2027: 277, 2028: 277 },
    toelichting: 'Optimalisatie.',
  },
  {
    categorie: '3a',
    aandeel: '65–75 % PMD-verpakkingen',
    pctKostenbasis: { 2026: 70, 2027: 70, 2028: 70 },
    euroPerTon: { 2026: 228, 2027: 228, 2028: 228 },
    toelichting: 'Optimalisatie.',
  },
  {
    categorie: '3b',
    aandeel: 'onder 65 %, haalroutes (zakken of minicontainers)',
    pctKostenbasis: { 2026: 60, 2027: 55, 2028: 50 },
    euroPerTon: { 2026: 195, 2027: 179, 2028: 163 },
    toelichting: 'Transitie. Het percentage daalt elk jaar.',
  },
  {
    categorie: '4',
    aandeel: 'onder 65 %, brengvoorzieningen',
    pctKostenbasis: { 2026: 0, 2027: 0, 2028: 0 },
    euroPerTon: { 2026: 0, 2027: 0, 2028: 0 },
    toelichting: 'Geen vergoeding; deze voorzieningen worden uitgefaseerd. Brengvoorzieningen boven 65 % volgen de rest van de staffel.',
  },
];

export const staffelPerCategorie = Object.fromEntries(staffel.map((s) => [s.categorie, s])) as Record<StaffelCategorie, StaffelRegel>;

export const pmdBronnen = {
  akkoord: bronnen.verpactAkkoord,
  nvrd: bronnen.nvrdVragen,
  strategy: bronnen.strategyVa2025,
  asb: bronnen.asb,
};

/** Kostenbasis bronscheiding 2026: 100 % in de staffel. Kostenonderzoek 2021 (90 % haal-, 10 % brengsystemen), geïndexeerd naar 2025. */
export const kostenbasisBron = 325;

/** Voorschot 2026 voor bronscheidingsgemeenten met (overwegend) een haalsysteem, euro per ton. Bron: NVRD, 11 juni 2025. */
export const voorschot2026 = 195;

/** Nascheiding volgens het akkoord (par. 7). Bedragen per ton restafval dat bij een gecontracteerde nascheider is nagescheiden. */
export const nascheiding = {
  /** Gemiddelde nascheidingskosten uit het kostenonderzoek 2021, euro per ton restafval. */
  kosten2021: 93.47,
  /** Opslag voor transport en overslag, euro per ton restafval. */
  opslagTransport: 6.79,
  /** Aandeel PMD in nascheidingsrestafval volgens het kostenonderzoek 2021. */
  pmdAandeel: 0.144,
  /** Inflatiecorrectie naar 2026 die het akkoord toepast. */
  inflatiefactor: 1.1954,
  /** Vergoeding 2026, euro per ton restafval. */
  vergoeding2026: 17.26,
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Kental nascheidingskosten 2026: (93,47 + 6,79) × 1,1954 = 119,85, met dezelfde inflatiecorrectie die het akkoord
 * op de vergoeding toepast.
 *
 * LET OP: de eenheid staat niet vast. De bron (par. 7) noemt "gemiddelde kosten voor nascheiding van € 93,47 per ton"
 * zonder te zeggen per ton wát. Twee lezingen:
 * - per ton restafval (bovengrens, 119,85). Steun: de opslag van € 6,79 is € 3 mln gedeeld door "de tonnages uit
 *   het KSO", dus ongeveer 442 kton. Dat past bij nagescheiden restafval en niet bij teruggewonnen PMD.
 * - per ton teruggewonnen PMD (ondergrens). Omgerekend naar restafval met het PMD-aandeel van 14,4 %: 17,26 per ton
 *   restafval, precies de vergoeding.
 * Daarom rekent de tool met beide lezingen en trekt hij pas een conclusie als de gebruiker een eigen tarief invult.
 */
export const kentalNascheidingskosten = r2((nascheiding.kosten2021 + nascheiding.opslagTransport) * nascheiding.inflatiefactor);

/** De twee lezingen van het kental nascheidingskosten, beide in euro per ton restafval (2026). */
export const nascheidingskostenLezingen = {
  perTonRestafval: kentalNascheidingskosten,
  perTonPmd: r2(kentalNascheidingskosten * nascheiding.pmdAandeel),
  /** Tonnage waarop de opslag van € 6,79 is gebaseerd: € 3 mln / € 6,79. */
  tonnageOpslagKton: Math.round(3_000_000 / nascheiding.opslagTransport / 1000),
};

/** Bandbreedte nascheidingskosten (euro per ton restafval): de twee lezingen. Midden = het kental in het veld. */
export const nascheidingskostenBand = {
  laag: nascheidingskostenLezingen.perTonPmd,
  midden: kentalNascheidingskosten,
  hoog: kentalNascheidingskosten,
};

/** Poorttarief verbranding gemeentelijk restafval bij aanbesteding volgens Strategy& (2025), bron ACM 2023. */
export const poorttariefBandbreedte = { laag: 55, hoog: 70 };
/** Afvalstoffenbelasting 2026, euro per 1.000 kg. Bron: Belastingdienst. */
export const asb2026 = 40.85;
/** Kental verbrandingstarief incl. afvalstoffenbelasting: midden van de bandbreedte + ASB 2026. */
export const kentalVerbrandingstarief = r2((poorttariefBandbreedte.laag + poorttariefBandbreedte.hoog) / 2 + asb2026);

/* ---------- CBS ---------- */

export interface CbsGemeente {
  code: string;
  naam: string;
  inwoners: number | null;
  pmdKgPerInw: number | null;
  restafvalKgPerInw: number | null;
}

export const cbsPmd = cbs as {
  peildatum: string;
  jaar: number;
  bronnen: Record<'gemeente' | 'landelijk' | 'inwoners', { tabelId: string; titel: string; gewijzigd: string; url: string }>;
  toelichting: string;
  landelijk: { jaar: number; pmdKgPerInw: number; restafvalKgPerInw: number };
  gemeenten: CbsGemeente[];
};

export const cbsGemeenten: CbsGemeente[] = cbsPmd.gemeenten;

/* ---------- Bandbreedtes ---------- */

/**
 * Teruggewonnen PMD bij nascheiding, kg per inwoner per jaar dat aan recyclers wordt aangeboden: 15 tot 25 in de
 * praktijk van verschillende nascheidingsinstallaties; een van de meest effectieve installaties haalde in 2019
 * gemiddeld 25 kg. Vaak zonder blik gerapporteerd (PD in plaats van PMD). Bron: IPR Normag voor MARN (2021), par. 3.3.
 */
export const nascheidingRendement = { laag: 15, midden: 20, hoog: 25 };

/** Verbrandingstarief incl. afvalstoffenbelasting bij de onder- en bovenkant van het poorttarief. */
export const verbrandingstariefBand = {
  laag: r2(poorttariefBandbreedte.laag + asb2026),
  midden: kentalVerbrandingstarief,
  hoog: r2(poorttariefBandbreedte.hoog + asb2026),
};

export const pmdVarianten = {
  teruggewonnenNa: nascheidingRendement,
  verbrandingstarief: verbrandingstariefBand,
  nascheidingskosten: nascheidingskostenBand,
};

/** Grenzen voor de plausibiliteitscontrole. */
export const pmdGrenzen = {
  teruggewonnenHoog: nascheidingRendement.hoog,
  pmdAandeelRestafval: nascheiding.pmdAandeel,
  responsMax: Math.max(...cbsGemeenten.map((g) => g.pmdKgPerInw ?? 0)),
  inwonersNl: cbsGemeenten.reduce((s, g) => s + (g.inwoners ?? 0), 0),
};

export const iprBron = bronnen.iprMarn2021;
