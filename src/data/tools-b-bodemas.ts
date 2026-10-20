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
  { jaar: 2022, verbrandKton: 7392, ruweBodemasKton: 1678, ferroKton: 113, nonFerroKton: 46, gestortKton: 67 },
  { jaar: 2023, verbrandKton: 6841, ruweBodemasKton: 1766, ferroKton: 106, nonFerroKton: 36, gestortKton: 76 },
  { jaar: 2024, verbrandKton: 6422, ruweBodemasKton: 1570, ferroKton: 109, nonFerroKton: 38, gestortKton: 60 },
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
