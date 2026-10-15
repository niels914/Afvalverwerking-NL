// Feiten achter de juridische pagina's: aanbieder, versies, bronnen, browseropslag en externe diensten.
//
// Onderhoud:
// - Verandert een tekst inhoudelijk, verhoog dan `versie` en zet `gewijzigd` op de nieuwe datum (documenten hieronder).
// - Komt er een nieuwe sleutel in localStorage/sessionStorage, een cookie, een Supabase-tabel of -functie bij,
//   voeg die dan toe aan `opslag` of `supabaseGebruik`. De test opslag.test.ts faalt tot dat gebeurd is.
// - Elk feit dat uit een externe bron komt, staat in `bronnen` met URL en peildatum (datum van raadplegen).

import { contact } from '../../data/site';

export type DocumentId = 'algemene-voorwaarden' | 'privacy' | 'cookies' | 'toegankelijkheid' | 'disclaimer';

export interface DocumentMeta {
  titel: string;
  pad: string;
  versie: string;
  /** Datum van de laatste inhoudelijke wijziging (jjjj-mm-dd). */
  gewijzigd: string;
  /** True zolang de tekst niet juridisch is getoetst. Dan staat de conceptmarkering bovenaan. */
  concept: boolean;
}

export const documenten: Record<DocumentId, DocumentMeta> = {
  'algemene-voorwaarden': { titel: 'Algemene voorwaarden', pad: '/algemene-voorwaarden', versie: '0.1', gewijzigd: '2026-10-15', concept: true },
  privacy: { titel: 'Privacyverklaring', pad: '/privacy', versie: '0.1', gewijzigd: '2026-10-15', concept: true },
  cookies: { titel: 'Cookieverklaring', pad: '/cookies', versie: '0.1', gewijzigd: '2026-10-15', concept: true },
  toegankelijkheid: { titel: 'Toegankelijkheidsverklaring', pad: '/toegankelijkheid', versie: '0.1', gewijzigd: '2026-10-15', concept: true },
  disclaimer: { titel: 'Disclaimer en colofon', pad: '/disclaimer', versie: '0.1', gewijzigd: '2026-10-15', concept: true },
};

export interface Bron {
  feit: string;
  titel: string;
  url: string;
  /** Datum van raadplegen (jjjj-mm-dd). */
  peildatum: string;
  opmerking?: string;
}

