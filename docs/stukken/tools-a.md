# Tools A: Indexcalculator en CO2-heffingenscan

Stand: 20 oktober 2026 (ronde 1; afgemaakt na een eerdere poging die halverwege stopte, op 20 oktober gecontroleerd en aangevuld).
Beide tools rekenen nu met officiële cijfers. Elk cijfer heeft een bron en een peildatum in de UI, in de CSV en in een
databestand. Wat de tool niet uit een officiële bron kan halen, staat zichtbaar als aanname of kental.

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Indexcalculator | `src/pages/tools/Indexcalculator.tsx` | Gratis: één CBS-reeks, jaar- of maandcijfers, basis- en peilperiode, voorlopige cijfers gemarkeerd. Pro: eigen weging over zes reeksen plus een vast deel, tarief per contractjaar (peilmaand of jaargemiddelde, indexcijfer van hetzelfde of het voorgaande jaar), plafond per indexatie en "geen negatieve indexatie", vergelijking van twee contractjaren (ook in de deellink, parameter `vgl`, en in de CSV), grafiek met CPI ter vergelijking. |
| Rekenlogica index | `src/lib/calc/indexering.ts` (+ test) | Pure functies: gewogen factor, perioden, contractjaren, begrenzing (`begrensStap`), invoer naar en uit de URL. |
| CBS-data | `src/data/indexreeksen.json`, `src/data/indexreeksen.ts` | Zes reeksen met tabel-id, tabeltitel, dimensies, onderwerp, basisjaar, laatste wijziging bij CBS, peildatum, bron-URL (StatLine) en API-URL. Maand- en jaarcijfers zoals CBS ze publiceert; jaargemiddelden worden niet zelf berekend. |
| Ophaalscript | `scripts/cbs-indexreeksen.mjs` | Haalt de reeksen op via de CBS OData-API (v3) en schrijft de JSON. Meldt ontbrekende maanden. |
| CO2-heffingenscan | `src/pages/tools/Co2Heffingenscan.tsx` | Gratis: heffing in één jaar (2026–2035) voor uw tonnage, tariefpad geldend recht of wetsvoorstel Belastingplan 2027, wettelijke of eigen vrijstelling, inflatieaanname. Tarieventabel per jaar, tabel in prijspeil 2026 uit de memorie van toelichting, ontwikkelingen, bronnenlijst. Pro: verloop 2026–2035 voor drie scheidingsscenario's, per inwoner, vergelijking met het andere tariefpad. |
| Rekenlogica CO2 | `src/lib/calc/co2.ts` (+ test) | Pure functies: tarief per jaar met verhogingen en inflatiecorrectie, vrijgesteld deel volgens de NEa-formule, scan per jaar en per scenario, invoer naar en uit de URL. |
| CO2-tarieven en regels | `src/data/co2-tarieven.ts` | Tarieven, verhogingen, correctie-, reductie- en procesemissiefactoren, kental emissiefactor, tabel prijspeil 2026, bronnen en `PEILDATUM`. |
| Export en delen | `src/components/rekenen/Export.tsx`, `export.ts` (+ test) | CSV met puntkomma en decimale komma (Excel NL, met BOM). Deellink met alle invoer; de adresbalk wordt ook bijgewerkt. |
| Bronnenlijst | `src/components/rekenen/Bronnen.tsx` | Per getal: status in tekst (officiële bron, wetsvoorstel, kental, aanname), waarde, bron met link, peildatum. |
| Rapport | `src/components/rekenen/Uitkomst.tsx` | Rapportkop en -voet en knop "Rapport maken" (Pro); printweergave via `src/styles/print.css`. |
| Grafiek | `src/components/grafiek/Grafieken.tsx` | Lijngrafiek; x-aslabels overlappen niet meer op 400 px. |
| E2E | `e2e/tools-a.spec.ts` | Beide tools op 400 px en desktop: rekenen, bron en peildatum, CSV, deellink, betaalmuur, Pro-preview, print. Pro met inlog alleen als `E2E_EMAIL` en `E2E_WACHTWOORD` gezet zijn. |

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
| Gemiddelde pompprijs diesel (euro per liter) | 81567NED | Brandstof van inzamelvoertuigen. Geen index; alleen de verhouding telt. |

Niet opgenomen: PPI gasolie (85770NED, ProdCom 192026). CBS laat daar veel maanden leeg (onder meer heel 2023 en 2024),
waardoor een indexatie niet na te rekenen is.

