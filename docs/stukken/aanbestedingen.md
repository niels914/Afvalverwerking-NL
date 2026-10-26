# Aanbestedingsarchief (ronde 1)

Stand: 26 oktober 2026. Onderdeel van de opdracht "platform gebruiksklaar" (docs/opdracht-gebruiksklaar.md).

## Wat er gebouwd is

Het archief op `/aanbestedingsarchief` toont echte aanbestedingen over afval uit TenderNed. De 15 verzonnen aanbestedingen
zijn weg.

- **Bron:** de openbare publicatie-webservice van TenderNed (TNS), gefilterd op CPV-code `90500000-2` (diensten op het
  gebied van vuilnis en afval). De webservice neemt onderliggende codes vanzelf mee: 90510000 (afvalverwijdering en
  -verwerking), 90511000 tot en met 90514000, 90520000 tot en met 90524000 en 90530000 tot en met 90533000.
  Bij de eerste vulling (26-10-2026) waren dat 2.498 publicaties, samen 1.435 aanbestedingen, de oudste uit 2013.
- **Database:** tabel `public.aanbestedingen` in Supabase-project `mnwynrioozcqqvhelqku`, één rij per TenderNed-kenmerk
  (alle publicaties van één aanbesteding: aankondiging, rectificaties, gunning, beëindiging). RLS staat aan; de enige
  policy is `select` voor `authenticated` met `(select public.is_lid())`. `anon` heeft geen rechten. Alleen de service-rol
  (Edge Function) schrijft.
- **View en functies** (alle `security invoker`, dus RLS blijft gelden):
  - `public.aanbestedingen_overzicht` voegt de actuele status toe (open/gesloten hangt af van de klok).
  - `public.zoek_aanbestedingen(p_zoek, p_stroom, p_status, p_provincie, p_dienst, p_sortering)` voor zoeken, filteren,
    sorteren; de pagina haalt 25 rijen per keer op met `range` en `count: 'exact'`.
  - `public.aanbestedingen_telling()` aantallen per status.
  - `public.aanbestedingen_verversingen` logboek van elke verversing (peildatum "laatst bijgewerkt" in de UI).
- **Verversen:** Edge Function `ververs-aanbestedingen` (code in `supabase/functions/ververs-aanbestedingen/`). Haalt de
  hele lijst op (±25 verzoeken van 100), haalt detailpagina's (CPV-codes, NUTS-codes, trefwoorden) alleen voor nieuwe
  aanbestedingen of aanbestedingen met een nieuwe publicatie, bouwt per kenmerk één rij en doet een upsert.
  pg_cron-taak `ververs-aanbestedingen` draait elke dag om 05:17 UTC en roept via pg_net
  `public.start_ververs_aanbestedingen()` aan.
- **Beveiliging van de functie:** `verify_jwt` staat uit; de functie eist de kop `x-ververs-geheim`. Het geheim is in de
  database gegenereerd en staat alleen in Vault (`ververs_aanbestedingen_geheim`). De functie controleert het met
  `public.ververs_geheim_klopt()` (alleen service-rol). Zonder of met een fout geheim: 401 (getest).
- **Pagina voor leden:** zoekveld (ook `?zoek=` in de URL), filters afvalstroom, status (met aantallen), provincie, soort
  dienst, sortering (publicatie- of sluitingsdatum, opdrachtgever), paginering. Alle filters staan in de URL, dus een
  zoekopdracht is te delen of te bookmarken. Per aanbesteding: opdrachtgever, titel (link naar de aankondiging op
  TenderNed), provincie, afvalstromen, procedure, publicatie- en sluitingsdatum (met tijd en "nog n dagen"), status, en
  onder "Details" de omschrijving, soort opdracht, hoofd-CPV, link naar het externe platform (Mercell, Negometrix e.d.)
  en de tijdlijn van publicaties met links. Bovenaan staan bron, licentie, aantal en tijdstip van de laatste verversing.
  Onderaan staat hoe afvalstroom, provincie en status worden afgeleid.
- **Bezoekers en niet-leden:** korte uitleg over de inhoud, dan de betaalmuur (`Vergrendeld`) met een wazige preview van
  grijze balken. Er wordt voor hen niets uit de database gehaald (en RLS zou ook niets teruggeven).
- **Telefoon:** onder 760 px wordt elke tabelrij een blok met kolomnamen; geen horizontale scroll op 400 px (getest).

