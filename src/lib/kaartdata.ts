// Koppelt gemeenten aan samenwerkingsverbanden en berekent kerncijfers per verband.
// Pure functies: werken op elke lijst met dezelfde vorm, ook op echte Restafvalkaart-data.

import type { Aanbesteding, Gemeente, Samenwerkingsverband } from '../data/types';

export interface Kerncijfers {
  inwoners: number;
  aantalGemeenten: number;
  /** Gewogen naar inwoners. */
  restafvalKgPerInw: number;
  /** Gewogen naar inwoners. */
  scheidingsPct: number;
  /** Totaal restafval in ton per jaar. */
  restafvalTon: number;
  jaar: number | null;
}

export function kerncijfers(gemeenten: Gemeente[]): Kerncijfers {
  const inwoners = gemeenten.reduce((s, g) => s + g.inwoners, 0);
  if (inwoners === 0) {
    return { inwoners: 0, aantalGemeenten: gemeenten.length, restafvalKgPerInw: 0, scheidingsPct: 0, restafvalTon: 0, jaar: null };
  }
  const kg = gemeenten.reduce((s, g) => s + g.restafvalKgPerInw * g.inwoners, 0);
  const scheiding = gemeenten.reduce((s, g) => s + g.scheidingsPct * g.inwoners, 0);
  return {
    inwoners,
    aantalGemeenten: gemeenten.length,
    restafvalKgPerInw: kg / inwoners,
    scheidingsPct: scheiding / inwoners,
    restafvalTon: kg / 1000,
    jaar: Math.max(...gemeenten.map((g) => g.jaar)),
  };
}

export interface VerbandMetCijfers extends Samenwerkingsverband {
  gemeenten: Gemeente[];
  cijfers: Kerncijfers;
}

export function verbandenMetCijfers(verbanden: Samenwerkingsverband[], gemeenten: Gemeente[]): VerbandMetCijfers[] {
  return verbanden.map((v) => {
    const eigen = gemeenten.filter((g) => g.samenwerkingsverbandId === v.id);
    return { ...v, gemeenten: eigen, cijfers: kerncijfers(eigen) };
  });
}

export function aanbestedingenVan(verbandId: string, lijst: Aanbesteding[]): Aanbesteding[] {
  return lijst
    .filter((a) => a.samenwerkingsverbandId === verbandId)
    .sort((a, b) => b.publicatie.localeCompare(a.publicatie));
}
