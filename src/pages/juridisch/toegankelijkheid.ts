// Meting en bekende problemen voor de toegankelijkheidsverklaring.
//
// Onderhoud: meet na elke grotere wijziging opnieuw (zie docs/stukken/juridisch.md, "Toegankelijkheid meten"),
// werk `meting` en `bekendeProblemen` bij, en verhoog de versie in gegevens.ts (documenten.toegankelijkheid).
// Een probleem dat is opgelost, haalt u uit de lijst; noem het niet als opgelost zonder nieuwe meting.

export interface LighthouseUitkomst {
  pagina: string;
  toegankelijkheid: number;
  prestaties: number;
}

export interface BekendProbleem {
  onderdeel: string;
  probleem: string;
  /** WCAG-succescriterium, bijvoorbeeld "1.4.3 Contrast (minimum)". */
  criterium: string;
  gevolg: string;
  aanpak: string;
}

export const meting = {
  datum: '2026-10-15',
  omgeving: 'Productiebuild van het platform, lokaal geserveerd, in Chromium (Playwright).',
  axe: {
    versie: '4.10.2',
    regels: 'WCAG 2.0, 2.1 en 2.2, niveau A en AA',
    breedtes: [400, 1280],
    aantalPaginas: 22,
    paginasZonderBevindingen: 0,
  },
  lighthouse: {
    versie: '12.8.2',
    instelling: 'mobiel, standaardinstellingen',
    uitkomsten: [] as LighthouseUitkomst[],
  },
  /** Handmatige controles, uitgevoerd op de meetdatum. */
  handmatig: [
    'Alle pagina’s zijn met alleen het toetsenbord te bedienen; de focus is zichtbaar met een paarse rand.',
    'Een link "Naar de inhoud" staat bovenaan elke pagina en wordt zichtbaar bij focus.',
    'Op 400 pixels breed hoeft u op geen enkele pagina horizontaal te scrollen.',
    'Status en labels (lid, concept, voorbeeld, bèta) staan altijd in tekst, niet alleen in kleur.',
    'De kaart heeft een lijst met knoppen per samenwerkingsverband als alternatief; de cijfers staan ook in een tabel.',
    'Grafieken hebben een titel als tekstalternatief; de rekentools tonen de waarden ook in een tabel.',
    'Formuliervelden hebben een zichtbaar label; foutmeldingen staan in tekst bij het veld.',
  ],
};

export const bekendeProblemen: BekendProbleem[] = [];

/**
 * Status volgens de indeling van de Rijksoverheid (zie bronnen.statussen in gegevens.ts).
 * A/B: volledig onderzoek door een deskundige, hooguit 3 jaar oud. C: onderzoek gepland binnen 6 maanden.
 * D: geen onderzoek gepland. Dit platform heeft nu alleen een eigen meting en nog geen gepland onderzoek.
 */
export const status = {
  letter: 'D',
  label: 'Voldoet niet volledig, geen volledig onderzoek gepland',
  toelichting:
    'Er is een eigen meting gedaan met automatische hulpmiddelen en handmatige controles, maar nog geen volledig onderzoek door een onafhankelijke deskundige. Zodra KplusV zo’n onderzoek inplant, wordt dit status C; na het onderzoek A of B.',
};
