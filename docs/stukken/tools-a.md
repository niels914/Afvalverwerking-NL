# Tools A: Indexcalculator en CO2-heffingenscan

Stand: 27 oktober 2026 (ronde 3, versie 3.0 van beide tools). Beide tools rekenen met officiële cijfers. Elk cijfer heeft een bron en een peildatum
in de UI, in de CSV en in een databestand. Wat de tool niet uit een officiële bron kan halen, staat zichtbaar als
aanname of kental.

## Wat er in ronde 3 is veranderd

| Punt uit inspectie of jury (ronde 2) | Wat er nu is |
|---|---|
| Blokkerend: Pro-kerntegel "Gewogen tarief 2025: € 124,85" sprak de tabel tegen (contractjaar 2025 = € 121,62) | De grote tegel in Pro is nu "Tarief contractjaar J" en komt uit dezelfde rij als de tabel, dus met verschuiving van de peilperiode, plafond/bodem en afronding. Toelichting in de tegel: "indexcijfer 2025"; eronder een zin welke periode en factor het jaar gebruikt. De gebruiker kiest het jaar ("Tarief tonen voor contractjaar") en een vergelijkingsjaar; de rij in de tabel krijgt het label "in tegel". De tegel in het gratis deel heet nu "Tarief peilperiode 2025". Pure functie `kiesContractjaren` met tests (ook met plafond). |
| Kern bovenaan voor leden | Kern noemt voor leden ook het Pro-tarief van het getoonde contractjaar (indexcalculator) en het totaal 2026–2035 (CO2-scan). |
| CO2-CSV: tarief 157,31 met bron wetten.overheid.nl bevat inflatieaanname | CSV heeft nu twee rijen: tarief volgens wet zonder inflatiecorrectie (153,32, bron wet) en tarief incl. inflatieaanname (157,31, "wet plus aanname gebruiker"). Tegel en gebruikte invoer zeggen hetzelfde; badge "Wet en NEa + uw aannames". Pro-CSV-kolom ook gelabeld. `inflatieInTarief` met tests. |
| Kerntegel toonde oud bedrag na ongeldige invoer | `useOngeldigeInvoer` (in `Inklap.tsx`) volgt `aria-invalid` van alle getalvelden. Bij een fout: kern meldt "Uitkomst niet bijgewerkt" met de veldnaam, tegels en tabellen tonen "–", CSV en deellink verdwijnen tot de invoer klopt. Beide tools, gratis en Pro. |
| CO2: uitstoot t.o.v. historisch alleen 85–115 % | Invoer 1–300 % (ook in de deellink). Buiten ± 15 % past de NEa het activiteitsniveau aan met efficiëntieregels uit het EU ETS (NEa-pagina berekening dispensatierechten, gecontroleerd 27-10-2026); de scan benadert dat met de actuele uitstoot en zegt dat als aanname, met verwijzing naar "Eigen percentage". |
| "Kabinet wil afschaffen" sterker dan de bron | Overal: "het coalitieakkoord noemt afschaffing". |
| Eigen indexreeks ontbrak | "Eigen indexreeks": naam plus cijfers per periode (2024 102,4 / 2024-09 / 2024M09 / september 2024; plakken uit een spreadsheet werkt). Te kiezen in het gratis deel en te wegen in Pro; gelabeld als eigen invoer (geen CBS), in CSV, bronnenlijst (status aanname) en deellink (`ereeks`, `enaam`). |
| Pro-invoer lid als lange kolom | Weging compact: label links, smal veld rechts. Op 400 px: hoofdtegel over de volle breedte, overige tegels naast elkaar; contractjaren naast elkaar. |
| Jury: rekenvoorbeeld-validatie met tweede CBS-verwijzing | Blok "Zelf narekenen": peil ÷ basis = factor; basistarief × factor = tarief, met de afgeronde cijfers die de tool gebruikt, een link naar de CBS-tabel en naar de CBS-uitleg "Indexeringen voor nieuwe contracten" (zelfde rekenmethode). Ook in de CSV. |
| Jury: versie en wijzigingsdatum | "Versie 3.0, bijgewerkt 27 oktober 2026" in de kern, het rapport en de CSV; inklapblok "Versie en wijzigingen". Bron: `indexToolVersie` en `co2ToolVersie` in de databestanden. |
| Jury: tabel op mobiel als compacte kaarten | Contractjarentabel en scenariotabel worden op ≤ 520 px kaarten (één per jaar, kolomnaam boven elk getal, volledige bedragen). De CO2-bedragen per jaar staan op mobiel ingeklapt ("Bedragen per jaar"), breed open. |
| Jury CO2: onzekerheid en onder-/bovengrens bij het resultaat | Kader direct onder de tegels: onder- en bovengrens over beide tariefpaden en inflatie ± 1 procentpunt (`bandbreedte`, met tests), status van het Belastingplan en de afschaffing. Ook in kern en CSV. |

