# Tools B: Bodemassencalculator, Rekenmodel PMD en Aanbestedingstool

Stand: 27 oktober 2026 (ronde 2). Alle drie de tools tonen bij binnenkomst een volledig ingevulde uitkomst met
openbaar onderbouwde waarden en een bandbreedte. Elk cijfer heeft een bron en een peildatum in de UI, in de CSV en in een
databestand. Waarden zonder openbare bron staan zichtbaar als aanname en worden alleen gebruikt als de gebruiker ze zelf
invult (rekenwijze "eigen contract" bij bodemas, tarieven voor andere stromen dan restafval bij de aanbestedingstool).

## Wat er in ronde 2 veranderde

| Punt van de criticus | Oplossing |
|---|---|
| MVI-codes 049.0xx hingen aan stromen zonder MVI-productgroep (textiel, PMD, papier) en 042.0xx aan een dienst | `mviStatus(c, stroom)` in `tools-b-aanbesteding.ts`: alleen "eigen" als het criterium uit de productgroep van de stroom komt. Anders label "Ontleend aan MVI 049.012 · andere productgroep" met uitleg, ook in tekstbestand en CSV. "Alleen officiële MVI-criteria" toont alleen eigen criteria. Inzameling valt onder productgroep Verwerking huishoudelijk afval (die omvat volgens de MVI-tool ook het inzamelen van restafval); de voertuigcriteria 042.002/003 zijn daar "andere productgroep". |
| Bodemas: geen uitkomst bij binnenkomst, veel "aanname", gratis en Pro door elkaar, mobiel ~7.800 px | Rekenwijze "kental" met openbare bronnen als standaard: netto opwerkingskosten (metalen verrekend) uit Staatsblad 2021, 235, omgerekend met de CBS-CPI; residu en stortkosten met afvalstoffenbelasting. Tonnage = gemiddelde AVI 2024 of een gemeente (CBS). Uitkomst bovenaan met zin, tegels en bandbreedte; kentallen ingeklapt; Pro apart onderaan. Mobiel nu ~3.450 px. Rekenwijze "eigen contract" (tarief + metaalprijzen) blijft beschikbaar. |
| Ferro + non-ferro > 100 % zonder waarschuwing | `controleerBodemas`: fout bij ferro + non-ferro + residu > 100 %, signalen bij aandelen ver buiten 2022–2024 en residu boven 15 %. |
| "€ -7,54 per ton verbrand" verwarrend | Bedragen in woorden: "€ 3,75 kosten per ton verbrand" of "… opbrengst …". |
| PMD: nascheiding "–" bij binnenkomst, >20 velden, ~9.200 px | Kental teruggewonnen PMD 20 kg/inw (bandbreedte 15–25, IPR Normag 2021). Uitkomst eerst (zin, drie tegels, opbouw met bandbreedte), invoer in drie inklapbare groepen. Mobiel ~3.500 px. |
| PMD: 200 kg teruggewonnen zonder controle; inwoners 0/−1000 houdt oude uitkomst | `controleerPmd`: fout als teruggewonnen > restafval, signalen boven 25 kg en boven het gemiddelde PMD-aandeel in restafval, onwaarschijnlijke respons, meer inwoners dan Nederland. Ongeldige velden melden "De uitkomst is niet bijgewerkt" (BronVeld `onFout`); inwoners minimaal 1. |
| Inzamelkosten € 325 = staffelbedrag | Label en bronregel zeggen nu expliciet: kostenbasis van het akkoord, geen raming van uw kosten; in categorie 1 dekt de vergoeding precies dit bedrag. Een onafhankelijke openbare kostenraming is niet gevonden. |
| Aanbesteding: tarief 103,35 geeft schijnnauwkeurig totaal | Bij het tariefkental toont de raming een bandbreedte (95,85–110,85 €/t) en oordeelt de drempeltoets over de hele band ("op de grens" als de drempel erbinnen valt). |
| Drempeltoets mist concessie- en sociale-dienstendrempels | Veld "Soort opdracht": diensten of leveringen, sociale en andere specifieke diensten (750.000; speciale sectoren 1.000.000), dienstenconcessie (5.404.000), met uitleg en checklistpunt. |
| Geen melding bij absurde raming | `ramingSignalen`: volume groter dan al het restafval van Nederland, tarief ver buiten het kental, meer containers dan inwoners, volume 0. |
| Resultaat niet vast in beeld, keuzekaarten op mobiel lang | Vaste balk onderaan met raming, drempeloordeel, aantal criteria en prijsweging. Stroomkaarten tonen op mobiel alleen de gekozen omschrijving; criteriumtoelichting is op mobiel ingeklapt. |
| Algemeen: kern bovenaan, details inklapbaar | Op alle drie: uitkomst eerst (op desktop rechts, meescrollend), details en bronnen in inklapbare blokken die bij printen opengaan; deellink achter "Deellink tonen". |

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Bodemassencalculator | `src/pages/tools/Bodemassencalculator.tsx` | Gratis: gemeente of gemiddelde AVI, rekenwijze kental of eigen contract, uitkomst met bandbreedte, controles, CSV, deellink, printen. Inklapbaar: kosten van opwerken en storten, aandelen, tabel 2022–2024, bronnen. Pro (apart, achter `Vergrendeld`): meerdere installaties, totaal, gevoeligheidsanalyse, CSV, rapport. |
| Rekenlogica bodemas | `src/lib/calc/bodemas.ts` (+ test, 33 tests) | `bodemas`, `controleerBodemas`, `bandbreedte`, `bodemasInstallaties`, `gevoeligheid`, deellink (oude links met `tarief=` openen als contract). |
| Kentallen bodemas | `src/data/tools-b-bodemas.ts` | RWS 2022–2024, kostenkentallen (Staatsblad 2021, 235), CPI-factor, scenario's laag/midden/hoog, gemiddelde per AVI, bereik voor controles. |
| Rekenmodel PMD (leden) | `src/pages/tools/PmdRekenmodel.tsx` | Uitkomst eerst (zin met voordeel en bandbreedte, tegels, opbouw), invoer in groepen Bronscheiding / Nascheiding / Verbranding, grafiek en staffeleffect inklapbaar, CSV, deellink, rapport. Openbaar: staffel en bronnen (inklapbaar). |
| Rekenlogica PMD | `src/lib/calc/pmd.ts` (+ test, 23 tests) | Routes, omslagpunt, `controleerPmd`, `pmdBandbreedte` (alle combinaties laag/hoog), deellink. |
| Gegevens PMD | `src/data/tools-b-pmd.ts`, `src/data/tools-b-cbs-pmd.json` | Staffel, kostenbasis, nascheiding, kental en band verbrandingstarief, kental en band teruggewonnen PMD, grenzen voor controles, CBS. |
| Aanbestedingstool | `src/pages/tools/Aanbestedingstool.tsx` | Vier stappen (opdracht, eisen en criteria, weging, overzicht), soort opdracht, raming met bandbreedte, signalen, vaste samenvattingsbalk, MVI-status per stroom, tekstbestand, CSV, deellink, printen. |
| Rekenlogica aanbesteding | `src/lib/calc/aanbesteding.ts` (+ test, 31 tests) | Weging, afronding, raming, `ramingBandbreedte`, `drempelBand`, `ramingSignalen`, checklist, export, deellink (`type=`). |
| Criteria per stroom | `src/data/tools-b-aanbesteding.ts` | 8 stromen, 45 criteria, drempels per soort opdracht, `mviStatus`, `productgroepNaam`. |
| Bronnen | `src/data/tools-b-bronnen.ts` | Alle bronnen met titel, uitgever, datum, URL; `PEILDATUM` 2026-10-27. |
| Componenten | `src/components/rekenen/b/` | `BronVeld` (nu met `onFout`), `CelGetal`, `Knoppen`, nieuw: `Blokken` (`Uitklap`, `Ankers`, `Bandbreedte`, `Meldingen`, `useUitklapBijPrint`, `useVeldFouten`), `Delen` (CSV, link kopiëren, ingeklapte deellink, `BronLijst`). Gedeelde componenten in `src/components/rekenen/*` zijn niet gewijzigd. |
| Overzicht tools | `src/pages/Tools.tsx`, `src/data/tools.ts` | Beschrijvingen en bronnen per tool bijgewerkt. |
| E2E | `e2e/tools-b.spec.ts` | 14 tests × 400 px en desktop = 28. |

