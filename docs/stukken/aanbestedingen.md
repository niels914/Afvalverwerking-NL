# Aanbestedingsarchief (ronde 2)

Stand: 27 oktober 2026. Onderdeel van de opdracht "platform gebruiksklaar" (docs/opdracht-gebruiksklaar.md).

## Wat er gebouwd is

Het archief op `/aanbestedingsarchief` toont echte aanbestedingen over afval uit TenderNed.

- **Bron:** de openbare publicatie-webservice van TenderNed (TNS), gefilterd op CPV-code `90500000-2` (diensten op het
  gebied van vuilnis en afval) met alle onderliggende codes (90510000 tot en met 90533000). Op 27-10-2026: 2.502
  publicaties, samen 1.435 aanbestedingen, de oudste uit 2013.
- **Database:** tabel `public.aanbestedingen` in Supabase-project `mnwynrioozcqqvhelqku`, één rij per TenderNed-kenmerk.
  RLS staat aan; de enige policy is `select` voor `authenticated` met `(select public.is_lid())`. `anon` heeft geen rechten
  op de tabel of de view. Alleen de service-rol (Edge Function) schrijft.
- **View en functies:**
  - `public.aanbestedingen_overzicht` (security invoker): actuele status (open/gesloten hangt af van de klok),
    `provincie_bron` en `afval_hoofd` (hoofd-CPV is 905…, 90000000 of onbekend).
  - `public.aanbestedingen_zoeken(p_zoek, p_stroom, p_status, p_provincie, p_dienst, p_sortering, p_alleen_hoofd)`
    (security invoker, alleen `authenticated`, RLS geldt): zoeken, filteren, sorteren. Zoekt in titel, opdrachtgever,
    omschrijving, trefwoorden, CPV-codes en -omschrijving, afvalstroom, provincie en kenmerk. "Woordgroep tussen
    aanhalingstekens" is één term; tekens als `% * ? ( )` worden genegeerd (`public.aanbestedingen_zoektermen`).
  - `public.zoek_aanbestedingen(...)` (ronde 1) bestaat nog en roept `aanbestedingen_zoeken` aan; de site gebruikt hem niet
    meer. Kan weg met `drop function public.zoek_aanbestedingen(text, text, text, text, text, text);`.
  - `public.aanbestedingen_telling()` en `public.aanbestedingen_telling_stromen()`: aantallen per status en per stroom.
  - `public.open_aanbestedingen_zoeken(p_zoek)` (security definer, ook `anon`): zie "Bezoekers".
  - `public.aanbestedingen_verversingen`: logboek van elke verversing ("laatst bijgewerkt" in de UI).
- **Verversen:** Edge Function `ververs-aanbestedingen` (`supabase/functions/ververs-aanbestedingen/`, versie 5). Haalt de
  hele lijst op (±26 verzoeken van 100), haalt detailpagina's (CPV, NUTS, trefwoorden) alleen voor nieuwe of gewijzigde
  aanbestedingen, bouwt per kenmerk één rij en doet een upsert. pg_cron-taak `ververs-aanbestedingen` draait elke dag om
  05:17 UTC; op 27-10-2026 voor het eerst zelfstandig waargenomen (run 7, geslaagd).
- **Beveiliging van de functie:** `verify_jwt` uit; de functie eist de kop `x-ververs-geheim`, gecontroleerd tegen een
  Vault-geheim via `public.ververs_geheim_klopt()` (alleen service-rol).

### Bezoekers: open aanbestedingen (besluit Niels, 27-10-2026)

Bezoekers en ingelogde niet-leden zien bovenaan "Open voor inschrijving": zoeken (ook via `?zoek=`) in titel en
opdrachtgever, en per aanbesteding alleen titel, opdrachtgever, sluitingsdatum en de link naar TenderNed. Eerst tien,
de rest met één knop. Daaronder de betaalmuur (`Vergrendeld`) voor het volledige archief, met een wazige voorbeeldweergave
van grijze balken (geen echte data).

