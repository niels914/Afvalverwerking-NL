// CO2-heffing industrie voor afvalverbrandingsinstallaties (AVI's): tarieven en regels.
// Alle getallen hieronder komen uit de genoemde officiële bron, geraadpleegd op PEILDATUM.
// Waar staat "status: 'voorstel'" gaat het om het wetsvoorstel Belastingplan 2027 (nog geen wet).
// Bijwerken: zie docs/stukken/tools-a.md, paragraaf "Onderhoud CO2-heffingenscan".

export const PEILDATUM = '2026-10-15';

export interface Bron {
  titel: string;
  url: string;
}

export const bronnen = {
  neaTarieven: {
    titel: 'NEa, Tarieven CO2-heffing',
    url: 'https://www.emissieautoriteit.nl/regelgeving/co2-heffing/tarieven-co2-heffing',
  },
  neaWatIs: {
    titel: 'NEa, Wat is de CO2-heffing?',
    url: 'https://www.emissieautoriteit.nl/regelgeving/co2-heffing/wat-is-co2-heffing',
  },
  neaAvi: {
    titel: 'NEa, Verplichtingen voor afvalverbrandingsinstallaties',
    url: 'https://www.emissieautoriteit.nl/regelgeving/co2-heffing/verplichtingen/verplichtingen-voor-afvalverbrandingsinstallaties',
  },
  neaDpr: {
    titel: 'NEa, Berekening aantal dispensatierechten',
    url: 'https://www.emissieautoriteit.nl/regelgeving/co2-heffing/dispensatierechten/berekening-aantal-dispensatierechten',
  },
  neaDprHandel: {
    titel: 'NEa, Dispensatierechten',
    url: 'https://www.emissieautoriteit.nl/regelgeving/co2-heffing/dispensatierechten',
  },
  wbm71p: {
    titel: 'Wet belastingen op milieugrondslag, art. 71l, 71p en 71q (stand 4 juni 2026)',
    url: 'https://wetten.overheid.nl/BWBR0007168/2026-06-04#HoofdstukVIB',
  },
  wm16b17: {
    titel: 'Wet milieubeheer, art. 16b.17 (stand 1 augustus 2026)',
    url: 'https://wetten.overheid.nl/BWBR0003245/2026-08-01#Hoofdstuk16b',
  },
  bp2027: {
    titel: 'Wetsvoorstel Belastingplan 2027, art. XXVI, XXVII en LX en memorie van toelichting par. 5.21 (15 september 2026)',
    url: 'https://www.rijksfinancien.nl/sites/default/files/bestanden/belastingplan-2027/wetsvoorstel-belastingplan-2027/Wetsvoorstel-Belastingplan-2027.pdf',
  },
  bp2027Nieuws: {
    titel: 'Rijksoverheid, Belastingplan 2027 (nieuwsbericht 15 september 2026)',
    url: 'https://www.rijksoverheid.nl/actueel/nieuws/2026/09/15/belastingplan-2027-voorstellen-voor-beter-werkend-belastingstelsel-en-gezonde-overheidsfinancien',
  },
  nir2024: {
    titel: 'NEa/RVO, Nederlandse lijst van energiedragers en standaard CO2-emissiefactoren, versie januari 2024 (regel "Afval")',
    url: 'https://www.emissieautoriteit.nl/documenten/2024/02/9/standaardwaarden-nir-2024',
  },
} satisfies Record<string, Bron>;

/** Tarief en EU ETS-prijs per jaar zoals vastgesteld (NEa, tarievenpagina). Euro per ton CO2. */
export const vastgesteldeTarieven: { jaar: number; algemeen: number; avi: number; etsPrijs: number }[] = [
  { jaar: 2021, algemeen: 30.48, avi: 30.48, etsPrijs: 26.73 },
  { jaar: 2022, algemeen: 41.75, avi: 41.75, etsPrijs: 60.78 },
  { jaar: 2023, algemeen: 55.94, avi: 55.94, etsPrijs: 73.27 },
  { jaar: 2024, algemeen: 74.17, avi: 74.17, etsPrijs: 86.32 },
  { jaar: 2025, algemeen: 87.9, avi: 87.9, etsPrijs: 66.76 },
  { jaar: 2026, algemeen: 78.67, avi: 103.66, etsPrijs: 79.42 },
];

