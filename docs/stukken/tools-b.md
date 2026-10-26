# Tools B: Bodemassencalculator, Rekenmodel PMD en Aanbestedingstool

Stand: 26 oktober 2026 (ronde 1, afgerond na onderbreking op 23 oktober). Alle drie de tools rekenen nu met cijfers uit openbare bronnen. Elk cijfer heeft een
bron en een peildatum in de UI, in de CSV en in een databestand. Een waarde die niet uit een openbare bron komt, staat
zichtbaar als kental of aanname. Bedragen zonder bron (opwerkingstarief bodemas, metaalprijzen, teruggewonnen PMD bij
nascheiding) staan leeg tot de gebruiker ze invult; de tool rekent dan alleen wat wel bekend is en zegt wat ontbreekt.

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Bodemassencalculator | `src/pages/tools/Bodemassencalculator.tsx` | Gratis: één installatie. Ruwe bodemas, ferro, non-ferro en overig uit kentallen van Rijkswaterstaat; netto kosten zodra tarief en metaalprijzen zijn ingevuld; deel van de metaalopbrengst instelbaar. Tabel 2022–2024, bronnenlijst, CSV, deellink. Pro: meerdere installaties met totaal, gevoeligheidsanalyse (grafiek en tabel), CSV, rapport. |
| Rekenlogica bodemas | `src/lib/calc/bodemas.ts` (+ test) | Pure functies; bedragen `null` zolang tarief of prijzen ontbreken. Deellink-parameters. |
| Kentallen bodemas | `src/data/tools-b-bodemas.ts` | Landelijke kilotonnen 2022–2024 (tabel 9 en 13) en de afgeleide percentages. |
| Rekenmodel PMD (leden) | `src/pages/tools/PmdRekenmodel.tsx` | Gemeentekeuze vult inwoners, PMD en restafval met CBS-cijfers. Bronscheiding en nascheiding naast elkaar ten opzichte van de nulsituatie "alles verbranden": kosten, vergoeding Verpact, vermeden verbranding, netto per jaar en per inwoner. Omslagpunt voor teruggewonnen PMD. Inzamelvergoeding per staffelcategorie 2026–2028 voor uw tonnage. CSV, deellink, rapport. Openbaar: staffeltabel en bronnenlijst. |
| Rekenlogica PMD | `src/lib/calc/pmd.ts` (+ test) | Pure functies per route, omslagpunt, deellink. |
| Gegevens PMD | `src/data/tools-b-pmd.ts`, `src/data/tools-b-cbs-pmd.json` | Staffel 2026–2028, kostenbasis, nascheidingsvergoeding en -kosten, kental verbrandingstarief, CBS per gemeente (342 gemeenten, 2024) en landelijk (2025). |
| Ophaalscript CBS | `scripts/tools-b-cbs-pmd.mjs` | Haalt CBS 83452NED, 83558NED en 70072ned op en schrijft de JSON. |
| Aanbestedingstool | `src/pages/tools/Aanbestedingstool.tsx` | Vier stappen naar het voorbeeld van de MVI-criteriatool: (1) afvalstroom, soort aanbestedende dienst, volume, tarief, looptijd → geraamde waarde en drempeltoets; (2) eisen, gunningscriteria, contractbepalingen en aandachtspunten kiezen met zoeken op trefwoord (ook MVI-code) en filters op soort, thema en "alleen MVI"; (3) weging in punten → procenten (samen precies 100), signalen bij prijs 0 % of ≥ 90 %; (4) overzicht met checklist, download als tekstbestand en CSV, deellink (inclusief stap), printweergave voor iedereen. De stappenbalk bestaat uit knoppen: u springt direct naar elke stap. |
| Rekenlogica aanbesteding | `src/lib/calc/aanbesteding.ts` (+ test) | Weging, afronding op 100, geraamde waarde, drempeltoets, prijssignaal, checklist, CSV- en tekstexport, deellink. Een leeg tarief gaat als `tarief=` mee in de link; een link met alleen een andere stroom krijgt de standaardselectie en het tariefkental (of leeg) van die stroom. |
| Criteria per stroom | `src/data/tools-b-aanbesteding.ts` | 8 stromen, 45 criteria. Alle 15 MVI-criteria voor huishoudelijk afval (049.001–049.015) en 2 uit Zware voertuigen (042.002, 042.003) met code, ambitieniveau en link; overige criteria als "Voorbeeld KplusV". Drempelbedragen 2026–2027. |
| Bronnen | `src/data/tools-b-bronnen.ts` | Alle bronnen met titel, uitgever, datum, URL en `PEILDATUM`. |
| Componenten | `src/components/rekenen/b/` | `BronVeld` (getalveld met herkomstlabel, bronlink, "Terug naar bronwaarde", leeg toegestaan), `CelGetal` (tabelinvoer), `Knoppen` (print voor iedereen, tekstdownload, melding ontbrekende invoer), `tools-b.css`. |
| Overzicht tools | `src/pages/Tools.tsx`, `src/data/tools.ts` | Teksten zonder "dummy", per tool de bronnen; label "Gratis deel + Pro voor leden"; beschrijvingen van Indexcalculator en CO2-scan bijgewerkt naar wat tools-a bouwde. |
| Standaardwaarden | `src/data/standaardwaarden.ts` | Verwijst naar de bronbestanden; waarden zonder bron staan op `null`. `indexStandaard` en `co2Standaard` blijven voor oude imports. |
| E2E | `e2e/tools-b.spec.ts` | Alle drie de tools op 400 px en desktop. |