Afgedwongen op de server: `public.open_aanbestedingen_zoeken` is security definer, maar geeft hard alleen rijen met
`status_basis = 'aankondiging'` en een sluitingsdatum in de toekomst (dus geen marktconsultaties, gunningen of
beëindigingen) en alleen vijf kolommen terug, maximaal 100 rijen. De tabel en de view blijven dicht voor `anon`
(e2e-test controleert dit). De advisor meldt "anon kan security definer-functie uitvoeren"; dat is hier de bedoeling.

### Leden: het volledige archief

- Kerncijfers en bron bovenaan (aantal, aantal open, tijdstip laatste verversing, licentie).
- Snelkeuzes: "Open voor inschrijving, vroegste sluiting eerst", "Marktconsultaties", "Recent gegund" (met aantallen).
- Zoeken, filters (afvalstroom met aantallen; stromen zonder treffers staan er niet in, status, provincie, soort dienst),
  sorteren (ook op laatste publicatie) en het vinkje "Alleen aanbestedingen met afval als hoofdopdracht". Op de telefoon
  staan filters en sorteren achter een knop.
- "Link kopiëren" (de URL bevat alle filters) en "Download CSV" (puntkomma, BOM, maximaal 2.000 rijen, voor Excel).
- Legenda "Wat betekenen de statussen en lege velden?" (inklapbaar), statussen met tekst; kleur is nooit de enige drager.
- Tabel op desktop; op de telefoon een compacte lijst: opdrachtgever, titel, status met sluiting en "nog n dagen",
  afvalstroom en provincie; procedure, publicatiedatum, omschrijving, CPV, documentenplatform en tijdlijn onder Details.
  Lege velden worden weggelaten.
- `?pagina=999` gaat naar de laatste pagina in plaats van een lege tabel.
- Toelichting "Zo komt dit overzicht tot stand" onderaan, ingeklapt.

### Afleiding (`supabase/functions/ververs-aanbestedingen/afleiding.ts`)

Eén bestand zonder imports, gebruikt door de Edge Function, de frontend en de tests (`src/lib/aanbestedingen.test.ts`).

- **Status:** ingetrokken publicaties tellen niet mee. Gunning of wijziging → Gegund; vroegtijdige beëindiging →
  Vroegtijdig beëindigd. **Nieuw:** noemt de laatste aankondiging, rectificatie of vooraankondiging zichzelf een
  marktconsultatie, marktverkenning, market consultation, RFI of informatieverzoek in de titel, of zegt de eerste zin van
  de omschrijving dat de opdrachtgever "een marktconsultatie" organiseert/houdt/start, dan is de status Marktconsultatie,
  ook als het formulier "Aankondiging opdracht" is gebruikt. Zo staat Rotterdam 618943 niet meer als "Open voor
  inschrijving". Op 27-10-2026 geldt dit voor vijf aanbestedingen met een AAO-publicatie. Een latere verwijzing ("na de
  marktconsultatie …") telt niet. Anders: open als de (eventueel door een rectificatie verlengde) sluitingsdatum nog niet
  voorbij is, anders "Inschrijving gesloten".
- **Afvalstroom:** CPV en trefwoorden. **Nieuw:** afvalbakken in gebouwen (zoals afvalscheidingsunits, TU Delft 515890)
  vallen onder "Containers en inzamelmiddelen", niet meer onder zwerfafval; zwerfafval alleen bij openbare ruimte,
  straat- of hondenafvalbakken, veegvuil of CPV 90511300.
- **Provincie:** eerst NUTS (2021 en 2024). **Nieuw:** staat daar alleen "NL", dan uit de naam van de opdrachtgever:
  "Gemeente X" (ook opsommingen als "gemeente Duiven, Westervoort en Zevenaar") en "Provincie X". Gemeentelijst:
  `gemeenten.ts`, gegenereerd door `maak-gemeenten.mjs` uit CBS "Gebieden in Nederland" 2013 tot en met 2026 (441 namen,
  ook opgeheven gemeenten). Samenwerkingsverbanden en bedrijven zonder gemeentenaam blijven zonder provincie. Kolom
  `provincie_bron` zegt waar de provincie vandaan komt; Details toont dat. Resultaat 27-10-2026: zonder provincie van
  776 naar 469 van 1.435.
