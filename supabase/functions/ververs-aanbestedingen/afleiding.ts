// Afleiding van aanbestedingen uit TenderNed-publicaties.
//
// Dit bestand heeft geen imports en draait zowel in de Edge Function (Deno) als in de frontend en
// in Vitest (src/lib/aanbestedingen.test.ts). Pas de regels hier aan; beide kanten volgen vanzelf.
//
// Bron: openbare publicatie-webservice van TenderNed (TNS), zie docs/stukken/aanbestedingen.md.

/* ---------- Vorm van de TenderNed-data (alleen de velden die we gebruiken) ---------- */

export interface TnsCode {
  code: string;
  omschrijving?: string;
}

/** Eén publicatie zoals de lijst /v2/publicaties die geeft. */
export interface TnsLijstPublicatie {
  publicatieId: string | number;
  kenmerk: number;
  publicatieDatum: string; // jjjj-mm-dd
  typePublicatie: TnsCode; // AAO, AGO, REC, MAC, VAK, VBE, AAW
  aanbestedingNaam?: string;
  opdrachtgeverNaam?: string;
  opdrachtBeschrijving?: string;
  sluitingsDatum?: string; // jjjj-mm-ddTuu:mm:ss, Nederlandse tijd
  sluitingsDatumMarktconsultatie?: string; // jjjj-mm-dd
  procedure?: TnsCode;
  typeOpdracht?: TnsCode;
  europees?: boolean;
  publicatiestatus?: TnsCode; // PUB of INT (ingetrokken)
  isVroegtijdigeBeeindiging?: boolean;
  tsenderNaam?: string;
  tsenderLink?: string;
}

/** Wat we uit de detailpagina /v2/publicaties/{id} bewaren. */
export interface DetailSamenvatting {
  publicatieId: number;
  cpv: { code: string; omschrijving: string; hoofd: boolean }[];
  nuts: string[];
  trefwoorden: string[];
}

/* ---------- Vaste lijsten ---------- */

/** CPV-hoofdgroep waarop we filteren: 90500000-2 "Diensten op het gebied van vuilnis en afval" en alle onderliggende codes. */
export const CPV_FILTER = '90500000-2';

export const TENDERNED_AANKONDIGING = 'https://www.tenderned.nl/aankondigingen/overzicht/';

export const PUBLICATIETYPE: Record<string, string> = {
  AAO: 'Aankondiging opdracht',
  AGO: 'Aankondiging gegunde opdracht',
  REC: 'Rectificatie',
  MAC: 'Marktconsultatie',
  VAK: 'Vooraankondiging',
  VBE: 'Vroegtijdige beëindiging',
  AAW: 'Aankondiging van een wijziging',
};

/** NUTS-2-code → provincie. Indeling 2021 én 2024 (Utrecht en Zuid-Holland kregen in 2024 een nieuwe code). Bron: Eurostat GISCO. */
export const PROVINCIE_PER_NUTS2: Record<string, string> = {
  NL11: 'Groningen',
  NL12: 'Fryslân',
  NL13: 'Drenthe',
  NL21: 'Overijssel',
  NL22: 'Gelderland',
  NL23: 'Flevoland',
  NL31: 'Utrecht',
  NL35: 'Utrecht',
  NL32: 'Noord-Holland',
  NL33: 'Zuid-Holland',
  NL36: 'Zuid-Holland',
  NL34: 'Zeeland',
  NL41: 'Noord-Brabant',
  NL42: 'Limburg',
};

export const PROVINCIES = [
  'Drenthe',
  'Flevoland',
  'Fryslân',
  'Gelderland',
  'Groningen',
  'Limburg',
  'Noord-Brabant',
  'Noord-Holland',
  'Overijssel',
  'Utrecht',
  'Zeeland',
  'Zuid-Holland',
] as const;

export const ONBEKENDE_STROOM = 'Niet gespecificeerd';

interface StroomRegel {
  naam: string;
  /** CPV-codes (8 cijfers, zonder controlecijfer) of het begin daarvan. */
  cpv?: string[];
  /** Herkenning in titel, omschrijving en trefwoorden (kleine letters). */
  tekst?: RegExp;
}

/**
 * Afvalstromen. Eerst de CPV-code; is die te algemeen (zoals 90510000 "afvalverzameling en -verwerking"),
 * dan trefwoorden in titel, omschrijving en de trefwoorden die de opdrachtgever zelf invulde.
 */
