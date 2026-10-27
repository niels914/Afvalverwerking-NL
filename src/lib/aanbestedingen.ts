// Aanbestedingsarchief: ophalen uit Supabase (public.aanbestedingen_zoeken), filters in de URL en weergave-hulpjes.
// De afleiding van afvalstroom, dienst, provincie en status staat in
// supabase/functions/ververs-aanbestedingen/afleiding.ts (gedeeld met de Edge Function).

import { getal } from './format';
import { supabase } from './supabase';
import { DIENSTEN, PROVINCIES, STROMEN, type Status } from '../../supabase/functions/ververs-aanbestedingen/afleiding';

export { DIENSTEN, PROVINCIES, STROMEN };
export type { Status };

export interface Publicatie {
  id: number;
  datum: string;
  type: string;
  omschrijving: string;
  ingetrokken: boolean;
}

/** Een rij uit public.aanbestedingen_overzicht. */
export interface AanbestedingRegel {
  kenmerk: number;
  titel: string;
  opdrachtgever: string;
  omschrijving: string | null;
  procedure: string;
  type_opdracht: string | null;
  europees: boolean | null;
  publicatiedatum: string;
  laatste_publicatie: string;
  sluitingsdatum: string | null;
  sluiting_tijd_bekend: boolean;
  tenderned_url: string;
  tsender_naam: string | null;
  tsender_url: string | null;
  cpv_hoofd: string | null;
  cpv_hoofd_omschrijving: string | null;
  provincies: string[];
  provincie_bron: 'nuts' | 'opdrachtgever' | null;
  stromen: string[];
  diensten: string[];
  publicaties: Publicatie[];
  status: Status;
  /** Hoofd-CPV is een afvalcode (905..., 90000000) of onbekend. Anders is afval een nevenonderdeel. */
  afval_hoofd: boolean;
}

export const STATUS_LABEL: Record<Status, string> = {
  open: 'Open voor inschrijving',
  gesloten: 'Inschrijving gesloten',
  onbekend: 'Sluitingsdatum onbekend',
  gegund: 'Gegund',
  beeindigd: 'Vroegtijdig beëindigd',
  marktconsultatie: 'Marktconsultatie',
  vooraankondiging: 'Vooraankondiging',
  ingetrokken: 'Ingetrokken',
};

/** Korte uitleg per status (title en legenda). */
export const STATUS_UITLEG: Record<Status, string> = {
  open: 'De sluitingsdatum voor inschrijving ligt in de toekomst.',
  gesloten: 'De sluitingsdatum is voorbij; op TenderNed staat (nog) geen gunning of beëindiging. Bij oudere aanbestedingen is de gunning vaak niet gepubliceerd.',
  onbekend: 'De aankondiging noemt geen sluitingsdatum.',
  gegund: 'Op TenderNed staat een aankondiging van een gegunde opdracht of een wijziging daarvan. De winnaar staat in die aankondiging.',
  beeindigd: 'De opdrachtgever heeft de aanbesteding vroegtijdig beëindigd.',
  marktconsultatie: 'Een marktconsultatie of marktverkenning: de opdrachtgever vraagt de markt om informatie. Inschrijven kan nog niet; de datum is de reactietermijn.',
  vooraankondiging: 'Alleen een vooraankondiging, nog geen aanbesteding.',
  ingetrokken: 'Alle publicaties zijn ingetrokken.',
};

export const STATUS_VOLGORDE: Status[] = ['open', 'gesloten', 'gegund', 'beeindigd', 'marktconsultatie', 'vooraankondiging', 'onbekend', 'ingetrokken'];

export const SORTERINGEN = [
  { waarde: 'publicatie-nieuw', label: 'Publicatiedatum, nieuwste eerst' },
  { waarde: 'publicatie-oud', label: 'Publicatiedatum, oudste eerst' },
  { waarde: 'sluiting-op', label: 'Sluitingsdatum, vroegste eerst' },
  { waarde: 'sluiting-af', label: 'Sluitingsdatum, laatste eerst' },
  { waarde: 'laatste-nieuw', label: 'Laatste publicatie, nieuwste eerst' },
  { waarde: 'opdrachtgever', label: 'Opdrachtgever, A tot Z' },
] as const;
export type Sortering = (typeof SORTERINGEN)[number]['waarde'];