Hoogte op 400 px (demo-lid): indexcalculator ca. 6.950 px (was 6.596, met eigen reeks, narekenen en versie erbij), CO2-scan
6.078 px (was 6.619). Bezoeker: 4.312 en 4.779 px.

## Wat er in ronde 2 is veranderd

| Punt uit de inspectie | Wat er nu is |
|---|---|
| Indexcalculator rekende zonder afronding (blokkerend) | Keuze "Afronding" bij de invoer: indexcijfers zoals CBS ze publiceert of op 1 of 2 decimalen, indexfactor niet afgerond of op 3 of 4 decimalen, tarief op hele centen (standaard aan). Geldt voor gratis en Pro, staat in de kern bovenaan, in "Gebruikte invoer", in de CSV en in de deellink (`rindex`, `rfactor`, `rtarief`). Bij jaar-op-jaar indexeren (plafond of bodem) rekent elk jaar verder met het afgeronde tarief. |
| CO2: 0 % inflatie maakte geldend recht en voorstel oneerlijk vergelijkbaar (blokkerend) | Standaardinflatie 2,6 % per jaar (de correctie per 1 januari 2027 uit de MvT Belastingplan 2027), zichtbaar gelabeld als aanname voor latere jaren. De kern bovenaan noemt beide tariefpaden met dezelfde inflatie én het officiële tarief in prijspeil 2026 (tabel 12). Met 0 % blijft de waarschuwing staan. |
| CO2 verloor van PIANOo: mobiel ~10.700 px, tabellen onleesbaar | Kern bovenaan (uitkomst, vergelijking, aannames, peildatum). Formule en gebruikte invoer, deellink, tarieventabellen, ontwikkelingen, rekenregels en bronnen zijn ingeklapt. Tabellen hebben op 400 px nog 3 of 4 kolommen (details onder het getal); de scenariotabel toont op smalle schermen duizenden euro's. Hoogte op 400 px: bezoeker 8.329 → 4.393 px, lid 10.694 → 6.619 px. |
| Indexcalculator: dicht, lang, kleine tekst | Zelfde opbouw. Hulp- en brontekst 14 px (was 12,5–13 px). Gratis en Pro zichtbaar gescheiden: label "Gratis" en een eigen vlak met kopbalk voor Pro. Hoogte op 400 px: bezoeker 6.149 → 3.999 px, lid 8.854 → 6.596 px. |
| Pro-invoer overschreven 1–2 s na laden als lid | Oorzaak: tijdens het controleren van de ledentoegang toonde de betaalmuur de Pro-velden als (wazige) preview; zodra het lidmaatschap bekend was, kwamen er nieuwe velden voor in de plaats. Nu staat er zolang alleen "Ledentoegang controleren…", zodat er geen Pro-veld bestaat dat vervangen kan worden. E2E-test toegevoegd. |
| Peildatum CO2 vernieuwen | Alle bronnen op 27 oktober 2026 opnieuw gecontroleerd; `PEILDATUM` is 2026-10-27. |
| Emissiefactor 0,363 en nieuwere lijst | Vervangen door de lijst van energiedragers, versie januari 2026 (RVO, afgestemd met NEa): 9,6 GJ/t × 107,1 kg/GJ × (1 − 63 %) = 0,380 ton fossiel CO2 per ton. Lezing gecontroleerd: voetnoot 6 noemt 63 % biogeen aandeel in de emissiefactor; de 107,1 kg/GJ geldt voor de hele brandstof (voetnoot 2 "alleen fossiel deel" staat niet bij afval). |
| Pro-CSV mist indexcijfers per reeks en peilperiode | CSV bevat nu het CBS-indexcijfer van de basisperiode per reeks, per contractjaar het indexcijfer van elke gebruikte reeks, de afronding en of een voorlopig cijfer is gebruikt. |
| Uitleg waarom peilperiode na basis | Hulptekst bij "Peilperiode" en in "Rekenregels en afronding". |
| Bovengrens basistarief | Maximaal € 1.000.000 in het veld en in de deellink (`MAX_BASISTARIEF`). |
| Diesel incl. accijns en btw | Reeksnaam en uitleg in de JSON aangepast; bij keuze van de dieselprijs verschijnt een notitie: btw verandert de verhouding niet, accijns wel. |

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Indexcalculator | `src/pages/tools/Indexcalculator.tsx` | Kern bovenaan. Gratis: één CBS-reeks, jaar- of maandcijfers, basis- en peilperiode, afronding, voorlopige cijfers gemarkeerd. Pro: eigen weging over zes reeksen plus een vast deel, tarief per contractjaar (peilmaand of jaargemiddelde, cijfer van hetzelfde of het voorgaande jaar), plafond en "geen negatieve indexatie", vergelijking van twee contractjaren (ook in de deellink), grafiek met CPI ter vergelijking. Achtergrond ingeklapt. |
| Rekenlogica index | `src/lib/calc/indexering.ts` (+ test) | Pure functies: gewogen factor, afronding (`rondAf`, `rondTarief`, `afrondingTekst`), perioden, contractjaren, begrenzing, invoer naar en uit de URL. |
| CBS-data | `src/data/indexreeksen.json`, `src/data/indexreeksen.ts` | Zes reeksen met tabel-id, tabeltitel, dimensies, onderwerp, basisjaar, laatste wijziging bij CBS, peildatum, bron-URL en API-URL. |
| Ophaalscript | `scripts/cbs-indexreeksen.mjs` | Haalt de reeksen op via de CBS OData-API (v3) en schrijft de JSON. |
| CO2-heffingenscan | `src/pages/tools/Co2Heffingenscan.tsx` | Kern bovenaan. Gratis: heffing in één jaar (2026–2035), tariefpad geldend recht of wetsvoorstel, wettelijke of eigen vrijstelling, inflatieaanname, bedrag bij het andere tariefpad. Pro: verloop 2026–2035 voor drie scheidingsscenario's, per inwoner, vergelijking met het andere tariefpad. Achtergrond (tarieven, ontwikkelingen, rekenregels, bronnen) ingeklapt. |
| Rekenlogica CO2 | `src/lib/calc/co2.ts` (+ test) | Pure functies: tarief per jaar met verhogingen en inflatiecorrectie, vrijgesteld deel, scan per jaar en scenario, invoer naar en uit de URL. |
| CO2-tarieven en regels | `src/data/co2-tarieven.ts` | Tarieven, verhogingen, correctie-, reductie- en procesemissiefactoren, kental emissiefactor, tabel prijspeil 2026, bronnen, `PEILDATUM`. |
| Inklappen en kern | `src/components/rekenen/Inklap.tsx`, `tools-a.css` | `Kern`, `Inklapbaar`, `useInklapBijPrintEnAnker` (ingeklapte blokken gaan open bij printen en als een anker ernaar wijst), `openAnkerDoel`. Alle CSS-klassen beginnen met `ta-`. |
| Gedeelde rekencomponenten | `src/components/rekenen/*` | Nieuw, zonder bestaande props te breken: `Uitkomst` prop `inklapbaar`, `ExportKnoppen` prop `linkInklappen`, export `BronRegels` (lijst zonder kaart). `OpDezePagina` opent een ingeklapt doel. |
| E2E | `e2e/tools-a.spec.ts` | 27 tests × 2 viewports (ronde 3 erbij: tegel volgt contractjaar, eigen reeks, ongeldige invoer, narekenen en versie, bandbreedte, uitstoot buiten de band, inflatielabel in CSV, kern voor leden). Eerder: rekenen, afronding, diesel-uitleg, inklappen en anker, CSV, deellink, betaalmuur, Pro-preview, hoogte op 400 px, print (ingeklapte delen zichtbaar), Pro met inlog (CSV met indexcijfers, invoer blijft staan). |