export const STROOM_REGELS: StroomRegel[] = [
  { naam: 'Huishoudelijk afval (algemeen)', cpv: ['90511200', '90513100'], tekst: /huishoudelijk(e)? (rest)?afval|huisvuil|huishoudelijke afvalstoffen|huis-aan-huis/ },
  { naam: 'Restafval', tekst: /rest-?afval|restfractie|nascheiding/ },
  { naam: 'GFT en etensresten', tekst: /\bgft|groente-?,? ?fruit|\bgf-?afval|swill|etensresten|keukenafval|voedselafval|voedselresten/ },
  { naam: 'Groenafval', tekst: /groen-?afval|snoei(afval|hout)|maaisel|blad-?afval|bermgras|groenresten|tuinafval|hekkel/ },
  { naam: 'PMD en kunststof', tekst: /\bpmd\b|plastic( |-)?(afval|verpakking)|kunststof(afval|verpakking|fractie|fen)|drankkarton/ },
  { naam: 'Papier en karton', cpv: ['90511400'], tekst: /papier|(?<!drank)karton|\bopk\b/ },
  { naam: 'Glas', tekst: /\bglas\b|glasbak|glasafval|vlakglas|verpakkingsglas/ },
  { naam: 'Textiel', tekst: /textiel/ },
  { naam: 'Grof afval', tekst: /grof-?(huis)?(vuil|afval)|grof huishoudelijk/ },
  { naam: 'Hout', tekst: /houtafval|\b[abc]-hout\b|\bhout\b/ },
  { naam: 'Bouw- en sloopafval', tekst: /bouw- en sloop|bouw-? en sloopafval|bouwafval|sloopafval|\bpuin/ },
  { naam: 'Elektrische apparaten (AEEA)', tekst: /\baeea\b|e-waste|elektrische (en elektronische )?apparat|elektronica-?afval|wit- en bruingoed/ },
  { naam: 'Gevaarlijk afval', cpv: ['90520', '90523'], tekst: /(?<!niet[- ])gevaarlijk(e)? afval|gevaarlijke afvalstoffen|\bkca\b|klein chemisch|asbest|chemisch afval/ },
  { naam: 'Medisch afval', cpv: ['90524'], tekst: /medisch afval|ziekenhuisafval|\bsza\b|zorgafval|klinisch afval/ },
  { naam: 'Radioactief afval', cpv: ['90521'] },
  { naam: 'Grond en baggerspecie', cpv: ['90522'], tekst: /verontreinigde grond|grondreiniging|gronddepot|(?<!op )\bgrond\b(?! van)|baggerspecie/ },
  { naam: 'Bodemas en vliegas', cpv: ['9051340'], tekst: /bodemas|vliegas|aec-?as|verbrandingsslakken|\bwte\b|reststoffen (van )?(afval)?verbranding/ },
  { naam: 'Slib en septictanks', cpv: ['905136', '905137', '905138', '905139'], tekst: /\bslib|zuiveringsslib|rioolslib|septictank|beerput/ },
  // Alleen afvalbakken in de openbare ruimte; afvalbakken in gebouwen (zoals afvalscheidingsunits) vallen onder inzamelmiddelen.
  { naam: 'Zwerfafval en straatreiniging', cpv: ['90511300'], tekst: /zwerf(afval|vuil)|veegvuil|straatvegen|straatreiniging|straat\)? ?afvalbak|(afval|prullen)bakken (in de )?openbare ruimte|openbare (afval|prullen)bak|hondenafvalbak/ },
  { naam: 'Matrassen', tekst: /matras/ },
  { naam: 'Metalen', tekst: /metalen|\bferro|schroot/ },
  { naam: 'Luiers en incontinentiemateriaal', tekst: /luier|incontinentie/ },
  { naam: 'Drukhouders en gasflessen', tekst: /drukhouder|gasfles|lachgas/ },
  { naam: 'Overige monostromen', tekst: /\bgips|dakleer|tapijt|koffiedik|kunstgras|monostro|frituurvet/ },
  { naam: 'Kringloop en hergebruik', tekst: /kringloop|goedzooi|refurbish/ },
  { naam: 'Milieustraat', tekst: /milieustra|milieupark|milieustation|brengvoorziening|brengstation|recyclingstation|recyclingpark/ },
  { naam: 'Containers en inzamelmiddelen', tekst: /minicontainer|ondergrondse (afval)?container|containerbehuizing|verzamelcontainer|afvalcontainer|inzamelvoertuig|achterlader|afvalscheidingsunit|afvalsorteersyste|(afval|prullen)bakken/ },
  { naam: 'Bedrijfsafval', tekst: /bedrijfsafval|kantoorafval|bedrijfsafvalstoffen|afvaldienstverlening|afval(stoffen)?management/ },
];

