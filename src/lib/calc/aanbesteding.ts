// Aanbestedingstool: weging van gunningscriteria en een checklist.
// Formule: weging_i = schuif_i / Σ schuif × 100 %
// DUMMY: de checklist is een voorbeeld, geen juridisch advies.

export type Criterium = 'prijs' | 'co2' | 'kwaliteit' | 'circulariteit';

export const criteriumLabel: Record<Criterium, string> = {
  prijs: 'Prijs',
  co2: 'CO2',
  kwaliteit: 'Kwaliteit',
  circulariteit: 'Circulariteit',
};

export const criteria: Criterium[] = ['prijs', 'co2', 'kwaliteit', 'circulariteit'];

/** Zet de schuifjes om naar percentages die samen 100 zijn. Alles op 0 betekent gelijke weging. */
export function normaliseerWeging(schuiven: Record<Criterium, number>): Record<Criterium, number> {
  const som = criteria.reduce((s, c) => s + Math.max(0, schuiven[c]), 0);
  const uit = {} as Record<Criterium, number>;
  for (const c of criteria) uit[c] = som === 0 ? 100 / criteria.length : (Math.max(0, schuiven[c]) / som) * 100;
  return uit;
}

export interface Scope {
  stroom: string;
  looptijdJaren: number;
  verlengingJaren: number;
  volumeTon: number;
}

/** Checklist op basis van scope en weging. Volgorde: algemeen, dan specifiek. */
export function checklist(scope: Scope, weging: Record<Criterium, number>): string[] {
  const punten = [
    'Leg de scope vast: afvalstroom, volume per jaar, looptijd en verlengingsopties.',
    'Kies de procedure op basis van de geraamde opdrachtwaarde en de drempelbedragen.',
    'Beschrijf hoe u de gunningscriteria beoordeelt en hoe u punten toekent.',
  ];
  const totaleLooptijd = scope.looptijdJaren + scope.verlengingJaren;
  if (totaleLooptijd >= 4) punten.push('Neem een indexeringsclausule op met vaste weging en vaste indexreeksen.');
  if (totaleLooptijd >= 6) punten.push('Spreek een tussentijdse evaluatie af, bijvoorbeeld halverwege de looptijd.');
  if (scope.volumeTon > 0) punten.push('Spreek een bandbreedte voor het volume af (bijvoorbeeld ±15 %) en wat er buiten die band gebeurt.');
  if (weging.prijs >= 60) punten.push('Prijs weegt zwaar: controleer of kwaliteitseisen als minimumeis in het bestek staan.');
  if (weging.co2 > 0) punten.push('Leg vast hoe CO2-uitstoot wordt berekend en aangetoond (methode, scope, transport).');
  if (weging.co2 > 0) punten.push('Regel wie een CO2-heffing op verbranding draagt en hoe die wordt doorberekend.');
  if (weging.kwaliteit > 0) punten.push('Maak kwaliteit meetbaar met prestatie-indicatoren en een rapportagefrequentie.');
  if (weging.circulariteit > 0) punten.push('Vraag naar de bestemming van de reststromen en het aandeel hoogwaardige verwerking.');
  if (scope.stroom === 'Restafval') punten.push('Neem afspraken op over bodemas en teruggewonnen metalen.');
  if (scope.stroom === 'GFT') punten.push('Neem afspraken op over piekaanvoer in voorjaar en najaar en over de compostkwaliteit.');
  if (scope.stroom === 'PMD') punten.push('Leg vast welke sorteerkwaliteit nodig is voor de vergoeding en wie het risico van afkeur draagt.');
  if (scope.stroom === 'Textiel') punten.push('Stem de opdracht af op de producentenverantwoordelijkheid voor textiel.');
  return punten;
}
