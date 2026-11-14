// De afvalstromen van het platform: een vaste lijst met id, naam, omschrijving en de CBS-afvalsoorten erachter.
// De id's liggen vast, omdat andere pagina's ernaar linken (/stromen/<id>): restafval, gft, papier, pmd, textiel, glas, grof, luiers, kca.
// De koppeling met de CBS-afvalsoorten staat in stromen-fracties.json; de cijfers komen uit scripts/cbs-stromen.mjs.
// Dit bestand is klein en mag overal worden geïmporteerd. De teksten per stroom (verwerking, regels) staan in stromen-inhoud.ts.

import fracties from './stromen-fracties.json';

export const STROOM_IDS = ['restafval', 'gft', 'papier', 'pmd', 'textiel', 'glas', 'grof', 'luiers', 'kca'] as const;
export type StroomId = (typeof STROOM_IDS)[number];

export interface StroomTool {
  pad: string;
  naam: string;
  /** Waarvoor de tool bij deze stroom dient. */
  waarvoor: string;
}

export interface Stroom {
  id: StroomId;
  naam: string;
  /** Eén korte zin voor de kaart op het overzicht. */
  kort: string;
  omschrijving: string;
  /** Titels van de CBS-afvalsoorten die samen deze stroom vormen. */
  cbsFracties: string[];
  /** Sleutels in stromen-fracties.json. */
  fractieSleutels: string[];
  /** Naam van de stroom in het aanbestedingsarchief (zie STROOM_REGELS in supabase/functions/ververs-aanbestedingen/afleiding.ts). */
  archiefStroom: string;
  /** Id van de stroom in de Aanbestedingstool, als die er een heeft (voor ?stroom=). */
  toolStroom?: string;
  tools: StroomTool[];
  /** Waar het CBS-cijfer van deze stroom op moet worden gelezen. */
  cijferUitleg: string;
}

const indexTool: StroomTool = { pad: '/tools/indexcalculator', naam: 'Indexcalculator', waarvoor: 'Laat een tarief meebewegen met openbare CBS-indexcijfers.' };
const aanbesteding = (stroom?: string): StroomTool => ({
  pad: stroom ? `/tools/aanbestedingstool?stroom=${stroom}` : '/tools/aanbestedingstool',
  naam: 'Aanbestedingstool',
  waarvoor: stroom
    ? 'Kies eisen, gunningscriteria en contractbepalingen voor deze stroom.'
    : 'Voor deze stroom heeft de tool geen eigen criteria; u kiest er algemene contractbepalingen.',
});

const f = fracties.fracties as Record<string, { titel: string }>;
const s = fracties.stromen as Record<StroomId, string[]>;
const titels = (id: StroomId) => s[id].map((k) => f[k].titel);