export const PER_PAGINA = 25;

export interface Filters {
  zoek: string;
  stroom: string; // '' = alle
  status: string;
  provincie: string; // '' = alle, 'landelijk' = geen provincie bekend
  dienst: string;
  /** Alleen aanbestedingen met afval als hoofdopdracht (hoofd-CPV 905... of 90000000). */
  hoofd: boolean;
  sortering: Sortering;
  pagina: number; // vanaf 1
}

export const LEGE_FILTERS: Filters = { zoek: '', stroom: '', status: '', provincie: '', dienst: '', hoofd: false, sortering: 'publicatie-nieuw', pagina: 1 };

/** Snelkeuzes boven de filters. */
export const SNELKEUZES: { label: string; filters: Partial<Filters> }[] = [
  { label: 'Open voor inschrijving, vroegste sluiting eerst', filters: { status: 'open', sortering: 'sluiting-op' } },
  { label: 'Marktconsultaties', filters: { status: 'marktconsultatie', sortering: 'publicatie-nieuw' } },
  { label: 'Recent gegund', filters: { status: 'gegund', sortering: 'laatste-nieuw' } },
];

const geldigeStatus = new Set<string>(STATUS_VOLGORDE);
const geldigeSortering = new Set<string>(SORTERINGEN.map((s) => s.waarde));

