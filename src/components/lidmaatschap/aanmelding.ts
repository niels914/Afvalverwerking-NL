// Aanmeldformulier lidmaatschap: gegevens, controles en het formaat voor Netlify Forms.
// Pure functies, getest in aanmelding.test.ts. De veldnamen moeten gelijk blijven aan
// `aanmeldVelden` in src/data/lidmaatschap.ts en aan de verborgen kopie in index.html.

import {
  AANMELD_FORMULIER,
  gemeentenInNederland,
  organisatietypen,
  publiekeMaildomeinen,
  staffelVan,
  type Aanvraagsoort,
  type Organisatietype,
  type Staffel,
} from '../../data/lidmaatschap';
import {
  bepaalStaffel,
  berekenAanmelding,
  controleerStartdatum,
  isIsoDatum,
  looptijdVan,
  prijsVoorStaffel,
  type Berekening,
  type Looptijd,
  type Prijs,
} from '../../lib/prijs';

export type Factuurvorm = 'pdf' | 'peppol';

export interface AanmeldGegevens {
  /** Direct lid worden of eerst een offerte. */
  soort: Aanvraagsoort;
  organisatie: string;
  type: Organisatietype | '';
  aantal_gemeenten: string;
  kvk: string;
  btw_nummer: string;
  oin: string;
  factuur_adres: string;
  factuur_postcode: string;
  factuur_plaats: string;
  factuur_ter_attentie: string;
  crediteuren_email: string;
  factuurvorm: Factuurvorm;
  peppol_id: string;
  inkoopordernummer: string;
  contact_naam: string;
  contact_functie: string;
  contact_email: string;
  contact_telefoon: string;
  toegang: string;
  startdatum: string;
  opmerkingen: string;
  akkoord_voorwaarden: boolean;
  akkoord_privacy: boolean;
}

export type Veld = keyof AanmeldGegevens;
export type Fouten = Partial<Record<Veld, string>>;

export function legeAanmelding(startdatum = ''): AanmeldGegevens {
  return {
    soort: 'aanmelding',
    organisatie: '',
    type: '',
    aantal_gemeenten: '',
    kvk: '',
    btw_nummer: '',
    oin: '',
    factuur_adres: '',
    factuur_postcode: '',
    factuur_plaats: '',
    factuur_ter_attentie: '',
    crediteuren_email: '',
    factuurvorm: 'pdf',
    peppol_id: '',
    inkoopordernummer: '',
    contact_naam: '',
    contact_functie: '',
    contact_email: '',
    contact_telefoon: '',
    toegang: '',
    startdatum,
    opmerkingen: '',
    akkoord_voorwaarden: false,
    akkoord_privacy: false,
  };
}

/* ---------- Opschonen ---------- */

/** Haalt spaties, punten en streepjes weg: "12 34.56-78" → "12345678". */
export const alleenTekens = (s: string) => s.replace(/[\s.\-]/g, '');

export const normaliseerKvk = (s: string) => alleenTekens(s);
export const normaliseerBtw = (s: string) => alleenTekens(s).toUpperCase();
export const normaliseerOin = (s: string) => alleenTekens(s);
export function normaliseerPostcode(s: string): string {
  const schoon = s.replace(/\s/g, '').toUpperCase();
  return /^\d{4}[A-Z]{2}$/.test(schoon) ? `${schoon.slice(0, 4)} ${schoon.slice(4)}` : s.trim();
}

/* ---------- Controles ---------- */

