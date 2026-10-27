// Kentallen voor de Bodemassencalculator, afgeleid uit openbare bronnen (onderdeel tools-b).
// Bron hoeveelheden: Rijkswaterstaat, Afvalverwerking in Nederland, gegevens 2024, tabel 9 en 13 (kton).
// Prijzen en tarieven staan hier bewust niet: daarvoor bestaat geen openbare bron. De gebruiker vult ze in.

import { bronnen, PEILDATUM } from './tools-b-bronnen';

export { PEILDATUM };

/** Landelijke hoeveelheden per jaar in kiloton, zoals Rijkswaterstaat ze publiceert. */
export interface BodemasJaar {
  jaar: number;
  verbrandKton: number;
  ruweBodemasKton: number;
  ferroKton: number;
  nonFerroKton: number;
  gestortKton: number;
}

export const bodemasJaren: BodemasJaar[] = [
  {
    jaar: 2022,
    verbrandKton: 7392,
    ruweBodemasKton: 1678,
    ferroKton: 113,
    nonFerroKton: 46,
    gestortKton: 67,
  },
  {
    jaar: 2023,
    verbrandKton: 6841,
    ruweBodemasKton: 1766,
    ferroKton: 106,
    nonFerroKton: 36,
    gestortKton: 76,
  },
  {
    jaar: 2024,
    verbrandKton: 6422,
    ruweBodemasKton: 1570,
    ferroKton: 109,
    nonFerroKton: 38,
    gestortKton: 60,
  },
];

