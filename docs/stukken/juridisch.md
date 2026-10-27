# Juridisch: voorwaarden, privacy, cookies, toegankelijkheid, disclaimer

Onderdeel "juridisch", ronde 2. Stand 27 oktober 2026. Alle vijf teksten: versie 0.3, 27 oktober 2026.

## Wat er staat

Vijf pagina's, allemaal met bovenaan de markering **Concept ter juridische toetsing** (versie en datum), daaronder een
blok **In het kort** (de kern in vier tot zes regels), een inhoudsopgave met ankers, knoppen "Alles uit-/inklappen" en
"Afdrukken of opslaan als pdf", en inklapbare secties met bronregels (URL en peildatum). Punten voor de jurist staan in
ingeklapte kaders "Toetspunt voor de jurist".

| Pagina | Bestand | Inhoud in het kort |
|---|---|---|
| `/algemene-voorwaarden` | `src/pages/juridisch/AlgemeneVoorwaarden.tsx` | 16 artikelen: begrippen, toepassing (aanvullend de gedeponeerde AV van KplusV, A/05/26/4), aanmelding (3.1: formulier, offerte via formulier of e-mail; 3.6: kosteloos afzien binnen 14 dagen als de definitieve prijs afwijkt, alleen zolang prijzen concept zijn), proeftoegang, looptijd/verlenging/opzegging, prijs en betaling op factuur (staffeltabel uit `src/data/lidmaatschap.ts`), toegang via e-maildomein, gebruik van inhoud en open data, rekentools (indicatief), beschikbaarheid, aansprakelijkheid (max. jaarbedrag), persoonsgegevens (12.2: invoer staat in het webadres), onafhankelijkheid, einde, wijziging, recht en geschillen. |
| `/privacy` | `Privacy.tsx` | Verwerkingsverantwoordelijke, zes verwerkingen met gegevens/doel/grondslag/bewaartermijn (termijnen buiten de fiscale plicht als voornemen), wat wij niet doen (invoer in webadres eerlijk beschreven), database gesplitst in "eigen account en organisatie" en "gedeelde open gegevens voor alle leden" plus het achtergrondproces (pg_cron, pg_net, Edge Function, Vault), verwerkers Supabase en Netlify, doorgifte buiten de EU, beveiliging, datalek, rechten. |
| `/cookies` | `Cookies.tsx` | Geen cookies; vier sleutels in browseropslag; ingelogd gemeten (alleen de Supabase-sessiesleutel); invoer in het webadres (geschiedenis, bladwijzer, serverlogboek); waarom geen toestemmingsbanner (Tw 11.7a lid 3, ACM); zelf verwijderen. |
| `/toegankelijkheid` | `Toegankelijkheid.tsx` + `toegankelijkheid.ts` | Model Rijksoverheid: inzet, status D met schaal A–E, meting 27-10 (axe en Lighthouse), niet gemeten, één bekend probleem (invoerrand), opgeloste problemen, inhoud van anderen, maatregelen, probleem melden. |
| `/disclaimer` | `Disclaimer.tsx` | Verantwoordelijkheid, bèta: concepten en voorbeelddata (`#voorbeelddata`), rekentools, open data (CBS, PDOK, TenderNed CC-0 via data.overheid.nl), links, auteursrecht, fout melden, colofon (`#colofon`). |

Verder:

- **Bètamelding** (`src/components/layout/Banner.tsx`): versie van de lead (aside-landmark, tekst over conceptprijzen en
  -voorwaarden) ongewijzigd. Zet `BETA` op `false` zodra prijzen en voorwaarden vaststaan; pas dan de sectie
  `#voorbeelddata` in de disclaimer aan.
- **Voettekst** (`Voettekst.tsx`): KplusV B.V., adres, KVK 09055476 (bevestigd door Niels op 27-10), contact Niels
  Ahsmann, nu ook het algemene adres info@kplusv.nl, links naar de vijf pagina's en het colofon.
- **Lettertype zelf gehost**: `public/fonts/` (Poppins 400–700, latin en latin-ext, OFL), `src/styles/fonts.css`,
  geïmporteerd in `src/main.tsx`. Geen verbinding met Google (e2e controleert dat).

## Inklappen, ankers en afdrukken (`JuridischDocument.tsx`)

- Vanaf 760 px breed staan alle secties open en is de inhoudsopgave zichtbaar. Smaller staan de secties dicht en zijn de
  sectiekoppen zelf de inhoudsopgave. Mobiele paginahoogte ging van circa 12.000 px naar 2.100–2.900 px.
- De kop van een sectie is een knop met `aria-expanded`/`aria-controls`; de kop blijft altijd zichtbaar, dus ankers als
  `/privacy#rechten` werken. Een anker naar iets binnen een dichte sectie (`/privacy#verwerking-bezoek`) klapt die open.
- Dichte inhoud heeft `hidden="until-found"`: zoeken in de pagina (Ctrl+F) vindt de tekst en klapt de sectie open.
- Afdrukken (knop of Ctrl+P) klapt alles open; in de afdruk staan geen knoppen, inhoudsopgave of toetspunten. Zo is er een
  pdf van de voorwaarden voor contractdossiers.

## Eén bron voor de feiten