export type PadId = 'geldend' | 'voorstel';

export interface Tariefpad {
  id: PadId;
  naam: string;
  kort: string;
  status: 'officieel' | 'voorstel';
  /** Tarieven die vastliggen (euro per ton CO2). */
  vast: Record<number, number>;
  /** Wettelijke verhoging per jaar, bovenop het tarief van het jaar ervoor, vóór inflatiecorrectie. */
  verhogingen: Record<number, number>;
  /** AVI-correctiefactor voor dispensatierechten per jaar. Na het laatste jaar geldt de laatste waarde. */
  correctiefactor: Record<number, number>;
  toelichting: string;
  bron: Bron;
}

/** Tariefpad volgens de wet zoals die nu geldt (Wbm art. 71p, Wm art. 16b.17 lid 4). */
const geldend: Tariefpad = {
  id: 'geldend',
  naam: 'Geldend recht (Wet belastingen op milieugrondslag, stand 2026)',
  kort: 'Geldend recht',
  status: 'officieel',
  vast: { 2021: 30.48, 2022: 41.75, 2023: 55.94, 2024: 74.17, 2025: 87.9, 2026: 103.66 },
  verhogingen: { 2027: 49.66, 2028: 50.42, 2029: 50.42, 2030: 49.39 },
  correctiefactor: { 2025: 1, 2026: 0.85, 2027: 0.7, 2028: 0.55, 2029: 0.4, 2030: 0.25, 2031: 0.17, 2032: 0.09, 2033: 0 },
  toelichting:
    'Tarief 2026 € 103,66 per ton CO2 (art. 71p lid 1). Verhoging 2027 t/m 2030 volgens art. 71p lid 2, daarna jaarlijkse inflatiecorrectie (art. 90). AVI-correctiefactor volgens art. 16b.17 lid 4 Wet milieubeheer.',
  bron: bronnen.wbm71p,
};

/** Wetsvoorstel Belastingplan 2027: trager ingroeipad tot 2035. Nog geen wet. */
const voorstel: Tariefpad = {
  id: 'voorstel',
  naam: 'Wetsvoorstel Belastingplan 2027 (ingediend 15 september 2026, nog geen wet)',
  kort: 'Voorstel BP 2027',
  status: 'voorstel',
  vast: { 2021: 30.48, 2022: 41.75, 2023: 55.94, 2024: 74.17, 2025: 87.9, 2026: 103.66, 2027: 129.15 },
  verhogingen: { 2028: 22.79, 2029: 23.54, 2030: 24.1, 2031: 24.61, 2032: 25.15, 2033: 25.68, 2034: 26.22, 2035: 26.77 },
  correctiefactor: {
    2025: 1,
    2026: 0.85,
    2027: 0.7,
    2028: 0.55,
    2029: 0.4,
    2030: 0.25,
    2031: 0.2,
    2032: 0.15,
    2033: 0.1,
    2034: 0.05,
    2035: 0,
  },
  toelichting:
    'Tarief 2027 € 129,15 per ton CO2 zonder inflatiecorrectie in 2027 (art. XXVII en LX). Verhoging 2028 t/m 2035, daarna inflatiecorrectie. Correctiefactor bouwt af tot 0 in 2035 (art. XXVI). Memorie van toelichting, tabel 12.',
  bron: bronnen.bp2027,
};

export const tariefpaden: Record<PadId, Tariefpad> = { geldend, voorstel };

