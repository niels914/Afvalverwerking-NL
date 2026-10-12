# Ledenplatform Restafvalkaart van Nederland (prototype)

Klikbaar prototype van een ledenplatform voor afvalverwerking rond de Restafvalkaart van Nederland van KplusV.
Het prototype laat het idee zien aan collega's (KplusV Lab) en aan relaties (samenwerkingsverbanden en afvalverwerkers) en verzamelt hun feedback.

**Alles is fictief.** Er is geen backend, geen login, geen betaling en geen echte data. Alle rekentools zijn dummyberekeningen en alle content is verzonnen. Dat staat op elke pagina in een banner.

## Starten

Nodig: Node.js 20 of nieuwer.

```bash
npm install
npm run dev       # ontwikkelserver op http://localhost:5173
npm run build     # productieversie in dist/
npm run preview   # productieversie lokaal bekijken
npm test          # rekentests (Vitest)
```

## Op Netlify zetten

1. Zet de repository op GitHub en kies in Netlify **Add new project → Import an existing project**.
2. Netlify leest `netlify.toml`: buildcommando `npm run build`, publicatiemap `dist`. Meer hoeft u niet in te stellen.
3. `public/_redirects` (`/* /index.html 200`) zorgt dat directe links zoals `/tools/indexcalculator` werken.
4. **Formulieren aanzetten:** ga in Netlify naar **Project configuration → Forms** en klik op **Enable form detection**. Start daarna een nieuwe deploy (**Deploys → Trigger deploy**). Netlify vindt het formulier `feedback` alleen bij een build die ná het aanzetten draait.

Zonder Git kan het ook: draai `npm run build` en sleep de map `dist` naar **Deploys** in een nieuw Netlify-project. Netlify Forms werkt dan ook, mits form detection aanstaat.

### Feedback terugvinden

- In Netlify: open het project, ga naar **Forms** en klik op het formulier **feedback**. Daar staan alle inzendingen; u kunt ze exporteren als CSV.
- Een e-mail per inzending: **Project configuration → Notifications → Emails and webhooks → Form submission notifications**.
- Spam: inzendingen die het honeypotveld invullen, worden door Netlify weggefilterd. Twijfelgevallen staan onder **Spam submissions**.
- Lokaal (of als versturen mislukt) bewaart het formulier de inzending in de browser onder de sleutel `afvalplatform-feedback` in `localStorage`. Die gegevens zijn alleen in die browser te zien (ontwikkelhulpmiddelen → Application → Local storage).

Het formulier werkt met een verborgen statische kopie in `index.html`, omdat Netlify bij de build alleen statische HTML leest. **Voegt u een vraag toe, zet het nieuwe veld dan ook in die kopie**, met dezelfde `name` als in `src/data/feedback.ts`.

## Waar staat wat

```
index.html                   verborgen kopie van het feedbackformulier (Netlify Forms)
netlify.toml                 build-instellingen Netlify
public/_redirects            SPA-routing op Netlify
public/logo-kplusv.jpg       logo (uit de huisstijl-skill); logo-kplusv.svg is de placeholder
src/data/                    ALLE content en voorbeelddata
src/lib/calc/                ALLE rekenformules (pure functies) + tests
src/lib/kaartdata.ts         gemeenten → kerncijfers per samenwerkingsverband
src/lib/format.ts            Nederlandse notatie (€ 1.234,56 en 12,5 %)
src/styles/tokens.css        huisstijl: kleuren, lettertype, maten (één bron)
src/styles/components.css    kaarten, tegels, knoppen, tabellen, formulieren
src/styles/print.css         printweergave voor "Rapport maken"
src/components/              layout, betaalmuur, rekencomponenten, grafieken, kaart, formulier
src/pages/                   één bestand per pagina
```

### Voorbeelddata vervangen

Alle data staat in `src/data/`. De vorm van elk type staat in `src/data/types.ts`. Vervang een bestand door echte data met dezelfde velden; aan de componenten hoeft u niets te veranderen.