## Rekenregels

**Bodemas**

```
ruwe bodemas      = verbrand afval × aandeel bodemas
ferro, non-ferro  = ruwe bodemas × aandeel ferro, aandeel non-ferro
kosten opwerking  = ruwe bodemas × verwerkingstarief (€/t ruwe bodemas)
opbrengst metalen = (ferro × prijs ferro + non-ferro × prijs non-ferro) × uw deel (%)
netto kosten      = kosten opwerking − opbrengst metalen
```

Niet in de berekening: transport, stortkosten van reinigingsresidu, afvalstoffenbelasting op storten.

**PMD** (nulsituatie: al het PMD gaat met het restafval naar de verbranding)

```
bron:  PMD = inwoners × respons / 1000
       netto = PMD × (inzamelkosten + overige kosten − inzamelvergoeding − verbrandingstarief)
na:    restafval = inwoners × restafval naar nascheider / 1000
       netto = restafval × (nascheidingskosten − nascheidingsvergoeding) − teruggewonnen PMD × verbrandingstarief
```

Restafval naar de nascheider = CBS-restafval + CBS-PMD van de gemeente (bij nascheiding zit het PMD in het restafval).
Inzameling van restafval zelf telt in beide routes gelijk en zit er niet in. Sortering bij bronscheiding valt onder
Verpact (na overdracht op de overslag).

**Aanbesteding**

```
weging_i         = punten_i / Σ punten × 100 %  (afgerond met grootste-restmethode op samen 100 %)
geraamde waarde  = volume × tarief × (looptijd + verlengingsopties)
Europees         = geraamde waarde ≥ drempelbedrag
```

## Gebruikte cijfers en bronnen (peildatum 19 oktober 2026)

