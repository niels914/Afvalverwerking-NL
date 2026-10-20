# Juridisch: voorwaarden, privacy, cookies, toegankelijkheid, disclaimer

Onderdeel "juridisch", ronde 1. Stand 19 oktober 2026.

## Wat er staat

Vijf pagina's, allemaal met bovenaan de markering **Concept ter juridische toetsing** (versie 0.1, 19 oktober 2026),
een inhoudsopgave met ankers, korte genummerde secties, bronregels met URL en peildatum, en gele kaders
"Toetspunt voor de jurist" waar een keuze nog getoetst moet worden.

| Pagina | Bestand | Inhoud in het kort |
|---|---|---|
| `/algemene-voorwaarden` | `src/pages/juridisch/AlgemeneVoorwaarden.tsx` | 16 artikelen: begrippen, toepassing (aanvullend de gedeponeerde AV van KplusV, A/05/26/4), aanmelding en orderbevestiging, proeftoegang, looptijd/verlenging/opzegging, prijs en betaling op factuur (met staffeltabel uit `src/data/lidmaatschap.ts`), toegang via e-maildomein, gebruik van inhoud en open data, rekentools (indicatief), beschikbaarheid, aansprakelijkheid (max. jaarbedrag), persoonsgegevens, onafhankelijkheid, einde, wijziging, recht en geschillen (Rechtbank Gelderland). |
| `/privacy` | `Privacy.tsx` | Verwerkingsverantwoordelijke, zes verwerkingen (account, ledenadministratie, aanmelding, feedback, e-mail, bezoek) met gegevens/doel/grondslag/bewaartermijn, databasefuncties, verwerkers (Supabase EU-Frankfurt, Netlify VS, OpenStreetMap), doorgifte buiten de EU, beveiliging, datalek melden, rechten, AP-klacht. |
| `/cookies` | `Cookies.tsx` | Geen cookies; vier sleutels in browseropslag (Supabase-sessie, concept aanmeldformulier, twee reservekopieën); uitleg waarom geen toestemmingsbanner nodig is (Tw 11.7a lid 3 onder b, ACM); zelf verwijderen. |
| `/toegankelijkheid` | `Toegankelijkheid.tsx` + `toegankelijkheid.ts` | Opbouw volgens het model van de Rijksoverheid: inzet, status D met schaal A–E, meting (axe en Lighthouse), niet gemeten, vijf bekende problemen, inhoud van anderen, maatregelen, probleem melden. |
| `/disclaimer` | `Disclaimer.tsx` | Verantwoordelijkheid, bèta en voorbeelddata (`#voorbeelddata`), rekentools, open data (CBS CC BY 4.0, TenderNed, OSM ODbL), links, auteursrecht, fout melden, colofon (`#colofon`). |

Verder:

- **Bètamelding** (`src/components/layout/Banner.tsx`): "Bèta" in tekst plus uitleg en link naar `/disclaimer#voorbeelddata`.
  Zet `BETA` op `false` zodra er geen voorbeelddata meer is; pas dan ook de sectie voorbeelddata in de disclaimer aan.
- **Voettekst** (`src/components/layout/Voettekst.tsx`): KplusV B.V., adres, KVK 09055476, contact Niels Ahsmann
  (e-mail, telefoon), links naar de vijf pagina's en het colofon.
- **Lettertype zelf gehost**: `public/fonts/` (Poppins 400/500/600/700, latin en latin-ext, woff2, uit
  `@fontsource/poppins` 5.2.7, licentie OFL in `public/fonts/OFL.txt`), `@font-face` in `src/styles/fonts.css`,
  geïmporteerd in `src/main.tsx`. De Google Fonts-regels in `index.html` zijn weg. De e2e-test controleert dat er geen
  verzoek naar Google gaat.
- **Gedeelde opmaak**: `JuridischDocument.tsx` (conceptmarkering, inhoudsopgave, secties, bronregel, toetspunt, contact,
  genummerde artikelleden) en `juridisch.css` (alleen tokens uit `tokens.css`).

## Eén bron voor de feiten

`src/pages/juridisch/gegevens.ts` bevat:

- `documenten`: titel, pad, versie, datum laatste wijziging, conceptstatus per pagina;
- `bronnen`: elk extern feit met URL en peildatum (KVK, adres, AV KplusV, Telecommunicatiewet, ACM, AWR art. 52, AVG,
  AP, adequaatheidsbesluiten, privacyverklaringen Netlify/Supabase/OSM, CBS-licentie, TenderNed, DigiToegankelijk, WCAG);
- `aanbieder`, `supabaseProject`, `opslag` (browseropslag), `supabaseGebruik` (tabellen en functies), `externeDiensten`.

Prijzen, termijnen en btw komen uit `src/data/lidmaatschap.ts` (van het onderdeel lidmaatschap). Verandert daar een
termijn, dan verandert de tekst van de voorwaarden mee.

## Onderhoud

- **Tekst inhoudelijk gewijzigd**: verhoog `versie` en zet `gewijzigd` in `documenten` (gegevens.ts). Na de juridische
  toetsing: `concept: false`, dan verdwijnt de markering.
