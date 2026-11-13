// Heffingenscan restafval: tariefpaden, parameters, bronnen, peildatum en de status van het wetsvoorstel.
// Elk getal hieronder komt uit de genoemde officiële bron, geraadpleegd op PEILDATUM. Wat geen officiële bron heeft,
// staat in `aannames` en is in de pagina zichtbaar als aanname gelabeld.
//
// Eén waarheid met de CO2-heffingenscan voor installaties: het CO2-tarief, de AVI-correctiefactor, de nationale
// reductiefactor en de procesemissiefactor komen uit src/data/co2-tarieven.ts en worden hier alleen in de vorm gezet
// die de scan nodig heeft. De test heffingen.test.ts bewaakt dat de paden gelijk zijn aan tabel 11 en 12 van de
// memorie van toelichting.
// Bijwerken: zie docs/stukken/heffingenscan.md, "Als het Belastingplan verandert".

import { procesemissiefactor, reductiefactor, tariefpadPrijspeil2026, tariefpaden, vastgesteldeTarieven, bronnen as co2Bronnen } from './co2-tarieven';

/** Datum waarop alle bronnen hieronder zijn geraadpleegd. */
export const PEILDATUM = '2026-11-13';

/** Versie van de scan. Verhoog bij een wijziging in tarieven, regels of rekenwijze. */
export const heffingenscanVersie = {
  versie: '1.0',
  datum: '2026-11-13',
  wijzigingen: [
    {
      versie: '1.0',
      datum: '2026-11-13',
      tekst: 'Eerste versie op de website: alle gemeenten, tarieven uit de memorie van toelichting bij het Belastingplan 2027, status na de stemming in de Tweede Kamer van 12 november 2026.',
    },
  ],
};

export const JAREN = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035] as const;
export const PRIJSPEIL = 2026;

export type HeffingPadId = 'bp2027' | 'bp2026';

export interface HeffingBron {
  titel: string;
  url: string;
  /** ISO-datum waarop de bron is geraadpleegd. */
  peildatum: string;
}

export const heffingBronnen = {
  mvtBp2027: {
    titel: 'Wetsvoorstel Belastingplan 2027 met memorie van toelichting, par. 5.21, tabel 11 (afvalstoffenbelasting) en tabel 12 (CO2-heffing AVI’s) (Kamerstukken 37 022, 15 september 2026)',
    url: co2Bronnen.bp2027.url,
    peildatum: PEILDATUM,
  },
  eersteKamer: {
    titel: 'Eerste Kamer, dossier 37.022 Belastingplan 2027 (stand van zaken)',
    url: 'https://www.eerstekamer.nl/wetsvoorstel/37022_belastingplan_2027',
    peildatum: PEILDATUM,
  },
  stemmingTweedeKamer: {
    titel: 'Overzicht van stemmingen in de Tweede Kamer over wetsvoorstel 37.022, 12 november 2026',
    url: 'https://www.eerstekamer.nl/behandeling/20261112/stemmingsoverzicht_tweede_kamer_4/document3/f=/vn2lfl9ja3ze.pdf',
    peildatum: PEILDATUM,
  },
  tweedeKamer: {
    titel: 'Tweede Kamer, wetsvoorstel 37022 Belastingplan 2027',
    url: 'https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen/detail?dossier=37022&id=2026Z18819',
    peildatum: PEILDATUM,
  },
  iploAsb2026: {
    titel: 'IPLO, Afvalstoffenbelasting omhoog per 1 januari 2026 (30 december 2025)',
    url: 'https://iplo.nl/thema/bodem/nieuws-bodem/2025/afvalstoffenbelasting-omhoog-per-1-januari-2026/',
    peildatum: PEILDATUM,
  },
  neaTarieven: { ...co2Bronnen.neaTarieven, peildatum: PEILDATUM },
  neaAvi: { ...co2Bronnen.neaAvi, peildatum: PEILDATUM },
  neaDpr: { ...co2Bronnen.neaDpr, peildatum: PEILDATUM },
  neaFactoren: {
    titel: 'NEa, Berekeningsfactoren afvalstoffen 2014–2027, versie 28 september 2026 (emissiefactor en biomassafractie per afvalcategorie)',
    url: 'https://www.emissieautoriteit.nl/site/binaries/site-content/collections/documents/2026/10/1/berekeningsfactoren-afvalstoffen-avis-2014-2027/berekeningsfactoren-afvalstoffen-publicatie-2027.pdf',
    peildatum: PEILDATUM,
  },
} satisfies Record<string, HeffingBron>;

// ---------- Afvalstoffenbelasting ----------

/**
 * Tarief afvalstoffenbelasting 2026 (euro per ton): € 40,85 (IPLO; ook genoemd als huidig tarief in de memorie
 * van toelichting bij het Belastingplan 2027).
 */