export const STROMEN: string[] = [...STROOM_REGELS.map((r) => r.naam), ONBEKENDE_STROOM];

export const DIENSTEN = ['Inzameling', 'Transport', 'Verwerking', 'Recycling', 'Stortplaats', 'Algemeen'] as const;

/* ---------- Afleiding ---------- */

const cpv8 = (code: string) => code.replace(/\D/g, '').slice(0, 8);

/** Afvalstromen uit CPV-codes en tekst. Altijd minstens één waarde. */
export function afvalstromen(cpvCodes: string[], tekst: string): string[] {
  const codes = cpvCodes.map(cpv8);
  // Koppeltekens normaliseren: TenderNed-teksten bevatten soms een niet-afbrekend koppelteken (U+2011).
  const t = tekst.toLowerCase().replace(/[\u2010-\u2015\u00ad]/g, '-');
  const gevonden = STROOM_REGELS.filter(
    (r) => (r.cpv && codes.some((c) => r.cpv!.some((p) => c.startsWith(p)))) || (r.tekst && r.tekst.test(t)),
  ).map((r) => r.naam);
  return gevonden.length ? gevonden : [ONBEKENDE_STROOM];
}

/** Soort dienst uit de CPV-codes. "Algemeen" als alleen de algemene codes 90500000 of 90510000 voorkomen. */
export function diensten(cpvCodes: string[]): string[] {
  const uit = new Set<string>();
  for (const c of cpvCodes.map(cpv8)) {
    if (c.startsWith('90511')) uit.add('Inzameling');
    else if (c.startsWith('90512') || c.startsWith('905137')) uit.add('Transport');
    else if (c.startsWith('90513') || c.startsWith('9052')) uit.add('Verwerking');
    else if (c.startsWith('90514')) uit.add('Recycling');
    else if (c.startsWith('9053')) uit.add('Stortplaats');
  }
  if (uit.size === 0) uit.add('Algemeen');
  return DIENSTEN.filter((d) => uit.has(d));
}

/** Provincies uit NUTS-codes (NUTS-2 of fijner). Alleen "NL" of niets = landelijk of niet vermeld: lege lijst. */
export function provincies(nuts: string[]): string[] {
  const uit = new Set<string>();
  for (const n of nuts) {
    const p = PROVINCIE_PER_NUTS2[n.toUpperCase().slice(0, 4)];
    if (p) uit.add(p);
  }
  return [...uit].sort((a, b) => a.localeCompare(b, 'nl'));
}

/** Normaliseert een gemeentenaam zoals maak-gemeenten.mjs dat doet: kleine letters, zonder accenten, punten en dubbele spaties. */
export function normaliseerNaam(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Provincies uit de naam van de opdrachtgever, voor aanbestedingen zonder provincie in de NUTS-code.
 * Alleen uitdrukkelijke vermeldingen: "Gemeente X" (ook meerdere, zoals "gemeente Duiven, Westervoort en Zevenaar")
 * en "Provincie X". Samenwerkingsverbanden en bedrijven zonder gemeentenaam blijven zonder provincie.
 * @param gemeenten genormaliseerde gemeentenaam → provincie (gemeenten.ts, uit CBS)
 */
export function provinciesUitOpdrachtgever(opdrachtgever: string, gemeenten: Record<string, string>): string[] {
  const uit = new Set<string>();
  const naam = normaliseerNaam(opdrachtgever);
  const provincie = /\bprovincie (\S+(?: \S+)?)/.exec(naam);
  if (provincie) {
    const p = PROVINCIES.find((x) => {
      const n = normaliseerNaam(x);
      return provincie[1].startsWith(n) || (n === 'fryslan' && provincie[1].startsWith('friesland'));
    });
    if (p) uit.add(p);
  }
  // Na elk "gemeente(n)" de langste reeks woorden die een gemeentenaam is; daarna verder na "," of "en".
  for (const m of naam.matchAll(/\bgemeenten? (.+)/g)) {
    const woorden = m[1].split(' ');
    let i = 0;
    while (i < woorden.length) {
      let gevonden = 0;
      for (let k = Math.min(5, woorden.length - i); k >= 1; k--) {
        const kandidaat = woorden.slice(i, i + k).join(' ').replace(/[,;:|)]+$/, '');
        const p = gemeenten[kandidaat] ?? gemeenten[kandidaat.replace(/[(),]/g, '')];
        if (p) {
          uit.add(p);
          gevonden = k;
          break;
        }
      }
      if (!gevonden) break;
      i += gevonden;
      // Alleen doorgaan bij een opsomming: "Duiven, Westervoort en Zevenaar".
      const vorig = woorden[i - 1];
      if (vorig.endsWith(',')) continue;
      if (woorden[i] === 'en') {
        i++;
        continue;
      }
      break;
    }
  }
  return [...uit].sort((a, b) => a.localeCompare(b, 'nl'));
}

