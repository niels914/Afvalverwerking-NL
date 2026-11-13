// Keuze van de fossiele emissiefactor in de tool "CO2-heffing per installatie".
// Twee officiële bronnen, beide uit bestaande data (niets overgetypt):
//  - het RVO-kental voor alle afval in AVI's (co2-tarieven.ts, lijst van energiedragers januari 2026);
//  - de NEa-berekeningsfactoren voor huishoudelijk afval (neaFactoren in heffingen-tarieven.ts): fossiele uitstoot per ton
//    = emissiefactor × (1 − biomassafractie). Dit zijn dezelfde waarden als in de Heffingenscan voor gemeenten.
// Afgerond op drie decimalen, zoals het kental. Voor 2028 en later houdt de Heffingenscan de waarden van 2027 aan.

import { kentalEmissiefactor, type Bron } from './co2-tarieven';
import { getal } from '../lib/format';
import { heffingBronnen, neaFactoren } from './heffingen-tarieven';

export type EmissiefactorKeuzeId = 'kental' | 'nea2026' | 'nea2027';

export interface EmissiefactorKeuze {
  id: EmissiefactorKeuzeId;
  label: string;
  /** Ton fossiel CO2 per ton afval. */
  waarde: number;
  bron: Bron & { peildatum?: string };
  /** Uitleg in één zin. */
  uitleg: string;
}

const rond3 = (n: number) => Math.round(n * 1000) / 1000;
const neaRestafval = (jaar: 2026 | 2027) => rond3(neaFactoren.huishoudelijk[jaar].ef * (1 - neaFactoren.huishoudelijk[jaar].bio));

export const emissiefactorKeuzes: EmissiefactorKeuze[] = [
  {
    id: 'kental',
    label: `RVO-kental, alle afval in AVI’s (${getal(kentalEmissiefactor.waarde, 3)})`,
    waarde: kentalEmissiefactor.waarde,
    bron: kentalEmissiefactor.bron,
    uitleg: 'Gemiddelde voor al het afval dat AVI’s verbranden, uit de lijst van energiedragers (januari 2026).',
  },
  {
    id: 'nea2026',
    label: `NEa, huishoudelijk restafval 2026 (${getal(neaRestafval(2026), 3)})`,
    waarde: neaRestafval(2026),
    bron: heffingBronnen.neaFactoren,
    uitleg: 'Landelijke NEa-factor voor huishoudelijk afval in 2026, voorlopige emissiefactor × (1 − biomassafractie).',
  },
  {
    id: 'nea2027',
    label: `NEa, huishoudelijk restafval 2027 en later (${getal(neaRestafval(2027), 3)})`,
    waarde: neaRestafval(2027),
    bron: heffingBronnen.neaFactoren,
    uitleg: 'Landelijke NEa-factor voor huishoudelijk afval in 2027. De NEa publiceert niet verder; de Heffingenscan houdt deze waarde voor latere jaren aan.',
  },
];

/** De keuze die bij een emissiefactor hoort, of undefined bij een eigen waarde. */
export const keuzeBijWaarde = (waarde: number): EmissiefactorKeuze | undefined => emissiefactorKeuzes.find((k) => k.waarde === waarde);
