// Datatypes van het platform. Vervang de voorbeelddata in src/data/ door echte data met dezelfde vorm.

export type Regio = 'Noord' | 'Oost' | 'Midden' | 'West' | 'Zuid';

/**
 * Eén gemeente. Dit is het niveau van de echte Restafvalkaart van Nederland.
 * Kerncijfers per samenwerkingsverband worden hieruit berekend (zie lib/kaartdata.ts).
 */
export interface Gemeente {
  /** CBS-gemeentecode, bijv. "GM0363". In de voorbeelddata fictief (GM9xxx). */
  cbsCode: string;
  naam: string;
  /** Verwijst naar Samenwerkingsverband.id. */
  samenwerkingsverbandId: string;
  inwoners: number;
  /** Fijn en grof restafval in kg per inwoner per jaar. */
  restafvalKgPerInw: number;
  /** Scheidingspercentage huishoudelijk afval, 0–100. */
  scheidingsPct: number;
  /** Peiljaar van de cijfers. */
  jaar: number;
}

export interface Samenwerkingsverband {
  id: string;
  naam: string;
  regio: Regio;
  /** Middelpunt voor de marker, [breedtegraad, lengtegraad]. */
  centrum: [number, number];
  /** Optioneel: begrenzing als GeoJSON-geometrie (Polygon of MultiPolygon). */
  grens?: { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export type Afvalstroom = 'Restafval' | 'GFT' | 'PMD' | 'Papier en karton' | 'Textiel' | 'Grof huishoudelijk afval' | 'Bodemas';
export type AanbestedingStatus = 'lopend' | 'gesloten' | 'gegund';

export interface Aanbesteding {
  id: string;
  titel: string;
  opdrachtgever: string;
  /** Koppeling met de kaart; leeg als de opdrachtgever geen samenwerkingsverband op de kaart is. */
  samenwerkingsverbandId?: string;
  stroom: Afvalstroom;
  procedure: string;
  regio: Regio;
  /** ISO-datum jjjj-mm-dd. */
  publicatie: string;
  sluiting: string;
  status: AanbestedingStatus;
  platform: 'TenderNed' | 'Mercell';
  /** In het prototype de homepage van het platform; later de link naar de aankondiging. */
  url: string;
}

export type NieuwsThema =
  | 'Verbrandingscapaciteit'
  | 'CO2-heffing'
  | 'PMD'
  | 'GFT'
  | 'Bodemas'
  | 'Textiel (UPV)'
  | 'Contracten en indexering';

export interface Nieuwsbericht {
  id: string;
  titel: string;
  datum: string;
  samenvatting: string;
  thema: NieuwsThema;
}

export type PublicatieType = 'Rapport' | 'Factsheet' | 'Handreiking';

export interface Publicatie {
  id: string;
  titel: string;
  jaar: number;
  type: PublicatieType;
  thema: string;
  samenvatting: string;
  uitgever: string;
}

export type Toegang = 'gratis' | 'gratis+pro' | 'leden';

export interface Tool {
  id: string;
  titel: string;
  pad: string;
  toegang: Toegang;
  omschrijving: string;
  /** Extra regel onder de titel, bijv. de samenwerkingspartner. */
  extraLabel?: string;
  gratisDeel?: string;
  proDeel?: string;
}

export interface Indexreeks {
  id: string;
  naam: string;
  /** Indexwaarde per jaar. */
  waarden: Record<number, number>;
}