export interface BodemasKentallen {
  jaar: number;
  /** Ruwe bodemas als % van verbrand afval. */
  aandeelBodemasPct: number;
  /** Afgescheiden ferro als % van ruwe bodemas. */
  ferroPct: number;
  /** Afgescheiden non-ferro (incl. rvs) als % van ruwe bodemas. */
  nonFerroPct: number;
  /** Gestort (bodemas en reinigingsresidu, incl. steunlaag) als % van ruwe bodemas. */
  gestortPct: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Rekent de landelijke hoeveelheden om naar percentages (afgerond op 0,1 %). */
export function kentallenUit(j: BodemasJaar): BodemasKentallen {
  return {
    jaar: j.jaar,
    aandeelBodemasPct: r1((j.ruweBodemasKton / j.verbrandKton) * 100),
    ferroPct: r1((j.ferroKton / j.ruweBodemasKton) * 100),
    nonFerroPct: r1((j.nonFerroKton / j.ruweBodemasKton) * 100),
    gestortPct: r1((j.gestortKton / j.ruweBodemasKton) * 100),
  };
}

export const bodemasKentallenPerJaar = bodemasJaren.map(kentallenUit);
/** Kentallen van het laatste jaar: de standaardwaarden van de calculator. */
export const bodemasKental = bodemasKentallenPerJaar[bodemasKentallenPerJaar.length - 1];

export const bodemasBron = bronnen.war2024;

/** Context uit het Strategy&-rapport voor de Vereniging Afvalbedrijven (2025), op basis van expertinterviews. */
export const bodemasContext = {
  samenstelling: 'circa 10 % metalen, circa 3 % onverbrand materiaal, 72–75 % mineralen en 12–15 % reinigingsresidu',
  residuMaxPct: 15,
  betaling: 'AVI’s betalen doorgaans voor het opwerken van bodemas; de waarde komt vooral uit de metalen.',
  bron: bronnen.strategyVa2025,
};

/* ---------- Kosten (rekenwijze "kental") ---------- */

/** Afvalstoffenbelasting 2026 op storten en verbranden, euro per 1.000 kg (één tarief). Bron: Belastingdienst. */
export const stortbelasting2026 = 40.85;

/** CBS-consumentenprijsindex (2015 = 100), jaargemiddelde alle bestedingen. Bron: CBS 83131NED. */
export const cpi = { 2021: 110.39, 2025: 134.56 } as const;
/** Prijsontwikkeling 2021 → 2025 volgens de CPI. */
export const cpiFactor2021naar2025 = cpi[2025] / cpi[2021];

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Kostenkentallen uit de nota van toelichting bij het Besluit vrijstellingen stortverbod (Staatsblad 2021, 235):
 * - opwerking kost de ontdoener (de AVI) per saldo ongeveer € 10 per ton bodemas: de reiniging is duurder, maar de
 *   opbrengst van metalen en gereinigde bodemas maakt dat goed;
 * - daarbovenop komt het storten van het residu (ongeveer 15 % van het materiaal), doorgaans € 30–40 per ton plus
 *   stortbelasting.
 * Bedragen in prijspeil 2021; KplusV rekent ze met de CPI om naar 2025.
 */
export const bodemasKostenBron = {
  opwerkingNetto2021: 10,
  stortkostenLaag2021: 30,
  stortkostenHoog2021: 40,
  residuVolgensBesluitPct: 15,
};

/** Netto kosten opwerking per ton ruwe bodemas, metaalopbrengst verrekend, prijspeil 2025. */
export const kentalNettoOpwerking = r2(bodemasKostenBron.opwerkingNetto2021 * cpiFactor2021naar2025);
/** Stortkosten residu excl. belasting, midden van € 30–40 (2021), prijspeil 2025. */
export const kentalStortkosten = r2(((bodemasKostenBron.stortkostenLaag2021 + bodemasKostenBron.stortkostenHoog2021) / 2) * cpiFactor2021naar2025);

/** Bandbreedte voor de uitkomst. Midden = standaardwaarden van de calculator. */
export const bodemasScenario = {
  laag: {
    nettoOpwerking: bodemasKostenBron.opwerkingNetto2021,
    residuPct: bodemasKental.gestortPct,
    stortkosten: bodemasKostenBron.stortkostenLaag2021,
  },
  midden: {
    nettoOpwerking: kentalNettoOpwerking,
    residuPct: bodemasKental.gestortPct,
    stortkosten: kentalStortkosten,
  },
  hoog: {
    nettoOpwerking: kentalNettoOpwerking,
    residuPct: bodemasKostenBron.residuVolgensBesluitPct,
    stortkosten: r2(bodemasKostenBron.stortkostenHoog2021 * cpiFactor2021naar2025),
  },
};

/** Landelijk gemiddelde per afvalverbrandingsinstallatie in 2024: 6.422 kton in 13 AVI's (Rijkswaterstaat, p. 26). */
export const aantalAvis2024 = 13;
export const gemiddeldPerAvi = Math.round((bodemasJaren[bodemasJaren.length - 1].verbrandKton * 1000) / aantalAvis2024 / 1000) * 1000;

/** Bandbreedte van de aandelen over 2022–2024, voor de plausibiliteitscontrole. */
export const bodemasBereik = {
  aandeelBodemasPct: [
    Math.min(...bodemasKentallenPerJaar.map((k) => k.aandeelBodemasPct)),
    Math.max(...bodemasKentallenPerJaar.map((k) => k.aandeelBodemasPct)),
  ] as [number, number],
  ferroPct: [Math.min(...bodemasKentallenPerJaar.map((k) => k.ferroPct)), Math.max(...bodemasKentallenPerJaar.map((k) => k.ferroPct))] as [number, number],
  nonFerroPct: [Math.min(...bodemasKentallenPerJaar.map((k) => k.nonFerroPct)), Math.max(...bodemasKentallenPerJaar.map((k) => k.nonFerroPct))] as [
    number,
    number,
  ],
  /** Hoogste landelijk verbrande hoeveelheid in 2022–2024, in ton. */
  verbrandMaxTon: Math.max(...bodemasJaren.map((j) => j.verbrandKton)) * 1000,
};

export const bodemasKostenBronnen = {
  besluit: bronnen.stb2021bodemas,
  cpi: bronnen.cbsCpi,
  asb: bronnen.asb,
};
