# Inhoud: Restafvalkaart, nieuws, kennisbank en homepage (ronde 1)

Stand: 19 oktober 2026. Alle fictieve inhoud op deze vier onderdelen is vervangen door echte, openbare inhoud met bron en peildatum.

## Wat er gebouwd is

### Restafvalkaart (`/restafvalkaart`)

- **Choropleet per gemeente** voor alle 342 gemeenten (peiljaar 2024, het laatste jaar met gemeentecijfers bij CBS). Drie indicatoren, te kiezen boven de kaart: restafval per inwoner (fijn + grof), gescheiden ingezameld (%) en totaal huishoudelijk afval per inwoner. Keuze en gekozen gemeente staan in de URL (`?toon=scheidingsPct&gemeente=GM0344`), zodat een link te delen is.
- **Legenda** met vaste, ronde klassegrenzen (restafval 100/150/200/250 kg; scheiding 50/60/70/80 %; totaal 400/450/500/550 kg), de grenzen in tekst en het aantal gemeenten per klasse. Kleurreeks: één violette tint van licht naar donker, gecontroleerd met de dataviz-validator (oplopende lichtheid, zichtbare stappen, lichtste stap ≥ 2:1 tegen wit). Gemeenten zonder cijfer: wit met stippelrand en een eigen legendaregel.
- **Zoeken op gemeente**: op naam (zonder accenten, hoofdletters of "'s-") of CBS-code, met suggesties; Enter kiest de beste treffer. De kaart zoomt naar de gemeente en de focus gaat naar de kop van het paneel.
- **Paneel met kerncijfers**: restafval, scheidingspercentage, totaal, restafval in ton (berekend), vergelijking met het landelijk gemiddelde en met het vorige jaar, rangorde, en de afvalstromen per inwoner (fijn/grof rest, gft, papier, PMD, glas, textiel).
- **Aanbestedingsblok**: link naar `/aanbestedingsarchief?zoek=<gemeentenaam>`.
- **Tabelweergave** als toegankelijk alternatief: alle gemeenten, filter op provincie, sorteren per kolom (`aria-sort`), kiezen van een gemeente vanuit de tabel, download als CSV (puntkomma, decimale komma, UTF-8 met BOM).
- **Bron, peiljaar en rekenwijze** onderaan de pagina: CBS-tabellen met link, wijzigingsdatum, status (nader voorlopig), ophaaldatum, PDOK-bron met licentie en bewerking, definities en de controle tegen het landelijke CBS-cijfer.
- Geen OpenStreetMap-tegels meer: de vlakken zijn de kaart. Dat scheelt een externe verbinding (privacy) en houdt de kleuren zuiver.
- Als de grenzen niet laden, toont de pagina een melding en blijft de tabel werken.

### Homepage (`/`)

Hero met kleine choropleet (restafval), een blok "Huishoudelijk afval in Nederland" met landelijke CBS-cijfers (restafval 176 kg, 61 % gescheiden, 455 kg totaal, 84 van 342 gemeenten onder 100 kg), de vier nieuwste nieuwsberichten, drie recente kennisbankpublicaties, uitgelichte tools en het lidmaatschapsblok. De homepage laadt alleen de kleine kop van de afvaldata (`afval-bron.json`), niet de 342 rijen.

### Nieuws (`/nieuws`)

Berichten uit openbare RSS-feeds: Rijksoverheid (onderwerp Afval, plus zoekfeeds "circulaire economie" en "recycling"), PIANOo (nieuws en jurisprudentie) en CBS (alle nieuwsberichten). Gefilterd op afval, recycling, verpakkingen, textiel, verbranding en circulaire economie. Per bericht: titel (link naar het origineel), datum, bron, thema en de korte inleiding zoals de feed die geeft (hooguit 220 tekens). Filters op bron en thema, 15 berichten per keer. Geen volledige artikelen.

### Kennisbank (`/kennisbank`)