/** KVK-nummer: acht cijfers. Bron: kvk.nl, zie bronnen.kvk. */
export const isKvk = (s: string) => /^\d{8}$/.test(normaliseerKvk(s));
/** Btw-id: NL + 9 cijfers + B + 2 cijfers. Bron: ondernemersplein.overheid.nl, zie bronnen.btwId. */
export const isBtwId = (s: string) => /^NL\d{9}B\d{2}$/.test(normaliseerBtw(s));
/** OIN: 20 posities (cijfers). Bron: Logius, zie bronnen.oin. */
export const isOin = (s: string) => /^\d{20}$/.test(normaliseerOin(s));
/** Nederlandse postcode: 4 cijfers (niet beginnend met 0) en 2 letters. */
export const isPostcode = (s: string) => /^[1-9]\d{3}\s?[A-Za-z]{2}$/.test(s.trim());
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
/** Peppol-deelnemer-ID in de vorm schema:nummer, bijvoorbeeld 0106:12345678. */
export const isPeppolId = (s: string) => /^\d{4}:[A-Za-z0-9.\-]{1,50}$/.test(s.trim());
/** Telefoonnummer: cijfers, spaties, +, haakjes en streepjes; 10 tot 15 cijfers. */
export function isTelefoon(s: string): boolean {
  if (!/^[\d\s+()\-]+$/.test(s.trim())) return false;
  const cijfers = s.replace(/\D/g, '');
  return cijfers.length >= 10 && cijfers.length <= 15;
}

const domeinPatroon = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const domeinVan = (email: string) => email.trim().toLowerCase().split('@')[1] ?? '';

export interface Domeinen {
  domeinen: string[];
  ongeldig: string[];
  publiek: string[];
}

/**
 * Leest de opgegeven domeinen. Scheiding met komma, puntkomma, spatie of nieuwe regel.
 * "@gemeente.nl" en "naam@gemeente.nl" worden "gemeente.nl". Dubbele domeinen tellen één keer.
 */
export function leesDomeinen(tekst: string): Domeinen {
  const domeinen: string[] = [];
  const ongeldig: string[] = [];
  const publiek: string[] = [];
  for (const ruw of tekst.split(/[\s,;]+/)) {
    if (!ruw) continue;
    const d = (ruw.includes('@') ? ruw.slice(ruw.lastIndexOf('@') + 1) : ruw).toLowerCase().replace(/\.$/, '');
    if (!domeinPatroon.test(d)) ongeldig.push(ruw);
    else if (publiekeMaildomeinen.includes(d)) publiek.push(d);
    else if (!domeinen.includes(d)) domeinen.push(d);
  }
  return { domeinen, ongeldig, publiek };
}

export const isOverheid = (type: Organisatietype | '') => organisatietypen.find((o) => o.waarde === type)?.overheid ?? false;

export function aantalGemeenten(g: AanmeldGegevens): number | undefined {
  if (g.type !== 'samenwerkingsverband' || g.aantal_gemeenten.trim() === '') return undefined;
  const n = Number(g.aantal_gemeenten.trim());
  return Number.isFinite(n) ? n : Number.NaN;
}

export function berekening(g: AanmeldGegevens): Berekening | null {
  return berekenAanmelding({ type: g.type, aantalGemeenten: aantalGemeenten(g), startdatum: g.startdatum });
}

/* ---------- Prijs tijdens het invullen ---------- */

export type PrijsStand =
  /** Staffel staat vast. Looptijd alleen als de startdatum geldig is; de prijs hangt daar niet van af. */
  | { soort: 'prijs'; staffel: Staffel; prijs: Prijs; looptijd: Looptijd | null }
  /** Samenwerkingsverband zonder (geldig) aantal gemeenten: beide prijzen tonen. */
  | { soort: 'bereik'; opties: { staffel: Staffel; prijs: Prijs }[]; melding: string }
  | { soort: 'leeg'; melding: string };

/**
 * Wat het prijsblok toont terwijl iemand het formulier invult. De prijs verschijnt zodra het type bekend is;
 * een ongeldige startdatum verbergt alleen de looptijd, niet de prijs.
 */
export function prijsStand(g: AanmeldGegevens): PrijsStand {
  if (!g.type) return { soort: 'leeg', melding: 'Kies het type organisatie, dan ziet u hier de prijs.' };
  const n = aantalGemeenten(g);
  const id = bepaalStaffel(g.type, n);
  if (!id) {
    const opties = (['samenwerkingsverband-klein', 'samenwerkingsverband-groot'] as const).map((s) => ({
      staffel: staffelVan(s),
      prijs: prijsVoorStaffel(s),
    }));
    const melding =
      n === undefined
        ? 'Vul het aantal deelnemende gemeenten in, dan ziet u de prijs die voor u geldt.'
        : `Het aantal gemeenten moet een heel getal van 2 tot en met ${gemeentenInNederland} zijn (Nederland telt ${gemeentenInNederland} gemeenten). Eén gemeente? Kies dan het type Gemeente.`;
    return { soort: 'bereik', opties, melding };
  }
  return {
    soort: 'prijs',
    staffel: staffelVan(id),
    prijs: prijsVoorStaffel(id),
    looptijd: isIsoDatum(g.startdatum) ? looptijdVan(g.startdatum) : null,
  };
}