- **Afval als hoofdopdracht:** 206 van 1.435 aanbestedingen hebben een hoofd-CPV buiten 905… en 90000000 (bijv. maaien,
  ICT; de inspectie telde 267 inclusief 90000000). Ze blijven in het
  archief (sommige zijn echte afvalopdrachten met een vreemde hoofdcode, zoals groenafval onder 09120000), maar krijgen het
  label "Afval is nevenonderdeel" en zijn weg te filteren.

## Bronnen en gebruiksvoorwaarden (gecontroleerd 26-10-2026)

- data.overheid.nl, dataset "Aankondigingen van overheidsopdrachten - TenderNed" (PIANOo), licentie **CC-0 1.0**:
  https://data.overheid.nl/dataset/26e6440b-1d39-4e28-8d18-57d987042622 . De beschrijving noemt de webservice
  `https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties` als manier om aankondigingen te bekijken, met de
  waarschuwing dat die zonder kennisgeving kan wijzigen. De officiële XML-API vraagt een account.
- TenderNed, "Datasets aanbesteden voor analyses": https://www.tenderned.nl/cms/nl/aanbesteden-in-cijfers/datasets-aanbestedingen
- TenderNed gebruiksvoorwaarden (versie 19-11-2025), https://www.tenderned.nl/over-deze-site/gebruiksvoorwaarden:
  art. 7 (opdrachtgever verantwoordelijk voor juistheid; in de UI: "Juridisch geldt alleen de aankondiging op TenderNed")
  en art. 16 (rechten bij de Staat; wij gebruiken geen logo of vormgeving, noemen de bron en linken naar elke aankondiging).
- CBS, Gebieden in Nederland 2013-2026 (open data, CC BY 4.0), tabellen 82000NED tot en met 86247NED,
  https://opendata.cbs.nl/statline/#/CBS/nl/dataset/86247NED/table , peildatum 27-10-2026.
- Eurostat GISCO, NUTS 2021 en 2024, https://gisco-services.ec.europa.eu/distribution/v2/nuts/ .
- Geen persoonsgegevens: lijst en gebruikte detailvelden bevatten geen contactpersonen.
- Belasting van de bron: één run per dag, ±26 lijstverzoeken plus enkele detailverzoeken, met pauzes.

## Onderhoud

- **Dagelijks vanzelf.** Controle: `select * from public.aanbestedingen_verversingen order by id desc limit 5;`
- **Handmatig verversen** (SQL-editor of MCP, als postgres): `select public.start_ververs_aanbestedingen(300);`
  Antwoord: `select status_code, content from net._http_response order by id desc limit 1;`
- **Regels aanpassen** (stromen, marktconsultatie, provincie): `afleiding.ts`, test toevoegen in
  `src/lib/aanbestedingen.test.ts`, de functie opnieuw uitrollen (`index.ts`, `afleiding.ts`, `gemeenten.ts`,
  `verify_jwt: false`) en één keer verversen; alle rijen worden opnieuw afgeleid uit de opgeslagen details.
- **Gemeentelijst bijwerken** (na een gemeentelijke herindeling, jaarlijks in januari): tabel-id van het nieuwe jaar
  toevoegen in `maak-gemeenten.mjs`, `NODE_USE_ENV_PROXY=1 node supabase/functions/ververs-aanbestedingen/maak-gemeenten.mjs`,
  daarna uitrollen en verversen.
- **Geheim vernieuwen:** `select vault.update_secret((select id from vault.secrets where name='ververs_aanbestedingen_geheim'), encode(extensions.gen_random_bytes(32),'hex'));`
- Migraties: `20261026090000_aanbestedingen.sql`, `20261026091000_aanbestedingen_cron.sql`,
  `20261027090000_aanbestedingen_r2.sql`, `20261027190000_aanbestedingen_open_voor_bezoekers.sql`.
  De r2-migratie is eerst via `execute_sql` toegepast (de bevestigingsvraag bij `apply_migration` kreeg geen antwoord;
  de versie zonder drop/update is daarna alsnog via `apply_migration` vastgelegd, idempotent).

## Controles (27-10-2026)

