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
  datum: '2026-10-19',
  omgeving: 'Productiebuild van het platform, lokaal geserveerd, in Chromium 141 (Playwright), zonder in te loggen.',
  axe: {
    versie: '4.10.2',
    regels: 'WCAG 2.0, 2.1 en 2.2, niveau A en AA',
    breedtes: [400, 1280],
    aantalPaginas: 22,
    paginasZonderBevindingen: 13,
  },
  lighthouse: {
    versie: '12.8.2',
    instelling: 'mobiele weergave, standaardinstellingen',
    uitkomsten: [
      { pagina: 'Home', pad: '/', toegankelijkheid: 100, prestaties: 89 },
      { pagina: 'Restafvalkaart', pad: '/restafvalkaart', toegankelijkheid: 95, prestaties: 57 },
      { pagina: 'Indexcalculator', pad: '/tools/indexcalculator', toegankelijkheid: 97, prestaties: 95 },
      { pagina: 'Lidmaatschap', pad: '/lidmaatschap', toegankelijkheid: 97, prestaties: 94 },
      { pagina: 'Aanmelden', pad: '/lidmaatschap/aanmelden', toegankelijkheid: 96, prestaties: 95 },
      { pagina: 'Algemene voorwaarden', pad: '/algemene-voorwaarden', toegankelijkheid: 100, prestaties: 96 },
      { pagina: 'Privacyverklaring', pad: '/privacy', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Cookieverklaring', pad: '/cookies', toegankelijkheid: 100, prestaties: 97 },
      { pagina: 'Toegankelijkheidsverklaring', pad: '/toegankelijkheid', toegankelijkheid: 100, prestaties: 98 },
      { pagina: 'Disclaimer en colofon', pad: '/disclaimer', toegankelijkheid: 100, prestaties: 98 },
    ] as LighthouseUitkomst[],
  },
  /** Handmatige controles, uitgevoerd op de meetdatum met een script dat met de Tab-toets door de pagina's loopt. */
  handmatig: [
    'De eerste Tab op elke pagina geeft de link "Naar de inhoud"; die wordt zichtbaar zodra hij focus krijgt.',
    'Links en knoppen krijgen bij focus een paarse rand van 3 pixels. Invoervelden krijgen een dunne paarse rand; zie Bekende problemen.',
    'Op 400 en 1.280 pixels breed hoeft u op geen van de 22 pagina’s horizontaal te scrollen.',
    'Status en labels (lid, concept, voorbeeld, bèta) staan in tekst, niet alleen in kleur.',
    'De Restafvalkaart heeft naast de kaart een knop per samenwerkingsverband en een tabel met de kerncijfers.',
    'Grafieken in de rekentools hebben een tekstalternatief met de getoonde waarden; bij de meeste tools staan de waarden ook in een tabel.',
    'axe vond op geen enkele pagina een invoerveld zonder label.',
  ],
  /** Wat niet is gemeten. */
  nietGemeten: [
    'Pagina’s en functies die alleen zichtbaar zijn na inloggen als lid.',
    'Gebruik met een echte schermlezer (NVDA, VoiceOver) en met spraakbediening.',
    'Documenten van anderen waar het platform naar linkt.',
  ],
};

export const bekendeProblemen: BekendProbleem[] = [
  {
    id: 'linkkleur',
    onderdeel: 'Blauwe links op de lichte achtergrond',
    paginas: ['Indexcalculator', 'CO2-heffingenscan', 'Lidmaatschap', 'Aanmelden', 'Nieuws'],
    probleem:
      'Links in de inhoudsopgave van tools en Lidmaatschap, in het kruimelpad en in een gele notitie hebben te weinig contrast met de achtergrond: 4,28:1 en 4,4:1, waar 4,5:1 nodig is.',
    criterium: '1.4.3 Contrast (minimum)',
    gevolg: 'Bij slecht zien of in fel licht zijn deze links moeilijker te lezen.',
    aanpak: 'Een donkerder linkkleur in de huisstijlkleuren van het platform. Op de juridische pagina’s is dat al gedaan.',
  },
  {
    id: 'grijze-hulptekst',
    onderdeel: 'Grijze hulptekst op lichtpaarse vlakken',
    paginas: ['Restafvalkaart', 'Aanbestedingstool', 'CO2-heffingenscan', 'Bodemassencalculator', 'Over het platform'],
    probleem:
      'Eenheden naast invoervelden (zoals ton/jaar) en de kleine toelichting onder kerncijfers hebben een contrast van 4,32:1, waar 4,5:1 nodig is.',
    criterium: '1.4.3 Contrast (minimum)',
    gevolg: 'De eenheid of toelichting is minder goed leesbaar. De eenheid staat ook in het label van het veld.',
    aanpak: 'Donkerder grijs voor deze teksten.',
  },
  {
    id: 'uitgelichte-tegel',
    onderdeel: 'Uitgelicht kerncijfer op paarse achtergrond',
    paginas: ['Restafvalkaart', 'CO2-heffingenscan', 'Bodemassencalculator'],
    probleem: 'Het label en de toelichting in de paarse tegel met het belangrijkste cijfer hebben een contrast van 3,81:1, waar 4,5:1 nodig is.',
    criterium: '1.4.3 Contrast (minimum)',
    gevolg: 'De kleine tekst in de tegel is moeilijker te lezen. Het grote cijfer zelf is goed leesbaar.',
    aanpak: 'Witte tekst of een donkerder paars voor de tegel.',
  },
  {
    id: 'scrolltabel',
    onderdeel: 'Brede tabellen op een smal scherm',
    paginas: ['Restafvalkaart', 'Lidmaatschap'],
    probleem:
      'Op 400 pixels breed zijn enkele tabellen horizontaal te scrollen, maar dat scrollgebied krijgt geen toetsenbordfocus.',
    criterium: '2.1.1 Toetsenbord',
    gevolg: 'Wie alleen een toetsenbord gebruikt, kan de rechterkolommen van die tabellen op een smal scherm niet in beeld brengen.',
    aanpak: 'Het scrollgebied focusbaar maken met een naam, zoals bij de tabellen op de juridische pagina’s.',
  },
  {
    id: 'invoerrand',
    onderdeel: 'Rand van invoervelden',
    paginas: ['Aanmelden', 'alle rekentools', 'Over het platform', 'Inloggen'],
    probleem:
      'De rand van invoervelden heeft een contrast van 1,31:1 met de witte achtergrond, waar 3:1 nodig is. Bij focus wordt de rand paars (4,61:1), maar blijft één pixel dik.',
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