Cao-lonen per maand zijn er vanaf januari 2020 (basisjaar 2020=100), jaarcijfers vanaf 2015. De PPI-energiereeks
begint in januari 2018.

### Rekenregels

- Eén reeks: `nieuw tarief = basistarief × indexcijfer peilperiode / indexcijfer basisperiode`.
- Gewogen: `nieuw tarief = basistarief × (vast deel + Σ weging_i × index_i,peil / index_i,basis)`. Weging en vast deel
  moeten samen 100 % zijn; anders meldt de tool dat (met tekst en teken, niet alleen kleur) en rekent met de ingevulde weging.
- Contractjaar J gebruikt het jaarcijfer of de peilmaand van jaar J (nacalculatie) of J − 1 (tarief per 1 januari).
- Plafond en bodem: met een begrenzing indexeert de tool jaar op jaar:
  `tarief_J = tarief_vorig × begrensd(factor_J / factor_vorig)`. Zonder begrenzing is dat gelijk aan `basistarief × factor_J`.
  De begrenzing geldt ook voor de eerste stap vanaf de basisperiode. Begrensde jaren staan in de tabel en CSV met het
  tarief zonder begrenzing ernaast.
- Het basisjaar van een CBS-reeks maakt voor de uitkomst niet uit, behalve kleine afrondingsverschillen als CBS een
  reeks herbaseert.

### Peildatum

De CBS-reeksen zijn op 20 oktober 2026 opnieuw opgehaald. De waarden zijn gelijk aan die van 19 oktober; alleen de
peildatum is verschoven. Laatste cijfers: CPI, cao-lonen en dieselprijs t/m september 2026, PPI energie t/m augustus 2026.

### Onderhoud

```bash
NODE_USE_ENV_PROXY=1 node scripts/cbs-indexreeksen.mjs   # achter de proxy; zonder proxy zonder de variabele
npx vitest run src/lib/calc/indexering.test.ts
```

Het script schrijft `src/data/indexreeksen.json` opnieuw met de dag van ophalen als peildatum. CBS publiceert de CPI
rond de tiende van de maand, cao-lonen en PPI aan het eind van de maand. Maandelijks draaien is genoeg.

Let op bij een herbasering door CBS (nieuwe tabel-id, bijvoorbeeld bij een nieuw basisjaar): pas `tabelId`, `onderwerp`
en eventueel de dimensiesleutels aan in `REEKSEN` bovenin het script, en `basisjaar`. De test controleert dat CPI 2025
gelijk is aan 100 en cao-lonen 2020 aan 100; die regels moeten dan mee.

## CO2-heffingenscan

### Wat de scan rekent

```
uitstoot          = restafval × fossiele emissiefactor
vrijgesteld deel  = procesemissiefactor × reductiefactor × AVI-correctiefactor ÷ (uitstoot ÷ historisch niveau)
heffing           = max(0, uitstoot × (1 − vrijgesteld deel)) × tarief
tarief_t          = (tarief_t−1 + verhoging_t) × (1 + inflatiecorrectie)
```

De heffing betaalt de exploitant van de AVI. De scan verdeelt die naar rato van het tonnage van de gebruiker. Hoeveel
de verwerker doorberekent, hangt af van het contract.

- **Geldend recht:** art. 90 Wbm noemt art. 71p lid 1 en 2, dus ook de nog niet toegepaste verhogingen worden jaarlijks
  geïndexeerd. De scan doet dat met de ingevulde inflatieaanname.
- **Voorstel Belastingplan 2027:** tarief 2027 € 129,15 (al geïndexeerd met 2,6 %; art. LX sluit een tweede correctie
  in 2027 uit); verhogingen 2028–2035 worden niet meer apart geïndexeerd (art. XXVII onderdeel D).
- **Historisch niveau:** mediaan 2019–2023. Binnen ± 15 % rekent de NEa met het historisch niveau; daarbuiten met het
  actuele niveau (de scan rekent dan met verhouding 1).
- Met 0 % inflatie lijkt het voorstel in 2035 duurder dan geldend recht. Dat komt doordat de verhogingen in het voorstel
  al inflatie bevatten. De tool meldt dat en toont de officiële vergelijking in prijspeil 2026 (MvT tabel 12).

### Gebruikte cijfers en bronnen (peildatum 19 oktober 2026)