/** Velden die in stap 1 (gegevens) staan, in schermvolgorde. De akkoordvelden staan in stap 2. */
export const veldenStap1: Veld[] = [
  'soort', 'type', 'aantal_gemeenten', 'organisatie', 'kvk', 'btw_nummer',
  'factuur_adres', 'factuur_postcode', 'factuur_plaats', 'crediteuren_email', 'inkoopordernummer',
  'contact_naam', 'contact_email', 'toegang', 'startdatum',
  'oin', 'factuur_ter_attentie', 'factuurvorm', 'peppol_id', 'contact_functie', 'contact_telefoon', 'opmerkingen',
];

/**
 * Velden in het inklapbare deel "Aanvullende gegevens". Het btw-nummer staat daar alleen voor overheden;
 * voor een verwerker is het verplicht en staat het bij de organisatie.
 */
export function aanvullendeVelden(type: Organisatietype | ''): Veld[] {
  const vast: Veld[] = ['oin', 'factuur_ter_attentie', 'factuurvorm', 'peppol_id', 'contact_functie', 'contact_telefoon', 'opmerkingen'];
  return type === 'verwerker' ? vast : ['btw_nummer', ...vast];
}
export const veldenStap2: Veld[] = ['akkoord_voorwaarden', 'akkoord_privacy'];

const verplicht = (s: string) => s.trim().length > 0;