/** Leest de filters uit de URL. Onbekende waarden worden genegeerd. */
export function filtersUitUrl(params: URLSearchParams): Filters {
  const stroom = params.get('stroom') ?? '';
  const status = params.get('status') ?? '';
  const provincie = params.get('provincie') ?? '';
  const dienst = params.get('dienst') ?? '';
  const sortering = params.get('sortering') ?? '';
  const pagina = Number.parseInt(params.get('pagina') ?? '1', 10);
  return {
    zoek: (params.get('zoek') ?? '').slice(0, 200),
    stroom: STROMEN.includes(stroom) ? stroom : '',
    status: geldigeStatus.has(status) ? status : '',
    provincie: provincie === 'landelijk' || (PROVINCIES as readonly string[]).includes(provincie) ? provincie : '',
    dienst: (DIENSTEN as readonly string[]).includes(dienst) ? dienst : '',
    hoofd: params.get('hoofd') === '1',
    sortering: geldigeSortering.has(sortering) ? (sortering as Sortering) : 'publicatie-nieuw',
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Zet filters om naar URL-parameters; standaardwaarden laten we weg. */
export function filtersNaarUrl(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.zoek.trim()) p.set('zoek', f.zoek.trim());
  if (f.stroom) p.set('stroom', f.stroom);
  if (f.status) p.set('status', f.status);
  if (f.provincie) p.set('provincie', f.provincie);
  if (f.dienst) p.set('dienst', f.dienst);
  if (f.hoofd) p.set('hoofd', '1');
  if (f.sortering !== 'publicatie-nieuw') p.set('sortering', f.sortering);
  if (f.pagina > 1) p.set('pagina', String(f.pagina));
  return p;
}

export interface Resultaat {
  regels: AanbestedingRegel[];
  totaal: number;
}

const KOLOMMEN =
  'kenmerk,titel,opdrachtgever,omschrijving,procedure,type_opdracht,europees,publicatiedatum,laatste_publicatie,sluitingsdatum,sluiting_tijd_bekend,tenderned_url,tsender_naam,tsender_url,cpv_hoofd,cpv_hoofd_omschrijving,provincies,provincie_bron,stromen,diensten,publicaties,status,afval_hoofd';

const rpcArgumenten = (f: Filters) => ({
  p_zoek: f.zoek.trim() || null,
  p_stroom: f.stroom || null,
  p_status: f.status || null,
  p_provincie: f.provincie || null,
  p_dienst: f.dienst || null,
  p_sortering: f.sortering,
  p_alleen_hoofd: f.hoofd,
});

/** Haalt één pagina aanbestedingen op. Alleen leden krijgen rijen terug (RLS). */
export async function zoekAanbestedingen(f: Filters): Promise<Resultaat> {
  const van = (f.pagina - 1) * PER_PAGINA;
  const { data, error, count } = await supabase
    .rpc('aanbestedingen_zoeken', rpcArgumenten(f), { count: 'exact' })
    .select(KOLOMMEN)
    .range(van, van + PER_PAGINA - 1);
  if (error?.code === 'PGRST103') {
    // Pagina voorbij het einde (bijvoorbeeld ?pagina=999): geen rijen, wel het totaal, zodat de pagina kan doorverwijzen.
    // Geen head-verzoek: dat zet de argumenten in de URL, waar null als de tekst "null" aankomt.
    const telling = await supabase.rpc('aanbestedingen_zoeken', rpcArgumenten(f), { count: 'exact' }).select('kenmerk').range(0, 0);
    if (telling.error) throw telling.error;
    return { regels: [], totaal: telling.count ?? 0 };
  }
  if (error) throw error;
  return { regels: (data ?? []) as unknown as AanbestedingRegel[], totaal: count ?? 0 };
}

/** Maximaal aantal rijen in een CSV-bestand. */
export const CSV_MAX = 2000;

/** Alle rijen voor de huidige filters (tot CSV_MAX), voor de CSV-download. */
export async function haalAlleVoorCsv(f: Filters): Promise<AanbestedingRegel[]> {
  const { data, error } = await supabase
    .rpc('aanbestedingen_zoeken', rpcArgumenten(f))
    .select(KOLOMMEN)
    .range(0, CSV_MAX - 1);
  if (error) throw error;
  return (data ?? []) as unknown as AanbestedingRegel[];
}

const csvVeld = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * CSV met puntkomma als scheidingsteken en een BOM, zodat Excel in Nederlandse instellingen de kolommen en accenten goed leest.
 * Datums als jjjj-mm-dd (sorteerbaar); sluiting met tijd als jjjj-mm-dd uu:mm.
 */
export function maakCsv(regels: AanbestedingRegel[]): string {
  const kop = ['Kenmerk', 'Opdrachtgever', 'Titel', 'Afvalstroom', 'Procedure', 'Publicatiedatum', 'Sluitingsdatum', 'Status', 'Provincie', 'Hoofd-CPV', 'Aankondiging op TenderNed'];
  const rijen = regels.map((a) => [
    String(a.kenmerk),
    a.opdrachtgever,
    a.titel,
    a.stromen.join(', '),
    a.procedure,
    a.publicatiedatum,
    a.sluitingsdatum ? (a.sluiting_tijd_bekend ? a.sluitingsdatum.slice(0, 16).replace('T', ' ') : a.sluitingsdatum.slice(0, 10)) : '',
    STATUS_LABEL[a.status],
    a.provincies.join(', '),
    a.cpv_hoofd ? `${a.cpv_hoofd} ${a.cpv_hoofd_omschrijving ?? ''}`.trim() : '',
    a.tenderned_url,
  ]);
  return '\uFEFF' + [kop, ...rijen].map((r) => r.map(csvVeld).join(';')).join('\r\n') + '\r\n';
}

/**
 * Lange procedurenamen met zachte afbreekstreepjes, zodat ze in een smalle kolom netjes afbreken
 * (bijvoorbeeld "Onderhandelingsprocedure zonder voorafgaande oproep tot mededinging").
 */
export function procedureAfbreekbaar(procedure: string): string {
  return procedure.replace(/(Onderhandelings|Mededingings|Concurrentie|Innovatie)(procedure|gerichte|partnerschap)/g, '$1\u00AD$2');
}

export interface Kerncijfers {
  perStatus: Partial<Record<Status, number>>;
  perStroom: Record<string, number>;
  totaal: number;
  laatsteVerversing: string | null; // ISO-tijdstempel van de laatste gelukte verversing
  oudste: string | null; // vroegste publicatiedatum in het archief
}

export async function haalKerncijfers(): Promise<Kerncijfers> {
  const [telling, ververs, oudste, stromen] = await Promise.all([
    supabase.rpc('aanbestedingen_telling'),
    supabase.from('aanbestedingen_verversingen').select('klaar').eq('gelukt', true).order('klaar', { ascending: false }).limit(1),
    supabase.rpc('aanbestedingen_zoeken', { p_sortering: 'publicatie-oud' }).select('publicatiedatum').range(0, 0),
    supabase.rpc('aanbestedingen_telling_stromen'),
  ]);
  if (telling.error) throw telling.error;
  const perStatus: Partial<Record<Status, number>> = {};
  let totaal = 0;
  for (const r of (telling.data ?? []) as { status: Status; aantal: number }[]) {
    perStatus[r.status] = Number(r.aantal);
    totaal += Number(r.aantal);
  }
  const laatste = ververs.data?.[0]?.klaar ?? null;
  const eerste = (oudste.data as { publicatiedatum: string }[] | null)?.[0]?.publicatiedatum ?? null;
  const perStroom: Record<string, number> = {};
  for (const r of (stromen.data ?? []) as { stroom: string; aantal: number }[]) perStroom[r.stroom] = Number(r.aantal);
  return { perStatus, perStroom, totaal, laatsteVerversing: laatste, oudste: eerste };
}

/* ---------- Weergave ---------- */

const tijdFormaat = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false });
const tijdstempelFormaat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Amsterdam',
});