Op 20 oktober 2026 opnieuw gecontroleerd en ongewijzigd: de NEa-pagina's over tarieven, AVI's, dispensatierechten en
mogelijke afschaffing, en het wetsvoorstel Belastingplan 2027 (€ 129,15; verhogingen € 22,79 t/m € 26,77; 1,026).
wetten.overheid.nl was die dag niet bereikbaar (lege respons). De peildatum in `co2-tarieven.ts` blijft daarom
19 oktober, de laatste dag waarop alle bronnen zijn gecontroleerd.

| Gegeven | Waarde | Bron |
|---|---|---|
| Tarief AVI 2026 | € 103,66 per ton CO2 | Wbm art. 71p lid 1 (stand 4 juni 2026, nog geldend op 19-10-2026), https://wetten.overheid.nl/BWBR0007168/2026-06-04#HoofdstukVIB; NEa, https://www.emissieautoriteit.nl/regelgeving/co2-heffing/tarieven-co2-heffing |
| Verhogingen geldend recht | 2027 € 49,66; 2028 € 50,42; 2029 € 50,42; 2030 € 49,39 (NEa-tabel zonder indexatie: 153,32 / 203,74 / 254,16 / 303,55) | Wbm art. 71p lid 2; NEa tarievenpagina |
| Eerdere tarieven en ETS-prijzen | 2021–2025 | NEa tarievenpagina |
| AVI-correctiefactor geldend | 2026 0,85; 0,70; 0,55; 0,40; 0,25; 0,17; 0,09; 2033 e.v. 0 | Wm art. 16b.17 lid 4 (stand 1 augustus 2026), https://wetten.overheid.nl/BWBR0003245/2026-08-01#Hoofdstuk16b; NEa AVI-pagina |
| Nationale reductiefactor | 1,023 vanaf 2026 (eerder 1,2 / 1,143 / 1,213 / 1,135 / 1,057) | Wm art. 16b.17 lid 3; https://www.emissieautoriteit.nl/regelgeving/co2-heffing/dispensatierechten/berekening-aantal-dispensatierechten |
| Procesemissiefactor AVI's | 0,97; vanaf 2028 0,91 | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/verplichtingen/verplichtingen-voor-afvalverbrandingsinstallaties |
| Voorstel BP 2027 | 2027 € 129,15; verhogingen 2028–2035 € 22,79 / 23,54 / 24,10 / 24,61 / 25,15 / 25,68 / 26,22 / 26,77; correctiefactor 2031–2035 0,20 / 0,15 / 0,10 / 0,05 / 0 | Wetsvoorstel Belastingplan 2027 art. XXVI, XXVII, LX en MvT par. 5.21, https://www.rijksfinancien.nl/sites/default/files/bestanden/belastingplan-2027/wetsvoorstel-belastingplan-2027/Wetsvoorstel-Belastingplan-2027.pdf |
| Tariefpad prijspeil 2026 | geldend 104 → 304 in 2030; voorstel 104 → 304 in 2035 | MvT Belastingplan 2027, tabel 12 |
| Inflatiecorrectie 1-1-2027 | 2,6 % (tabelcorrectiefactor 1,026) | MvT Belastingplan 2027 |
| Afschaffing heffing | coalitieakkoord 2026–2030; pas definitief na wetswijziging | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/wat-is-co2-heffing |
| Handel DPR's | vanaf overdrachtstijdvak 2027 alleen tussen AVI's | https://www.emissieautoriteit.nl/regelgeving/co2-heffing/dispensatierechten |
| **Kental** fossiele emissiefactor | 0,363 ton CO2 per ton afval = 9,4 GJ/t × 107,4 kg/GJ × (1 − 64 % biogeen) | NEa/RVO standaardwaarden NIR 2024, regel "Afval" en voetnoot 6, https://www.emissieautoriteit.nl/documenten/2024/02/9/standaardwaarden-nir-2024. Gemiddelde voor afval in AVI's, niet specifiek huishoudelijk restafval. |
| **Aanname** | restafval, inflatie na 2027, uitstoot t.o.v. historisch niveau, eigen vrijgesteld deel, inwoners, scheidingspercentages | Vult de gebruiker in; zo gelabeld in UI en CSV. |
| **Aanname** | procesemissiefactor na 2030 | Niet gepubliceerd; de scan houdt 0,91 aan en zegt dat. |

### Onderhoud