| Gegeven | Waarde | Status | Bron |
|---|---|---|---|
| Verbrand in AVI's | 7.392 / 6.841 / 6.422 kton (2022–2024) | officieel | Rijkswaterstaat, Afvalverwerking in Nederland, gegevens 2024 (juni 2026), tabel 9: https://verenigingafvalbedrijven.nl/public/News/540/download/Afvalverwerking%20in%20Nederland%20gegevens%202024.pdf |
| Ruwe bodemas, ferro, non-ferro, gestort | 2024: 1.570 / 109 / 38 / 60 kton (ook 2022 en 2023) | officieel | idem, tabel 13 |
| Aandeel bodemas | 24,4 % (2024; 22,7 % in 2022, 25,8 % in 2023) | kental, afgeleid | idem |
| Ferro / non-ferro | 6,9 % / 2,4 % van ruwe bodemas (2024) | kental, afgeleid | idem |
| Samenstelling bodemas, residu max. 15 % | context, niet in berekening | kental | Strategy& voor Vereniging Afvalbedrijven, 11 september 2025, p. 78: https://verenigingafvalbedrijven.nl/public/News/507/download/25.09.10%20-%20PwC%20-%20Gevolgen%20fiscale%20maatregelen%20afvalsector.pdf |
| Staffel inzamelvergoeding 2026 | 325 / 277 / 228 / 195 / 0 €/t; 3b 179 (2027) en 163 (2028) | officieel | Onderhandelingsresultaat Verpact, VNG en NVRD, aanbiedingsbrief 28 mei 2025, par. 6.2 (ingestemd ALV VNG en NVRD 18–19 juni 2025): https://www.nvrd.nl/wp-content/uploads/2025/06/Aanbiedingsbrief-nieuwe-afspraken-verpakkingsafval.pdf |
| Kostenbasis bronscheiding | € 325 per ton PMD | kental | idem (100 % van de staffel) |
| Nascheidingsvergoeding 2026 | € 17,26 per ton restafval | officieel | idem, par. 7 |
| Nascheidingskosten | € 119,85 per ton restafval = (93,47 + 6,79) × 1,1954 | kental, afgeleid | idem, par. 7 |
| Voorschot 2026 | € 195 per ton | officieel | NVRD, 11 juni 2025: https://www.nvrd.nl/nieuws/11-vragen-over-de-nieuwe-afspraken-met-verpact/ |
| Poorttarief restafval bij aanbesteding | € 55–70 per ton | kental | Strategy& 2025, p. 31 (bron ACM 2023) |
| Afvalstoffenbelasting 2026 | € 40,85 per ton | officieel | Belastingdienst: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/overige_belastingen/belastingen_op_milieugrondslag/afvalstoffenbelasting/tarief_afvalstoffenbelasting |
| Verbrandingstarief | € 103,35 = 62,50 + 40,85 | kental, afgeleid | combinatie van de twee regels hierboven |
| PMD en restafval per gemeente | kg/inw, 2024, 342 gemeenten | officieel | CBS 83452NED (gewijzigd 16-07-2026) |
| PMD en restafval landelijk | 21 en 147 kg/inw (2025) | officieel | CBS 83558NED |
| Inwoners per gemeente | 1 januari 2024 | officieel | CBS 70072ned |
| MVI-criteria afval | 049.001–049.015, versie 24 juli 2026 | officieel (alleen code, niveau en link) | https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5 (opgehaald via `/api/criteria?product_groups[]=54`) |
| MVI-criteria zware voertuigen | 042.002, 042.003 (versie 30 november 2025) | officieel | https://www.mvicriteria.nl/nl/webtool?product_group=46&cluster=3 |
| Drempelbedragen 2026–2027 | 216.000 / 140.000 / 432.000 euro | officieel | PIANOo: https://www.pianoo.nl/nl/regelgeving/drempelbedragen-europees-aanbesteden |
| Gunningscriteria en BPKV | uitleg en waarschuwing bij zeer hoog prijsgewicht | officieel | PIANOo, keuze gunningscriterium; handreiking BPKV (december 2023) |
| **Aanname** | verbrand tonnage (voorbeeld 100.000 t), inwoners zonder gemeentekeuze (voorbeeld 100.000), volume en looptijd aanbesteding (voorbeeld), opwerkingstarief, metaalprijzen, teruggewonnen PMD, overige kosten, tarieven voor andere stromen dan restafval | aanname | vult de gebruiker in; zo gelabeld in UI en CSV |

Teksten van de MVI-criteriatool zijn niet overgenomen. De tool geeft per criterium een eigen samenvatting en linkt naar
de officiële tekst.

## Onderhoud

1. **CBS (jaarlijks, na de publicatie in juli):**
   ```bash
   NODE_USE_ENV_PROXY=1 node scripts/tools-b-cbs-pmd.mjs
   npx vitest run src/lib/calc/pmd.test.ts
   ```
   Het script kiest zelf het laatste jaar in 83452NED en de inwoners van hetzelfde jaar.
2. **Rijkswaterstaat (jaarlijks, rapport verschijnt rond juni):** voeg een regel toe aan `bodemasJaren` in
   `src/data/tools-b-bodemas.ts` (tabel 9 totaal en tabel 13) en pas de bron in `tools-b-bronnen.ts` aan. De calculator
   gebruikt automatisch het laatste jaar. Pas de verwachte waarden in `bodemas.test.ts` aan.
3. **Verpact (jaarlijks, voor 1 januari):** de geïndexeerde staffel en nascheidingsvergoeding voor 2027 en 2028 staan
   in de samenwerkingsovereenkomst of in de mededelingen van Verpact, VNG en NVRD. Vul `staffel` en `nascheiding` in
   `src/data/tools-b-pmd.ts` aan. Vanaf 2029 komt er een nieuwe kostenbasis (nieuw kostenonderzoek).
4. **Afvalstoffenbelasting (1 januari):** `asb2026` in `tools-b-pmd.ts` (hernoemen naar het nieuwe jaar).
5. **MVI-criteriatool (bij elke nieuwe versie):** controleer codes en niveaus met
   `curl -s "https://www.mvicriteria.nl/api/criteria?product_groups[]=54&language=nl"`; pas `criteria` in
   `tools-b-aanbesteding.ts` aan. De test controleert dat 049.001–049.015 gekoppeld zijn.