- `npx tsc --noEmit -p .`: geen fouten.
- `npx vitest run`: 297 tests groen, waarvan 37 in `src/lib/aanbestedingen.test.ts`.
- `npx vite build --outDir /tmp/claude-0/build-aanbestedingen`: geslaagd.
- `e2e/aanbestedingen.spec.ts` (400 px en 1280 px) tegen `vite preview` op poort 5107: 15 geslaagd, 1 overgeslagen
  (telefoontest alleen op 400 px). Dekt: open lijst voor bezoekers zonder marktconsultaties, betaalmuur zonder echte data,
  anon krijgt alleen vijf velden van open rijen en geen toegang tot tabel, view of ledenfuncties, Rotterdam 618943 is
  marktconsultatie, zoeken op CPV-code en woordgroep met `%` en `*`, afval-als-hoofdopdracht, `?zoek=`, filters,
  sortering, paginering, `?pagina=999`, snelkeuze, link kopiëren, CSV-download, legenda, compacte lijst op de telefoon,
  geen horizontale scroll.
  Draaien: `NODE_USE_ENV_PROXY=1 PW_BASE=http://localhost:5107 E2E_EMAIL=… E2E_WACHTWOORD=… npx playwright test e2e/aanbestedingen.spec.ts`.
- Lighthouse mobiel (bezoeker): prestaties 0,98, toegankelijkheid 1,0, best practices 1,0, CLS 0.
- `get_advisors` (security) na de DDL: alleen de bedoelde melding voor `open_aanbestedingen_zoeken` (anon en
  authenticated) en de bestaande meldingen voor `is_lid`, `mijn_domein` en wachtwoordlekcontrole.
- Paginahoogte op 400 px: bezoeker 3.268 px (was 6.559 met alle open regels); lid met 25 resultaten 6.974 px (ronde 1
  ±11.000 px).

## Open punten

1. Juridisch (Niels): hergebruik via de TNS-webservice, nu ook voor bezoekers, bevestigen bij TenderNed/PIANOo, of een
   account voor de officiële XML-API aanvragen. Toetsen aan art. 16 van de gebruiksvoorwaarden.
2. Marktconsultatie-herkenning is tekstueel; een opdrachtgever die een consultatie als aankondiging publiceert zonder het
   woord in titel of eerste zin, valt erdoorheen. Leden kunnen dat melden via het feedbackformulier.
3. Provincie ontbreekt nog bij 469 aanbestedingen (samenwerkingsverbanden, bedrijven, scholen). Een koppeling
   samenwerkingsverband → gemeenten zou helpen, maar vraagt een onderhouden lijst.
4. Mercell en andere platforms zijn geen bron; aankondigingen die alleen daar staan ontbreken.
5. "Inschrijving gesloten" bij oudere aanbestedingen betekent vaak alleen dat de gunning niet is gepubliceerd.
6. Geen e-mailattendering op nieuwe aanbestedingen (leden kunnen een zoeklink bewaren of kopiëren).
7. `public.zoek_aanbestedingen` (ronde 1) kan worden verwijderd; dat is een drop en vraagt bevestiging.

## Ronde 3: documenten, gunningen en de documentenbibliotheek (13-14 november 2026)

### Wat TenderNed openbaar geeft (onderzocht met echte aanroepen op 13-11-2026)

Alle eindpunten zitten in dezelfde openbare webservice als de lijst (`https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties`), zonder account.

- **Documentenlijst:** `/v2/publicaties/{publicatieId}/documenten` geeft per document `documentId`, `documentNaam`, `typeDocument` (pdf, docx, xlsx, xls),
  `datumPublicatie`, `publicatieCategorie` (ANK aankondiging, DOC aanbestedingsdocumenten, NVI nota van inlichtingen, MAC marktconsultatie),
  `grootte` (bytes) en `links.download.href` (`/v2/publicaties/{id}/documenten/{nr}/content`, ook zonder inloggen te openen).
  Gecontroleerd op 24 aanbestedingen uit 2013 tot en met 2026 (verschillende statussen en procedures): alle publicaties van één kenmerk geven
  dezelfde documentenlijst (11 van 11 vergeleken kenmerken identiek), dus één verzoek per aanbesteding volstaat, bij de laatste geldige publicatie.
  Oudere aanbestedingen (2013 en later) hebben meestal alleen de aankondiging zelf als document; de leidraad en bijlagen staan er vaak niet bij,
  of staan op het eigen platform van de opdrachtgever (Mercell, Negometrix, enzovoort).
  Een enkele publicatie geeft een 404 (bijvoorbeeld een gunning zonder dossier); dat tellen we als nul documenten.
