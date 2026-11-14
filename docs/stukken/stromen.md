# Afvalstromen (/stromen)

Per huishoudelijke afvalstroom een verdiepende pagina. Routes: `/stromen` (overzicht en matrix) en `/stromen/:id`.

## Stromen en id's (vast, andere pagina's linken ernaar)
`restafval`, `gft`, `papier`, `pmd`, `textiel`, `glas`, `grof`, `luiers`, `kca`. De eerste zeven zijn opgedragen; luiers en klein chemisch afval zijn toegevoegd omdat CBS er voor (bijna) alle gemeenten een cijfer voor heeft. Hout, matrassen en grof tuinafval zitten in `grof`; elektrische apparaten, puin en bruikbaar huisraad zijn bewust weggelaten (UPV of bouwafval).
De koppeling stroom naar CBS-afvalsoorten staat in `src/data/stromen-fracties.json`. Restafval = fijn + grof restafval (zoals op de Restafvalkaart); PMD = kunststof + drankenkartons + blik + gemengde PMD-fractie; grof = grof tuinafval, hout A/B en C, matrassen, metalen, harde plastics, vloerbedekking (grof restafval telt bij restafval).

## Wat er staat
1. In het kort: landelijk kg per inwoner en kton, verandering over tien jaar, spreiding tussen gemeenten (10e–90e percentiel, laagste en hoogste).
2. Ontwikkeling: lijngrafiek 2005–2025 met tabel als tekstalternatief en de CBS-fracties.
3. Per gemeente: kaart (`RestafvalKaart` met de optionele props `kleurPerCode` en `tipPerCode`), legenda, doorzoekbare en sorteerbare tabel, paneel met gemeente naast landelijk, links naar Restafvalkaart en (restafval) Heffingenscan.
4. Verwerking en geldstromen, 5. Regels en beleid: `src/data/stromen-inhoud.ts`, alleen met bron en peildatum.
6. Tools, 7. Aanbestedingen en documenten (links met `?stroom=<archiefnaam>`), 8. Aandachtspunten bij een contract (uit `tools-b-aanbesteding.ts`, geladen als het blok opengaat), 9. Publicaties (`stromen` in `src/data/kennisbank.ts`; het filter staat ook op `/kennisbank?stroom=<id>`).

## Data bijwerken
```
NODE_USE_ENV_PROXY=1 node scripts/cbs-afval-gemeenten.mjs   # eerst: gemeenten, inwoners, peiljaar
NODE_USE_ENV_PROXY=1 node scripts/cbs-stromen.mjs           # daarna: stromen
```
Schrijft `public/data/stromen-gemeenten.json` (CBS 83452NED, peiljaar zoals de kaart, laadt pas bij gebruik) en `src/data/stromen-landelijk.json` (CBS 83558NED, 2005 tot nu, kg per inwoner en kton, plus verdeling verwerking). Het script controleert de restafval-, gft-, papier-, glas-, textiel- en pmd-cijfers tegen `afval-gemeenten.json`. PMD-kg landelijk is afgerond op hele kilo's (som van deels afgeronde CBS-cijfers). De landelijke cijfers lopen een jaar voor op de gemeentecijfers.
Teksten bijwerken: lees de bron opnieuw, pas tekst, bron en `PEILDATUM` in `stromen-inhoud.ts` aan. Nieuwe publicaties: link controleren (HTTP 200), eigen samenvatting, veld `stromen` vullen, `linksGecontroleerd` aanpassen.

## Bronnen per stroom (gelezen op 13 november 2026)
- Alle stromen: CBS 83558NED en 83452NED; Wet milieubeheer art. 10.21–10.29 en 15.33 (wetten.overheid.nl); Besluit gescheiden inzameling huishoudelijke afvalstoffen (Stb. 2020, 197); Circulair Materialenplan (in werking 30 december 2025, Rijkswaterstaat; richtwaarde 30 kg restafval in 2030 volgens VNG-samenvatting).
- Restafval: Rijkswaterstaat Afvalverwerking in Nederland 2024 (13 AVI's, 6.422 kton); Strategy& (11 september 2025, poorttarief ca. € 55–70 per ton, sectorstudie); Belastingdienst (afvalstoffenbelasting 2026 € 40,85 per 1.000 kg); CBS-verdeling eerst toegepaste verwerking.
- GFT: Rijkswaterstaat 2024 (20 installaties, 1.638 kton, 387 kton vergist).
- Papier en glas: Samenwerkingsovereenkomst Verpakkingen 2025–2030 (art. 7, bijlage 4 punt 17) en NVRD-bericht 19 september 2025.
- PMD: dezelfde overeenkomst (bijlage 4: inzameltarieven 2026 € 325/277/228/195/0 per ton, nascheidingstarief € 17,26 per ton nascheidingsgewicht), NVRD prullenbakvergoeding 2026 (€ 1,02 per inwoner).
- Textiel: Besluit UPV textiel (wetten.overheid.nl), Rijksoverheid, NVRD-presentatie 21 maart 2024.
- Grof: Wm art. 10.22. Luiers en KCA: Besluit gescheiden inzameling.

## Wat niet te onderbouwen was (staat zo op de pagina's)
Verwerkingstarief gft; opbrengst papier, glas, textiel en vergoedingen per ton voor glas en papier (Verpact-factsheet niet raadpleegbaar); vergoeding aan gemeenten voor textiel; teruggewonnen hoeveelheid bij nascheiding; poorttarieven per installatie; tarieven voor hout, matrassen en grof tuinafval; verwerking en kosten van luiers en KCA; producentenverantwoordelijkheid voor matrassen, luiers en delen van KCA (niet nagelezen). De Europese kaderrichtlijn zelf was niet raadpleegbaar (EUR-Lex geblokkeerd); de Europese recyclingnorm 2035 staat daarom als NVRD-uitspraak.

## Let op
- VNG-pagina's geven bij curl HTTP 403 (botfilter) maar openen in een browser; daarom staan ze niet in de kennisbank.
- De getekende overeenkomst noemt één tarief per staffel tot en met 2028; `tools-b-pmd.ts` laat staffel 3b dalen (179 en 163). Controleren.
