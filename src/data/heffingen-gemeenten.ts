// Gemeentecijfers voor de Heffingenscan restafval (CBS): fijn en grof restafval, verbouwingsrestafval, nascheiding,
// inwoners en huishoudens, met slug en provincie.
// Bijwerken: NODE_USE_ENV_PROXY=1 node scripts/cbs-heffingenscan.mjs (zie docs/stukken/heffingenscan.md).
// Dit bestand laadt alle 342 rijen: importeer het alleen in pagina's die lazy laden, niet op de homepage.
// De homepage gebruikt src/lib/heffingenVoorbeeld.ts.

import data from './heffingen-gemeenten.json';
import type { HeffingGemeente } from '../lib/calc/heffingen';

export interface CbsTabelBron {
  tabelId: string;
  titel: string;
  /** Datum van de laatste wijziging van de tabel bij CBS. */
  gewijzigd: string;
  url: string;
  api: string;
  velden: string;
}

export interface HeffingGemeentenBron {
  /** Datum waarop de cijfers bij CBS zijn opgehaald. */
  opgehaald: string;
  aantalGemeenten: number;
  aantalMetNascheiding: number;
  bronnen: {
    afval: CbsTabelBron & { peiljaar: number; status: { tekst: string; label: string } };
    nascheiding: CbsTabelBron & { peiljaar: number; status: { tekst: string; label: string } };
    kerncijfers: CbsTabelBron & {
      /** Peildatum van inwoners en huishoudens (1 januari). */
      peildatum: string;
      /** Nieuwere tabel bij CBS waarmee de scan nog niet rekent, of null. */
      nieuwer: { tabelId: string; peildatum: string; url: string } | null;
    };
    provincie: { bestand: string; peiljaar: number };
  };
}

const { gemeenten: rijen, ...kop } = data;

export const heffingGemeenten: HeffingGemeente[] = rijen as HeffingGemeente[];
export const heffingGemeentenBron: HeffingGemeentenBron = kop as HeffingGemeentenBron;
