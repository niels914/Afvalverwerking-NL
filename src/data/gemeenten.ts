/// <reference types="geojson" />
// (De verwijzing hierboven houdt het GeoJSON-type beschikbaar voor src/data/types.ts; vroeger kwam dat
// via Leaflet, dat de kaart niet meer gebruikt.)
// Echte cijfers over huishoudelijk afval per gemeente (CBS) en de bron van de gemeentegrenzen (PDOK).
// Bijwerken: node scripts/cbs-afval-gemeenten.mjs en daarna node scripts/pdok-gemeentegrenzen.mjs
// (achter een proxy met NODE_USE_ENV_PROXY=1). Zie docs/stukken/inhoud.md.

import afval from './afval-gemeenten.json';

export { afvalBron, grenzenBron, type AfvalBron, type GrenzenBron } from './afvalbron';

/** Eén gemeente met cijfers in kg per inwoner per jaar (CBS 83452NED). */
export interface GemeenteAfval {
  /** CBS-gemeentecode, bijv. "GM0363". */
  code: string;
  naam: string;
  provincie: string | null;
  /** Gemiddelde bevolking in het peiljaar (CBS 03759ned). */
  inwoners: number | null;
  /** Totaal huishoudelijk afval. Kan ontbreken als CBS het niet publiceert. */
  totaal: number | null;
  fijnRest: number;
  grofRest: number;
  verbouwingRest: number;
  /** Fijn + grof huishoudelijk restafval. */
  restafval: number;
  /** Gescheiden ingezameld deel van het huishoudelijk afval, 0–100. Null als het totaal ontbreekt. */
  scheidingsPct: number | null;
  gft: number | null;
  papier: number | null;
  glas: number | null;
  textiel: number | null;
  /** Kunststof en metalen verpakkingen, drankenkartons en gemengde PMD-fractie. */
  pmd: number;
  /** Fijn + grof restafval in het jaar ervoor (alleen als de gemeentecode toen al bestond). */
  restafvalVorigJaar: number | null;
}

export const gemeenten: GemeenteAfval[] = afval.gemeenten as GemeenteAfval[];