export const stromen: Stroom[] = [
  {
    id: 'restafval',
    naam: 'Restafval',
    kort: 'Wat overblijft na scheiding: fijn en grof huishoudelijk restafval.',
    omschrijving:
      'Het niet gescheiden ingezamelde afval, fijn en grof. Dit is de stroom waar de afvalstoffenbelasting en de CO2-heffing op drukken en waar gemeenten kiezen tussen bron- en nascheiding.',
    cbsFracties: titels('restafval'),
    fractieSleutels: s.restafval,
    archiefStroom: 'Restafval',
    toolStroom: 'restafval',
    tools: [
      { pad: '/heffingenscan', naam: 'Heffingenscan', waarvoor: 'Wat de afvalstoffenbelasting en de CO2-heffing een gemeente kosten, per gemeente.' },
      { pad: '/tools/co2-heffingenscan', naam: 'CO2-heffing per installatie', waarvoor: 'De CO2-heffing op afvalverbranding bij het tonnage van één installatie, volgens wet en wetsvoorstel.' },
      { pad: '/tools/bodemassencalculator', naam: 'Bodemassencalculator', waarvoor: 'Hoeveel bodemas en metalen er vrijkomen bij verbranding van restafval.' },
      { pad: '/restafvalkaart', naam: 'Restafvalkaart', waarvoor: 'Restafval en scheiding per gemeente op één kaart.' },
      aanbesteding('restafval'),
      indexTool,
    ],
    cijferUitleg: 'Fijn huishoudelijk restafval plus grof huishoudelijk restafval, zoals op de Restafvalkaart.',
  },
  {
    id: 'gft',
    naam: 'GFT',
    kort: 'Groente-, fruit- en tuinafval, dat wordt vergist of gecomposteerd.',
    omschrijving: 'Groente-, fruit- en tuinafval (bioafval). Na inzameling wordt het gecomposteerd of eerst vergist.',
    cbsFracties: titels('gft'),
    fractieSleutels: s.gft,
    archiefStroom: 'GFT en etensresten',
    toolStroom: 'gft',
    tools: [aanbesteding('gft'), indexTool],
    cijferUitleg: 'GFT-afval volgens CBS: groente-, fruit- en tuinafval.',
  },
  {
    id: 'papier',
    naam: 'Papier en karton',
    kort: 'Oud papier en karton, ook van verenigingen en scholen.',
    omschrijving: 'Oud papier en karton. CBS telt ook wat verenigingen, scholen en liefdadigheidsorganisaties inzamelen.',
    cbsFracties: titels('papier'),
    fractieSleutels: s.papier,
    archiefStroom: 'Papier en karton',
    toolStroom: 'papier',
    tools: [aanbesteding('papier'), indexTool],
    cijferUitleg: 'Oud papier en karton volgens CBS, inclusief inzameling door verenigingen, scholen en liefdadigheidsorganisaties.',
  },
  {
    id: 'pmd',
    naam: 'PMD',
    kort: 'Plastic en metalen verpakkingen en drankenkartons.',
    omschrijving:
      'Kunststof verpakkingen, metalen verpakkingen en drankenkartons. Een deel van de gemeenten scheidt aan de bron, een deel scheidt achteraf uit het restafval (nascheiding).',
    cbsFracties: titels('pmd'),
    fractieSleutels: s.pmd,
    archiefStroom: 'PMD en kunststof',
    toolStroom: 'pmd',
    tools: [
      { pad: '/tools/pmd-rekenmodel', naam: 'Rekenmodel bron- en nascheiding PMD', waarvoor: 'Vergelijk de netto kosten van bron- en nascheiding voor uw gemeente (voor leden).' },
      aanbesteding('pmd'),
      indexTool,
    ],
    cijferUitleg:
      'Alleen gescheiden ingezameld PMD (kunststof, drankenkartons, blik en gemengde PMD-fractie). Gemeenten met nascheiding tonen een laag cijfer; wat zij achteraf uit het restafval halen, staat hier niet in.',
  },
  {
    id: 'textiel',
    naam: 'Textiel',
    kort: 'Gebruikte kleding en ander textiel, met producentenverantwoordelijkheid.',
    omschrijving: 'Gebruikte kleding en ander textiel. Producenten hebben sinds 2023 een uitgebreide verantwoordelijkheid; gemeenten blijven zorgen voor inzameling in de openbare ruimte.',
    cbsFracties: titels('textiel'),
    fractieSleutels: s.textiel,
    archiefStroom: 'Textiel',
    toolStroom: 'textiel',
    tools: [aanbesteding('textiel'), indexTool],
    cijferUitleg: 'Textiel volgens CBS, inclusief wat verenigingen, scholen en liefdadigheidsorganisaties inzamelen. Inzameling via winkels of producenten staat er niet in.',
  },
  {
    id: 'glas',
    naam: 'Glas',
    kort: 'Eenmalig verpakkingsglas: flessen en potten.',
    omschrijving: 'Eenmalig verpakkingsglas zoals flessen en potten. Vlakglas (ruiten en spiegels) valt hier niet onder.',
    cbsFracties: titels('glas'),
    fractieSleutels: s.glas,
    archiefStroom: 'Glas',
    tools: [aanbesteding(), indexTool],
    cijferUitleg: 'Verpakkingsglas volgens CBS; vlakglas is niet meegeteld.',
  },
  {
    id: 'grof',
    naam: 'Grof huishoudelijk afval',
    kort: 'Tuinafval, hout, matrassen en andere grote spullen die op de milieustraat komen.',
    omschrijving:
      'Wat te groot is voor de minicontainer: grof tuinafval, hout, matrassen, metalen, harde plastics en vloerbedekking. Grof restafval telt hier niet mee, dat staat bij restafval.',
    cbsFracties: titels('grof'),
    fractieSleutels: s.grof,
    archiefStroom: 'Grof afval',
    toolStroom: 'grof',
    tools: [aanbesteding('grof'), indexTool],
    cijferUitleg:
      'Som van de gescheiden grove fracties die CBS apart noemt. Bouw- en sloopafval, elektrische apparaten en bruikbaar huisraad zijn niet meegeteld.',
  },
  {
    id: 'luiers',
    naam: 'Luiers',
    kort: 'Luiers en ander incontinentiemateriaal.',
    omschrijving: 'Luiers en ander incontinentiemateriaal dat gemeenten apart inzamelen.',
    cbsFracties: titels('luiers'),
    fractieSleutels: s.luiers,
    archiefStroom: 'Luiers en incontinentiemateriaal',
    tools: [aanbesteding(), indexTool],
    cijferUitleg: 'Apart ingezamelde luiers en incontinentiemateriaal volgens CBS. Luiers in het restafval staan bij restafval.',
  },
  {
    id: 'kca',
    naam: 'Klein chemisch afval',
    kort: 'Verf, batterijen, afgewerkte olie en ander klein gevaarlijk afval.',
    omschrijving: 'Huishoudelijke afvalstoffen van de KCA-lijst, zoals afgewerkte olie en accu’s.',
    cbsFracties: titels('kca'),
    fractieSleutels: s.kca,
    archiefStroom: 'Gevaarlijk afval',
    tools: [aanbesteding(), indexTool],
    cijferUitleg: 'Klein chemisch afval volgens CBS, zonder elektrische apparaten.',
  },
];

export const stroomPerId = Object.fromEntries(stromen.map((x) => [x.id, x])) as Record<StroomId, Stroom>;
export const isStroomId = (w: string | undefined | null): w is StroomId => !!w && (STROOM_IDS as readonly string[]).includes(w);

export const stroomPad = (id: StroomId) => `/stromen/${id}`;
/** Het aanbestedingsarchief gefilterd op de stroom, zoals het archief de stroom noemt. */
export const archiefPad = (s: Stroom) => `/aanbestedingsarchief?stroom=${encodeURIComponent(s.archiefStroom)}`;
/** De documentenbibliotheek in het archief, gefilterd op dezelfde stroom (gebouwd in het archief zelf). */
export const documentenPad = (s: Stroom) => `/aanbestedingsarchief/documenten?stroom=${encodeURIComponent(s.archiefStroom)}`;