/** Externe bronnen voor feiten op de juridische pagina's en in de voettekst. */
export const bronnen = {
  kvk: {
    feit: 'KplusV B.V., KVK-nummer 09055476, hoofdvestiging Arnhem',
    titel: 'Companyinfo – KplusV B.V. (gegevens uit het Handelsregister)',
    url: 'https://www.companyinfo.nl/organisatieprofiel/activiteiten-van-organisatie-adviesbureaus/kplusv-b-v-arnhem-09055476-000019031661',
    peildatum: '2026-10-15',
    opmerking: 'Afgeleide bron. Nog controleren in het Handelsregister van KVK (kvk.nl/zoeken) of op het briefpapier van KplusV.',
  },
  adres: {
    feit: 'Bezoekadres Westervoortsedijk 73, 6827 AV Arnhem (Arnhem Cleantech Park), telefoon 026 355 13 55',
    titel: 'KplusV – Contact',
    url: 'https://www.kplusv.nl/contact',
    peildatum: '2026-10-15',
  },
  avKplusV: {
    feit: 'Algemene voorwaarden KplusV B.V., gedeponeerd op 5 februari 2026 bij de griffie van de rechtbank Gelderland onder nummer A/05/26/4',
    titel: 'KplusV – Algemene voorwaarden (pdf)',
    url: 'https://www.kplusv.nl/media/x32d0xwf/algemene-voorwaarden-kplusv.pdf',
    peildatum: '2026-10-15',
  },
  telecomwet: {
    feit: 'Opslag in de browser zonder toestemming is toegestaan als die strikt noodzakelijk is voor de dienst waar de gebruiker om vraagt',
    titel: 'Telecommunicatiewet, artikel 11.7a lid 3 (wetten.overheid.nl)',
    url: 'https://wetten.overheid.nl/jci1.3:c:BWBR0009950&hoofdstuk=11&paragraaf=11.1&artikel=11.7a',
    peildatum: '2026-10-15',
  },
  bewaarplicht: {
    feit: 'Administratieplichtigen bewaren hun administratie zeven jaar',
    titel: 'Algemene wet inzake rijksbelastingen, artikel 52 lid 4 (wetten.overheid.nl)',
    url: 'https://wetten.overheid.nl/jci1.3:c:BWBR0002320&hoofdstuk=VIII&afdeling=1&artikel=52',
    peildatum: '2026-10-15',
  },
  avg: {
    feit: 'Algemene verordening gegevensbescherming (AVG); antwoord op een verzoek binnen een maand (artikel 12 lid 3)',
    titel: 'Verordening (EU) 2016/679 (EUR-Lex)',
    url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    peildatum: '2026-10-15',
  },
  apKlacht: {
    feit: 'Klacht indienen bij de Autoriteit Persoonsgegevens',
    titel: 'Autoriteit Persoonsgegevens – Een tip of klacht indienen',
    url: 'https://www.autoriteitpersoonsgegevens.nl/een-tip-of-klacht-indienen-bij-de-ap',
    peildatum: '2026-10-15',
  },
  adequaatheid: {
    feit: 'De Europese Commissie heeft adequaatheidsbesluiten voor onder meer het Verenigd Koninkrijk (vernieuwd in december 2025) en voor Amerikaanse bedrijven die deelnemen aan het EU-US Data Privacy Framework',
    titel: 'Europese Commissie – Adequacy decisions',
    url: 'https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en',
    peildatum: '2026-10-15',
  },
  netlifyPrivacy: {
    feit: 'Netlify, Inc. neemt deel aan het EU-US Data Privacy Framework en gebruikt daarnaast de standaardcontractbepalingen van de Europese Commissie (besluit 2021/914)',
    titel: 'Netlify – Privacy Statement (paragraaf 5 en 13)',
    url: 'https://www.netlify.com/privacy/',
    peildatum: '2026-10-15',
  },
  supabasePrivacy: {
    feit: 'Supabase, Inc. baseert doorgifte naar de Verenigde Staten op standaardcontractbepalingen van de Europese Commissie',
    titel: 'Supabase – Privacy Policy',
    url: 'https://supabase.com/privacy',
    peildatum: '2026-10-15',
  },
  supabaseSubverwerkers: {
    feit: 'Lijst van subverwerkers van Supabase, laatst bijgewerkt 12 oktober 2026',
    titel: 'Supabase – Subprocessor List',
    url: 'https://supabase.com/legal/subprocessors',
    peildatum: '2026-10-15',
  },
  supabaseRegio: {
    feit: 'Supabase-project afvalverwerking-nl draait in regio eu-central-1 (Frankfurt am Main, Duitsland)',
    titel: 'Supabase – projectinstellingen (opgevraagd via de beheer-API)',
    url: 'https://supabase.com/docs/guides/platform/regions',
    peildatum: '2026-10-15',
  },
  osmPrivacy: {
    feit: 'De OpenStreetMap Foundation verwerkt IP-adressen en verzoeken bij het leveren van kaarttegels via een wereldwijd netwerk van cacheservers; overige persoonsgegevens staan in het Verenigd Koninkrijk en Nederland',
    titel: 'OpenStreetMap Foundation – Privacy Policy',
    url: 'https://osmfoundation.org/wiki/Privacy_Policy',
    peildatum: '2026-10-15',
  },
  osmTegels: {
    feit: 'Gebruik van tile.openstreetmap.org is gratis, zonder garantie op beschikbaarheid, met naamsvermelding en zonder massaal downloaden',
    titel: 'OpenStreetMap Foundation – Tile Usage Policy',
    url: 'https://operations.osmfoundation.org/policies/tiles/',
    peildatum: '2026-10-15',
  },
  osmLicentie: {
    feit: 'OpenStreetMap-gegevens: © OpenStreetMap-bijdragers, Open Database License (ODbL)',
    titel: 'OpenStreetMap – Copyright and License',
    url: 'https://www.openstreetmap.org/copyright',
    peildatum: '2026-10-15',
  },
  cbsLicentie: {
    feit: 'Inhoud van cbs.nl valt onder Creative Commons Naamsvermelding (CC BY 4.0): hergebruik mag met CBS als bron',
    titel: 'CBS – Copyright',
    url: 'https://www.cbs.nl/nl-nl/over-ons/website/copyright',
    peildatum: '2026-10-15',
  },
  tenderned: {
    feit: 'TenderNed publiceert datasets over aanbestedingen voor analyses',
    titel: 'TenderNed – Datasets aanbesteden voor analyses',
    url: 'https://www.tenderned.nl/cms/nl/aanbesteden-in-cijfers/datasets-aanbestedingen',
    peildatum: '2026-10-15',
  },
  statussen: {
    feit: 'Statussen A tot en met E voor toegankelijkheidsverklaringen; status A en B vragen een volledig onderzoek van hooguit 3 jaar oud, status C een onderzoek dat binnen 6 maanden is gepland',
    titel: 'DigiToegankelijk – Wat betekenen de statussen?',
    url: 'https://www.digitoegankelijk.nl/toegankelijkheidsverklaring/status',
    peildatum: '2026-10-15',
  },
  modelverklaring: {
    feit: 'Model en invulassistent voor de toegankelijkheidsverklaring',
    titel: 'Logius – toegankelijkheidsverklaring.nl',
    url: 'https://www.toegankelijkheidsverklaring.nl/',
    peildatum: '2026-10-15',
  },
  wcag: {
    feit: 'Web Content Accessibility Guidelines 2.1',
    titel: 'W3C – WCAG 2.1',
    url: 'https://www.w3.org/TR/WCAG21/',
    peildatum: '2026-10-15',
  },
  bdto: {
    feit: 'Besluit digitale toegankelijkheid overheid (geldt voor overheidsinstanties)',
    titel: 'Besluit digitale toegankelijkheid overheid (wetten.overheid.nl)',
    url: 'https://wetten.overheid.nl/BWBR0040936',
    peildatum: '2026-10-15',
  },
  poppins: {
    feit: 'Lettertype Poppins, SIL Open Font License 1.1, bestanden uit @fontsource/poppins 5.2.7',
    titel: 'Fontsource – Poppins',
    url: 'https://fontsource.org/fonts/poppins',
    peildatum: '2026-10-15',
  },
} satisfies Record<string, Bron>;