export const ASB_2026 = 40.85;

/**
 * Tariefpad afvalstoffenbelasting 2027–2035, euro per ton afval, prijspeil 2026.
 * Bron: memorie van toelichting Belastingplan 2027, tabel 11 ("Huidig ASB-tarief – BP26" en "Nieuw voorstel – BP27").
 */
const asbTabel11: Record<HeffingPadId, number[]> = {
  bp2026: [40.85, 92.82, 95.29, 124.2, 112.98, 105.68, 101.56, 109.28, 117.1],
  bp2027: [40.85, 64, 71, 81, 81, 81, 81, 81, 81],
};

// ---------- CO2-heffing voor AVI's (uit co2-tarieven.ts) ----------

const co2Pad = (kolom: 'geldend' | 'voorstel') =>
  JAREN.map((jaar) => {
    // 2026 is vastgesteld (NEa: € 103,66); tabel 12 rondt dat af op 104. De jaren erna komen uit tabel 12.
    if (jaar === 2026) return vastgesteldeTarieven.find((t) => t.jaar === 2026)!.avi;
    return tariefpadPrijspeil2026.find((t) => t.jaar === jaar)![kolom];
  });

/** Correctiefactor per jaar; na het laatste jaar in de wet of het voorstel geldt de laatste waarde. */
const correctiePad = (factoren: Record<number, number>) =>
  JAREN.map((jaar) => {
    const laatste = Math.max(...Object.keys(factoren).map(Number).filter((j) => j <= jaar));
    return factoren[laatste];
  });

export interface HeffingPad {
  id: HeffingPadId;
  naam: string;
  /** Wat het pad juridisch is, in een paar woorden. */
  status: string;
  /** Afvalstoffenbelasting, euro per ton afval, per jaar 2026–2035 (prijspeil 2026). */
  asb: number[];
  /** CO2-heffing voor AVI's, euro per ton CO2, per jaar 2026–2035 (prijspeil 2026). */
  co2: number[];
  /** AVI-correctiefactor voor dispensatierechten per jaar. */
  correctiefactor: number[];
}

export const heffingPaden: Record<HeffingPadId, HeffingPad> = {
  bp2027: {
    id: 'bp2027',
    naam: 'Belastingplan 2027',
    status: 'wetsvoorstel',
    asb: [ASB_2026, ...asbTabel11.bp2027],
    co2: co2Pad('voorstel'),
    correctiefactor: correctiePad(tariefpaden.voorstel.correctiefactor),
  },
  bp2026: {
    id: 'bp2026',
    naam: 'Belastingplan 2026',
    status: 'geldende wet',
    asb: [ASB_2026, ...asbTabel11.bp2026],
    co2: co2Pad('geldend'),
    correctiefactor: correctiePad(tariefpaden.geldend.correctiefactor),
  },
};

export const anderPad = (pad: HeffingPadId): HeffingPadId => (pad === 'bp2027' ? 'bp2026' : 'bp2027');

/** Nationale reductiefactor voor dispensatierechten: 1,023 vanaf 2026 (NEa). */
export const NRF = reductiefactor[2026];

/** Procesemissiefactor per jaar: 0,97 in 2026 en 2027, 0,91 vanaf 2028 (NEa, pagina AVI's). */
export const PROCESEMISSIEFACTOR = JAREN.map((jaar) => (jaar >= 2028 ? procesemissiefactor[2028] : procesemissiefactor[2021]));

// ---------- NEa-berekeningsfactoren afvalstoffen ----------

/**
 * Voorlopige emissiefactor (ton CO2 per ton afval, biomassa en fossiel samen) en biomassafractie, per jaar.
 * Bron: NEa, Berekeningsfactoren afvalstoffen 2014–2027, hoofdstuk 4, categorie 2 "huishoudelijk afval" en
 * categorie 3 "grofvuil". Fossiele uitstoot per ton = emissiefactor × (1 − biomassafractie).
 */
export const neaFactoren = {
  huishoudelijk: {
    2019: { ef: 0.976, bio: 0.661 },
    2020: { ef: 0.965, bio: 0.657 },
    2021: { ef: 0.965, bio: 0.657 },
    2022: { ef: 0.96, bio: 0.662 },
    2023: { ef: 0.94, bio: 0.676 },
    2024: { ef: 0.959, bio: 0.664 },
    2025: { ef: 0.989, bio: 0.646 },
    2026: { ef: 0.989, bio: 0.646 },
    2027: { ef: 0.972, bio: 0.655 },
  } as Record<number, { ef: number; bio: number }>,
  /** Grofvuil: in alle jaren 2014–2027 dezelfde waarden. */
  grof: { ef: 1.076, bio: 0.635 },
};