## Indexcalculator

### Welke reeksen en waarom

Indexeringsclausules in verwerkings- en inzamelcontracten volgen meestal de kostenopbouw: loon, energie en brandstof,
aangevuld met de algemene prijsontwikkeling.

| Reeks | CBS-tabel | Waarom |
|---|---|---|
| CPI, alle bestedingen (2025=100) | 86141NED | Standaardreeks voor algemene prijsontwikkeling; komt in vrijwel elk contract voor. |
| Cao-lonen per uur incl. bijzondere beloningen, SBI E Waterbedrijven en afvalbeheer (2020=100) | 85663NED | Loonkosten in de eigen bedrijfstak van verwerkers en inzamelaars. |
| Idem, SBI H Vervoer en opslag | 85663NED | Chauffeurs en logistiek bij inzamel- en transportcontracten. |
| Idem, alle economische activiteiten | 85663NED | Als het contract geen bedrijfstak noemt. |
| PPI afzet binnenland, D Elektriciteit, gas, stoom en warmte (2021=100) | 85770NED | Energiekosten van installaties. |
| Gemiddelde pompprijs diesel, inclusief accijns en btw (euro per liter) | 81567NED | Brandstof van inzamelvoertuigen. Geen index; alleen de verhouding telt. Accijns is een vast bedrag per liter en verandert de verhouding. |

