// Lidmaatschap: staffels, prijzen, voorwaarden in het kort, vergelijking gratis/lid en veelgestelde vragen.
//
// CONCEPT. De prijzen zijn nog niet vastgesteld door KplusV (Niels Ahsmann). Zolang `prijzenVastgesteld` false is,
// toont de site overal het label "Concept". Wijzig een prijs alleen hier; de pagina's, de prijsberekening
// (src/lib/prijs.ts) en het aanmeldformulier lezen deze waarden.
//
// Bronnen voor de echte (externe) gegevens staan in `bronnen` onderaan, met peildatum.

import { tools } from './tools';

/** Zelfde waarden als de kolom `type` in de Supabase-tabel public.organisaties. */
export type StaffelId = 'samenwerkingsverband-klein' | 'samenwerkingsverband-groot' | 'gemeente' | 'verwerker';

export interface Staffel {
  id: StaffelId;
  naam: string;
  korteNaam: string;
  voorWie: string;
  /** Jaarprijs per organisatie in euro, exclusief btw. CONCEPT. */
  prijsExclBtw: number;
  /** Waarom deze prijs: herleidbaar naar de richtprijs uit het prototype. */
  onderbouwing: string;
}

/** Staat op false tot Niels de prijzen vaststelt. Dan verdwijnt het conceptlabel. */
export const prijzenVastgesteld = false;

/**
 * Keuze per staffel (14 oktober 2026, concept):
 * - De prototype-richtprijzen waren bandbreedtes. Voor een aanmelding op factuur is één vaste prijs nodig.
 * - Samenwerkingsverbanden en verwerker: het midden van de oude bandbreedte, afgerond op € 500.
 * - Gemeente: had geen richtprijs. Gekozen onder het kleine samenwerkingsverband, omdat één gemeente
 *   doorgaans één contract en één team heeft. Dit is een aanname die Niels nog moet toetsen.
 */
export const staffels: Staffel[] = [
  {
    id: 'samenwerkingsverband-klein',
    naam: 'Samenwerkingsverband, klein',
    korteNaam: 'Samenwerkingsverband klein',
    voorWie: 'Samenwerkingsverband van 2 of 3 gemeenten',
    prijsExclBtw: 2500,
    onderbouwing: 'Midden van de richtprijs € 2.000 – € 3.000 uit het prototype.',
  },
  {
    id: 'samenwerkingsverband-groot',
    naam: 'Samenwerkingsverband, groot',
    korteNaam: 'Samenwerkingsverband groot',
    voorWie: 'Samenwerkingsverband van 4 of meer gemeenten',
    prijsExclBtw: 8500,
    onderbouwing: 'Midden van de richtprijs € 7.000 – € 10.000 uit het prototype.',
  },
  {
    id: 'gemeente',
    naam: 'Gemeente',
    korteNaam: 'Gemeente',
    voorWie: 'Eén gemeente die zelf inzameling of verwerking contracteert',
    prijsExclBtw: 1500,
    onderbouwing: 'Nieuw; aanname onder de prijs voor een klein samenwerkingsverband. Nog te toetsen.',
  },
  {
    id: 'verwerker',
    naam: 'Verwerker',
    korteNaam: 'Verwerker',
    voorWie: 'Afvalverwerker of sorteerder, één vestiging of concern',
    prijsExclBtw: 5500,
    onderbouwing: 'Midden van de richtprijs € 3.000 – € 8.000 uit het prototype. Een staffel naar omvang kan later.',
  },
];

export function staffelVan(id: StaffelId): Staffel {
  const s = staffels.find((x) => x.id === id);
  if (!s) throw new Error(`Onbekende staffel: ${id}`);
  return s;
}

/** Organisatietype zoals de aanmelder het kiest. De staffel volgt daaruit (zie src/lib/prijs.ts). */
export type Organisatietype = 'samenwerkingsverband' | 'gemeente' | 'verwerker';

export interface OrganisatietypeOptie {
  waarde: Organisatietype;
  label: string;
  /** Overheden mogen het btw-nummer leeg laten. */
  overheid: boolean;
}

export const organisatietypen: OrganisatietypeOptie[] = [
  { waarde: 'samenwerkingsverband', label: 'Samenwerkingsverband van gemeenten (bijv. gemeenschappelijke regeling)', overheid: true },
  { waarde: 'gemeente', label: 'Gemeente', overheid: true },
  { waarde: 'verwerker', label: 'Afvalverwerker of sorteerder', overheid: false },
];