## Rekenregels

**Bodemas, rekenwijze kental (standaard)**

```
ruwe bodemas     = verbrand afval × aandeel bodemas
ferro, non-ferro = ruwe bodemas × aandeel ferro, aandeel non-ferro
opwerking        = ruwe bodemas × netto opwerkingskosten (metaalopbrengst al verrekend)
storten residu   = ruwe bodemas × aandeel residu × (stortkosten + stortbelasting)
netto kosten     = opwerking + storten residu
```

**Bodemas, rekenwijze eigen contract**

```
kosten opwerking  = ruwe bodemas × verwerkingstarief
opbrengst metalen = (ferro × prijs ferro + non-ferro × prijs non-ferro) × uw deel
netto kosten      = kosten opwerking − opbrengst metalen + storten residu
```

Bandbreedte (alleen voor velden die de gebruiker niet zelf aanpaste): laag = € 10,00 opwerking, 3,8 % residu, € 30
storten; midden = € 12,19, 3,8 %, € 42,66; hoog = € 12,19, 15 %, € 48,76. Stortbelasting steeds € 40,85.
Niet in de berekening: transport van bodemas, CO2-heffing.

**PMD** (nulsituatie: al het PMD gaat met het restafval naar de verbranding)

```
bron:  PMD = inwoners × respons / 1000
       netto = PMD × (inzamelkosten + overige kosten − inzamelvergoeding − verbrandingstarief)
na:    restafval = inwoners × restafval naar nascheider / 1000
       netto = restafval × (nascheidingskosten − nascheidingsvergoeding) − teruggewonnen PMD × verbrandingstarief
```