### Afleiding (bestand `supabase/functions/ververs-aanbestedingen/afleiding.ts`)

Eén bestand zonder imports, gebruikt door de Edge Function én door de frontend en de tests (`src/lib/aanbestedingen.test.ts`).

- **Afvalstroom:** eerst CPV (bijv. 90511400 papier, 90524 medisch, 90522 grond, 905136-9 slib, 9051340 as); omdat de
  meeste aanbestedingen alleen de algemene code 90510000 hebben, daarna trefwoorden in titel, omschrijving en de
  trefwoorden van de opdrachtgever. Meerdere stromen per aanbesteding mogelijk. Lukt het niet: "Niet gespecificeerd"
  (op 26-10-2026: 229 van 1.435, vaak "afvalinzameling en -verwerking" van scholen of zorginstellingen).
  Bekende valkuilen zijn afgevangen en getest: "niet-gevaarlijk afval", "drankkartons" (geen papier), "op grond van",
  "glasvezel", het niet-afbrekende koppelteken (U+2011) in TenderNed-teksten.
- **Soort dienst:** uit CPV: inzameling (90511), transport (90512, 905137), verwerking (90513, 9052), recycling (90514),
  stortplaats (9053), anders "Algemeen".
- **Provincie:** uit de NUTS-code van de plaats van uitvoering, NUTS-2-indeling 2021 en 2024 (NL31/NL35 Utrecht,
  NL33/NL36 Zuid-Holland). Bron: Eurostat GISCO. Staat er alleen "NL": "landelijk of niet vermeld" (op 26-10-2026: 776 van 1.435).
- **Status:** ingetrokken publicaties tellen niet mee. De laatste beslissende publicatie bepaalt: gunning of wijziging
  → Gegund; vroegtijdige beëindiging → Vroegtijdig beëindigd. Anders bij een aankondiging of rectificatie: open als de
  (eventueel door een rectificatie verlengde) sluitingsdatum in Nederlandse tijd nog niet voorbij is, anders "Inschrijving
  gesloten" (nog geen gunning gepubliceerd). Alleen vooraankondiging of marktconsultatie krijgt die status.

## Gebruiksvoorwaarden van de bron (gecontroleerd 26-10-2026)

- data.overheid.nl, dataset "Aankondigingen van overheidsopdrachten - TenderNed" (eigenaar PIANOo, Rijk), licentie
  **CC-0 1.0**, toegang publiek: https://data.overheid.nl/dataset/26e6440b-1d39-4e28-8d18-57d987042622 (via de CKAN-API
  opgevraagd: `license_id` = creativecommons.org/publicdomain/zero/1.0). De beschrijving noemt de publicatie-webservice
  `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties` uitdrukkelijk als manier om aankondigingen te bekijken,
  met de waarschuwing dat die "zonder voorafgaande kennisgeving gewijzigd kan worden". Voor de officiële XML-API is een
  account nodig (functioneelbeheer@tenderned.nl).
