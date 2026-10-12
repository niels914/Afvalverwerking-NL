// Indexcalculator: tarief dat meebeweegt met een gewogen mix van indexreeksen.
// Formule: nieuw tarief = basistarief × Σ(weging_i × index_i,nu / index_i,basis)
// DUMMY: bedoeld om de werking te tonen; de reeksen in src/data/indexreeksen.ts zijn fictief.

export interface IndexOnderdeel {
  naam: string;
  /** Weging als fractie (0–1). Samen 1. */
  weging: number;
  /** Indexwaarde in het basisjaar. */
  basis: number;
  /** Indexwaarde in het rekenjaar. */
  nu: number;
}

/** Som van de wegingen (hoort 1 te zijn). */
export function somWegingen(onderdelen: Pick<IndexOnderdeel, 'weging'>[]): number {
  return onderdelen.reduce((s, o) => s + o.weging, 0);
}

/** Klopt de weging (samen 100 %)? */
export function wegingKlopt(onderdelen: Pick<IndexOnderdeel, 'weging'>[], tolerantie = 1e-6): boolean {
  return Math.abs(somWegingen(onderdelen) - 1) <= tolerantie;
}

/** Gewogen indexfactor: Σ(weging_i × nu_i / basis_i). */
export function indexFactor(onderdelen: IndexOnderdeel[]): number {
  return onderdelen.reduce((s, o) => {
    if (!(o.basis > 0)) throw new Error(`Basisindex van "${o.naam}" moet groter dan 0 zijn`);
    return s + o.weging * (o.nu / o.basis);
  }, 0);
}

/** Nieuw tarief = basistarief × indexfactor. */
export function nieuwTarief(basistarief: number, onderdelen: IndexOnderdeel[]): number {
  return basistarief * indexFactor(onderdelen);
}

export interface Reeks {
  naam: string;
  weging: number;
  waarden: Record<number, number>;
}

export interface TariefJaar {
  jaar: number;
  factor: number;
  tarief: number;
  /** Stijging ten opzichte van het vorige jaar in procent; null voor het startjaar. */
  stijgingPct: number | null;
}

/**
 * Tarief per contractjaar, steeds ten opzichte van het startjaar (basisjaar).
 * Jaren zonder waarde in een van de reeksen worden overgeslagen.
 */
export function tariefPerJaar(basistarief: number, reeksen: Reeks[], startjaar: number, eindjaar: number): TariefJaar[] {
  const uitkomst: TariefJaar[] = [];
  for (let jaar = startjaar; jaar <= eindjaar; jaar++) {
    if (!reeksen.every((r) => Number.isFinite(r.waarden[jaar]) && Number.isFinite(r.waarden[startjaar]))) continue;
    const onderdelen = reeksen.map((r) => ({ naam: r.naam, weging: r.weging, basis: r.waarden[startjaar], nu: r.waarden[jaar] }));
    const factor = indexFactor(onderdelen);
    const tarief = basistarief * factor;
    const vorige = uitkomst[uitkomst.length - 1];
    uitkomst.push({ jaar, factor, tarief, stijgingPct: vorige ? (tarief / vorige.tarief - 1) * 100 : null });
  }
  return uitkomst;
}