Het CBS noemt cao-loonindex, CPI, PPI en dienstenprijsindex als de cijfers die contracten gebruiken
(https://www.cbs.nl/nl-nl/achtergrond/2025/12/indexeringen-voor-nieuwe-contracten, 12-2-2026, geraadpleegd 27-10-2026);
de tool linkt daarnaar bij "Zelf narekenen" en in de bronnen. Een reeks die er niet bij staat (bijv. DPI reiniging) vult
de gebruiker in als eigen reeks.

Niet opgenomen: PPI gasolie (85770NED, ProdCom 192026). CBS laat daar veel maanden leeg (onder meer heel 2023 en 2024).

### Rekenregels

- Eén reeks: `nieuw tarief = basistarief × indexcijfer peilperiode / indexcijfer basisperiode`.
- Gewogen: `nieuw tarief = basistarief × (vast deel + Σ weging_i × index_i,peil / index_i,basis)`.
- Contractjaar J gebruikt het jaarcijfer of de peilmaand van jaar J (nacalculatie) of J − 1 (tarief per 1 januari).
- Plafond en bodem: jaar op jaar, `tarief_J = tarief_vorig × begrensd(factor_J / factor_vorig)`.
- Afronding, in deze volgorde: indexcijfers (optioneel), indexfactor (en bij jaar-op-jaar de stap), tarief op centen.
  Rekenkundig afronden (vanaf 5 naar boven); `rondAf` werkt via 15 significante cijfers, zodat 1,005 → 1,01.
- De peilperiode ligt altijd na de basisperiode: een contract indexeert vooruit.

### Peildatum

CBS-reeksen opnieuw opgehaald op 27 oktober 2026; de waarden zijn gelijk aan die van 20 oktober. Laatste cijfers:
CPI, cao-lonen en dieselprijs t/m september 2026, PPI energie t/m augustus 2026.

### Onderhoud

```bash
NODE_USE_ENV_PROXY=1 node scripts/cbs-indexreeksen.mjs   # achter de proxy; zonder proxy zonder de variabele
npx vitest run src/lib/calc/indexering.test.ts
```

Bij een wijziging in rekenregels of reeksen: `indexToolVersie` (en bij de CO2-scan `co2ToolVersie`) ophogen, datum
zetten en een regel aan `wijzigingen` toevoegen.

CBS publiceert de CPI rond de tiende van de maand, cao-lonen en PPI aan het eind van de maand. Maandelijks draaien is
genoeg. Bij een herbasering (nieuwe tabel-id of basisjaar): `tabelId`, `onderwerp`, dimensiesleutels en `basisjaar` in
`REEKSEN` bovenin het script aanpassen; de test op CPI 2025 = 100 en cao-lonen 2020 = 100 moet dan mee.

## CO2-heffingenscan

### Wat de scan rekent

```
uitstoot          = restafval × fossiele emissiefactor
vrijgesteld deel  = procesemissiefactor × reductiefactor × AVI-correctiefactor ÷ (uitstoot ÷ historisch niveau)
heffing           = max(0, uitstoot × (1 − vrijgesteld deel)) × tarief
tarief_t          = (tarief_t−1 + verhoging_t) × (1 + inflatiecorrectie)
```

- **Geldend recht:** art. 90 Wbm noemt art. 71p lid 1 en 2, dus ook de nog niet toegepaste verhogingen worden jaarlijks
  geïndexeerd.
- **Voorstel Belastingplan 2027:** tarief 2027 € 129,15 (al geïndexeerd met 2,6 %); verhogingen 2028–2035 niet meer
  apart geïndexeerd.
- **Standaardinflatie 2,6 %:** de bekende correctie per 1 januari 2027. Voor latere jaren een aanname. Met deze waarde
  komen beide paden in 2035 op hetzelfde reële niveau uit (test in `co2.test.ts`), zoals tabel 12 van de MvT laat zien.

### Gebruikte cijfers en bronnen (peildatum 27 oktober 2026)

Op 27 oktober 2026 gecontroleerd: NEa-pagina's (tarieven, wat is de heffing, AVI's, berekening dispensatierechten,
dispensatierechten), het wetsvoorstel Belastingplan 2027 (pdf bereikbaar, nog niet aangenomen), en de wetteksten.
wetten.overheid.nl was die dag weer niet bereikbaar (DNS-fout en lege respons). De wetteksten zijn daarom gecontroleerd
in de officiële BWB-repository waaruit wetten.overheid.nl wordt gevuld
(`repository.officiele-overheidspublicaties.nl/bwb/BWBR0007168/manifest.xml`): de laatste versie van de Wbm is nog
die van 4 juni 2026 (art. 71p en 90 ongewijzigd), van de Wm die van 1 augustus 2026. De links in de tool wijzen naar
wetten.overheid.nl.