export type StatusBasis = 'aankondiging' | 'gegund' | 'beeindigd' | 'marktconsultatie' | 'vooraankondiging' | 'ingetrokken';
export type Status = 'open' | 'gesloten' | 'onbekend' | 'gegund' | 'beeindigd' | 'marktconsultatie' | 'vooraankondiging' | 'ingetrokken';

const isIngetrokken = (p: TnsLijstPublicatie) => p.publicatiestatus?.code === 'INT';

/**
 * Herkent een marktconsultatie die formeel als (voor)aankondiging is gepubliceerd. Opdrachtgevers gebruiken daar soms het
 * formulier "Aankondiging opdracht" voor (bijvoorbeeld Rotterdam, kenmerk 618943), waardoor de sluitingsdatum de
 * reactietermijn van de consultatie is en niet die van een inschrijving.
 * Signalen: de titel noemt een marktconsultatie, marktverkenning of RFI, of de eerste zin van de omschrijving zegt dat de
 * opdrachtgever een marktconsultatie houdt. Een latere vermelding ("na de marktconsultatie ...") telt niet.
 */
export function isMarktconsultatieTekst(titel: string | undefined | null, omschrijving?: string | null): boolean {
  const t = (titel ?? '').toLowerCase();
  if (/markt-?\s?(consultatie|verkenning)|market ?consultation|marketconsultation|request for information|\brfi\b|informatieverzoek/.test(t)) return true;
  const eersteZin = (omschrijving ?? '').toLowerCase().split(/(?<=[.!?])\s/)[0] ?? '';
  return /\b(organiseert|houdt|start|voert)\b[^.]{0,60}\been markt-?(consultatie|verkenning)/.test(eersteZin);
}

const typeVan = (p: TnsLijstPublicatie) => p.typePublicatie?.code ?? '';
const oplopend = (a: TnsLijstPublicatie, b: TnsLijstPublicatie) =>
  a.publicatieDatum.localeCompare(b.publicatieDatum) || Number(a.publicatieId) - Number(b.publicatieId);

/**
 * Status op grond van de publicaties (ingetrokken publicaties tellen niet mee).
 * De laatste beslissende publicatie (gunning, wijziging of vroegtijdige beëindiging) bepaalt de status.
 * Zonder zo'n publicatie: aankondiging, of anders vooraankondiging of marktconsultatie.
 */
export function statusBasis(publicaties: TnsLijstPublicatie[]): StatusBasis {
  const geldig = publicaties.filter((p) => !isIngetrokken(p)).sort(oplopend);
  if (geldig.length === 0) return 'ingetrokken';
  const beslissend = geldig.filter((p) => ['AGO', 'AAW', 'VBE'].includes(typeVan(p)) || p.isVroegtijdigeBeeindiging);
  const laatste = beslissend[beslissend.length - 1];
  if (laatste) return typeVan(laatste) === 'VBE' || laatste.isVroegtijdigeBeeindiging ? 'beeindigd' : 'gegund';
  const typen = new Set(geldig.map(typeVan));
  // De laatste aankondiging, rectificatie of vooraankondiging bepaalt of het om een marktconsultatie gaat.
  const laatsteAankondiging = [...geldig].reverse().find((p) => ['AAO', 'REC', 'VAK'].includes(typeVan(p)));
  if (laatsteAankondiging && isMarktconsultatieTekst(laatsteAankondiging.aanbestedingNaam, laatsteAankondiging.opdrachtBeschrijving)) {
    return 'marktconsultatie';
  }
  if (typen.has('AAO') || typen.has('REC')) return 'aankondiging';
  if (typen.has('VAK')) return 'vooraankondiging';
  return 'marktconsultatie';
}