export type BronSleutel = keyof typeof bronnen;

/** Gegevens van de aanbieder. KVK-nummer en adres: zie bronnen.kvk en bronnen.adres. */
export const aanbieder = {
  naam: 'KplusV B.V.',
  handelsnaam: 'KplusV',
  straat: 'Westervoortsedijk 73',
  postcode: '6827 AV',
  plaats: 'Arnhem',
  kvk: '09055476',
  telefoonAlgemeen: '026 355 13 55',
  emailAlgemeen: 'info@kplusv.nl',
  website: 'https://www.kplusv.nl',
  contact,
  /** Rechtbank bij geschillen; volgt uit artikel 15 van de algemene voorwaarden van KplusV. */
  rechtbank: 'Rechtbank Gelderland, locatie Arnhem',
};

/** Projectgegevens voor de privacy- en cookieverklaring. */
export const supabaseProject = {
  ref: 'mnwynrioozcqqvhelqku',
  regio: 'eu-central-1 (Frankfurt am Main, Duitsland)',
};

// ---------- Browseropslag (cookieverklaring) ----------

export type Opslagsoort = 'localStorage' | 'sessionStorage' | 'cookie';

export interface OpslagItem {
  sleutel: string;
  soort: Opslagsoort;
  /** Wie de opslag plaatst. */
  partij: string;
  doel: string;
  inhoud: string;
  /** Wanneer de opslag ontstaat. */
  wanneer: string;
  bewaarduur: string;
  /** Bestanden (vanaf de projectmap) die deze opslag lezen of schrijven. Gebruikt door opslag.test.ts. */
  codebestanden: string[];
}

export const opslag: OpslagItem[] = [
  {
    sleutel: `sb-${supabaseProject.ref}-auth-token`,
    soort: 'localStorage',
    partij: 'Dit platform (Supabase Auth)',
    doel: 'U ingelogd houden, ook als u de pagina vernieuwt of later terugkomt.',
    inhoud: 'Toegangstoken en verversingstoken van uw sessie, uw e-mailadres en de gebruikers-ID.',
    wanneer: 'Na inloggen met wachtwoord of inloglink.',
    bewaarduur: 'Tot u uitlogt. Het toegangstoken is kort geldig en wordt automatisch ververst zolang u ingelogd blijft.',
    codebestanden: ['src/lib/supabase.ts'],
  },
  {
    sleutel: 'afvalplatform-aanmelding-concept',
    soort: 'sessionStorage',
    partij: 'Dit platform',
    doel: 'Wat u in het aanmeldformulier invult niet kwijtraken als u tussendoor een andere pagina opent, bijvoorbeeld de voorwaarden.',
    inhoud: 'De ingevulde velden van het aanmeldformulier, zonder de vinkjes voor akkoord.',
    wanneer: 'Zodra u het aanmeldformulier invult.',
    bewaarduur: 'Tot u het tabblad sluit of de aanmelding verstuurt.',
    codebestanden: ['src/pages/Aanmelden.tsx'],
  },
  {
    sleutel: 'afvalplatform-aanmelding',
    soort: 'localStorage',
    partij: 'Dit platform',
    doel: 'Reservekopie van uw aanmelding als het versturen mislukt, zodat u die per e-mail kunt sturen.',
    inhoud: 'De gegevens van de aanmelding, met tijdstip.',
    wanneer: 'Alleen als het versturen van de aanmelding mislukt.',
    bewaarduur: 'Tot u de browsergegevens van deze site wist.',
    codebestanden: ['src/pages/Aanmelden.tsx', 'src/data/lidmaatschap.ts'],
  },
  {
    sleutel: 'afvalplatform-feedback',
    soort: 'localStorage',
    partij: 'Dit platform',
    doel: 'Reservekopie van uw feedback als het versturen mislukt.',
    inhoud: 'Uw antwoorden op het feedbackformulier, met tijdstip.',
    wanneer: 'Alleen als het versturen van het feedbackformulier mislukt.',
    bewaarduur: 'Tot u de browsergegevens van deze site wist.',
    codebestanden: ['src/components/FeedbackFormulier.tsx', 'src/data/feedback.ts'],
  },
];