| Gegeven | Waarde | Bron |
|---|---|---|
| Tarief AVI 2026 | € 103,66 per ton CO2 | Wbm art. 71p lid 1, https://wetten.overheid.nl/BWBR0007168/2026-06-04#HoofdstukVIB; NEa tarievenpagina |
| Verhogingen geldend recht | 2027 € 49,66; 2028 € 50,42; 2029 € 50,42; 2030 € 49,39 | Wbm art. 71p lid 2 |
| Eerdere tarieven en ETS-prijzen | 2021–2025 | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/tarieven-co2-heffing |
| AVI-correctiefactor geldend | 2026 0,85; 0,70; 0,55; 0,40; 0,25; 0,17; 0,09; 2033 e.v. 0 | Wm art. 16b.17 lid 4, https://wetten.overheid.nl/BWBR0003245/2026-08-01#Hoofdstuk16b; NEa AVI-pagina |
| Nationale reductiefactor | 1,023 vanaf 2026 | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/dispensatierechten/berekening-aantal-dispensatierechten |
| Procesemissiefactor AVI's | 0,97; vanaf 2028 0,91 | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/verplichtingen/verplichtingen-voor-afvalverbrandingsinstallaties |
| Voorstel BP 2027 | 2027 € 129,15; verhogingen 2028–2035 € 22,79 t/m € 26,77; correctiefactor 2031–2035 0,20 / 0,15 / 0,10 / 0,05 / 0 | https://www.rijksfinancien.nl/sites/default/files/bestanden/belastingplan-2027/wetsvoorstel-belastingplan-2027/Wetsvoorstel-Belastingplan-2027.pdf |
| Tariefpad prijspeil 2026 | geldend 104 → 304 in 2030; voorstel 104 → 304 in 2035 | MvT Belastingplan 2027, tabel 12 |
| Inflatiecorrectie 1-1-2027 | 2,6 % (tabelcorrectiefactor 1,026) | MvT Belastingplan 2027 |
| Afschaffing heffing | coalitieakkoord 2026–2030; pas definitief na wetswijziging | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/wat-is-co2-heffing |
| **Kental** fossiele emissiefactor | 0,380 ton CO2 per ton afval = 9,6 GJ/t × 107,1 kg/GJ × (1 − 63 % biogeen) | Nederlandse lijst van energiedragers en standaard CO2-emissiefactoren, versie januari 2026, regel "Afval", voetnoten 3 en 6, https://www.rvo.nl/sites/default/files/2026-06/Nederlandse-energiedragerlijst-versie-januari-2026.pdf. Gemiddelde voor afval, niet specifiek huishoudelijk restafval; 2025 en 2026 gelijkgesteld aan 2024. |
| **Aanname** | restafval, inflatie na 2027, uitstoot t.o.v. historisch niveau, eigen vrijgesteld deel, inwoners, scheidingspercentages | Vult de gebruiker in; zo gelabeld in UI en CSV. |
| **Aanname** | procesemissiefactor na 2030 | Niet gepubliceerd; de scan houdt 0,91 aan. |