Bandbreedte: teruggewonnen PMD 15–25 kg/inw en verbrandingstarief 95,85–110,85 €/t, alle combinaties.

**Aanbesteding**

```
weging_i         = punten_i / Σ punten × 100 %  (grootste-restmethode, samen 100 %)
geraamde waarde  = volume × tarief × (looptijd + verlengingsopties)
bandbreedte      = idem met tarief laag en hoog (alleen bij het tariefkental restafval)
Europees         = geraamde waarde ≥ drempelbedrag (per soort dienst en soort opdracht)
```

## Gebruikte cijfers en bronnen (peildatum 27 oktober 2026)

| Gegeven | Waarde | Status | Bron |
|---|---|---|---|
| Verbrand in AVI's | 7.392 / 6.841 / 6.422 kton (2022–2024), 13 AVI's | officieel | Rijkswaterstaat, Afvalverwerking in Nederland, gegevens 2024 (juni 2026), tabel 9 en p. 26: https://verenigingafvalbedrijven.nl/public/News/540/download/Afvalverwerking%20in%20Nederland%20gegevens%202024.pdf (opnieuw nagelezen 27-10) |
| Ruwe bodemas, ferro, non-ferro, gestort | 2024: 1.570 / 109 / 38 / 60 kton | officieel | idem, tabel 13 |
| Aandeel bodemas, ferro, non-ferro, residu | 24,4 % / 6,9 % / 2,4 % / 3,8 % (2024) | kental, afgeleid | idem |
| Gemiddelde AVI | 494.000 ton (6.422 kton / 13) | kental, afgeleid | idem |
| Netto opwerkingskosten | € 10 per ton (2021) → € 12,19 (2025) | kental, afgeleid | Staatsblad 2021, 235, nota van toelichting: https://zoek.officielebekendmakingen.nl/stb-2021-235.html; CBS 83131NED CPI 110,39 (2021) → 134,56 (2025): https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83131NED/table |
| Stortkosten residu | € 30–40 per ton (2021) → midden € 42,66, hoog € 48,76 | kental, afgeleid | Staatsblad 2021, 235; CPI |
| Residu bij volledig wassen | ongeveer 15 % (bovenkant bandbreedte) | kental | Staatsblad 2021, 235; Strategy& 2025 noemt 12–15 % |
| Afvalstoffenbelasting 2026 | € 40,85 per ton (storten en verbranden) | officieel | Belastingdienst, tarief afvalstoffenbelasting |
| Staffel inzamelvergoeding 2026 | 325 / 277 / 228 / 195 / 0 €/t; 3b 179 (2027), 163 (2028) | officieel | Aanbiedingsbrief onderhandelingsresultaat 28 mei 2025, par. 6.2: https://www.nvrd.nl/wp-content/uploads/2025/06/Aanbiedingsbrief-nieuwe-afspraken-verpakkingsafval.pdf |
| Kostenbasis bronscheiding | € 325 per ton PMD | kental (geen eigen raming) | idem |
| Nascheidingsvergoeding / -kosten | € 17,26 / € 119,85 per ton restafval | officieel / kental afgeleid | idem, par. 7 |
| Teruggewonnen PMD bij nascheiding | 15–25 kg/inw; midden 20 | kental | IPR Normag voor MARN, 27 juli 2021, par. 3.3: https://nijmegen.bestuurlijkeinformatie.nl/Document/View/766b277b-ba1e-457d-96bf-331e7fafec0a |
| Poorttarief restafval | € 55–70 per ton | kental | Strategy& voor Vereniging Afvalbedrijven, 11 september 2025, p. 31 (bron ACM 2023) |
| Verbrandingstarief incl. ASB | 95,85 / 103,35 / 110,85 €/t | kental, afgeleid | poorttarief + ASB 2026 |
| PMD, restafval en inwoners per gemeente | 2024, 342 gemeenten; landelijk 21 en 147 kg/inw (2025) | officieel | CBS 83452NED, 83558NED, 70072ned |
| MVI-criteria | 049.001–049.015 (productgroep Verwerking huishoudelijk afval: fijn en grof restafval, GFT, minicontainers, inzamelen restafval), 042.002–003 (Zware voertuigen – aanschaf) | officieel (code, niveau, link) | https://www.mvicriteria.nl (API `/api/criteria?product_groups[]=54`, opnieuw opgevraagd 27-10) |
| Drempelbedragen 2026–2027 | diensten 216.000 / 140.000 / 432.000; sociale diensten 750.000 (speciale sectoren 1.000.000); concessies 5.404.000 | officieel | PIANOo (opnieuw opgehaald 27-10): https://www.pianoo.nl/nl/regelgeving/drempelbedragen-europees-aanbesteden |
| **Aanname** | inwoners zonder gemeentekeuze (voorbeeld 100.000), volume en looptijd aanbesteding, tarieven andere stromen, contracttarief en metaalprijzen bodemas, overige kosten PMD | aanname | vult de gebruiker in; zo gelabeld in UI en CSV |

