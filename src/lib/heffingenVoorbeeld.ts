// Het voorbeeld van de Heffingenscan (Overbetuwe) en het landelijke totaal, als klein gegevensobject.
// Voor de homepage en andere plekken die de cijfers willen tonen zonder de hele dataset (342 gemeenten) te laden.
//
// De cijfers staan in src/data/heffingen-voorbeeld.json. Dat bestand wordt gemaakt door scripts/cbs-heffingenscan.mjs
// (bij nieuwe CBS-cijfers) of met `node scripts/cbs-heffingenscan.mjs --alleen-voorbeeld` (na een wijziging in tarieven
// of rekenregels). De test src/lib/calc/heffingen.test.ts faalt als het bestand niet meer klopt met de rekenlogica.
// Bedragen zijn niet afgerond: gebruik euro() uit src/lib/format.ts. Alles is indicatief, prijspeil 2026.

import data from '../data/heffingen-voorbeeld.json';
import type { HeffingenVoorbeeld } from './calc/heffingen';

export type { HeffingenVoorbeeld, HeffingenVoorbeeldJaar } from './calc/heffingen';

export const heffingenVoorbeeld = data as HeffingenVoorbeeld;

/** Pad van de scan en van een gemeentepagina. */
export const HEFFINGENSCAN_PAD = '/heffingenscan';
export const heffingenscanPad = (slug: string) => `${HEFFINGENSCAN_PAD}/${slug}`;