/** Nationale reductiefactor voor dispensatierechten (NEa; Wm art. 16b.17 lid 3: vanaf 2026 1,023). */
export const reductiefactor: Record<number, number> = { 2021: 1.2, 2022: 1.143, 2023: 1.213, 2024: 1.135, 2025: 1.057, 2026: 1.023 };

/** Procesemissiefactor (terugvaloptie procesemissies) voor AVI's: 0,97, vanaf 2028 0,91 (NEa, pagina AVI's). */
export const procesemissiefactor: Record<number, number> = { 2021: 0.97, 2028: 0.91 };

/**
 * Kental fossiele CO2 per ton afval, afgeleid uit de NIR-standaardwaarden 2024 voor "Afval":
 * stookwaarde 9,4 GJ/ton × emissiefactor 107,4 kg CO2/GJ × (1 − 64 % biogeen) = 0,363 ton fossiel CO2 per ton.
 * Gemiddelde voor afval in AVI's, niet specifiek voor huishoudelijk restafval. Vervang door de waarde van uw verwerker.
 */
export const kentalEmissiefactor = {
  stookwaardeGjPerTon: 9.4,
  emissiefactorKgPerGj: 107.4,
  biogeenAandeel: 0.64,
  waarde: Math.round(((9.4 * 107.4 * (1 - 0.64)) / 1000) * 1000) / 1000,
};

export const scanJaren = { eerste: 2026, laatste: 2035 };

/** Standaardinvoer van de scan. Tonnage en inwoners zijn voorbeeldwaarden. */
export const co2StandaardInvoer = {
  tonnage: 50000,
  emissiefactor: kentalEmissiefactor.waarde,
  jaar: 2027,
  pad: 'geldend' as PadId,
  inflatiePct: 0,
  vrijstelling: 'wettelijk' as 'wettelijk' | 'eigen',
  eigenVrijgesteldPct: 50,
  uitstootVerhoudingPct: 100,
  inwoners: 300000,
  scheidingNuPct: 60,
  scenario2Pct: 70,
  scenario3Pct: 75,
};

/** Ontwikkelingen die de uitkomst kunnen veranderen. */
export const ontwikkelingen: { titel: string; tekst: string; bron: Bron }[] = [
  {
    titel: 'Belastingplan 2027: trager tariefpad voor AVI’s',
    tekst:
      'Het kabinet stelt voor het AVI-tarief langzamer te laten stijgen: in prijspeil 2026 naar € 304 per ton CO2 in 2035 in plaats van 2030. De vrijgestelde uitstoot bouwt af tot nul in 2035 in plaats van 2033. Het voorstel ligt bij de Tweede Kamer en kan nog wijzigen.',
    bron: bronnen.bp2027,
  },
  {
    titel: 'Mogelijke afschaffing van de CO2-heffing',
    tekst:
      'Het coalitieakkoord 2026–2030 noemt afschaffing van de CO2-heffing. Volgens de NEa is dat pas definitief als beide Kamers een wetswijziging hebben aangenomen. Tot die tijd gelden de huidige regels.',
    bron: bronnen.neaWatIs,
  },
  {
    titel: 'EU ETS voor afvalverbranding',
    tekst:
      'AVI’s monitoren hun CO2-uitstoot sinds 2024 voor het EU ETS, maar leveren nog geen emissierechten in. De Europese Commissie beoordeelt in 2026 of AVI’s vanaf 2028 volledig meedoen. Voor AVI’s gaat de ETS-prijs niet af van het heffingstarief.',
    bron: bronnen.neaAvi,
  },
  {
    titel: 'Handel in dispensatierechten alleen nog tussen AVI’s',
    tekst:
      'Vanaf belastingjaar 2026 gelden aparte tarieven voor AVI’s. AVI’s kunnen vanaf het overdrachtstijdvak in 2027 alleen nog dispensatierechten overdragen aan of ontvangen van andere AVI’s.',
    bron: bronnen.neaDprHandel,
  },
];
