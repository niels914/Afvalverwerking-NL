# Heffingenscan restafval

Stand 13 november 2026 (versie 1.0 van de scan). De Heffingenscan laat per gemeente zien wat de afvalstoffenbelasting (ASB) en de CO2-heffing op afvalverbranding tot 2035 kosten, in totaal en per huishouden, en verkoopt daarbij een rapport (€ 500 per gemeente, € 500 extra voor toelichting en sparringssessie, maatwerk voor een groep gemeenten; alles excl. btw). De scan is gratis en vraagt geen account.

## Wat er is

| Onderdeel | Waar |
| --- | --- |
| Overzicht, landelijk beeld, tabel van 342 gemeenten | `/heffingenscan` (`src/pages/Heffingenscan.tsx`) |
| Rapport per gemeente, rekenen met eigen cijfers, CSV, afdrukken | `/heffingenscan/:slug` (`src/pages/HeffingenscanGemeente.tsx`). Aliassen werken ook: `/heffingenscan/den-haag`, `/heffingenscan/den-bosch`, en de CBS-code |
| Alleen het aanvraagformulier | `/heffingenscan/aanvragen?gemeente=<slug>` (`src/pages/HeffingenscanAanvragen.tsx`) |
| Rekenlogica (puur, getest) | `src/lib/calc/heffingen.ts`, tests in `heffingen.test.ts` (o.a. de controlecijfers van Overbetuwe) |
| Tarieven, parameters, bronnen, aannames, wetsstatus | `src/data/heffingen-tarieven.ts` (hergebruikt `co2-tarieven.ts`: één waarheid met de CO2-heffingenscan voor installaties) |
| Gemeentecijfers (CBS) | `src/data/heffingen-gemeenten.json` (+ `.ts`), gemaakt door `scripts/cbs-heffingenscan.mjs` |
| Voorbeeld en landelijk totaal voor de homepage | `src/data/heffingen-voorbeeld.json`, `src/lib/heffingenVoorbeeld.ts` (klein; laadt de dataset niet) |
| Zoekveld voor elke pagina | `src/components/heffingenscan/GemeenteZoeker.tsx` |
| Prijzen, termijnen en formuliervelden | `src/data/heffingen-aanbod.ts` |
| Formulier | `src/components/heffingenscan/Rapportaanvraag.tsx`; Netlify-formulier `rapportaanvraag` (statische kopie in `index.html`) en tabel `public.rapportaanvragen` (`supabase/migrations/20261113090000_rapportaanvragen.sql`) |
| Eigen HTML per gemeente voor delen en zoekmachines | `scripts/prerender-heffingenscan.mjs`, onderdeel van `npm run build` |
| Deelafbeelding | `public/og-heffingenscan.png`, gemaakt met `scripts/og-heffingenscan.mjs` |
| e2e-tests | `e2e/heffingenscan.spec.ts` |

## Rekenmethode

Per jaar 2026–2035 en per tariefpad (wetsvoorstel Belastingplan 2027 of het pad uit het Belastingplan 2026), prijspeil 2026:

- tonnage = inwoners × kg fijn restafval per inwoner ÷ 1.000 (standaard alleen fijn restafval, alles verbrand);
- ASB per ton = tarief × grondslag (standaard 75 %, aanname KplusV na aftrek van bodemassen);
- CO2-heffing per ton = CO2-tarief × max(0, fossiele uitstoot − NRF × AVI-correctiefactor × procesemissiefactor × mediaan fossiele uitstoot 2019–2023);
- fossiele uitstoot fijn: 2026 = 0,989 × (1 − 0,646), vanaf 2027 = 0,972 × (1 − 0,655); mediaan = 0,965 × (1 − 0,661); NRF 1,023; procesemissiefactor 0,97 (2026–2027) en 0,91 (vanaf 2028); grof: 1,076 × (1 − 0,635);
- nergens tussentijds afronden.

Controlecijfers (Overbetuwe, BP2027): 3.353 ton; € 128.500 (2026), € 371.404 (2030), € 545.467 (2035); € 6, € 18, € 26 per huishouden; cumulatief € 3,55 mln tegen € 4,64 mln bij BP2026; 10 kg minder restafval scheelt in 2030 circa € 54.220. Ze staan als tests in `heffingen.test.ts`. Wijkt een uitkomst af, zoek dan de oorzaak; pas de controlecijfers niet aan.

## Data en tarieven bijwerken

**CBS-cijfers** (nieuw peiljaar, nieuwe kerncijfers):

```
NODE_USE_ENV_PROXY=1 node scripts/cbs-heffingenscan.mjs
```

Het script haalt 83452NED (restafval per inwoner, nieuwste jaar), 86053NED (nascheiding) en de kerncijfers (inwoners en huishoudens) op, schrijft `heffingen-gemeenten.json` en ververst `heffingen-voorbeeld.json`. Het script gebruikt standaard de kerncijfers van 1 januari 2025 (86165NED), omdat het gepubliceerde voorbeeld daarmee rekent; CBS heeft inmiddels cijfers per 1 januari 2026 (86358NED, staat onder `bronnen.kerncijfers.nieuwer`). Overstappen: `--kerncijfers=86358NED`, daarna de controlecijfers in `heffingen.test.ts` en het gepubliceerde voorbeeld samen met Niels aanpassen (de bedragen veranderen dan, ook in LinkedIn-uitingen en het voorbeeldrapport).