/** "12:00" uit een lokale tijd "2026-12-15T12:00:00". */
export function sluitingTijd(sluiting: string): string {
  const [u, m] = sluiting.slice(11, 16).split(':').map(Number);
  return tijdFormaat.format(new Date(2000, 0, 1, u, m));
}

/** "26 oktober 2026 om 07:17" in Nederlandse tijd. */
export function tijdstempel(iso: string): string {
  // nl-NL geeft "26 oktober 2026 om 20:47" (of met komma in oudere ICU-versies).
  return tijdstempelFormaat.format(new Date(iso)).replace(/(\d{4}),? (?:om )?(\d{2}:\d{2})$/, '$1 om $2');
}

/** Aantal dagen van vandaag (Nederlandse datum) tot de sluitingsdatum; negatief als die voorbij is. */
export function dagenTot(sluiting: string, vandaag: string): number {
  const a = Date.UTC(+vandaag.slice(0, 4), +vandaag.slice(5, 7) - 1, +vandaag.slice(8, 10));
  const b = Date.UTC(+sluiting.slice(0, 4), +sluiting.slice(5, 7) - 1, +sluiting.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Vandaag als jjjj-mm-dd in Nederlandse tijd. */
export function vandaagNl(nu = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nu);
}

/** Badgeklasse per status (bestaande stijlen; tekst draagt altijd de betekenis). */
export function statusBadge(s: Status): string {
  if (s === 'open') return 'status-lopend';
  if (s === 'gegund') return 'status-gegund';
  if (s === 'gesloten' || s === 'beeindigd' || s === 'ingetrokken') return 'status-gesloten';
  return 'thema';
}

/* ---------- Voor bezoekers: alleen open aanbestedingen ---------- */

/** Wat bezoekers van een open aanbesteding zien (public.open_aanbestedingen_zoeken, ook zonder inloggen). */
export interface OpenAanbesteding {
  titel: string;
  opdrachtgever: string;
  sluitingsdatum: string;
  sluiting_tijd_bekend: boolean;
  tenderned_url: string;
}

/**
 * Open aanbestedingen voor iedereen: titel, opdrachtgever, sluitingsdatum en TenderNed-link, vroegste sluiting eerst.
 * De database geeft alleen open rijen en deze vijf velden terug (maximaal 100); de rest blijft voor leden.
 */
export async function zoekOpenAanbestedingen(zoek: string): Promise<OpenAanbesteding[]> {
  const { data, error } = await supabase.rpc('open_aanbestedingen_zoeken', { p_zoek: zoek.trim() || null });
  if (error) throw error;
  return (data ?? []) as OpenAanbesteding[];
}

/** "nog 7 dagen", "vandaag" of null als de datum voorbij is. */
export function nogTekst(sluiting: string, vandaag: string): string | null {
  const d = dagenTot(sluiting, vandaag);
  if (d < 0) return null;
  return d === 0 ? 'vandaag' : `nog ${getal(d)} ${d === 1 ? 'dag' : 'dagen'}`;
}
