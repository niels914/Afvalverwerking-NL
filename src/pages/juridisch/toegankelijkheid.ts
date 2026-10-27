// Meting en bekende problemen voor de toegankelijkheidsverklaring.
//
// Onderhoud: meet na elke grotere wijziging opnieuw (zie docs/stukken/juridisch.md, "Toegankelijkheid meten"),
// werk `meting` en `bekendeProblemen` bij, en verhoog de versie in gegevens.ts (documenten.toegankelijkheid).
// Een probleem dat is opgelost, haalt u pas uit de lijst na een nieuwe meting waarin het niet meer voorkomt.

export interface LighthouseUitkomst {
  pagina: string;
  pad: string;
  toegankelijkheid: number;
  prestaties: number;
}

export interface BekendProbleem {
  id: string;
  onderdeel: string;
  /** Pagina's waar het probleem bij de meting is gevonden. */
  paginas: string[];
  probleem: string;
  /** WCAG-succescriterium, bijvoorbeeld "1.4.3 Contrast (minimum)". */
  criterium: string;
  gevolg: string;
  aanpak: string;
}

export const meting = {
  datum: '2026-10-27',
  omgeving:
    'Productiebuild van het platform zoals die op die dag in ontwikkeling was, lokaal geserveerd, in Chromium 141 (Playwright 1.56), zonder in te loggen.',
  axe: {
    versie: '4.14.0',
    regels: 'WCAG 2.0, 2.1 en 2.2, niveau A en AA',
    breedtes: [400, 1280],
    /** 21 pagina's plus de foutpagina voor een onbekend adres. */
    aantalPaginas: 22,
    paginasZonderBevindingen: 22,
  },
  lighthouse: {
    versie: '12.8.2',
    instelling: 'mobiele weergave, standaardinstellingen',
    uitkomsten: [
      { pagina: 'Home', pad: '/', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Restafvalkaart', pad: '/restafvalkaart', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Indexcalculator', pad: '/tools/indexcalculator', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Lidmaatschap', pad: '/lidmaatschap', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Aanmelden', pad: '/lidmaatschap/aanmelden', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Algemene voorwaarden', pad: '/algemene-voorwaarden', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Privacyverklaring', pad: '/privacy', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Cookieverklaring', pad: '/cookies', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Toegankelijkheidsverklaring', pad: '/toegankelijkheid', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Disclaimer en colofon', pad: '/disclaimer', toegankelijkheid: 100, prestaties: 98 },
    ] as LighthouseUitkomst[],
  },
  /** Handmatige controles, uitgevoerd op de meetdatum met een script dat met de Tab-toets door de pagina's loopt. */
  handmatig: [
    'De eerste Tab op elke pagina geeft de link "Naar de inhoud"; die wordt zichtbaar zodra hij focus krijgt.',
    'Links en knoppen krijgen bij focus een paarse rand van 3 pixels. Invoervelden krijgen een dunne paarse rand; zie Bekende problemen.',
    'Op 400 en 1.280 pixels breed hoeft u op geen van de 22 pagina’s horizontaal te scrollen.',
    'Status en labels (lid, concept, voorbeeld, bèta) staan in tekst, niet alleen in kleur.',
    'De onderdelen van de juridische pagina’s klappen open en dicht met Enter of de spatiebalk; de knop meldt of het onderdeel open of dicht is. Zoeken in de pagina vindt ook tekst in een dicht onderdeel.',
    'Op de Restafvalkaart kunt u een gemeente ook zoeken op naam of kiezen in een tabel met de cijfers per gemeente, zonder de kaart te gebruiken.',
    'Grafieken in de rekentools hebben een tekstalternatief; de uitkomsten staan ook in tekst of in een tabel.',
    'axe vond op geen enkele pagina een invoerveld zonder label.',
  ],
  /** Wat niet is gemeten. */
  nietGemeten: [
    'Pagina’s en functies die alleen zichtbaar zijn na inloggen als lid.',
    'Gebruik met een echte schermlezer (NVDA, VoiceOver) en met spraakbediening.',
    'Documenten en websites van anderen waar het platform naar linkt.',
  ],
};

/**
 * Opgelost sinds de meting van 20 oktober 2026 (niet meer gevonden op 27 oktober): contrast van blauwe links,
 * grijze hulptekst op lichtpaarse vlakken, tekst in de paarse kerncijfertegel en de kleine links naar nieuwsbronnen.
 */
export const bekendeProblemen: BekendProbleem[] = [
  {
    id: 'invoerrand',
    onderdeel: 'Rand van invoervelden',
    paginas: ['Aanmelden', 'alle rekentools', 'Tools', 'Restafvalkaart', 'Nieuws', 'Kennisbank', 'Aanbestedingsarchief', 'Over het platform (feedbackformulier)', 'Inloggen'],
    probleem:
      'De rand van invoervelden heeft een contrast van 1,31:1 met de witte achtergrond, waar 3:1 nodig is. Bij focus wordt de rand paars (4,61:1), maar blijft één pixel dik; de lichte gloed eromheen valt nauwelijks op.',
    criterium: '1.4.11 Contrast van niet-tekstuele content',
    gevolg: 'Bij slecht zien is moeilijk te zien waar een invoerveld begint en welk veld focus heeft.',
    aanpak: 'Een donkerder rand voor invoervelden en een duidelijker focusrand, gelijk aan die van links en knoppen.',
  },
];

/**
 * Status volgens de indeling van de Rijksoverheid (zie bronnen.statussen in gegevens.ts).
 * A/B: volledig onderzoek volgens WCAG-EM, hooguit 3 jaar oud. C: geen onderzoek, wel gepland binnen 6 maanden.
 * D: geen onderzoek en niets gepland. E: geen verklaring.
 */
export type StatusLetter = 'A' | 'B' | 'C' | 'D' | 'E';

export const statusSchaal: { letter: StatusLetter; betekenis: string }[] = [
  { letter: 'A', betekenis: 'Volledig onderzocht, voldoet aan alle eisen' },
  { letter: 'B', betekenis: 'Volledig onderzocht, voldoet aan een deel van de eisen' },
  { letter: 'C', betekenis: 'Nog niet onderzocht, onderzoek gepland binnen 6 maanden' },
  { letter: 'D', betekenis: 'Nog niet onderzocht, geen onderzoek gepland' },
  { letter: 'E', betekenis: 'Geen toegankelijkheidsverklaring' },
];

export const status: { letter: StatusLetter; label: string; toelichting: string } = {
  letter: 'D',
  label: 'nog niet volledig onderzocht, geen onderzoek gepland',
  toelichting:
    'KplusV heeft het platform zelf gemeten met automatische hulpmiddelen en handmatige controles. Een volledig onderzoek door een onafhankelijke deskundige is nog niet gedaan en nog niet ingepland. Zodra dat onderzoek is ingepland, wordt de status C; na het onderzoek A of B.',
};