**Alleen het voorbeeld verversen** (na een wijziging in tarieven of rekenregels): `node scripts/cbs-heffingenscan.mjs --alleen-voorbeeld`. De test faalt zolang `heffingen-voorbeeld.json` niet klopt met de rekenlogica.

**Tarieven**: in `src/data/heffingen-tarieven.ts` (ASB, tabel 11) en `src/data/co2-tarieven.ts` (CO2-tarief en correctiefactor, tabel 12). Werk daarna `PEILDATUM`, de bronnen en `heffingenscanVersie` bij.

## Als het Belastingplan verandert

Stand op 13 november 2026: de Tweede Kamer nam het wetsvoorstel Belastingplan 2027 (37 022) op 12 november 2026 aan, met 76 stemmen voor en 74 tegen. Er zijn geen amendementen op de AVI-tarieven aangenomen (verworpen: nr. 77 over de ASB-vrijstelling voor geïmporteerd afval; nr. 30 en 31 over de CO2-heffing voor industriële installaties, niet de AVI-tarieven). De Eerste Kamer (commissie voor Financiën) bespreekt op 17 november 2026 de procedure. Bronnen: eerstekamer.nl dossier 37.022 en het stemmingsoverzicht van de Tweede Kamer (links in `heffingen-tarieven.ts`).

Wat Niels doet:

1. **Eerste Kamer neemt het voorstel aan en het staat in het Staatsblad.** In `wetsstatus` (`heffingen-tarieven.ts`): `fase` op `wet`, `kort` en `tekst` aanpassen, stappen aanvullen. In `heffingPaden`: `bp2027.status` van `wetsvoorstel` naar `geldende wet` en `bp2026.status` naar `vervallen pad` (of de tekst die dan klopt). Zoek daarna in de pagina's naar “wetsvoorstel” en “geldende wet” en pas de teksten aan (de pagina's lezen de status uit de data; `Heffingenscan.tsx`, `HeffingenscanGemeente.tsx` en `heffingenVoorbeeld.wetsstatus`). Draai `--alleen-voorbeeld`.
2. **Eerste Kamer verwerpt het voorstel.** Zet `standaard.pad` (`heffingStandaard.pad`) op `bp2026`, pas `status` en de teksten aan en draai `--alleen-voorbeeld`. De controlecijfers in de test (BP2027) dan bewust omzetten, met Niels afstemmen en LinkedIn en het voorbeeldrapport aanpassen.
3. **Tarieven wijzigen (amendement, novelle, nieuwe nota van wijziging).** Tabel 11 en 12 van de memorie van toelichting opnieuw lezen en de getallen in `heffingen-tarieven.ts` en `co2-tarieven.ts` aanpassen. De test `heffingen.test.ts` bewaakt dat de paden gelijk zijn aan die tabellen en dat beide tools elkaar niet tegenspreken.
4. Altijd: `PEILDATUM` en de peildatum bij elke bron bijwerken, `heffingenscanVersie` verhogen, `npx vitest run` draaien.

## Rapportaanvraag

Het formulier staat onderaan elke gemeentepagina (ook als `/heffingenscan/aanvragen?gemeente=…`). Velden: naam, organisatie (vooringevuld met “Gemeente {naam}”), functie, e-mailadres, telefoon (optioneel), keuze (rapport € 500 / rapport met toelichting en sparringssessie € 1.000 / meerdere gemeenten, graag contact), opmerking (optioneel), akkoord met de privacyverklaring. Verborgen: gemeente, gemeentecode, de kerncijfers van de scan op dat moment (inclusief de deellink en of er met aangepaste cijfers is gerekend) en `bron`.