/** Controleert stap 1. Geeft per veld een foutmelding; een leeg object betekent: alles in orde. */
export function controleerGegevens(g: AanmeldGegevens, vandaag: string): Fouten {
  const f: Fouten = {};
  if (g.soort !== 'aanmelding' && g.soort !== 'offerte') f.soort = 'Kies of u zich aanmeldt of eerst een offerte wilt.';
  if (!verplicht(g.organisatie)) f.organisatie = 'Vul de naam van uw organisatie in.';
  if (!g.type) f.type = 'Kies het type organisatie.';
  if (g.type === 'samenwerkingsverband') {
    const n = aantalGemeenten(g);
    if (n === undefined) f.aantal_gemeenten = 'Vul het aantal deelnemende gemeenten in.';
    else if (bepaalStaffel('samenwerkingsverband', n) === null) {
      f.aantal_gemeenten = `Vul een heel getal van 2 tot en met ${gemeentenInNederland} in (Nederland telt ${gemeentenInNederland} gemeenten). Eén gemeente? Kies dan het type Gemeente.`;
    }
  }
  if (!verplicht(g.kvk)) f.kvk = 'Vul het KVK-nummer in.';
  else if (!isKvk(g.kvk)) f.kvk = 'Een KVK-nummer bestaat uit 8 cijfers.';
  if (verplicht(g.btw_nummer) && !isBtwId(g.btw_nummer)) {
    f.btw_nummer = 'Een btw-id heeft de vorm NL123456789B01.';
  } else if (!verplicht(g.btw_nummer) && g.type && !isOverheid(g.type)) {
    f.btw_nummer = 'Vul het btw-identificatienummer in. Alleen overheden mogen dit leeg laten.';
  }
  if (verplicht(g.oin) && !isOin(g.oin)) f.oin = 'Een OIN bestaat uit 20 cijfers.';

  if (!verplicht(g.factuur_adres)) f.factuur_adres = 'Vul het factuuradres in (straat en huisnummer of postbus).';
  if (!verplicht(g.factuur_postcode)) f.factuur_postcode = 'Vul de postcode in.';
  else if (!isPostcode(g.factuur_postcode)) f.factuur_postcode = 'Vul een postcode in zoals 1234 AB.';
  if (!verplicht(g.factuur_plaats)) f.factuur_plaats = 'Vul de plaats in.';
  if (!verplicht(g.crediteuren_email)) f.crediteuren_email = 'Vul het e-mailadres van de crediteurenadministratie in.';
  else if (!isEmail(g.crediteuren_email)) f.crediteuren_email = 'Vul een geldig e-mailadres in, zoals facturen@organisatie.nl.';
  if (g.factuurvorm === 'peppol') {
    if (!verplicht(g.peppol_id) && !verplicht(g.oin)) {
      f.peppol_id = 'Vul uw Peppol-ID of hierboven uw OIN in, zodat de e-factuur aankomt.';
    } else if (verplicht(g.peppol_id) && !isPeppolId(g.peppol_id)) {
      f.peppol_id = 'Een Peppol-ID heeft de vorm 0000:nummer, bijvoorbeeld 0106:12345678.';
    }
  }
  if (g.inkoopordernummer.trim().length > 50) f.inkoopordernummer = 'Maximaal 50 tekens.';

  if (!verplicht(g.contact_naam)) f.contact_naam = 'Vul de naam van de contactpersoon in.';
  if (!verplicht(g.contact_email)) f.contact_email = 'Vul het e-mailadres van de contactpersoon in.';
  else if (!isEmail(g.contact_email)) f.contact_email = 'Vul een geldig e-mailadres in.';
  if (verplicht(g.contact_telefoon) && !isTelefoon(g.contact_telefoon)) f.contact_telefoon = 'Vul een geldig telefoonnummer in, bijvoorbeeld 030 123 45 67.';

  const d = leesDomeinen(g.toegang);
  if (d.publiek.length > 0) {
    f.toegang = `Openbare maildomeinen geven geen toegang: ${d.publiek.join(', ')}. Gebruik het domein van uw organisatie.`;
  } else if (d.ongeldig.length > 0) {
    f.toegang = `Dit is geen geldig domein: ${d.ongeldig.join(', ')}. Schrijf het zoals gemeente-voorbeeld.nl.`;
  } else if (d.domeinen.length === 0 && g.soort !== 'offerte') {
    f.toegang = 'Vul minstens één e-maildomein in, bijvoorbeeld gemeente-voorbeeld.nl.';
  }

  const start = controleerStartdatum(g.startdatum, vandaag);
  if (start) f.startdatum = start;
  if (g.opmerkingen.length > 2000) f.opmerkingen = 'Maximaal 2.000 tekens.';
  return f;
}

/** Controleert stap 2 (akkoord). Bij een offerteaanvraag is akkoord met de algemene voorwaarden nog niet nodig. */
export function controleerAkkoord(g: AanmeldGegevens): Fouten {
  const f: Fouten = {};
  if (g.soort !== 'offerte' && !g.akkoord_voorwaarden) f.akkoord_voorwaarden = 'Ga akkoord met de algemene voorwaarden om te verzenden.';
  if (!g.akkoord_privacy) f.akkoord_privacy = 'Bevestig dat u de privacyverklaring hebt gelezen.';
  return f;
}

/** Schone waarden zoals ze worden verstuurd en op de bevestiging staan. */
export function schoon(g: AanmeldGegevens): AanmeldGegevens {
  return {
    ...g,
    organisatie: g.organisatie.trim(),
    aantal_gemeenten: g.type === 'samenwerkingsverband' ? g.aantal_gemeenten.trim() : '',
    kvk: normaliseerKvk(g.kvk),
    btw_nummer: normaliseerBtw(g.btw_nummer),
    oin: normaliseerOin(g.oin),
    factuur_adres: g.factuur_adres.trim(),
    factuur_postcode: normaliseerPostcode(g.factuur_postcode),
    factuur_plaats: g.factuur_plaats.trim(),
    factuur_ter_attentie: g.factuur_ter_attentie.trim(),
    crediteuren_email: g.crediteuren_email.trim().toLowerCase(),
    peppol_id: g.factuurvorm === 'peppol' ? g.peppol_id.trim() : '',
    inkoopordernummer: g.inkoopordernummer.trim(),
    contact_naam: g.contact_naam.trim(),
    contact_functie: g.contact_functie.trim(),
    contact_email: g.contact_email.trim().toLowerCase(),
    contact_telefoon: g.contact_telefoon.trim(),
    toegang: leesDomeinen(g.toegang).domeinen.join(', '),
    opmerkingen: g.opmerkingen.trim(),
  };
}