/**
 * Status op een moment. Zelfde regel als de view public.aanbestedingen_overzicht in de database.
 * @param sluiting lokale tijd jjjj-mm-ddTuu:mm:ss of null
 * @param nuLokaal huidige Nederlandse tijd in dezelfde notatie
 */
export function statusOp(basis: StatusBasis, sluiting: string | null, nuLokaal: string): Status {
  if (basis !== 'aankondiging') return basis;
  if (!sluiting) return 'onbekend';
  return sluiting >= nuLokaal ? 'open' : 'gesloten';
}

export interface PublicatieRegel {
  id: number;
  datum: string;
  type: string;
  omschrijving: string;
  ingetrokken: boolean;
}

/** Een rij voor public.aanbestedingen (zonder bijgewerkt-tijdstempel). */
export interface AanbestedingRij {
  kenmerk: number;
  titel: string;
  opdrachtgever: string;
  omschrijving: string | null;
  procedure: string;
  type_opdracht: string | null;
  europees: boolean | null;
  status_basis: StatusBasis;
  publicatiedatum: string;
  laatste_publicatie: string;
  sluitingsdatum: string | null;
  sluiting_tijd_bekend: boolean;
  aankondiging_id: number;
  tenderned_url: string;
  tsender_naam: string | null;
  tsender_url: string | null;
  cpv_hoofd: string | null;
  cpv_hoofd_omschrijving: string | null;
  cpv_codes: string[];
  nuts_codes: string[];
  provincies: string[];
  /** Waar de provincie vandaan komt: NUTS-code van de plaats van uitvoering, of de naam van de opdrachtgever. */
  provincie_bron: 'nuts' | 'opdrachtgever' | null;
  stromen: string[];
  diensten: string[];
  trefwoorden: string[];
  publicaties: PublicatieRegel[];
  detail_publicatie_id: number | null;
}

const schoon = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const lokaleTijd = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const datumAlleen = /^\d{4}-\d{2}-\d{2}$/;