| Bestand | Inhoud |
|---|---|
| `samenwerkingsverbanden.ts` | 12 fictieve samenwerkingsverbanden met middelpunt op de kaart |
| `gemeenten.ts` | Fictieve gemeenten met inwoners, kg restafval per inwoner en scheidingspercentage |
| `aanbestedingen.ts` | 15 fictieve aanbestedingen |
| `nieuws.ts` | 12 fictieve nieuwsberichten |
| `kennisbank.ts` | 10 fictieve publicaties |
| `indexreeksen.ts` | 3 fictieve indexreeksen (2019 = 100) en de vaste weging van de gratis indexcalculator |
| `standaardwaarden.ts` | Standaardwaarden van alle rekentools |
| `tools.ts`, `lidmaatschap.ts`, `site.ts`, `feedback.ts` | Teksten, prijzen, navigatie, contact, formuliervragen |

**Echte Restafvalkaart-data inlezen.** De kaart rekent vanaf gemeenteniveau, net als de echte Restafvalkaart. Zet per gemeente één rij in `gemeenten.ts`: `cbsCode` (bijv. `GM0363`), `naam`, `samenwerkingsverbandId`, `inwoners`, `restafvalKgPerInw`, `scheidingsPct` en `jaar`. De kerncijfers per verband (inwoners opgeteld, kg en scheiding gewogen naar inwoners) berekent `src/lib/kaartdata.ts`. Een CSV kunt u omzetten naar dit formaat of als JSON importeren (`import data from './gemeenten.json'`).
Wilt u vlakken in plaats van cirkels, vul dan bij een samenwerkingsverband het veld `grens` met een GeoJSON-polygoon (bijvoorbeeld samengevoegde CBS-gemeentegrenzen). De kaart tekent dan automatisch een vlak.

### Rekenformules

Elke rekentool heeft een eigen bestand in `src/lib/calc/` met de formule bovenaan in commentaar, en een testbestand ernaast.

| Tool | Bestand | Formule |
|---|---|---|
| Indexcalculator | `indexering.ts` | `nieuw tarief = basistarief × Σ(weging_i × index_i,nu / index_i,basis)` |
| CO2-heffingenscan | `co2.ts` | `heffing = max(0, tonnage × emissiefactor − vrijstelling) × heffingstarief` |
| Bodemassencalculator | `bodemas.ts` | `netto kosten = verbrand tonnage × aandeel bodemas × (verwerkingskosten − opbrengst metalen)` |
| Rekenmodel PMD | `pmd.ts` | bron: `ton × (inzameling + sortering − vergoeding)`, na: `ton × (nascheiding − vergoeding)` |
| Aanbestedingstool | `aanbesteding.ts` | `weging_i = schuif_i / Σ schuif × 100 %` en een checklist op basis van scope en weging |

### Betaalmuur (demo)

Rechts in de navbar staat **Bekijk als: Bezoeker | Lid**. De keuze staat in `localStorage` (sleutel `afvalplatform-rol`). Als bezoeker ziet u bij betaalde onderdelen een wazige preview met uitleg en een knop naar Lidmaatschap. Er is geen echte login: iedereen kan omschakelen. Zie `src/components/betaalmuur/`.

## Wat is fictief

- Alle twaalf samenwerkingsverbanden, alle gemeenten (namen, CBS-codes `GM9xxx`, inwoners, kg restafval, scheidingspercentages).
- Alle vijftien aanbestedingen: opdrachtgevers, titels, data, statussen. De links gaan naar de homepage van TenderNed of Mercell, niet naar een aankondiging.
- Alle twaalf nieuwsberichten. Ze komen niet van Afval Online; de bronvermelding laat alleen zien hoe dat in het echte platform zou werken.
- Alle tien publicaties in de kennisbank en hun uitgevers.
- Alle indexreeksen (loon, energie, consumentenprijzen) en de vaste weging.
- Alle standaardwaarden van de rekentools: emissiefactor, CO2-heffing, vrijstelling, bodemasaandeel, verwerkingskosten, metaalopbrengst, PMD-respons, kosten en vergoeding.
- De checklist van de aanbestedingstool (voorbeeld, geen juridisch advies).
- De richtprijzen van het lidmaatschap (concept, indicatief) en het rekenvoorbeeld van het verdienmodel.
- De samenwerking met CE Delft is als label genoemd ("in ontwikkeling"); de tool in dit prototype is een dummy.