- **Nieuwe browseropslag of nieuw databasegebruik**: `src/pages/juridisch/opslag.test.ts` (Vitest) faalt zodra de code
  een `localStorage`/`sessionStorage`/cookie-gebruik, een sleutel `afvalplatform-…`, een `.from()`/`.rpc()` of een
  andere Supabase-sessie-instelling heeft die niet in `gegevens.ts` staat. Vul `opslag` of `supabaseGebruik` aan en pas
  de versie aan.
- **Toegankelijkheid meten** (na elke grotere wijziging, minimaal jaarlijks):
  1. `npx vite build --outDir <map>` en `npx vite preview --outDir <map> --port <poort>`.
  2. axe-core 4.10.2 (van cdnjs) per pagina injecteren met Playwright, regels `wcag2a, wcag2aa, wcag21a, wcag21aa,
     wcag22aa`, op 400 en 1280 px. Het script van deze ronde stond in de scratchpad; het is kort: `page.addScriptTag`
     met de axe-bron en `axe.run(document, { runOnly: { type: 'tag', values: [...] } })`.
  3. `CHROME_PATH=<playwright-chromium> npx -y lighthouse@12.8.2 <url> --only-categories=accessibility,performance`.
  4. Werk `meting` en `bekendeProblemen` in `toegankelijkheid.ts` bij. Haal een probleem pas weg na een meting waarin het
     niet meer voorkomt.
- **Bronnen**: controleer jaarlijks de URL's in `bronnen` en zet de peildatum op de datum van raadplegen.
  `wetten.overheid.nl` geeft vanuit sommige omgevingen pas antwoord met een browser-User-Agent.

## Meting 19 oktober 2026

- axe 4.10.2, 22 routes (incl. 404), 400 en 1280 px: 13 routes zonder bevindingen, waaronder alle vijf juridische
  pagina's en de homepage. Bevindingen elders: contrast van links (`--blauw` 4,28:1 op `--achtergrond`), grijze
  hulptekst `--tekst-secundair` op `--kaartvlak` (4,32:1), tekst in de paarse KPI-tegel (3,81:1), scrollbare
  `.tabel-container` zonder `tabIndex` (Restafvalkaart, Lidmaatschap op 400 px).
- Handmatig: rand van invoervelden 1,31:1 (WCAG 1.4.11), focus op invoervelden alleen een dunne paarse rand.
- Lighthouse 12.8.2 mobiel: juridische pagina's 100 toegankelijkheid, 96–98 prestaties; Restafvalkaart 95 / 57.
- Geen horizontale scroll op 400 px op alle 22 routes.
- Geen cookies na het openen van alle routes (Playwright); browseropslag alleen met beschreven sleutels;
  kaarttegels van OSM krijgen als referrer alleen de oorsprong (`/`), niet het volledige pagina-adres.

## Tests

- `npx vitest run src/pages/juridisch` (8 tests): opslag en databasegebruik gelijk aan de code, documentmeta en bronnen.
- `e2e/juridisch.spec.ts` (13 tests × 2 viewports = 26): conceptmarkering/versie/datum/inhoudsopgave/ankers per pagina,
  zichtbare focus, prijstabel, bètamelding, voettekst en colofon, lettertype van eigen server, geen cookies en alleen
  beschreven opslag over alle routes, toegankelijkheidsverklaring volgt de meetgegevens, geen OSM-cookies.

## Open punten

1. **Juridische toetsing** van alle vijf teksten; zie de kaders "Toetspunt voor de jurist" (o.a. rangorde met
   inkoopvoorwaarden van gemeenten, handelsrente bij overheden, aansprakelijkheid t.o.v. de verzekering,
   verwerkersovereenkomst niet nodig?, belangenverstrengeling, bewaartermijnen, reservekopieën in localStorage).
2. **KVK-nummer** 09055476 komt uit afgeleide bronnen (Companyinfo, OpenCorporates); controleren met een uittreksel.
3. **Bewaartermijnen** zijn voorstellen; opruimen in Netlify Forms en Supabase moet nog worden ingericht.
4. **Toegankelijkheid**: status D tot er een onderzoek is ingepland. De vijf bekende problemen zitten in gedeelde stijlen
   en pagina's van andere onderdelen (zie hieronder).
5. **Meting op Netlify** herhalen na de eerste deploy (cookies, externe verzoeken, Lighthouse met compressie).
6. **E-mail van Supabase** (inloglinks) loopt via de standaard-SMTP van Supabase; bij een eigen mailserver de
   privacyverklaring aanvullen.
7. Contactgegevens van een functionaris gegevensbescherming of algemeen privacyadres van KplusV, als dat er is.

## Nodig van andere onderdelen

- `src/styles/tokens.css` / `components.css`: donkerder linkkleur (bijv. `color-mix(in srgb, var(--blauw) 80%, #000)`,
  ruim 6:1), donkerder `--tekst-secundair` op `--kaartvlak` (≥ 4,5:1), tekst in `.hero.tegel` wit of donkerder paars,
  rand van `.invoer` minimaal 3:1 en een focusrand gelijk aan `:focus-visible`.
- Scrollbare `.tabel-container` op Restafvalkaart en Lidmaatschap: `tabIndex={0}`, `role="region"` en `aria-label`.
- README: de zin "Alles is fictief … banner" past niet meer bij de bètamelding.