/** Bouwt één aanbesteding uit alle publicaties met hetzelfde kenmerk, plus (indien opgehaald) de details. */
export function bouwAanbesteding(
  publicaties: TnsLijstPublicatie[],
  detail?: DetailSamenvatting | null,
  gemeenten?: Record<string, string>,
): AanbestedingRij {
  if (publicaties.length === 0) throw new Error('Geen publicaties');
  const alle = [...publicaties].sort(oplopend);
  const geldig = alle.filter((p) => !isIngetrokken(p));
  const basis = geldig.length ? geldig : alle;
  const eerste = basis[0];
  const laatste = basis[basis.length - 1];
  const aankondiging = basis.find((p) => typeVan(p) === 'AAO') ?? eerste;

  // Sluitingsdatum: de laatste aankondiging of rectificatie met een datum (een rectificatie kan de termijn verlengen).
  let sluitingsdatum: string | null = null;
  let tijdBekend = false;
  for (const p of basis) {
    if (['AAO', 'REC'].includes(typeVan(p)) && p.sluitingsDatum && lokaleTijd.test(p.sluitingsDatum)) {
      sluitingsdatum = p.sluitingsDatum.length === 16 ? `${p.sluitingsDatum}:00` : p.sluitingsDatum;
      tijdBekend = true;
    }
  }
  if (!sluitingsdatum) {
    const mac = [...basis].reverse().find((p) => p.sluitingsDatumMarktconsultatie && datumAlleen.test(p.sluitingsDatumMarktconsultatie));
    if (mac) {
      sluitingsdatum = `${mac.sluitingsDatumMarktconsultatie}T23:59:59`;
      tijdBekend = false;
    }
  }

  const titel = schoon([...basis].reverse().find((p) => schoon(p.aanbestedingNaam))?.aanbestedingNaam) || 'Zonder titel';
  const opdrachtgever = schoon([...basis].reverse().find((p) => schoon(p.opdrachtgeverNaam))?.opdrachtgeverNaam) || 'Onbekend';
  const omschrijving = schoon([...basis].reverse().find((p) => schoon(p.opdrachtBeschrijving))?.opdrachtBeschrijving) || null;
  const proc = (aankondiging.procedure?.code && aankondiging.procedure.code !== 'NA' ? aankondiging.procedure : laatste.procedure) ?? null;
  const procedure = proc?.omschrijving ? schoon(proc.omschrijving) : 'Niet vermeld';
  const tsender = [...basis].reverse().find((p) => p.tsenderLink);

  const cpvCodes = detail?.cpv.map((c) => c.code) ?? [];
  const hoofd = detail?.cpv.find((c) => c.hoofd) ?? detail?.cpv[0];
  const trefwoorden = detail?.trefwoorden ?? [];
  const uitNuts = provincies(detail?.nuts ?? []);
  const uitOpdrachtgever = uitNuts.length === 0 && gemeenten ? provinciesUitOpdrachtgever(opdrachtgever, gemeenten) : [];
  const tekst = [titel, omschrijving ?? '', trefwoorden.join(' ')].join(' ');

  return {
    kenmerk: eerste.kenmerk,
    titel,
    opdrachtgever,
    omschrijving: omschrijving && omschrijving.length > 4000 ? `${omschrijving.slice(0, 3997)}...` : omschrijving,
    procedure,
    type_opdracht: aankondiging.typeOpdracht?.omschrijving ?? laatste.typeOpdracht?.omschrijving ?? null,
    europees: aankondiging.europees ?? null,
    status_basis: statusBasis(alle),
    publicatiedatum: eerste.publicatieDatum.slice(0, 10),
    laatste_publicatie: laatste.publicatieDatum.slice(0, 10),
    sluitingsdatum,
    sluiting_tijd_bekend: tijdBekend,
    aankondiging_id: Number(aankondiging.publicatieId),
    tenderned_url: `${TENDERNED_AANKONDIGING}${aankondiging.publicatieId}`,
    tsender_naam: tsender?.tsenderNaam ?? null,
    tsender_url: tsender?.tsenderLink && /^https?:\/\//.test(tsender.tsenderLink) ? tsender.tsenderLink : null,
    cpv_hoofd: hoofd?.code ?? null,
    cpv_hoofd_omschrijving: hoofd?.omschrijving ?? null,
    cpv_codes: cpvCodes,
    nuts_codes: detail?.nuts ?? [],
    provincies: uitNuts.length ? uitNuts : uitOpdrachtgever,
    provincie_bron: uitNuts.length ? 'nuts' : uitOpdrachtgever.length ? 'opdrachtgever' : null,
    stromen: afvalstromen(cpvCodes, tekst),
    diensten: detail ? diensten(cpvCodes) : [],
    trefwoorden,
    publicaties: alle.map((p) => ({
      id: Number(p.publicatieId),
      datum: p.publicatieDatum.slice(0, 10),
      type: typeVan(p),
      omschrijving: PUBLICATIETYPE[typeVan(p)] ?? p.typePublicatie?.omschrijving ?? typeVan(p),
      ingetrokken: isIngetrokken(p),
    })),
    detail_publicatie_id: detail?.publicatieId ?? null,
  };
}

/** Haalt de bruikbare velden uit een TenderNed-detailantwoord. */
export function vatDetailSamen(detail: Record<string, unknown>): DetailSamenvatting {
  const cpv = Array.isArray(detail.cpvCodes) ? (detail.cpvCodes as { code?: string; omschrijving?: string; isHoofdOpdracht?: boolean }[]) : [];
  const nuts = Array.isArray(detail.nutsCodes) ? (detail.nutsCodes as { code?: string }[]) : [];
  const trefwoorden = [1, 2, 3, 4, 5].map((i) => detail[`trefwoord${i}`]).filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  return {
    publicatieId: Number(detail.publicatieId),
    cpv: cpv.filter((c) => c.code).map((c) => ({ code: c.code!, omschrijving: schoon(c.omschrijving), hoofd: c.isHoofdOpdracht === true })),
    nuts: [...new Set(nuts.map((n) => n.code).filter((c): c is string => !!c))],
    trefwoorden: trefwoorden.map((t) => schoon(t)),
  };
}