1. Controleer na Prinsjesdag, na de stemming over het Belastingplan (Tweede Kamer meestal half november, Eerste Kamer
   half december) en op 1 januari:
   - de NEa-tarievenpagina (vastgesteld tarief en ETS-prijs van het nieuwe jaar);
   - wetten.overheid.nl voor Wbm art. 71p en 90 en Wm art. 16b.17;
   - de status van het Belastingplan 2027 op rijksoverheid.nl en eerstekamer.nl.
2. Pas `src/data/co2-tarieven.ts` aan: `vastgesteldeTarieven`, `tariefpaden.*.vast` (zet het geïndexeerde tarief van
   het nieuwe jaar vast), `verhogingen`, `correctiefactor`, `bronnen` en `PEILDATUM`.
3. Wordt het Belastingplan aangenomen, dan wordt het pad "voorstel" het geldende recht: zet bij dat pad
   `status: 'officieel'`, pas naam en bron aan en verwijder of hernoem het oude pad. Teksten in `ontwikkelingen` bijwerken.
4. Draai `npx vitest run src/lib/calc/co2.test.ts`. De tests controleren de NEa-tabel, het voorstel tot 2035 en de
   tabel in prijspeil 2026; pas verwachte waarden alleen aan na een wetswijziging.

## Controles (20 oktober 2026)

- `npx tsc --noEmit -p .`: geen fouten (hele project).
- `npx vitest run` voor `indexering`, `co2` en `rekenen/export`: 46 tests geslaagd (deellinktest uitgebreid met de
  vergeleken contractjaren en ongeldige `vgl`-waarden).
- `npx vite build --outDir /tmp/claude-0/build-tools-a`: geslaagd (waarschuwing chunkgrootte, niet van dit onderdeel).
- `PW_BASE=http://localhost:5103 npx playwright test e2e/tools-a.spec.ts`: 24 geslaagd, 4 overgeslagen (Pro met inlog).
  Nieuw: een gedeelde link met `vgl=2023-2025` toont dezelfde vergelijking.
- Op 400 px geen horizontale pagina-scroll (brede tabellen scrollen binnen hun eigen, focusbare kader).

## Open punten

- **Pro met echte inlog** is niet end-to-end getest: zet `E2E_EMAIL` en `E2E_WACHTWOORD` van een testaccount bij een
  actieve organisatie. De rekenlogica van Pro is wel getest (unit) en de Pro-preview achter de betaalmuur wordt in de
  e2e-test op de juiste uitkomst gecontroleerd.
- **Eerste publicatie versus herziene cijfers.** CBS herziet voorlopige cijfers. Contracten die het eerst gepubliceerde
  cijfer voorschrijven, hebben een archief van eerdere versies nodig. Het script bewaart alleen de actuele stand.
- **wetten.overheid.nl** was op 20 oktober niet bereikbaar; controleer bij de volgende ronde of er een nieuwere
  versie van de Wbm (na 4 juni 2026) of de Wm (na 1 augustus 2026) is en pas zo nodig de links in `bronnen` aan.
- **Afronding per jaar** (bijvoorbeeld tarief afronden op hele centen voor de volgende indexatie) zit er nog niet in.
- **Meer reeksen** op verzoek van leden, bijvoorbeeld CPI zonder energie, PPI voor specifieke diensten of de
  loonkostenindex. Toevoegen via `REEKSEN` in het script.
- **Historisch niveau per AVI** is niet openbaar per installatie. De scan rekent met een verhouding die de gebruiker
  invult; de echte waarde staat in het CO2-heffingsverslag van de verwerker.
- **Doorberekening.** De scan geeft de heffing naar rato van tonnage, niet wat een verwerker contractueel doorberekent.
- **EU ETS voor AVI's vanaf 2028** (besluit Europese Commissie in 2026) en **afschaffing van de heffing** (coalitieakkoord)
  kunnen de uitkomst sterk veranderen. Beide staan als ontwikkeling in de tool, niet als rekenpad.
- `README.md` (niet van dit onderdeel) noemt de indexreeksen, de emissiefactor en de CO2-heffing nog fictief en geeft
  bij Indexcalculator en CO2-heffingenscan de oude formules. Voorstel voor de beheerder van de README: tabelregel
  `indexreeksen.ts/.json` wordt "zes CBS-reeksen, opgehaald met scripts/cbs-indexreeksen.mjs", nieuwe regel
  `co2-tarieven.ts` ("tarieven en regels CO2-heffing AVI's met bron en peildatum"), formules volgens dit stuk, en de
  regels over indexreeksen, emissiefactor en CO2-heffing uit "Wat is fictief" halen.