`src/pages/juridisch/gegevens.ts`: `documenten` (versie, datum, concept), `toetspuntenTonen`, `domeincontroleBijAanmaken`
(zet op `true` zodra de Auth-hook `hook_alleen_bekende_domeinen` in het dashboard aanstaat; de privacyverklaring past
zich aan), `bronnen`, `aanbieder`, `opslag`, `supabaseGebruik` (met `bereik`: eigen of gedeeld), `achtergrondprocessen`,
`externeDiensten`, `externeVerbindingen`.

## Onderhoud

- **Tekst gewijzigd**: verhoog `versie` en `gewijzigd` in `documenten`. Na de juridische toetsing: `concept: false` per
  document en `toetspuntenTonen = false`.
- **Nieuwe browseropslag of nieuw databasegebruik**: `opslag.test.ts` faalt; vul `opslag` of `supabaseGebruik` aan.
- **Prijzen vastgesteld** (`prijzenVastgesteld` in `src/data/lidmaatschap.ts`): artikel 3.6 en de bijbehorende
  toetspunt verdwijnen vanzelf.
- **Toegankelijkheid meten** (na elke grotere wijziging, minimaal jaarlijks):
  1. `npx vite build --outDir <map>` en `npx vite preview --outDir <map> --port <poort>`.
  2. axe-core per route injecteren met Playwright (`page.addScriptTag` + `axe.run` met tags `wcag2a, wcag2aa, wcag21a,
     wcag21aa, wcag22aa`), op 400 en 1280 px, 22 routes inclusief een onbekend adres.
  3. `CHROME_PATH=<chromium> lighthouse <url> --only-categories=accessibility,performance --chrome-flags="--headless=new --no-sandbox"`.
  4. Handmatig: rand en focus van invoervelden (contrast berekenen uit `getComputedStyle`), eerste Tab, sectieknoppen.
  5. Werk `meting` en `bekendeProblemen` in `toegankelijkheid.ts` bij. Haal een probleem pas weg na een meting waarin het
     niet meer voorkomt; de tekst in "Bekende problemen" noemt wat sinds de vorige meting is opgelost.

## Meting 27 oktober 2026

- axe-core 4.14.0, 22 routes, 400 en 1280 px: **22 van 22 zonder bevindingen** (ook /nieuws, target-size is opgelost).
  Productiebuild van de werkmap van die dag, dus inclusief lopend werk van andere onderdelen.
- Lighthouse 12.8.2 mobiel, tien pagina's: toegankelijkheid overal 100, prestaties 97–98 (Restafvalkaart nu 97).
- Handmatig: rand van `.invoer` 1,31:1 (`--rand` #e2dff0 op wit), focus 1 px paars (4,61:1) met lichte gloed: WCAG 1.4.11
  nog open. Eerste Tab geeft "Naar de inhoud" met 3 px focusrand op alle gecontroleerde pagina's.
- Geen horizontale scroll op 400 px. Geen cookies; browseropslag alleen `afvalplatform-aanmelding-concept`; geen
  verbindingen met andere servers zonder in te loggen.

## Tests

- `npx vitest run src/pages/juridisch` (8 tests).
- `e2e/juridisch.spec.ts` (16 tests × 2 viewports = 32): per pagina markering/versie/kern/secties (breed: inhoudsopgave
  en ankers; smal: dichte secties, openklappen), anker in dichte sectie, afdrukweergave, teksten over webadres en gedeeld
  archief, focus, prijstabel, bètamelding, voettekst, lettertype, geen cookies en geen onbeschreven verbindingen,
  toegankelijkheidsverklaring volgt de meetgegevens, kaart zonder derden.

## Open punten (Niels of jurist)

1. **Juridische toetsing** van alle vijf teksten (zie de toetspunten), daarna `concept: false` en `toetspuntenTonen = false`.
2. **Termijn artikel 3.6** (14 dagen kosteloos afzien bij afwijkende prijs) is een voorstel.
3. **Bewaartermijnen** zijn voornemens; een opruimroutine (Netlify Forms, Supabase Auth, mailbox) is nog niet ingericht.
4. **Toegankelijkheid**: status D tot er een onafhankelijk WCAG-EM-onderzoek is ingepland (dan C).
5. **Auth-hook** `hook_alleen_bekende_domeinen` aanzetten in het Supabase-dashboard en dan `domeincontroleBijAanmaken = true`.
6. **Meting op Netlify** herhalen na de eerste deploy (cookies, verbindingen, Lighthouse).
7. Functionaris gegevensbescherming of vast privacyadres van KplusV, als dat er is; nu staan Niels en info@kplusv.nl vermeld.

## Nodig van andere onderdelen

- `src/styles/components.css` (`.invoer`): rand minimaal 3:1 op wit (bijv. `--tekst-secundair` #5f6673) en een focusrand
  gelijk aan `:focus-visible` (3 px). Dan kan het laatste bekende probleem uit de verklaring.
- `src/data/lidmaatschap.ts` r. 218 (FAQ verwerkersovereenkomst): "Wat u in de rekentools invult, blijft in uw browser"
  klopt niet meer; voorstel: "Wat u in de rekentools invult, slaat KplusV niet op; de invoer staat wel in het webadres
  van de pagina (zie artikel 12.2)."