/**
 * Wat de aanvrager wil: direct lid worden, of eerst een offerte voor het eigen inkoopproces.
 * Beide gaan via hetzelfde formulier en hetzelfde Netlify-formulier ("aanmelding", veld `soort`).
 */
export type Aanvraagsoort = 'aanmelding' | 'offerte';

/** Vanaf dit aantal gemeenten geldt het tarief voor een groot samenwerkingsverband. */
export const grensGrootSamenwerkingsverband = 4;

/** Algemeen btw-tarief in procenten. Bron: Belastingdienst, zie `bronnen.btw`. */
export const btwPercentage = 21;

/** Contractvoorwaarden in het kort. CONCEPT; de volledige tekst staat in de algemene voorwaarden. */
export const voorwaarden = {
  looptijdMaanden: 12,
  /** Stilzwijgende verlenging met deze termijn. */
  verlengingMaanden: 12,
  /** Opzeggen kan tot uiterlijk zoveel maanden vóór de einddatum. */
  opzegtermijnMaanden: 1,
  /** Betaaltermijn van de factuur. 30 dagen is de wettelijke termijn voor overheidsinstanties zonder andere afspraak (art. 6:119b lid 2 en 5 BW). */
  betaaltermijnDagen: 30,
  /** Prijswijzigingen voor een nieuw contractjaar melden we uiterlijk zoveel maanden van tevoren. */
  prijswijzigingAankondigingMaanden: 3,
  /** Werkdagen waarbinnen KplusV een aanmelding per e-mail bevestigt. Interne afspraak, concept. */
  bevestigingWerkdagen: 2,
  /** Een startdatum mag maximaal zoveel maanden vooruit liggen. */
  maxStartVooruitMaanden: 6,
  /** Proeftoegang op aanvraag, kosteloos, eindigt vanzelf. Concept. */
  proefDagen: 30,
  /** Geldigheid van een offerte. Gelijk aan artikel 3 van de algemene voorwaarden. */
  offerteGeldigDagen: 30,
};

export interface Onderdeel {
  onderdeel: string;
  gratis: string;
  lid: string;
  /** false: niet opnemen in de korte lijsten gratis/leden (bijv. de rij over het aantal gebruikers). */
  inLijsten?: boolean;
}

/**
 * Rij per rekentool, rechtstreeks uit src/data/tools.ts (toegang, gratisDeel, proDeel). Zo blijft de vergelijking gelijk
 * aan wat de tools zelf vrij en betaald maken; pas de tekst daar aan, niet hier.
 */
const toolRijen: Onderdeel[] = tools.map((t) => ({
  onderdeel: t.titel,
  gratis: t.toegang === 'leden' ? 'Nee' : t.toegang === 'gratis' ? 'Ja' : (t.gratisDeel ?? 'Beperkt'),
  lid: t.toegang === 'gratis+pro' ? (t.proDeel ?? 'Volledig') : 'Ja',
}));

/** Vergelijkingstabel gratis versus lid. Teksten in de cellen, zodat de betekenis niet alleen van een icoon afhangt. */
export const vergelijking: Onderdeel[] = [
  { onderdeel: 'Restafvalkaart: afvalcijfers per gemeente en samenwerkingsverband', gratis: 'Ja', lid: 'Ja' },
  { onderdeel: 'Nieuwsoverzicht afvalverwerking', gratis: 'Ja', lid: 'Ja' },
  { onderdeel: 'Kennisbank: onderzoeken, factsheets, handreikingen', gratis: 'Ja', lid: 'Ja' },
  ...toolRijen,
  { onderdeel: 'Aanbestedingsarchief met filters', gratis: 'Nee', lid: 'Ja' },
  {
    onderdeel: 'Aantal gebruikers',
    gratis: 'Iedereen, zonder account',
    lid: 'Alle collega’s met een e-mailadres van uw organisatie',
    inLijsten: false,
  },
];

/** Korte lijsten, onder meer gebruikt op Over het platform (GratisBetaald). */
export const gratisOnderdelen = vergelijking.filter((o) => o.inLijsten !== false && o.gratis !== 'Nee').map((o) => o.onderdeel);
export const ledenOnderdelen = vergelijking.filter((o) => o.inLijsten !== false && o.gratis !== 'Ja').map((o) => o.onderdeel);

