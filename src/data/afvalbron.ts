// Kop van de CBS-afvaldata (bron, peiljaar, controle, kerncijfers) en bron van de PDOK-grenzen.
// Klein bestand: de homepage gebruikt dit zonder de 342 gemeenterijen te laden.
// Bijwerken: node scripts/cbs-afval-gemeenten.mjs en node scripts/pdok-gemeentegrenzen.mjs.

import bron from './afval-bron.json';
import grenzen from './gemeentegrenzen-bron.json';

export interface AfvalBron {
  peiljaar: number;
  opgehaald: string;
  status: { tekst: string; label: string };
  bron: { tabelId: string; titel: string; gewijzigd: string; url: string; api: string; uitgever: string };
  bevolking: { tabelId: string; titel: string; gewijzigd: string; url: string; onderwerp: string };
  provincies: { tabelId: string; url: string } | null;
  controle: {
    tabelId: string;
    landelijkTotaalKgPerInw: number;
    landelijkRestafvalKgPerInw: number;
    landelijkScheidingsPctCbs: number;
    landelijkScheidingsPctBerekend: number;
  } | null;
  /** Landelijk cijfer van het nieuwste jaar uit 83558NED; kan een jaar verder zijn dan de gemeentecijfers. */
  landelijkActueel: {
    jaar: number;
    tabelId: string;
    url: string;
    gewijzigd: string;
    status: { tekst: string; label: string };
    totaalKgPerInw: number;
    /** Fijn + grof restafval, zelfde definitie als op de kaart. */
    restafvalKgPerInw: number;
    verbouwingsrestafvalKgPerInw: number;
    scheidingsPct: number;
  } | null;
  definities: { restafval: string; scheidingsPct: string; pmd: string };
  samenvatting: {
    aantalGemeenten: number;
    restafvalOnder100: number;
    laagste: { code: string; naam: string; restafval: number };
    hoogste: { code: string; naam: string; restafval: number };
  };
}

export interface GrenzenBron {
  jaar: number;
  aantal: number;
  opgehaald: string;
  uitgever: string;
  titel: string;
  url: string;
  api: string;
  licentie: string;
  bewerking: string;
  bestand: string;
  bytes: number;
  /** SVG-paden voor de kaart (scripts/pdok-gemeentekaart.mjs). */
  kaartbestand: string;
}

export const afvalBron: AfvalBron = bron as AfvalBron;
export const grenzenBron: GrenzenBron = grenzen as GrenzenBron;
