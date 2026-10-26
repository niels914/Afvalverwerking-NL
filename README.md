# Ledenplatform Restafvalkaart van Nederland (bèta)

Ledenplatform van KplusV voor contractmanagers en beleidsmedewerkers van gemeenten, samenwerkingsverbanden en afvalverwerkers: de Restafvalkaart, nieuws en kennisbank, rekentools en een aanbestedingsarchief.

**Stand.** De cijfers komen uit openbare bronnen (CBS, PDOK, Rijkswaterstaat, Nederlandse Emissieautoriteit, wet- en regelgeving, TenderNed), met bron en peildatum in de UI en in `src/data/`. Leden loggen in via Supabase Auth; lidmaatschap is per organisatie (bevestigd e-maildomein). Prijzen en algemene voorwaarden zijn nog **concept**; de juridische teksten zijn **concept ter juridische toetsing**. Daarom staat er een bètamelding bovenaan elke pagina.

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
src/data/                    content en data met bron en peildatum
src/lib/calc/                ALLE rekenformules (pure functies) + tests
src/lib/kaartdata.ts         gemeenten → kerncijfers per samenwerkingsverband
src/lib/format.ts            Nederlandse notatie (€ 1.234,56 en 12,5 %)
src/styles/tokens.css        huisstijl: kleuren, lettertype, maten (één bron)
src/styles/components.css    kaarten, tegels, knoppen, tabellen, formulieren
src/styles/print.css         printweergave voor "Rapport maken"
src/components/              layout, betaalmuur, rekencomponenten, grafieken, kaart, formulieren
src/lib/supabase.ts          Supabase-client (URL en publishable key; env VITE_SUPABASE_*)
supabase/migrations/         databaseschema (organisaties, lidmaatschap, aanbestedingen) met RLS
supabase/functions/          Edge Function ververs-aanbestedingen (dagelijks via pg_cron)
scripts/                     ophalen van CBS-, PDOK- en nieuwsdata
docs/stukken/                per onderdeel: wat er is, onderhoud, bronnen en open punten
src/pages/                   één bestand per pagina
```

## Per onderdeel

Elk onderdeel heeft een eigen document met bouw, onderhoud, bronnen en open punten:

| Onderdeel | Document |
|---|---|
| Inloggen en ledentoegang (Supabase Auth, organisatie activeren, dashboardinstellingen) | `docs/stukken/toegang.md` |
| Lidmaatschap, prijzen en aanmelden op factuur | `docs/stukken/lidmaatschap.md` |
| Indexcalculator en CO2-heffingenscan | `docs/stukken/tools-a.md` |
| Bodemassencalculator, PMD-rekenmodel en aanbestedingstool | `docs/stukken/tools-b.md` |
| Restafvalkaart, kennisbank, nieuws en homepage | `docs/stukken/inhoud.md` |
| Aanbestedingsarchief (TenderNed) | `docs/stukken/aanbestedingen.md` |
| Algemene voorwaarden, privacy, cookies, toegankelijkheid, disclaimer | `docs/stukken/juridisch.md` |

## Privacy en externe verbindingen

Geen trackers en geen analytics. Het lettertype Poppins staat op de site zelf. De site maakt verbinding met:
- **Supabase** (EU, Frankfurt) voor inloggen, lidmaatschap en het aanbestedingsarchief.
- **OpenStreetMap** voor de kaarttegels.
- **Netlify** voor hosting en het versturen van formulieren.

## Nog te doen door KplusV vóór livegang

1. Prijzen en algemene voorwaarden vaststellen; juridische teksten laten toetsen.
2. In Supabase: eigen SMTP, Site URL, Redirect URLs, Nederlandse mailteksten, minimale wachtwoordlengte (zie `docs/stukken/toegang.md`).
3. Na de eerste deploy: Netlify Forms aanzetten en e-mailmeldingen voor `feedback` en `aanmelding` instellen.
4. Hergebruik van TenderNed-gegevens in een ledenomgeving laten bevestigen (zie `docs/stukken/aanbestedingen.md`).
5. Het label "in ontwikkeling met CE Delft" bij de aanbestedingstool bevestigen of weghalen.

## Contact

Niels Ahsmann, partner en senior adviseur circulaire economie, KplusV · n.ahsmann@kplusv.nl · 06 2708 5537
