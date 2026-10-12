// FICTIEF: standaardwaarden voor de rekentools. Voorbeeldwaarden, geen actuele tarieven.
// Pas ze hier aan; de tools tonen er direct een uitkomst mee.

export const indexStandaard = {
  basistarief: 110, // € per ton
  startjaar: 2021,
};

export const co2Standaard = {
  tonnage: 50000, // ton restafval per jaar
  emissiefactor: 0.5, // ton CO2 per ton restafval (fictief)
  heffing: 50, // € per ton CO2 (fictief)
  vrijstelling: 10000, // ton CO2 per jaar (fictief)
  // Pro
  inwoners: 300000,
  scheidingNuPct: 60,
  scenarioPct: [60, 70, 75],
  startjaar: 2027,
  aantalJaren: 6,
  stijgingPerJaar: 10, // € per ton CO2 per jaar
};

export const bodemasStandaard = {
  tonnageVerbrand: 100000, // ton per jaar
  aandeelBodemasPct: 20, // % van verbrand tonnage
  verwerkingskosten: 35, // € per ton bodemas
  metaalopbrengst: 15, // € per ton bodemas
};

export const bodemasInstallatiesStandaard = [
  { id: 'i1', naam: 'Installatie Noord (voorbeeld)', tonnageVerbrand: 100000, aandeelBodemasPct: 20, verwerkingskosten: 35, metaalopbrengst: 15 },
  { id: 'i2', naam: 'Installatie Zuid (voorbeeld)', tonnageVerbrand: 60000, aandeelBodemasPct: 18, verwerkingskosten: 40, metaalopbrengst: 12 },
];

export const pmdStandaard = {
  inwoners: 100000,
  responsBron: 15, // kg per inwoner per jaar
  responsNa: 22, // kg per inwoner per jaar
  kostenInzameling: 250, // € per ton
  kostenSortering: 150, // € per ton
  kostenNascheiding: 320, // € per ton, incl. sortering
  vergoeding: 250, // € per ton
};

export const aanbestedingStandaard = {
  stroom: 'Restafval',
  looptijdJaren: 5,
  verlengingJaren: 2,
  volumeTon: 40000,
  schuiven: { prijs: 50, co2: 20, kwaliteit: 20, circulariteit: 10 },
};

export const stromen = ['Restafval', 'GFT', 'PMD', 'Papier en karton', 'Textiel', 'Grof huishoudelijk afval'];
