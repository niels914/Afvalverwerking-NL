// Live gegevens voor bezoekers op /inloggen: de stand van het aanbestedingsarchief en de open aanbestedingen.
//
// Besluit Niels (27-10-2026): open aanbestedingen zijn zonder account doorzoekbaar. Beide functies zijn ook voor
// bezoekers (anon) aan te roepen en geven alleen wat bezoekers mogen zien:
// - public.aanbestedingen_openbare_stand(): vier totalen (supabase/migrations/20261028090000_aanbestedingen_openbare_stand.sql)
// - public.open_aanbestedingen_zoeken(): open aanbestedingen met vijf velden (src/lib/aanbestedingen.ts)
// Er staan hier geen vaste cijfers: lukt het ophalen niet, dan toont de pagina geen getal.

import { supabase } from './supabase';

export interface OpenbareStand {
  /** Aantal aanbestedingen in het archief. */
  totaal: number;
  /** Aantal open voor inschrijving (zelfde criterium als public.open_aanbestedingen_zoeken). */
  open: number;
  /** Oudste publicatiedatum, jjjj-mm-dd. */
  oudste: string | null;
  /** Laatste gelukte verversing vanuit TenderNed, ISO-tijdstempel. */
  laatsteVerversing: string | null;
}

interface StandRij {
  totaal: number | string;
  open: number | string;
  oudste: string | null;
  laatste_verversing: string | null;
}

/** Zet de rij uit de database om; null als er niets bruikbaars terugkomt. */
export function leesStand(data: unknown): OpenbareStand | null {
  const rij = (Array.isArray(data) ? data[0] : data) as StandRij | undefined | null;
  if (!rij) return null;
  const totaal = Number(rij.totaal);
  const open = Number(rij.open);
  if (!Number.isFinite(totaal) || !Number.isFinite(open)) return null;
  return { totaal, open, oudste: rij.oudste ?? null, laatsteVerversing: rij.laatste_verversing ?? null };
}

export async function haalOpenbareStand(): Promise<OpenbareStand | null> {
  const { data, error } = await supabase.rpc('aanbestedingen_openbare_stand');
  if (error) throw error;
  return leesStand(data);
}

/** Adres van het archief met de zoekterm, zoals het archief die leest (?zoek=…, maximaal 200 tekens). */
export function archiefZoekPad(zoek: string): string {
  const term = zoek.trim().slice(0, 200);
  return term ? `/aanbestedingsarchief?${new URLSearchParams({ zoek: term })}` : '/aanbestedingsarchief';
}