/** Jaren waarover het historische activiteitsniveau van AVI's wordt bepaald (NEa: mediaan van de emissies 2019–2023). */
export const MEDIAAN_JAREN = [2019, 2020, 2021, 2022, 2023];

function mediaan(waarden: number[]): number {
  const s = [...waarden].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Mediaan 2019–2023 van emissiefactor (0,965) en biomassafractie (0,661) voor huishoudelijk afval. */
export const mediaanHuishoudelijk = {
  ef: mediaan(MEDIAAN_JAREN.map((j) => neaFactoren.huishoudelijk[j].ef)),
  bio: mediaan(MEDIAAN_JAREN.map((j) => neaFactoren.huishoudelijk[j].bio)),
};

// ---------- Standaardwaarden en aannames ----------

/** Standaardwaarden van "Rekenen met eigen cijfers". Wat hier staat en geen officiële bron heeft, staat ook in `aannames`. */
export const heffingStandaard = {
  /** Deel van de verbrande tonnen waarover afvalstoffenbelasting wordt betaald, na aftrek van bodemassen. */
  asbGrondslagPct: 75,
  /** Deel van het grove huishoudelijk restafval dat na sortering wordt verbrand. */
  grofVerbrandPct: 70,
  /** Deel van het fijne restafval dat wordt verbrand (100 = alles; lager bij nascheiding). */
  verbrandPct: 100,
  doorberekeningPct: 100,
  indexatiePct: 0,
  trendPct: 0,
  pad: 'bp2027' as HeffingPadId,
  /** Hoeveel minder fijn restafval per inwoner de pagina doorrekent onder "Wat een gemeente kan doen". */
  besparingKg: 10,
};

export interface Aanname {
  onderwerp: string;
  waarde: string;
  toelichting: string;
}

/** Alles waarvoor geen officiële bron bestaat. Zichtbaar onder "Methode en bronnen" en bij de velden zelf. */
export const aannames: Aanname[] = [
  {
    onderwerp: 'Al het fijne restafval wordt verbrand',
    waarde: '100 %',
    toelichting:
      'De scan rekent met al het fijne huishoudelijk restafval dat CBS meldt. Bij gemeenten met nascheiding wordt een deel niet verbrand; de bedragen zijn daar een bovengrens. Grof restafval en overig verbrand afval tellen standaard niet mee.',
  },
  {
    onderwerp: 'Grondslag afvalstoffenbelasting',
    waarde: `${heffingStandaard.asbGrondslagPct} %`,
    toelichting:
      'Kental KplusV: bodemassen die nuttig worden toegepast, mag de verwerker aftrekken. Bij ongeveer een kwart bodemas betaalt de AVI per saldo over ongeveer driekwart van de verbrande tonnen. Het werkelijke percentage verschilt per installatie.',
  },
  {
    onderwerp: 'Grof restafval dat wordt verbrand',
    waarde: `${heffingStandaard.grofVerbrandPct} %`,
    toelichting: 'Kental KplusV, alleen gebruikt als u grof restafval meerekent. Vraag het werkelijke aandeel na bij de sorteerder.',
  },
  {
    onderwerp: 'Fossiele uitstoot per ton en vrijgestelde uitstoot',
    waarde: 'landelijke NEa-factoren',
    toelichting:
      'De werkelijke heffing hangt af van de uitstoot en het historische activiteitsniveau van de AVI waar het afval heen gaat. De scan benadert dat met de landelijke NEa-factoren voor huishoudelijk afval en de mediaan daarvan over 2019–2023.',
  },
  {
    onderwerp: 'Factoren na 2027',
    waarde: 'gelijk aan 2027',
    toelichting:
      'De NEa heeft emissiefactor en biomassafractie tot en met 2027 gepubliceerd; de scan houdt de waarden van 2027 aan voor 2028–2035. De nationale reductiefactor (1,023) is gepubliceerd tot en met 2033 en de procesemissiefactor (0,91) vanaf 2028; voor latere jaren houdt de scan dezelfde waarden aan.',
  },
  {
    onderwerp: 'Doorberekening door de AVI',
    waarde: `${heffingStandaard.doorberekeningPct} %`,
    toelichting: 'De scan gaat ervan uit dat de verwerker beide heffingen volledig doorberekent. Wat u werkelijk betaalt, staat in het verwerkingscontract.',
  },
  {
    onderwerp: 'Prijspeil en indexatie',
    waarde: `prijspeil ${PRIJSPEIL}, ${heffingStandaard.indexatiePct} % indexatie`,
    toelichting: 'De tarieven uit de memorie van toelichting staan in prijspeil 2026. Voor nominale bedragen vult u zelf een indexatie in; dat percentage is uw eigen aanname.',
  },
];

/** Wat de scan niet meerekent. */
export const nietMeegenomen = [
  'Poorttarief, inzamelkosten en btw.',
  'Een mogelijke overgang van AVI’s naar het EU ETS.',
  'CO2-afvang, handel in dispensatierechten en andere keuzes van de verwerker.',
  'Veranderingen in de samenstelling van het restafval.',
];

// ---------- Status van het wetsvoorstel ----------

export type WetsFase = 'ingediend' | 'aangenomen-tweede-kamer' | 'aangenomen-eerste-kamer' | 'wet' | 'verworpen';

/**
 * Status van het wetsvoorstel Belastingplan 2027 op de peildatum. Bron: dossierpagina van de Eerste Kamer en het
 * stemmingsoverzicht van de Tweede Kamer van 12 november 2026.
 */
export const wetsstatus = {
  peildatum: PEILDATUM,
  dossier: '37 022',
  fase: 'aangenomen-tweede-kamer' as WetsFase,
  /** Eén regel voor in beeld. */
  kort: 'Aangenomen door de Tweede Kamer op 12 november 2026; de Eerste Kamer moet nog stemmen.',
  tekst:
    'De Tweede Kamer nam het wetsvoorstel Belastingplan 2027 op 12 november 2026 aan, na hoofdelijke stemming met 76 tegen 74 stemmen. De tarieven van de afvalstoffenbelasting en de CO2-heffing voor afvalverbranding zijn daarbij niet gewijzigd. Het voorstel ligt nu bij de Eerste Kamer; de commissie voor Financiën bespreekt op 17 november 2026 de procedure. Het is pas wet na aanvaarding door de Eerste Kamer en publicatie in het Staatsblad. Tot dan geldt het tariefpad uit het Belastingplan 2026.',
  stappen: [
    { datum: '2026-09-15', tekst: 'Wetsvoorstel ingediend bij de Tweede Kamer (Prinsjesdag).' },
    { datum: '2026-11-12', tekst: 'Aangenomen door de Tweede Kamer met 76 tegen 74 stemmen.' },
    { datum: '2026-11-17', tekst: 'Commissie voor Financiën van de Eerste Kamer bespreekt de procedure.' },
  ],
  /** Amendementen over afval in de Tweede Kamer, met de uitslag volgens het stemmingsoverzicht. */
  amendementen: [
    {
      nummer: 77,
      indiener: 'Van den Berg en Hoogeveen',
      onderwerp: 'Vrijstelling van afvalstoffenbelasting voor geïmporteerd afval per 1 januari 2028',
      uitslag: 'verworpen',
    },
    {
      nummer: 30,
      indiener: 'Teunissen',
      onderwerp: 'Stapsgewijze verhoging van de CO2-heffing voor industriële installaties (niet de AVI-tarieven)',
      uitslag: 'verworpen',
    },
    {
      nummer: 31,
      indiener: 'Teunissen',
      onderwerp: 'Lineaire verhoging van de CO2-heffing voor industriële installaties (niet de AVI-tarieven)',
      uitslag: 'verworpen',
    },
  ],
  /** De vier nota's van wijziging (14 en 20 oktober, 4 en 10 november 2026) raken de artikelen over afval niet. */
  notasVanWijziging: 'De vier nota’s van wijziging wijzigen de artikelen over de afvalstoffenbelasting (art. XXVIII e.v.) en de CO2-heffing voor AVI’s (art. XXVI, XXVII en LX) niet.',
  bronnen: [heffingBronnen.eersteKamer, heffingBronnen.stemmingTweedeKamer, heffingBronnen.tweedeKamer],
};

/** Ontwikkelingen die de uitkomst kunnen veranderen en niet in de berekening zitten. */
export const heffingOntwikkelingen: { titel: string; tekst: string; bron: HeffingBron }[] = [
  {
    titel: 'Eerste Kamer',
    tekst: 'Verwerpt de Eerste Kamer het Belastingplan 2027, dan blijft het hogere tariefpad uit het Belastingplan 2026 gelden.',
    bron: heffingBronnen.eersteKamer,
  },
  {
    titel: 'EU ETS voor afvalverbranding',
    tekst:
      'AVI’s monitoren hun CO2-uitstoot sinds 2024 voor het EU ETS, maar leveren nog geen emissierechten in. De Europese Commissie beoordeelt of AVI’s volledig gaan meedoen. De scan rekent daar niet mee.',
    bron: heffingBronnen.neaAvi,
  },
  {
    titel: 'Mogelijke afschaffing van de CO2-heffing',
    tekst:
      'Het coalitieakkoord 2026–2030 noemt afschaffing van de CO2-heffing. Volgens de NEa is dat pas definitief na een wetswijziging. Het Belastingplan 2027 bevat voor AVI’s juist een tariefpad tot en met 2035.',
    bron: { ...co2Bronnen.neaWatIs, peildatum: PEILDATUM },
  },
];