/** Wat bij elk lidmaatschap inbegrepen is, ongeacht de staffel. */
export const inbegrepen = [
  'Toegang voor alle medewerkers met een e-mailadres op het domein van uw organisatie',
  'Volledige versies van alle rekentools, met rapport en CSV-export waar de tool die biedt',
  'Het aanbestedingsarchief met filters op afvalstroom, status en regio',
  'Jaarlijkse actualisatie van de standaardwaarden en reeksen in de rekentools',
  'Vragen over de rekentools per e-mail aan KplusV',
  'Eén factuur per jaar, op naam van uw organisatie, met uw inkoopordernummer',
];

export interface Vraag {
  vraag: string;
  antwoord: string[];
}

export const veelgesteldeVragen: Vraag[] = [
  {
    vraag: 'Wij werken met een offerte en een inkoopordernummer. Kan dat?',
    antwoord: [
      `Ja. Kies in het aanmeldformulier “Eerst een offerte ontvangen”. U vult dezelfde gegevens in en krijgt binnen ${voorwaarden.bevestigingWerkdagen} werkdagen een offerte als pdf, met dezelfde prijs en voorwaarden als op deze pagina. De offerte is ${voorwaarden.offerteGeldigDagen} dagen geldig. Een offerteaanvraag verplicht u tot niets. Het jaarbedrag ligt ver onder de Europese drempel voor leveringen en diensten van decentrale overheden. Welke procedure u volgt, bepaalt uw eigen inkoopbeleid.`,
      'Heeft u een inkoopordernummer, vul het in bij de aanmelding. Het komt op de factuur. Krijgt u het nummer pas later, mail het dan voor de startdatum, dan wachten we met factureren.',
    ],
  },
  {
    vraag: 'Kunnen we een e-factuur krijgen?',
    antwoord: [
      'Standaard sturen we de factuur als pdf naar het e-mailadres van uw crediteurenadministratie. Heeft u een e-factuur via Peppol nodig, kies dat bij de aanmelding en vul uw OIN of Peppol-ID in. KplusV bevestigt dan of en hoe dat kan (concept: nog niet ingericht).',
    ],
  },
  {
    vraag: 'Hoeveel gebruikers mogen er inloggen?',
    antwoord: [
      'Zoveel als u wilt. U betaalt per organisatie. Iedereen met een e-mailadres op het domein dat u opgeeft, bijvoorbeeld @gemeente-voorbeeld.nl, kan inloggen. Openbare maildomeinen zoals gmail.com zijn uitgesloten. Werken medewerkers met een ander domein, zoals een samenwerkingsverband met eigen adressen, geef dan alle domeinen op.',
    ],
  },
  {
    vraag: 'Is er een proefperiode?',
    antwoord: [
      `Ja, op aanvraag: ${voorwaarden.proefDagen} dagen volledige toegang voor uw organisatie, kosteloos. De proeftoegang stopt vanzelf; u hoeft niet op te zeggen en krijgt geen factuur. Vraag het aan per e-mail. Daarnaast is een groot deel van het platform altijd gratis.`,
    ],
  },
  {
    vraag: 'Hoe lang loopt het lidmaatschap en hoe zeg ik op?',
    antwoord: [
      `Het lidmaatschap loopt ${voorwaarden.looptijdMaanden} maanden vanaf de startdatum en wordt daarna steeds met ${voorwaarden.verlengingMaanden} maanden verlengd. Opzeggen kan per e-mail tot uiterlijk ${voorwaarden.opzegtermijnMaanden} maand voor de einddatum. U krijgt een bevestiging van de opzegging.`,
    ],
  },
  {
    vraag: 'Wanneer krijgen we de factuur en hoe snel moet die betaald zijn?',
    antwoord: [
      `De factuur volgt op de startdatum, daarna steeds aan het begin van elk contractjaar. De betaaltermijn is ${voorwaarden.betaaltermijnDagen} dagen.`,
    ],
  },
  {
    vraag: 'Kan de prijs veranderen?',
    antwoord: [
      `Binnen een contractjaar niet. Een nieuwe prijs voor het volgende jaar melden we uiterlijk ${voorwaarden.prijswijzigingAankondigingMaanden} maanden voor de verlenging. Bent u het er niet mee eens, dan kunt u opzeggen per de einddatum.`,
    ],
  },
  {
    vraag: 'Onze organisatie past niet in een van de staffels. Wat nu?',
    antwoord: [
      'Bijvoorbeeld een provincie, een uitvoeringsorganisatie of een adviesbureau. Neem contact op; we maken dan een voorstel op maat.',
    ],
  },
];