6. **Drempelbedragen (elke twee jaar, volgende per 1 januari 2028):** `drempels` in `tools-b-aanbesteding.ts`.
7. Zet daarna `PEILDATUM` in `tools-b-bronnen.ts` op de dag van controle.

## Controles (26 oktober 2026)

- `npx tsc --noEmit -p .`: geen fouten (hele project).
- `npx vitest run`: 14 bestanden, 183 tests geslaagd (waarvan bodemas 14, pmd 13, aanbesteding 19).
- `npx vite build --outDir /tmp/claude-0/build-tools-b --emptyOutDir`: geslaagd (waarschuwing chunkgrootte, niet van dit onderdeel).
- `PW_BASE=http://localhost:5104 E2E_EMAIL=… E2E_WACHTWOORD=… npx playwright test e2e/tools-b.spec.ts`: 20 geslaagd
  (400 px en desktop), inclusief de ledentests met echte inlog (Pro bodemas, PMD-model).
- Lighthouse mobiel (preview): aanbestedingstool 92/97, PMD-rekenmodel 92/96, bodemassencalculator 95/97
  (prestaties/toegankelijkheid). Resterende contrastfouten zitten in gedeelde stijlen (zie open punten).
- Op 400 px geen horizontale scroll op alle drie de pagina's en alle stappen; brede tabellen scrollen binnen een focusbaar kader.
- Bedragen van de staffel (325/277/228/195/0; 3b 179 en 163) en de nascheidingsvergoeding (17,26 = 14,44 × 1,1954;
  93,47 + 6,79) opnieuw nagelezen in de aanbiedingsbrief van 28 mei 2025 (par. 6.2 en 7).

## Open punten

- **Bedragen zonder openbare bron.** Opwerkingstarieven voor bodemas, metaalprijzen en nascheidingsrendement zijn niet
  openbaar. Als leden hun cijfers delen, kan KplusV een geanonimiseerde bandbreedte publiceren (met toestemming en bron).
- **Staffel 2027–2028 geïndexeerd.** De indexatiemethode is afgesproken maar de euro's niet gepubliceerd; de tool houdt
  de bedragen van 2026 aan, behalve de afgesproken daling van categorie 3b, en zegt dat.
- **Samenwerkingsovereenkomst zelf** (VNG, september 2025) gaf een 403 bij ophalen. De bedragen komen uit de
  aanbiedingsbrief bij het onderhandelingsresultaat; controleer ze bij gelegenheid tegen bijlage 4 van de overeenkomst.
- **Poorttarief 55–70 €/t**: de bron (Strategy&, via ACM 2023) zegt niet of dit inclusief afvalstoffenbelasting is. De
  tool telt de belasting apart op en zegt dat. CO2-heffing zit niet in het verbrandingstarief; zie de CO2-heffingenscan.
- **PMD-model vereenvoudigingen:** vervuiling in bronscheidings-PMD, residu na opschoning en extra inzamelkosten voor
  restafval bij nascheiding zitten niet in het model (wel een veld "overige kosten").
- **Ledentests in e2e** draaien alleen met `E2E_EMAIL` en `E2E_WACHTWOORD` (testaccount bij een actieve lidorganisatie);
  zonder die variabelen worden ze overgeslagen.
- **Juridische toets** van de voorbeeldcriteria (KplusV) en de checklist door een aanbestedingsjurist.
- **Contrast in gedeelde stijlen** (niet van dit onderdeel, `src/styles/components.css`): `.invoer .eenheid`
  (#6b7280 op #f3f1fa, 4,3:1), labels en toelichting in `.tegel.hero` (#efe7f2 op #9462a6, 3,8:1) en de kleine links in
  `OpDezePagina` (#007db5 op #f8f7fc, 4,3:1) halen 4,5:1 niet. Dat houdt toegankelijkheid op 96–97.
- **Prestaties 92**: één JavaScript-bundel van meer dan 500 kB. Code-splitting per route (`React.lazy` in de router)
  hoort bij de lead.
- Label "In ontwikkeling met CE Delft" bij de Aanbestedingstool (uit het oorspronkelijke prototype) is niet door dit
  onderdeel te onderbouwen; laten staan, maar Niels moet bevestigen dat het klopt of het weghalen.
- `README.md` (niet van dit onderdeel) noemt de standaardwaarden van bodemas, PMD en de checklist nog fictief en noemt
  de oude formules; graag bijwerken naar dit document.
