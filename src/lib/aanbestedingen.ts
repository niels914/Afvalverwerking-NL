// Aanbestedingsarchief: ophalen uit Supabase (public.zoek_aanbestedingen), filters in de URL en weergave-hulpjes.
// De afleiding van afvalstroom, dienst, provincie en status staat in
// supabase/functions/ververs-aanbestedingen/afleiding.ts (gedeeld met de Edge Function).

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
  stromen: string[];
  diensten: string[];
  publicaties: Publicatie[];
  status: Status;
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
  gesloten: 'De sluitingsdatum is voorbij; op TenderNed staat nog geen gunning of beëindiging.',
  onbekend: 'De aankondiging noemt geen sluitingsdatum.',
  gegund: 'Er is een aankondiging van een gegunde opdracht (of een wijziging daarvan) gepubliceerd.',
  beeindigd: 'De opdrachtgever heeft de aanbesteding vroegtijdig beëindigd.',
  marktconsultatie: 'Alleen een marktconsultatie, nog geen aanbesteding.',
  vooraankondiging: 'Alleen een vooraankondiging, nog geen aanbesteding.',
  ingetrokken: 'Alle publicaties zijn ingetrokken.',
};

export const STATUS_VOLGORDE: Status[] = ['open', 'gesloten', 'gegund', 'beeindigd', 'marktconsultatie', 'vooraankondiging', 'onbekend', 'ingetrokken'];

export const SORTERINGEN = [
  { waarde: 'publicatie-nieuw', label: 'Publicatiedatum, nieuwste eerst' },
  { waarde: 'publicatie-oud', label: 'Publicatiedatum, oudste eerst' },
  { waarde: 'sluiting-op', label: 'Sluitingsdatum, vroegste eerst' },
  { waarde: 'sluiting-af', label: 'Sluitingsdatum, laatste eerst' },
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
  sortering: Sortering;
  pagina: number; // vanaf 1
}

export const LEGE_FILTERS: Filters = { zoek: '', stroom: '', status: '', provincie: '', dienst: '', sortering: 'publicatie-nieuw', pagina: 1 };

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
  if (f.sortering !== 'publicatie-nieuw') p.set('sortering', f.sortering);
  if (f.pagina > 1) p.set('pagina', String(f.pagina));
  return p;
}

export interface Resultaat {
  regels: AanbestedingRegel[];
  totaal: number;
}

const KOLOMMEN =
  'kenmerk,titel,opdrachtgever,omschrijving,procedure,type_opdracht,europees,publicatiedatum,laatste_publicatie,sluitingsdatum,sluiting_tijd_bekend,tenderned_url,tsender_naam,tsender_url,cpv_hoofd,cpv_hoofd_omschrijving,provincies,stromen,diensten,publicaties,status';

/** Haalt één pagina aanbestedingen op. Alleen leden krijgen rijen terug (RLS). */
export async function zoekAanbestedingen(f: Filters): Promise<Resultaat> {
  const van = (f.pagina - 1) * PER_PAGINA;
  const { data, error, count } = await supabase
    .rpc(
      'zoek_aanbestedingen',
      {
        p_zoek: f.zoek.trim() || null,
        p_stroom: f.stroom || null,
        p_status: f.status || null,
        p_provincie: f.provincie || null,
        p_dienst: f.dienst || null,
        p_sortering: f.sortering,
      },
      { count: 'exact' },
    )
    .select(KOLOMMEN)
    .range(van, van + PER_PAGINA - 1);
  if (error) throw error;
  return { regels: (data ?? []) as unknown as AanbestedingRegel[], totaal: count ?? 0 };
}

export interface Kerncijfers {
  perStatus: Partial<Record<Status, number>>;
  totaal: number;
  laatsteVerversing: string | null; // ISO-tijdstempel van de laatste gelukte verversing
}

export async function haalKerncijfers(): Promise<Kerncijfers> {
  const [telling, ververs] = await Promise.all([
    supabase.rpc('aanbestedingen_telling'),
    supabase.from('aanbestedingen_verversingen').select('klaar').eq('gelukt', true).order('klaar', { ascending: false }).limit(1),
  ]);
  if (telling.error) throw telling.error;
  const perStatus: Partial<Record<Status, number>> = {};
  let totaal = 0;
  for (const r of (telling.data ?? []) as { status: Status; aantal: number }[]) {
    perStatus[r.status] = Number(r.aantal);
    totaal += Number(r.aantal);
  }
  const laatste = ververs.data?.[0]?.klaar ?? null;
  return { perStatus, totaal, laatsteVerversing: laatste };
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

/** "15-12-2026" uit "2026-12-15T12:00:00". */
export function sluitingDatumDeel(sluiting: string): string {
  return sluiting.slice(0, 10);
}

/** "12:00" uit een lokale tijd "2026-12-15T12:00:00". */
export function sluitingTijd(sluiting: string): string {
  const [u, m] = sluiting.slice(11, 16).split(':').map(Number);
  return tijdFormaat.format(new Date(2000, 0, 1, u, m));
}

/** "26 oktober 2026 om 07:17" in Nederlandse tijd. */
export function tijdstempel(iso: string): string {
  return tijdstempelFormaat.format(new Date(iso)).replace(/,? (\d{2}:\d{2})$/, ' om $1');
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