- **Gunning:** de JSON-detailpagina (`/v2/publicaties/{id}`) noemt **geen** winnaar, waarde of aantal inschrijvingen. Die staan in de officiële weergave
  van de aankondiging: `/v2/publicaties/{id}/html` (JSON met een veld `html`). Twee vormen: eForms (tabel, vanaf 2024) en het oudere standaardformulier SF03.
  Daaruit lezen we: gegunde bedrijven (bedrijfsnamen), datum van het contract, waarde, aantal inschrijvingen, percelen, en alleen bij eForms de geraamde
  looptijd (begindatum, einddatum of looptijd) en het maximum aantal verlengingen. Bij oudere aankondigingen geeft soms de detailpagina `aanvangOpdrachtDatum` en
  `voltooiingOpdrachtDatum`; die gebruiken we als terugval (`einde_bron = 'detail'`).
  Niet in de bron: waarde bij veel aankondigingen (invulwaarden als 1 euro), looptijd bij SF03, inschrijvers die niet wonnen.
- Er is geen openbare OpenAPI-beschrijving gevonden (`/v3/api-docs` en `/swagger-ui` geven 404); de eindpunten hierboven zijn dus afgeleid uit het gedrag van de
  service zelf en kunnen zonder kennisgeving wijzigen (zelfde waarschuwing als bij de lijst).

### Wat de voorwaarden zeggen (TenderNed gebruiksvoorwaarden, versie 19-11-2025, gelezen 13-11-2026)

- Art. 7 (Gegevensuitwisseling): gebruikers zijn zelf verantwoordelijk voor de juistheid van wat zij plaatsen; TenderNed controleert het niet, heeft geen inzicht
  in de inhoud van documenten en is geen partij bij de aanbestedingen. Documenten zijn dus van de opdrachtgevers en niet door de CC-0-dataset gedekt.
- Art. 16 (Intellectuele eigendomsrechten): rechten op teksten, databestanden en dergelijke berusten bij de Staat; gebruik van het beeldmerk of andere rechten alleen met
  schriftelijke toestemming.
- De CC-0-licentie van data.overheid.nl (dataset "Aankondigingen van overheidsopdrachten - TenderNed") gaat over de aankondigingen, niet over de bijlagen die opdrachtgevers uploaden.
- **Gevolg voor het platform:** er worden **geen documenten en geen documentinhoud gekopieerd of opgeslagen**. Alleen metadata (naam, soort, bestandstype, datum, grootte) en de
  link naar het document op TenderNed. Leden openen het document bij TenderNed. De platformindeling in soorten is een eigen indeling en staat zo in de UI.
  Een formeel akkoord van TenderNed/PIANOo voor het gebruik van de webservice voor documentlinks is niet gevraagd (open punt 1 hieronder).

### Wat er is gebouwd

- **Tabellen** (migratie `20261113120000_aanbestedingen_documenten_gunningen.sql`, RLS aan, alleen leden via `public.is_lid()`, `anon` niets):
  `public.aanbesteding_documenten` (per document: naam, soort, bestandstype, categorie, datum, grootte, url) en `public.aanbesteding_gunningen` (per aanbesteding:
  gegund aan, gunningsdatum, waarde, aantal inschrijvingen, percelen als JSON, looptijd, einde, `einde_afgeleid`, `einde_bron`, verlengingen).
  Nieuwe kolommen op `public.aanbestedingen`: `documenten_publicatie_id`, `documenten_opgehaald`, `documenten_aantal`, `documenten_soorten`, `gunning_publicatie_id`, `gunning_opgehaald`.
  De view `aanbestedingen_overzicht` is uitgebreid met documenten- en gunningskolommen (achteraan).
- **Functies:** `aanbestedingen_zoeken_plus` (zoeken met extra filters `p_soort`, `p_partij`, `p_afloop_jaar`), `documenten_zoeken`, `documenten_filteropties`,
  `aanbestedingen_gegunde_partijen`, `aanbestedingen_afloopjaren` (alleen leden) en `aanbestedingen_documenten_openbaar` (security definer, ook anon: alleen aantallen per soort).
  `start_vul_aanbestedingen(p_max_documenten, p_max_gunningen)` (alleen service-rol) start de Edge Function in vul-modus.