### Onderhoud

1. Controleer na Prinsjesdag, na de stemming over het Belastingplan (Tweede Kamer meestal half november, Eerste Kamer
   half december) en op 1 januari: de NEa-tarievenpagina, de wetteksten (wetten.overheid.nl of de BWB-repository) en de
   status van het Belastingplan 2027. Elk jaar in het voorjaar: de nieuwe lijst van energiedragers op rvo.nl.
2. Pas `src/data/co2-tarieven.ts` aan: `vastgesteldeTarieven`, `tariefpaden.*.vast`, `verhogingen`, `correctiefactor`,
   `kentalEmissiefactor`, `inflatiecorrectie2027` (wordt de correctie van het nieuwe jaar), `bronnen` en `PEILDATUM`.
3. Wordt het Belastingplan aangenomen, dan wordt het pad "voorstel" geldend recht: `status: 'officieel'`, naam en bron
   aanpassen, het oude pad verwijderen of hernoemen, `ontwikkelingen` bijwerken.
4. Draai `npx vitest run src/lib/calc/co2.test.ts`; pas verwachte waarden alleen aan na een wetswijziging.

## Controles (27 oktober 2026, ronde 3)

- `npx tsc --noEmit -p .`: geen fouten.
- `npx vitest run src/lib/calc/indexering.test.ts src/lib/calc/co2.test.ts src/components/rekenen`: 67 geslaagd (nieuw:
  `kiesContractjaren` met verschuiving en plafond, eigen reeks lezen en in de deellink, `bandbreedte`, `inflatieInTarief`,
  uitstoot 1–300 %).
- `npx vite build --outDir /tmp/claude-0/build-tools-a`: geslaagd.
- `PW_BASE=http://localhost:5103 npx playwright test e2e/tools-a.spec.ts` met testaccount: 49 geslaagd, 5 overgeslagen
  (betaalmuurtests die met inlog niet gelden, en de hoogtetest op desktop). Zonder inlog: 45 geslaagd, 9 overgeslagen.
- Lighthouse (mobiel): indexcalculator prestaties 96, CO2-scan 97; toegankelijkheid en best practices 100.
- Op 400 px geen horizontale pagina-scroll.

## Open punten

- **Bandbreedte CO2** gebruikt beide tariefpaden en inflatie ± 1 procentpunt. Onzekerheid in emissiefactor, tonnage en
  vrijstelling zit er niet in; die vult de gebruiker zelf in.
- **Eigen reeks** wordt niet gecontroleerd (geen bron). Eén eigen reeks per berekening.
- **Ongeldige invoer** wordt herkend via `aria-invalid` van `GetalVeld`. Verandert het onderdeel UI dat attribuut, dan moet
  `useOngeldigeInvoer` mee.

- **Betaalmuur tijdens laden (algemeen).** De fix zit nu in deze twee pagina's. Beter is dat `Vergrendeld` zelf tijdens
  het laden geen bedienbare kopie van de inhoud toont; dat raakt alle Pro-onderdelen (onderdeel toegang).
- **Eerste publicatie versus herziene cijfers.** CBS herziet voorlopige cijfers; het script bewaart alleen de actuele stand.
- **wetten.overheid.nl** was twee rondes op rij niet bereikbaar vanuit de bouwomgeving; gecontroleerd via de BWB-repository.
- **Historisch niveau per AVI** is niet openbaar; de scan rekent met een verhouding die de gebruiker invult.
- **Doorberekening.** De scan geeft de heffing naar rato van tonnage, niet wat een verwerker contractueel doorberekent.
- **EU ETS voor AVI's vanaf 2028** en **afschaffing van de heffing** staan als ontwikkeling in de tool, niet als rekenpad.