- TenderNed, "Datasets aanbesteden voor analyses": alle aankondigingen zijn openbaar, zodat de gegevens voor iedereen
  beschikbaar zijn (https://www.tenderned.nl/cms/nl/aanbesteden-in-cijfers/datasets-aanbestedingen).
- TenderNed gebruiksvoorwaarden (versie 19-11-2025), https://www.tenderned.nl/over-deze-site/gebruiksvoorwaarden:
  - art. 7: opdrachtgevers zijn zelf verantwoordelijk voor juistheid en actualiteit; TenderNed controleert dat niet.
    → In de UI: "Juridisch geldt alleen de aankondiging op TenderNed" en de uitleg onderaan.
  - art. 16: rechten op teksten, databestanden, vormgeving en merk berusten bij de Staat; gebruik van het beeldmerk of
    andere rechten alleen met schriftelijke toestemming. → We gebruiken geen logo of vormgeving van TenderNed, noemen
    TenderNed als bron en linken naar elke aankondiging. De overgenomen gegevens zijn feitelijke metadata van openbare
    aankondigingen onder CC-0.
  - De voorwaarden gaan verder vooral over geregistreerde gebruikers van het elektronisch systeem; wij registreren niet.
  - Tijdens de controle gaf de pagina een tijdelijke 503; gelezen is de kopie van 19-10-2026 in de werkmap (zelfde
    versie, 19-11-2025).
- We nemen geen persoonsgegevens over: de lijst en de gebruikte detailvelden bevatten geen contactpersonen.
- Belasting van de bron: één run per dag, ±25 lijstverzoeken plus enkele detailverzoeken, met pauzes en maximaal 4
  gelijktijdige verzoeken.

## Onderhoud

- **Dagelijks vanzelf.** Controle: `select * from public.aanbestedingen_verversingen order by id desc limit 5;`
  (`gelukt`, aantallen, `melding`). De UI toont het tijdstip van de laatste gelukte verversing.
- **Handmatig verversen** (SQL-editor of MCP, als postgres): `select public.start_ververs_aanbestedingen(300);`
  Het argument is het maximum aantal detailpagina's per run (max 1.000; een run met 600 duurde ongeveer een minuut).
  Antwoord bekijken: `select status_code, content from net._http_response order by id desc limit 1;`
- **Regels voor afvalstroom aanpassen:** `STROOM_REGELS` in `afleiding.ts`, test toevoegen in
  `src/lib/aanbestedingen.test.ts`, daarna de functie opnieuw uitrollen (beide bestanden, `verify_jwt: false`) en één
  keer verversen; alle rijen worden opnieuw afgeleid uit de opgeslagen details.
- **Webservice gewijzigd** (lege lijst of fouten in het logboek): de functie schrijft dan niets weg en logt
  `gelukt = false`. Kijk of de TNS-URL of de veldnamen zijn veranderd, of vraag toegang tot de officiële XML-API.
- **Geheim vernieuwen:** `select vault.update_secret((select id from vault.secrets where name='ververs_aanbestedingen_geheim'), encode(extensions.gen_random_bytes(32),'hex'));`
  Er hoeft verder niets te veranderen.
- Migraties: `supabase/migrations/20261026090000_aanbestedingen.sql` en `20261026091000_aanbestedingen_cron.sql`.

## Controles

- `npx tsc --noEmit -p .`: geen fouten.
- `npx vitest run`: alle tests groen, waaronder 23 in `src/lib/aanbestedingen.test.ts`.
- `npx vite build --outDir /tmp/claude-0/build-aanbestedingen`: geslaagd.
- `e2e/aanbestedingen.spec.ts` (400 px en 1280 px): betaalmuur zonder echte data, RLS voor anon, lid leest via RLS,
  `?zoek=`, filters, sortering, paginering, details, geen horizontale scroll. 10 van 10 geslaagd.
  Draaien: `NODE_USE_ENV_PROXY=1 PW_BASE=http://localhost:5107 E2E_EMAIL=… E2E_WACHTWOORD=… npx playwright test e2e/aanbestedingen.spec.ts`.
- Lighthouse mobiel (bezoeker): prestaties 0,97, toegankelijkheid 1,0. axe op de ledenweergave: alleen `region` op de
  bètabanner van de layout.
- `get_advisors` (security) na elke DDL: geen meldingen voor deze tabellen of functies.

## Open punten

1. TenderNed of PIANOo vragen of hergebruik via de TNS-webservice in een ledenomgeving akkoord is, of een account voor de
   officiële XML-API aanvragen (stabieler). Juridisch toetsen bij art. 16 van de gebruiksvoorwaarden.
2. Mercell en andere platforms zijn niet als bron gebruikt; aankondigingen die alleen daar staan (onder de Europese
   drempel, niet op TenderNed) ontbreken. TenderNed linkt wel naar het externe platform als de opdrachtgever dat gebruikt.
3. Provincie ontbreekt bij ruim de helft (alleen "NL" als NUTS-code). Een koppeling opdrachtgever → gemeente of
   samenwerkingsverband (en daarmee provincie en de Restafvalkaart) zou dat oplossen.
4. CPV-filter: aanbestedingen die afval alleen onder een andere code zetten (bijv. 90000000 of 34928480 containers)
   vallen erbuiten; omgekeerd staan er enkele aanbestedingen in die 90500000 alleen als nevencode hebben (bijv. ICT met
   afvoer). Eventueel uitbreiden of filteren op hoofd-CPV.
5. "Inschrijving gesloten" bij oudere aanbestedingen betekent vaak alleen dat de gunning niet (onder dezelfde CPV) is
   gepubliceerd.
6. Geen e-mailattendering op nieuwe aanbestedingen (leden kunnen een zoek-URL bewaren).