Teksten van de MVI-criteriatool zijn niet overgenomen; per criterium staat een eigen samenvatting met link.

## Onderhoud

1. **CBS (jaarlijks, juli):** `NODE_USE_ENV_PROXY=1 node scripts/tools-b-cbs-pmd.mjs`, daarna `npx vitest run`.
2. **CPI (jaarlijks, januari):** `cpi` in `tools-b-bodemas.ts` aanvullen met het nieuwe jaargemiddelde. Tabel 83131NED is
   gestopt (laatste cijfer december 2025); neem de opvolger van CBS (CPI 2025=100) en reken de factor om, of laat de
   factor op 2021→2025 staan en zeg dat in de bronregel.
3. **Rijkswaterstaat (jaarlijks, juni):** regel toevoegen aan `bodemasJaren`; `aantalAvis2024` bijwerken als het
   aantal AVI's verandert. Verwachte waarden in `bodemas.test.ts` aanpassen.
4. **Verpact (jaarlijks):** staffel en nascheidingsvergoeding 2027–2028 in `tools-b-pmd.ts`; vanaf 2029 nieuwe
   kostenbasis.
5. **Afvalstoffenbelasting (1 januari):** `asb2026` in `tools-b-pmd.ts` en `stortbelasting2026` in `tools-b-bodemas.ts`.
6. **MVI-criteriatool:** codes en niveaus controleren via de API; bij een nieuwe productgroep voor PMD, papier of textiel
   `mvi` bij die stroom invullen, dan wordt `mviStatus` vanzelf "eigen".
