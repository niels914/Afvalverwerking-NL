// CO2-heffingenscan.
// Formule: heffing = max(0, tonnage × emissiefactor − vrijgestelde hoeveelheid) × heffingstarief
// Aanname: de vrijgestelde hoeveelheid is in ton CO2 en gaat af vóór de heffing wordt toegepast.
// DUMMY: voorbeeldwaarden, geen actuele tarieven.

export interface Co2Invoer {
  /** Restafval in ton per jaar. */
  tonnage: number;
  /** Ton CO2 per ton restafval. */
  emissiefactor: number;
  /** Heffing in € per ton CO2. */
  heffing: number;
  /** Vrijgestelde uitstoot in ton CO2 per jaar. */
  vrijstelling: number;
}

export interface Co2Uitkomst {
  uitstoot: number;
  belastbaar: number;
  kosten: number;
}

export function co2Heffing({ tonnage, emissiefactor, heffing, vrijstelling }: Co2Invoer): Co2Uitkomst {
  const uitstoot = tonnage * emissiefactor;
  const belastbaar = Math.max(0, uitstoot - vrijstelling);
  return { uitstoot, belastbaar, kosten: belastbaar * heffing };
}

/** Restafval bij een ander scheidingspercentage: het niet-gescheiden deel schaalt mee. */
export function restafvalBijScheiding(tonnageNu: number, scheidingNuPct: number, scheidingNieuwPct: number): number {
  if (scheidingNuPct >= 100) throw new Error('Huidig scheidingspercentage moet onder 100 % liggen');
  return (tonnageNu * (100 - scheidingNieuwPct)) / (100 - scheidingNuPct);
}

export interface Co2MeerjarigInvoer {
  tonnage: number;
  emissiefactor: number;
  vrijstelling: number;
  inwoners: number;
  scheidingNuPct: number;
  startjaar: number;
  aantalJaren: number;
  startHeffing: number;
  /** Stijging van het heffingstarief in € per ton CO2 per jaar. */
  stijgingPerJaar: number;
}

export interface Co2JaarRegel {
  jaar: number;
  heffing: number;
  tonnage: number;
  kosten: number;
  perInwoner: number;
}

/** Heffingstarief per jaar: lineair oplopend vanaf het startjaar. */
export function heffingInJaar(startHeffing: number, stijgingPerJaar: number, jaarIndex: number): number {
  return startHeffing + stijgingPerJaar * jaarIndex;
}

/** Meerjarig verloop voor één scheidingsscenario. */
export function co2Meerjarig(invoer: Co2MeerjarigInvoer, scheidingPct: number): Co2JaarRegel[] {
  const tonnage = restafvalBijScheiding(invoer.tonnage, invoer.scheidingNuPct, scheidingPct);
  return Array.from({ length: invoer.aantalJaren }, (_, i) => {
    const heffing = heffingInJaar(invoer.startHeffing, invoer.stijgingPerJaar, i);
    const { kosten } = co2Heffing({ tonnage, emissiefactor: invoer.emissiefactor, heffing, vrijstelling: invoer.vrijstelling });
    return { jaar: invoer.startjaar + i, heffing, tonnage, kosten, perInwoner: invoer.inwoners > 0 ? kosten / invoer.inwoners : 0 };
  });
}