/** Datum waarop de cookies en opslag zijn gemeten met een echte browser (e2e/juridisch.spec.ts). */
export const opslagGemetenOp = '2026-10-15';

// ---------- Supabase (privacyverklaring) ----------

export interface SupabaseGebruik {
  /** Naam van de tabel (`from`) of functie (`rpc`) zoals in de code. */
  naam: string;
  soort: 'tabel' | 'functie';
  wat: string;
}

/** Alle tabellen en functies van de database die de site aanroept. Gecontroleerd door opslag.test.ts. */
export const supabaseGebruik: SupabaseGebruik[] = [
  { naam: 'is_lid', soort: 'functie', wat: 'Controleert of uw bevestigde e-maildomein hoort bij een organisatie met een actief lidmaatschap. Geeft alleen ja of nee terug.' },
  { naam: 'mijn_lidmaatschap', soort: 'functie', wat: 'Geeft naam, soort, status en einddatum van het lidmaatschap van uw organisatie terug, om te tonen op Mijn account.' },
];

// ---------- Externe diensten (privacy- en cookieverklaring) ----------

export interface ExterneDienst {
  naam: string;
  partij: string;
  rol: string;
  waarvoor: string;
  gegevens: string;
  waar: string;
  doorgifte: string;
  bron: BronSleutel[];
}

export const externeDiensten: ExterneDienst[] = [
  {
    naam: 'Supabase',
    partij: 'Supabase, Inc. (Verenigde Staten)',
    rol: 'Verwerker voor KplusV',
    waarvoor: 'Inloggen, accounts en de ledenadministratie (welke organisatie lid is en met welke e-maildomeinen).',
    gegevens: 'E-mailadres, versleuteld wachtwoord (als u dat instelt), tijdstippen van aanmaken en inloggen, technische logboeken met IP-adres en browsertype.',
    waar: `Database in de Europese Unie: ${supabaseProject.regio}.`,
    doorgifte: 'Supabase is een Amerikaans bedrijf. Beheer, support en sommige subverwerkers kunnen gegevens vanuit de Verenigde Staten inzien. Supabase gebruikt daarvoor de standaardcontractbepalingen van de Europese Commissie.',
    bron: ['supabaseRegio', 'supabasePrivacy', 'supabaseSubverwerkers'],
  },
  {
    naam: 'Netlify',
    partij: 'Netlify, Inc. (Verenigde Staten)',
    rol: 'Verwerker voor KplusV',
    waarvoor: 'Hosting van de website en ontvangst van het aanmeldformulier en het feedbackformulier.',
    gegevens: 'IP-adres, opgevraagde pagina, tijdstip en browsertype in serverlogboeken; de inhoud van verzonden formulieren.',
    waar: 'Netlify levert pagina’s via servers wereldwijd; formulierinzendingen bewaart Netlify in de Verenigde Staten.',
    doorgifte: 'Doorgifte naar de Verenigde Staten. Netlify neemt deel aan het EU-US Data Privacy Framework en gebruikt daarnaast standaardcontractbepalingen.',
    bron: ['netlifyPrivacy', 'adequaatheid'],
  },
  {
    naam: 'OpenStreetMap',
    partij: 'OpenStreetMap Foundation (Verenigd Koninkrijk)',
    rol: 'Zelfstandig verantwoordelijk',
    waarvoor: 'Kaarttegels op de pagina Restafvalkaart.',
    gegevens: 'Uw IP-adres, het opgevraagde kaartdeel, het adres van de pagina (referrer) en uw browsertype. Alleen als u de kaart opent.',
    waar: 'Wereldwijd netwerk van cacheservers; overige gegevens in het Verenigd Koninkrijk en Nederland.',
    doorgifte: 'Het Verenigd Koninkrijk heeft een adequaatheidsbesluit van de Europese Commissie. Via welke cacheserver een tegel komt, bepaalt het netwerk van OpenStreetMap.',
    bron: ['osmPrivacy', 'adequaatheid'],
  },
];