/** Externe bronnen voor echte gegevens op de lidmaatschapspagina's. Peildatum = datum van raadplegen. */
export const bronnen = {
  btw: {
    feit: 'Algemeen btw-tarief 21 %',
    titel: 'Belastingdienst – Btw-tarieven en vrijstellingen',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/',
    peildatum: '2026-10-14',
  },
  betaaltermijn: {
    feit: 'Een overheidsinstantie die geen andere uiterste betaaldag heeft afgesproken, is na 30 dagen na ontvangst van de factuur wettelijke rente verschuldigd; een langere termijn kan alleen uitdrukkelijk en tot ten hoogste 60 dagen',
    titel: 'Burgerlijk Wetboek Boek 6, artikel 119b, lid 2 en 5 (wetten.overheid.nl)',
    url: 'https://wetten.overheid.nl/jci1.3:c:BWBR0005289&boek=6&titeldeel=1&afdeling=11&artikel=119b',
    peildatum: '2026-10-15',
  },
  drempel: {
    feit: 'Europese drempel leveringen en diensten decentrale overheid 2026–2027: € 216.000 excl. btw',
    titel: 'PIANOo – Drempelbedragen Europees aanbesteden',
    url: 'https://www.pianoo.nl/nl/regelgeving/drempelbedragen-europees-aanbesteden',
    peildatum: '2026-10-14',
  },
  oin: {
    feit: 'Het OIN telt 20 posities',
    titel: 'Logius – OIN-stelsel, documentatie versie 2.2.2',
    url: 'https://gitdocumentatie.logius.nl/publicatie/dk/oin/2.2.2/',
    peildatum: '2026-10-14',
  },
  efactuur: {
    feit: 'E-factureren via Peppol',
    titel: 'Logius – E-factureren',
    url: 'https://www.logius.nl/onze-dienstverlening/gegevensuitwisseling/e-factureren',
    peildatum: '2026-10-14',
  },
  kvk: {
    feit: 'Een KVK-nummer heeft acht cijfers; ook overheden staan in het Handelsregister',
    titel: 'KVK – KVK-nummer: goed om te weten',
    url: 'https://www.kvk.nl/over-het-handelsregister/kvk-nummer-alles-wat-je-moet-weten/',
    peildatum: '2026-10-15',
  },
  btwId: {
    feit: 'Een btw-identificatienummer is NL + 9 cijfers + B + 2 cijfers, bijvoorbeeld NL123456789B01',
    titel: 'Ondernemersplein (KVK en Rijksoverheid) – Nummers voor de btw',
    url: 'https://ondernemersplein.overheid.nl/geldzaken-en-belastingen/omzetbelasting-btw/nummers-voor-de-btw/',
    peildatum: '2026-10-15',
  },
} as const;

export type BronSleutel = keyof typeof bronnen;

/** Openbare maildomeinen die nooit als organisatiedomein mogen. Gelijk aan de check in de Supabase-tabel organisaties. */
export const publiekeMaildomeinen = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'live.nl', 'live.com', 'yahoo.com', 'icloud.com', 'ziggo.nl',
  'kpnmail.nl', 'planet.nl', 'home.nl', 'xs4all.nl', 'hotmail.nl', 'msn.com', 'proton.me', 'protonmail.com',
];

/** Netlify Forms. Houd de veldnamen gelijk aan de verborgen kopie in index.html. */
export const AANMELD_FORMULIER = 'aanmelding';
export const AANMELD_LOKALE_OPSLAG = 'afvalplatform-aanmelding';

export const aanmeldVelden = [
  'soort', 'ordernummer', 'organisatie', 'type', 'aantal_gemeenten', 'staffel', 'kvk', 'btw_nummer', 'oin',
  'factuur_adres', 'factuur_postcode', 'factuur_plaats', 'factuur_ter_attentie', 'crediteuren_email',
  'factuurvorm', 'peppol_id', 'inkoopordernummer', 'contact_naam', 'contact_functie', 'contact_email',
  'contact_telefoon', 'toegang', 'startdatum', 'einddatum', 'prijs_excl_btw', 'btw', 'prijs_incl_btw',
  'opmerkingen', 'akkoord_voorwaarden', 'akkoord_privacy',
] as const;

/**
 * Oude vorm, nog gebruikt op de homepage ("vanaf"). Bevat nu één vaste conceptprijs per staffel.
 * @deprecated Gebruik `staffels`.
 */
export interface Prijsklasse {
  doelgroep: string;
  toelichting: string;
  van: number;
  tot: number;
}
export const prijsklassen: Prijsklasse[] = staffels.map((s) => ({
  doelgroep: s.naam,
  toelichting: s.voorWie,
  van: s.prijsExclBtw,
  tot: s.prijsExclBtw,
}));