Achttien echte publicaties: Rijkswaterstaat (Afvalverwerking in Nederland 2024, sorteeranalyses 2025), CBS (tabel 83452NED, nieuwsbericht 2025), Rijksoverheid/IenW (CMP-vaststelling, beleidsvisie afvalverbranding, NPCE, textiel), TNO, Tweede Kamer (intentieverklaring AVI's), Ecorys/CE Delft (evaluatie afvalstoffenbelasting), Trinomics, PBL (ICER 2025, opties afvalstoffenbelasting), CE Delft (blik bron/nascheiding), Verpact (2024 en voorlopig 2025) en PIANOo (MVI-criteriatool). Per publicatie: uitgever, opdrachtgever, datum of jaar, soort, thema's, eigen samenvatting, "bruikbaar voor", formaat en taal. Zoeken en filteren op thema en soort.

## Bestanden

| Bestand | Rol |
|---|---|
| `scripts/cbs-afval-gemeenten.mjs` | Haalt CBS-cijfers op → `src/data/afval-gemeenten.json` (rijen) en `src/data/afval-bron.json` (bron, controle, samenvatting) |
| `scripts/pdok-gemeentegrenzen.mjs` | Haalt PDOK-grenzen op → `public/data/gemeentegrenzen.geojson` (380 kB, 105 kB gzip) en `src/data/gemeentegrenzen-bron.json` |
| `scripts/nieuws.mjs` | Haalt RSS op → `src/data/nieuws.json`; draait vóór elke build |
| `src/data/gemeenten.ts`, `src/data/afvalbron.ts` | Types en export van de afvaldata en bronnen |
| `src/data/nieuws.ts`, `src/data/kennisbank.ts` | Nieuws (uit JSON) en kennisbank (handmatig beheerd) |
| `src/data/samenwerkingsverbanden.ts` | Bewust leeg, met uitleg (zie open punten) |
| `src/lib/kaartdata.ts` (+ test) | Indicatoren, klassen, gewogen gemiddelden, rangorde, zoeken, CSV |
| `src/components/kaart/RestafvalKaart.tsx`, `Legenda.tsx`, `kaart.css` | Choropleet, legenda en opmaak |
| `src/pages/Restafvalkaart.tsx`, `Home.tsx`, `Nieuws.tsx`, `Kennisbank.tsx` | Pagina's |
| `e2e/inhoud.spec.ts` | End-to-endtest (400 px en desktop) |

## Rekenwijze en definities

- **Restafval** = huishoudelijk restafval (fijn) + grof huishoudelijk restafval, kg per inwoner (CBS 83452NED).
- **Gescheiden ingezameld** = (totaal − fijn rest − grof rest − verbouwingsrestafval) / totaal. Dit is de CBS-definitie: landelijk geeft deze formule 60,4 % tegen 61 % in CBS-tabel 83558NED (verschil door afronding; het script stopt als het verschil groter is dan 1 procentpunt). Nascheiding telt niet mee, dus gemeenten die restafval laten nascheiden scoren hier lager dan in eigen rapportages.
- **Inwoners**: gemiddelde bevolking in het peiljaar (CBS 03759ned). Gebruikt voor tonnen en gewogen gemiddelden.
- **Landelijk gemiddelde** in het paneel: gemiddelde van de gemeenten, gewogen naar inwoners (scheiding: naar inwoners × totaal). Komt uit op 175 kg restafval; het CBS-landcijfer is 176 kg (afronding).
- **PMD** = kunststof verpakkingen + drankenkartons + metalen verpakkingen + gemengde PMD-fractie.
- CBS publiceert voor Deurne en Pekela (2024) geen totaal; daar ontbreekt het scheidingspercentage.

## Onderhoud

**Nieuwe CBS-cijfers** (CBS kondigt gemeentecijfers over 2025 aan voor oktober 2026):

```bash
NODE_USE_ENV_PROXY=1 node scripts/cbs-afval-gemeenten.mjs        # pakt automatisch het laatste jaar
NODE_USE_ENV_PROXY=1 node scripts/pdok-gemeentegrenzen.mjs       # grenzen van hetzelfde jaar
npx vitest run src/lib/kaartdata.test.ts                         # controleert o.a. dat codes en grenzen overeenkomen
```

Een ander jaar kiezen: geef het jaar mee (`node scripts/cbs-afval-gemeenten.mjs 2023`). Zonder proxy kan `NODE_USE_ENV_PROXY=1` weg. Het CBS-script stopt zonder te schrijven als er minder dan 300 gemeenten zijn of als de landelijke controle niet klopt.

**Nieuws**: `npm run build` draait `node scripts/nieuws.mjs` automatisch. Het script start zichzelf opnieuw met `NODE_USE_ENV_PROXY=1` als er een proxy is ingesteld. Lukt een feed niet, dan blijven de eerder opgeslagen berichten van die bron staan; lukt er geen enkele, dan blijft de vorige versie staan. Het script eindigt altijd met exitcode 0, zodat de build doorgaat. Bronnen en het trefwoordfilter staan bovenin het script (`BRONNEN`, `RELEVANT`, `THEMAS`). Berichten ouder dan drie jaar vallen weg; maximaal 80.

**Kennisbank**: handmatig in `src/data/kennisbank.ts`. Controleer links periodiek en pas `linksGecontroleerd` aan:

```bash
grep -oE "url: '[^']+'" src/data/kennisbank.ts | sed "s/url: '//;s/'$//" | while read u; do echo "$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 40 "$u") $u"; done
```

`zoek.officielebekendmakingen.nl` geeft soms een 504 of verbreekt de verbinding; bij herhalen gaf elke link 200.

## Bronnen

| Wat | Bron | Peildatum |
|---|---|---|
| Afval per gemeente | CBS StatLine 83452NED, https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83452NED/table (tabel gewijzigd 16-07-2026; 2022–2024 nader voorlopig) | opgehaald 19-10-2026 |
| Bevolking | CBS StatLine 03759ned (gemiddelde bevolking 2024) | 19-10-2026 |
| Provincie per gemeente | CBS StatLine 85755NED, Gebieden in Nederland 2024 | 19-10-2026 |
| Landelijke controle | CBS StatLine 83558NED, Gemeentelijke afvalstoffen; hoeveelheden | 19-10-2026 |
| Gemeentegrenzen | PDOK, CBS Gebiedsindelingen, collectie `gemeente_gegeneraliseerd`, jaarcode 2024, https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1 (CC BY 4.0) | 19-10-2026 |
| Nieuws | `https://www.rijksoverheid.nl/api/rss?...` (onderwerp Afval; zoekfeeds), `https://www.pianoo.nl/nl/rss/nieuws.rss`, `https://www.pianoo.nl/nl/rss/jurisprudentie.rss`, `https://www.cbs.nl/nl-nl/rss-feeds/alle-nieuwsberichten` | bij elke build |
| Kennisbank | 18 links in `src/data/kennisbank.ts`, alle HTTP 200 | 19-10-2026 |

De oude Rijksoverheid-feeds (`feeds.rijksoverheid.nl`) en `rijksoverheid.nl/api/feeds` werken niet meer ("feeds offline"). De nieuwe RSS-links worden door de site zelf gemaakt via `/api/rss?query=<json>`; die vorm gebruikt het script.

## Controles

- `npx tsc --noEmit -p .`: geen fouten in mijn bestanden.
- `npx vitest run src/lib/kaartdata.test.ts`: 13 tests groen (rekenregels, zoeken, CSV, echte data: aantal gemeenten, codes ↔ grenzen, landelijke controle, kennisbank- en nieuwsvelden).
- `npx vite build --outDir /tmp/claude-0/build-inhoud`: geslaagd. Kaartcode en gemeenterijen zitten in een apart, lui geladen deel (64 kB gzip); de hoofdbundel werd 82 kB kleiner doordat de homepage de rijen niet meer laadt.
- `e2e/inhoud.spec.ts` tegen eigen server (poort 5106): 17 geslaagd, 1 overgeslagen (klikken op coördinaten alleen op desktop), op 400 px en 1280 px. Inclusief: geen horizontale scroll, zoeken, tabel en CSV, kaart zonder grenzen, nieuws- en kennisbanklinks gelijk aan de databestanden.
- Nieuwsscript getest met onbereikbare feeds: vorige versie blijft staan, exitcode 0.

## Open punten

1. **Aanbestedingsarchief leest `?zoek=` nog niet.** De link vanuit het kaartpaneel is er; `src/pages/Aanbestedingsarchief.tsx` (niet mijn bestand) moet de parameter `zoek` als beginwaarde van het zoekveld gebruiken.
2. **Samenwerkingsverbanden** staan niet op de kaart: er is geen openbare, onderhouden bron met de indeling van gemeenten in afvalsamenwerkingsverbanden. Het type en de uitleg staan klaar in `src/data/samenwerkingsverbanden.ts`; `kerncijfers()` in `kaartdata.ts` rekent een groep gemeenten al door.
3. **Peiljaar 2025**: CBS heeft landelijke cijfers over 2025 (juli 2026), maar de gemeentetabel loopt nog tot 2024. Script opnieuw draaien zodra CBS de gemeentecijfers publiceert.
4. **Scheidingspercentage** volgt CBS (inzameling). Gemeenten die nascheiden zien elders een hoger cijfer; de toelichting staat op de pagina. Een eigen variant met nascheiding vraagt gegevens die niet openbaar per gemeente beschikbaar zijn.
5. **README** noemt nog OpenStreetMap-tegels en fictieve kaartdata/nieuws/kennisbank (sectie "Wat is fictief" en "Privacy en externe verbindingen"). Dat bestand is niet van mij; het moet worden bijgewerkt. Ook de privacy- en cookieverklaring kunnen OpenStreetMap als externe verbinding schrappen voor de kaart.
6. **Bannertekst** ("Onderdelen met het label 'Voorbeeld' bevatten verzonnen gegevens") geldt niet meer voor kaart, nieuws en kennisbank; dat is aan de eigenaar van `Banner.tsx`.
7. Op 400 px is de kaart klein (Nederland vult ongeveer twee derde van de breedte). Zoeken en de tabel zijn daar de hoofdroute; overweeg later een hogere kaart op mobiel.