/** Alle velden voor Netlify Forms, inclusief de berekende velden. */
export function formulierVelden(g: AanmeldGegevens, b: Berekening, ordernummer: string): Record<string, string> {
  const s = schoon(g);
  return {
    soort: s.soort,
    ordernummer,
    organisatie: s.organisatie,
    type: s.type,
    aantal_gemeenten: s.aantal_gemeenten,
    staffel: b.staffel.id,
    kvk: s.kvk,
    btw_nummer: s.btw_nummer,
    oin: s.oin,
    factuur_adres: s.factuur_adres,
    factuur_postcode: s.factuur_postcode,
    factuur_plaats: s.factuur_plaats,
    factuur_ter_attentie: s.factuur_ter_attentie,
    crediteuren_email: s.crediteuren_email,
    factuurvorm: s.factuurvorm,
    peppol_id: s.peppol_id,
    inkoopordernummer: s.inkoopordernummer,
    contact_naam: s.contact_naam,
    contact_functie: s.contact_functie,
    contact_email: s.contact_email,
    contact_telefoon: s.contact_telefoon,
    toegang: s.toegang,
    startdatum: b.startdatum,
    einddatum: b.einddatum,
    prijs_excl_btw: b.exclBtw.toFixed(2),
    btw: b.btw.toFixed(2),
    prijs_incl_btw: b.inclBtw.toFixed(2),
    opmerkingen: s.opmerkingen,
    akkoord_voorwaarden: s.soort === 'offerte' ? 'nvt (offerte)' : s.akkoord_voorwaarden ? 'ja' : 'nee',
    akkoord_privacy: s.akkoord_privacy ? 'ja' : 'nee',
  };
}

/** Body voor een POST naar Netlify (application/x-www-form-urlencoded), met lege honeypot. */
export function codeer(velden: Record<string, string>): string {
  const data = new URLSearchParams();
  data.append('form-name', AANMELD_FORMULIER);
  data.append('bot-field', '');
  for (const [k, v] of Object.entries(velden)) data.append(k, v);
  return data.toString();
}

/* ---------- E-mail als alternatief ---------- */

/**
 * Veilige lengte voor een mailto-link. Sommige mailprogramma's (onder meer Outlook voor Windows) kappen links rond
 * 2.000 tekens af; dit is een praktische grens, geen norm.
 */
export const MAILTO_MAX = 1900;

export function mailtekst(velden: Record<string, string>): string {
  const regels = Object.entries(velden)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return ['Aanmelding lidmaatschap (via het formulier, verzenden lukte niet)', '', ...regels].join('\n');
}

const INGEKORT = ' … [ingekort, zie het formulier]';

/**
 * Mailto-link met alle velden. Wordt de link te lang, dan worden de opmerkingen ingekort (die zijn het enige vrije,
 * lange veld). `ingekort` zegt of dat gebeurd is, zodat de pagina het kan melden.
 */
export function mailtoMetVelden(
  aan: string,
  onderwerp: string,
  velden: Record<string, string>,
  max = MAILTO_MAX,
): { href: string; ingekort: boolean } {
  const maak = (v: Record<string, string>) =>
    `mailto:${aan}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(mailtekst(v))}`;
  const volledig = maak(velden);
  const opm = velden.opmerkingen ?? '';
  if (volledig.length <= max || opm === '') return { href: volledig, ingekort: false };
  let laag = 0;
  let hoog = opm.length;
  while (laag < hoog) {
    const midden = Math.ceil((laag + hoog) / 2);
    if (maak({ ...velden, opmerkingen: opm.slice(0, midden) + INGEKORT }).length <= max) laag = midden;
    else hoog = midden - 1;
  }
  return { href: maak({ ...velden, opmerkingen: opm.slice(0, laag).trimEnd() + INGEKORT }), ingekort: true };
}