- **Bron**: uit `?bron=…` in de URL (bijvoorbeeld `?bron=linkedin-1`), voor deze sessie bewaard in `sessionStorage` (`afvalplatform-heffingenscan-bron`). Geen tracker; de code gaat alleen mee met een aanvraag.
- **Verzenden**: tegelijk naar Netlify Forms (formulier `rapportaanvraag`) en met een insert in `public.rapportaanvragen` (Supabase-project `mnwynrioozcqqvhelqku`). Lukt één van de twee, dan is de aanvraag binnen. Lukken beide niet, dan staat er een mailknop met de ingevulde gegevens (naar het adres uit `src/data/site.ts`).
- **Netlify** leest de velden uit de verborgen statische kopie in `index.html`. Houd die gelijk aan `heffingAanvraagVelden` in `heffingen-aanbod.ts` (de test bewaakt dat). Na de eerste deploy: controleer in Netlify onder Forms dat `rapportaanvraag` bestaat, en zet daar een e-mailmelding aan.
- **Supabase**: RLS aan; `anon` en `authenticated` mogen alleen invoegen (policy `aanvraag toevoegen`, grant alleen `insert`), niemand kan via de API lezen, wijzigen of verwijderen; lengtes, e-mailpatroon, keuzelijst en akkoord staan als check constraints. Niels leest de aanvragen in het Supabase-dashboard (Table Editor, tabel `rapportaanvragen`). `get_advisors` (security) meldt niets over deze tabel.
- **Bevestiging**: reactie binnen één werkdag, rapport binnen een week nadat de invoer is bevestigd (termijnen uit Niels' plan); de bezoeker wordt gevraagd het werkelijk verbrande tonnage en het verwerkingscontract bij de hand te houden.

## Eigen HTML per gemeente en de indexeerschakelaar

`npm run build` draait aan het eind `scripts/prerender-heffingenscan.mjs`. Dat schrijft voor elke gemeente en elke alias `dist/heffingenscan/<slug>/index.html` op basis van `dist/index.html`, met eigen titel (“Heffingenscan Arnhem: € … aan heffingen op restafval in 2035”), beschrijving, canonical (alias → canonical naar de hoofdslug), Open Graph- en Twitter-tags, preload-links voor de pagina-chunk en een korte statische samenvatting in `#root` die React vervangt. Daarnaast `dist/heffingenscan/index.html` voor het overzicht. De rekenlogica komt via `createServer` + `ssrLoadModule` van Vite; er is geen extra pakket. Basis-URL: omgevingsvariabele `URL` (Netlify zet die), anders relatieve paden. Voor een eigen buildmap: `node scripts/prerender-heffingenscan.mjs --dist=/pad`.

`public/_redirects` (`/* /index.html 200`) laat bestaande bestanden voorgaan. Controleer na de eerste deploy dat `/heffingenscan/arnhem` de eigen HTML geeft (bekijk de paginabron). Vite's `preview` zet een SPA-terugval vóór de mapindex en toont de eigen HTML alleen op `/heffingenscan/arnhem/` (met slash); Netlify bedient de map zelf.

De site is een bèta en staat op `noindex`. Eén schakelaar: bouw met `VITE_INDEXEERBAAR=true` (in Netlify onder Site configuration, Environment variables). Dan haalt `vite.config.ts` de `noindex`-meta uit alle pagina's, zet het prerender-script `robots.txt` open (`Allow: /` met verwijzing naar de sitemap) en schrijft het `sitemap.xml` met het overzicht en alle gemeentepagina's (vraagt om `URL`). Standaard uit; `public/robots.txt` blijft `Disallow: /`. De sitemap bevat alleen de Heffingenscan; de rest van de site (homepage, tools) voegt bouwer 2 of Niels toe als de bèta voorbij is.

De deelafbeelding opnieuw maken: `PW_CHROME=/pad/naar/chromium node scripts/og-heffingenscan.mjs` (Playwright, 1200 × 630, huisstijl 2.2).

## Tests

- `npx vitest run`: rekenlogica, controlecijfers, tarieven tegenover memorie van toelichting, gemeentedata en slugs, voorbeeldbestand, statische formulierkopie, browseropslag en databasegebruik in de privacy- en cookieverklaring (`opslag.test.ts`).
- `e2e/heffingenscan.spec.ts`: zoeken (aliassen, dubbelzinnig, onbekend), gemeentepagina met de controlecijfers, nascheidingsmelding, eigen cijfers met deellink en CSV, formulier met validatie, versturen (Netlify en Supabase worden onderschept, er gaat niets echt de deur uit), de terugval met mailknop, geen horizontale scroll op 400 px, printweergave (hooguit twee pagina's) en de prerender-HTML.

## Bronnen

Alle bronnen met peildatum staan in `heffingen-tarieven.ts` (`heffingBronnen`, `wetsstatus.bronnen`) en op de pagina onder “Methode en bronnen”: wetsvoorstel Belastingplan 2027 met memorie van toelichting par. 5.21 (tabel 11 en 12), Eerste Kamer dossier 37.022, stemmingsoverzicht Tweede Kamer 12 november 2026, IPLO (ASB 2026), NEa (tarieven, AVI's, dispensatierechten, berekeningsfactoren afvalstoffen 2014–2027), CBS 83452NED, 86053NED en 86165NED.

## Aannames (zichtbaar gelabeld op de pagina)

Alle fijn restafval wordt verbrand (bovengrens bij nascheiding); grondslag ASB 75 %; grof restafval 70 % verbrand (alleen als het wordt meegerekend); landelijke NEa-factoren in plaats van de factoren van de eigen AVI; factoren na 2027 gelijk aan 2027; AVI berekent volledig door; prijspeil 2026 zonder indexatie.

## Open punten

- Inwoners en huishoudens per 1 januari 2025 (zoals het gepubliceerde voorbeeld); CBS heeft cijfers per 1 januari 2026. De scan en `afval-gemeenten.json` (gemiddelde bevolking 2024) geven daardoor verschillende inwonertallen voor dezelfde gemeente.
- Privacyverklaring, cookieverklaring en disclaimer zijn op 13 november 2026 bijgewerkt (versie 0.4, zie `docs/stukken/juridisch.md`). De bewaartermijn van rapportaanvragen is nog niet vastgesteld.
- Leden en niet-leden: de scan en het formulier hebben geen betaalmuur en geen account.