7. **Drempelbedragen (per 1 januari 2028):** `drempels` in `tools-b-aanbesteding.ts`.
8. Zet daarna `PEILDATUM` in `tools-b-bronnen.ts` op de dag van controle.

## Controles (27 oktober 2026)

- `npx tsc --noEmit -p .`: geen fouten in dit onderdeel (wel in `src/data/types.ts` en `src/pages/Home.tsx` van een andere bouwer).
- `npx vitest run`: 15 bestanden, 272 tests geslaagd (bodemas 33, pmd 23, aanbesteding 31).
- `npx vite build --outDir /tmp/claude-0/build-tools-b --emptyOutDir`: geslaagd.
- `PW_BASE=http://localhost:5104 E2E_EMAIL=… E2E_WACHTWOORD=… npx playwright test e2e/tools-b.spec.ts`: 28 geslaagd
  (400 px en desktop), inclusief de ledentests met echte inlog.
- Lighthouse mobiel (preview, prestaties/toegankelijkheid): bodemassencalculator 95/100, PMD-rekenmodel 96/100,
  aanbestedingstool 97/100, /tools 99/100.
- Paginahoogte op 400 px (bezoeker): bodemas 3.441 px (was ~7.800), aanbestedingstool stap 1 3.600 px; als lid:
  PMD 3.513 px (was ~9.200). Geen horizontale scroll.

## Open punten

- **Opwerkingskosten bodemas** rusten op één overheidsbron uit 2021 (nota van toelichting, "bij benadering"). Een
  recentere openbare bron is niet gevonden. Als leden contractcijfers delen, kan KplusV een geanonimiseerde bandbreedte
  publiceren.
- **Inzamelkosten PMD**: alleen de kostenbasis van het akkoord is openbaar; een onafhankelijke raming per gemeente niet.
- **Teruggewonnen PMD**: de bron (2021) noemt praktijkcijfers zonder installaties; vaak zonder blik. Nieuwere openbare
  rendementen van nascheiders zijn niet gevonden.
- **Staffel 2027–2028** houdt de bedragen van 2026 aan (behalve 3b) tot de indexatie in euro's is gepubliceerd.
- **Poorttarief 55–70 €/t**: onbekend of dit inclusief afvalstoffenbelasting is; de tool telt de belasting apart op.
- **Juridische toets** van de voorbeeldcriteria, de uitleg bij sociale diensten en concessies, en de checklist.
- Label "In ontwikkeling met CE Delft, publiek beschikbaar" komt uit de opdracht van Niels en blijft staan; Niels
  bevestigt of het klopt.
- `README.md` (van de lead) hoeft voor dit onderdeel niet te veranderen; hij verwijst al naar dit document.