## Privacy en externe verbindingen

Geen trackers en geen analytics. De site maakt wel verbinding met:
- **OpenStreetMap** voor de kaarttegels (`tile.openstreetmap.org`).
- **Google Fonts** voor Poppins.
- **Netlify** voor het versturen van het feedbackformulier.

## Open punten en aannames

**Aannames bij het bouwen**
1. CO2-heffing: de vrijgestelde hoeveelheid is in ton CO2 en gaat af van de uitstoot vóór de heffing (`max(0, uitstoot − vrijstelling) × tarief`). In de opdracht stond de aftrek na de heffing; dat gaf een eenheidsprobleem (€ min ton).
2. PMD: nascheidingskosten zijn inclusief sortering, de inzameling van restafval telt niet mee bij nascheiding, en de vergoeding per ton is voor beide routes gelijk.
3. CO2 Pro: het restafval bij een ander scheidingspercentage schaalt mee met het niet-gescheiden deel; het heffingstarief stijgt lineair per jaar.
4. Indexcalculator: het rekenjaar is het laatste jaar in de reeksen (2026); het basisjaar is het gekozen startjaar. De Pro-versie vergelijkt met een indexering op alleen consumentenprijzen (gestreepte grijze lijn).
5. Bodemas: verwerkingskosten en metaalopbrengst zijn per ton bodemas, niet per ton verbrand afval. De gevoeligheidsanalyse varieert elke parameter apart (standaard ±20 %).
6. Nieuws: de bronvermelding "Afval Online" staat er met de uitdrukkelijke vermelding dat het bericht verzonnen is, zodat geen bericht zich voordoet als een echt artikel van Afval Online.
7. Feedbackvraag 10 (alleen collega's) verschijnt alleen bij de rol "Collega KplusV". De volgende vraag schuift dan mee in nummering. Vraag 11 is gesplitst in "mogen we contact opnemen? ja/nee" plus een e-mailveld dat verschijnt bij "ja".
8. De meerkeuzevraag over onderdelen wordt naar Netlify gestuurd als één veld met waarden gescheiden door `; `.
9. Het echte KplusV-logo (96×96 jpg) staat in de navbar. Het is te klein voor druk; vraag een SVG aan voor de definitieve versie. `public/logo-kplusv.svg` is de placeholder, nu alleen gebruikt als favicon.

**Open punten**
1. Echte data: Restafvalkaart per gemeente, gemeentegrenzen (GeoJSON), echte indexreeksen (bijv. CBS) en actuele tarieven.
2. Login en betaling: welke dienst (bijvoorbeeld Netlify Identity, Supabase Auth of een ledenadministratie) en per organisatie in plaats van per gebruiker.
3. Gebruiksvoorwaarden van TenderNed en Mercell: mag informatie over aanbestedingen worden overgenomen, en zo ja hoe?
4. Onafhankelijkheid: hoe gaan we om met verwerkers en samenwerkingsverbanden die allebei lid zijn?
5. Validatie van de rekenmodellen door een tweede adviseur, met versiebeheer van formules en standaardwaarden.
6. Bronvermelding en rechten bij nieuws (overname van koppen en samenvattingen).
7. Poppins lokaal hosten in plaats van via Google Fonts (geen verbinding met Google).
8. OpenStreetMap-tegels zijn voor licht gebruik. Bij meer verkeer is een tegeldienst met een eigen sleutel nodig.
9. Privacyverklaring en gebruiksvoorwaarden voor een publieke versie.
10. De kleuren donkerviolet en KplusV-blauw liggen voor kleurenblinden dicht bij elkaar. De grafieken compenseren dat met lijnpatronen, markervormen en een legenda. Overweeg een derde, contrasterende grafiekkleur in de huisstijl.

## Contact

Niels Ahsmann, partner en senior adviseur circulaire economie, KplusV · n.ahsmann@kplusv.nl · 06 2708 5537