- **Edge Function** `ververs-aanbestedingen` (versie 7): na de gewone verversing worden documentenlijsten en gunningen aangevuld, nieuwste eerst, begrensd
  (standaard 150 documentenlijsten en 60 gunningen per run, tijdbudget 105 seconden, twee gelijktijdige verzoeken met 350 ms pauze) en hervatbaar (alleen wat nog niet of voor een
  nieuwere publicatie niet is opgehaald). Body `{"modus":"vul","maxDocumenten":300,"maxGunningen":150}` slaat de lijst over en vult alleen aan. Het logboek
  (`aanbestedingen_verversingen`) heeft kolommen `documenten_opgehaald`, `documenten_open`, `gunningen_opgehaald`, `gunningen_open`. Een fout in het aanvullen laat de verversing zelf niet mislukken.
  Gedeelde afleiding zonder imports: `supabase/functions/ververs-aanbestedingen/documenten.ts` (soort van een document) en `gunning.ts` (gunning uit de aankondiging), met tests in `src/lib/aanbestedingen.test.ts`.
- **Archief** (`/aanbestedingsarchief`, leden): bij Details de gunning en het contract (met "afgeleid"/"volgens de aankondiging") en de documentenlijst per soort met links naar TenderNed;
  filters "Documenten" (met conceptovereenkomst, programma van eisen, gunningscriteria, leidraad, prijzenblad), "Contract loopt af in" en "Gegunde partij"; sorteren op einde contract.
- **Documentenbibliotheek** (`/aanbestedingsarchief/documenten`, leden; bezoekers zien totalen per soort en de betaalmuur): zoeken en filteren op afvalstroom, soort, jaar, opdrachtgever en procedure;
  `?stroom=`, `?soort=` (codes: leidraad, programma-van-eisen, overeenkomst, voorwaarden, gunningscriteria, nota-van-inlichtingen, prijzenblad, uea, aankondiging, marktconsultatie, overig),
  `?jaar=`, `?opdrachtgever=`, `?procedure=`, `?zoek=`, `?sortering=`, `?pagina=`.
- **Soort document** (`soortDocument`): afgeleid van de bestandsnaam en de categorie van TenderNed, eerste passende regel wint; wat niet herkend wordt heet "overig" (zo'n 30 procent van de bijlagen: referentieverklaringen,
  begrippenlijsten, SROI en dergelijke). Een indeling van dit platform, niet van TenderNed.
- **Waarden onder 1.000 euro** in de aankondiging (1 euro, 0 euro) zijn invulwaarden en worden niet bewaard of getoond.
- **Privacy:** geen namen van contactpersonen, e-mailadressen of telefoonnummers; de parser leest alleen de bedrijfsnaam van de winnaar. Nieuwe tabellen en functies staan in `supabaseGebruik` (`src/pages/juridisch/gegevens.ts`).

### Contractenkalender

@@KALENDER@@

### Open punten ronde 3

1. Juridisch (Niels): het gebruik van `/documenten` en `/html` van de TNS-webservice bevestigen bij TenderNed/PIANOo (zelfde vraag als open punt 1 van ronde 2), en de lijst met link naar documenten (die dus rechtstreeks op de download van TenderNed wijst) laten toetsen.
2. @@VOORTGANG@@
3. De soortindeling is tekstueel; leden kunnen verkeerd ingedeelde documenten melden via het feedbackformulier.
4. Looptijd en einde van contracten staan alleen bij eForms-aankondigingen en bij een deel van de oudere via de detailpagina; bij de rest blijft het veld leeg. Verlengingsopties zijn vrije tekst en worden niet doorgerekend.
5. Documenten die een opdrachtgever buiten TenderNed publiceert (Mercell, eigen platform) staan er niet bij.
6. Verlopen of verwijderde documenten op TenderNed worden bij een volgende verversing van die aanbesteding opgeruimd (alleen als er een nieuwere publicatie is).
7. De `aanbestedingen_zoeken`-functie van ronde 2 wordt door de site niet meer gebruikt (de site gebruikt `aanbestedingen_zoeken_plus`); opruimen is een drop en vraagt bevestiging.
