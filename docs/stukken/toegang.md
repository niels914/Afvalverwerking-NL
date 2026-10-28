# Toegang: inloggen, account en betaalmuur

Stand: 27 oktober 2026 (ronde 3: typecheck, unittests, build, end-to-end op 400 px en 1280 px met het testaccount, Lighthouse op `/inloggen`). Supabase-project `afvalverwerking-nl`, ref `mnwynrioozcqqvhelqku`.

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Sessiestatus | `src/lib/auth.tsx` | `AuthProvider` en `useAuth()`: sessie uit Supabase Auth, `isLid` uit `rpc('is_lid')`, organisatie en status uit `rpc('mijn_lidmaatschap')` (beide tegelijk, één keer per paginalading). Opnieuw controleren gebeurt alleen bij een andere gebruiker, na gewijzigde gebruikersgegevens, bij een ververst token als de laatste controle ouder is dan 5 minuten, en als het tabblad na meer dan 5 minuten weer actief wordt. In ronde 1 ging dezelfde controle 2 tot 3 keer de deur uit (ook op `SIGNED_IN` bij het laden); de e2e-test bewaakt nu het aantal. |
| Compatibele hook | `src/components/betaalmuur/RolContext.tsx` | `useRol()` geeft nog steeds `{ isLid }` (plus `rol` en `laden`), zodat andere onderdelen niets hoeven te veranderen. De demo-schakelaar "Bekijk als" is weg. |
| Foutmeldingen | `src/lib/authFouten.ts` | Supabase-foutcodes naar gewoon Nederlands; de Engelse tekst komt nooit in beeld. Ook de afwijzing door de domeinhook (zie hieronder), controle op e-mailadres, veilig terugpad na inloggen (alleen paden binnen de site), controle nieuw wachtwoord (minimaal 10 tekens). |
| Status in woorden | `src/lib/authStatus.ts` | Lidmaatschapsrij naar label, uitleg en "geldig tot" (actief, loopt binnen 30 dagen af, verlopen, aangevraagd, opgezegd, geen organisatie). Soort organisatie met uitleg: de tariefgroep komt uit `src/data/lidmaatschap.ts`; `overig` heet "Overig, eigen afspraak met KplusV" met een zin uitleg. |
| Aanbod | `src/lib/authAanbod.ts` | Lijst van alle onderdelen (archief, tools, kaart, kennisbank, nieuws) met wat alleen leden krijgen. Afgeleid van `src/data/tools.ts`, dus een nieuwe tool komt vanzelf op de inlogpagina en het ledendashboard. |
| `/inloggen` | `src/pages/Inloggen.tsx` | **Ook zonder account bruikbaar** (besluit Niels 27-10-2026: open aanbestedingen zijn openbaar doorzoekbaar). Links (op mobiel bovenaan) **Open aanbestedingen zoeken**: live het aantal open aanbestedingen over afval, een zoekveld dat doorstuurt naar `/aanbestedingsarchief?zoek=…` (het archief toont bezoekers daar de open aanbestedingen voor die term), de drie aanbestedingen die het eerst sluiten met opdrachtgever, sluitingsdatum en tijd, "nog x dagen" en een directe TenderNed-link, een link naar alle open aanbestedingen en een bronregel met de omvang van het archief en het tijdstip van de laatste verversing. Alles live uit de database, geen vaste momentopname. Daaronder **Zonder account te gebruiken**: directe links naar de gratis tools en open pagina's (met "gratis" of "gratis deel"). Rechts (op mobiel daarna) **Inloggen voor leden** (e-mail + wachtwoord, inloglink per e-mail, ook voor de eerste keer, wachtwoord vergeten), **Lid worden** ("Vanaf € 1.500 per jaar" met label *Concept*, uit `src/data/lidmaatschap.ts`) en **Wat leden verder krijgen** met inklapbaar "Zo werkt de toegang". Op mobiel staat bovenaan een link **Direct naar inloggen** (zet de focus in het e-mailveld). Wie van een vergrendelde pagina komt (`?terug=`) of net uitlogde, krijgt op mobiel het formulier bovenaan. Verder: nieuw wachtwoord na de herstellink, melding bij verlopen links, "opnieuw versturen" pas na 60 seconden, na inloggen terug naar de pagina van herkomst. Omlijnde knoppen zijn donkerviolet (5,8:1). |
| Live gegevens voor bezoekers | `src/lib/authOpen.ts`, `supabase/migrations/20261028090000_aanbestedingen_openbare_stand.sql` | `haalOpenbareStand()` roept `public.aanbestedingen_openbare_stand()` aan: vier totalen (aantal in het archief, aantal open, oudste publicatiedatum, laatste gelukte verversing), geen rijen. De lijst komt uit `public.open_aanbestedingen_zoeken()` (bestond al, via `zoekOpenAanbestedingen()` in `src/lib/aanbestedingen.ts`). Lukt het ophalen niet, dan staat er een melding en geen getal. `archiefZoekPad()` maakt het doorstuuradres. Tests in `authOpen.test.ts`. De oude momentopname (`authVoorbeeld.ts`) is verwijderd. |
| `/account` | `src/pages/Account.tsx` | Ledendashboard. Ronde 4: de archieftegel in **Snel naar** is twee kolommen breed, met live aantallen en snelkeuzes (open voor inschrijving, marktconsultaties, recent gegund; niet-leden alleen "open"); daarnaast de tegel met de kortste beschrijving, zodat vijf tegels op desktop twee volle rijen van drie kolommen vormen (op tablet twee kolommen). De kaart **Aanbestedingen** heeft een filter **Afvalstroom** (neemt het filter mee in de link naar het archief), per regel de status als badge met tekst, de afvalstromen (gekozen stroom vooraan), procedure en het tijdstip van de laatste verversing. Verder: Bovenaan de kern: status, organisatie en geldig tot, met de uitleg en de knop die bij de status past (verlengen, lid worden). Daaronder **Snel naar**: tegels voor de onderdelen met ledeninhoud, met de volledige beschrijving (niet afgekapt), op mobiel in één kolom zodat geen woord midden in breekt; daaronder één regel "Open voor iedereen" met de open onderdelen. Niet-leden zien welke tegels voor leden zijn. **Aanbestedingen** (alleen leden): keuze "Nieuwst gepubliceerd" of "Open, sluit het eerst", drie regels met opdrachtgever, status, sluit- en publicatiedatum en per regel **Bekijk op TenderNed**; onderaan een link naar het archief met hetzelfde filter (`/aanbestedingsarchief?status=open&sortering=sluiting-op`). **Laatste nieuws** (drie berichten met bron en datum). Details staan ingeklapt: "Lidmaatschap in detail" en "Inloggegevens en wachtwoord". Uitloggen staat altijd zichtbaar. Zonder sessie door naar `/inloggen?terug=/account`; tijdens laden en doorsturen blijft een schermhoogte vrij. |
| Accountknop | `src/components/betaalmuur/AccountKnop.tsx` | Rechts in de navbar: "Inloggen" of "Mijn account" met de status als tekst ("Lid" / "Geen lid"). |
| Betaalmuur | `src/components/betaalmuur/Vergrendeld.tsx` | Leden zien de inhoud. Bezoekers: uitleg, wat leden krijgen, knoppen **Inloggen** en **Lid worden**. Ingelogde niet-leden: met welk adres ze zijn ingelogd, waarom ze geen toegang hebben (geen organisatie, verlopen, aangevraagd, opgezegd) en knoppen **Lid worden** en **Inloggen met ander adres**. Tijdens het controleren: "Ledentoegang controleren…". De inhoud staat altijd op dezelfde plek in de React-boom (`.vergrendeld-preview` wordt `.vergrendeld-inhoud` met `display: contents`), dus als de controle klaar is bouwt de tool niet opnieuw op en blijft invoer behouden. Zolang iemand (nog) geen lid is, staan `inert` en `aria-hidden` direct in de HTML (niet meer via een effect na het tekenen): ook tijdens het laden is de preview niet te bedienen. De kop van de slotkaart is een h2. |
| Stijl | `src/components/betaalmuur/toegang.css` | Alleen tokens uit `tokens.css`. Status heeft altijd tekst en een teken (✓, !, –), nooit alleen kleur. Inklapbare blokken met zichtbare focus en een doelgebied van 44 px. |
| Database | `supabase/migrations/20261014204324_is_lid_niet_voor_anon.sql`, `20261014205119_mijn_lidmaatschap.sql`, `20261026202544_hook_alleen_bekende_domeinen.sql` | `is_lid()` niet voor bezoekers zonder sessie; `mijn_lidmaatschap()` (SECURITY INVOKER, valt onder de RLS-policy op `organisaties`); `hook_alleen_bekende_domeinen()` voor de Auth-hook (zie hieronder). Alle drie staan in de database (gecontroleerd met `list_migrations`). |

### Hoe toegang werkt

1. Iemand logt in (wachtwoord of inloglink). Supabase Auth zet een sessie in de browser (`localStorage`).
2. `public.mijn_domein()` geeft het domein van het e-mailadres, **alleen als het adres bevestigd is** (`email_confirmed_at`).
3. `public.is_lid()` is waar als er een organisatie is met status `actief`, met `geldig_tot` leeg of vandaag of later, en dat domein in `emaildomeinen`.
4. De site toont of verbergt op basis daarvan. Nieuwe medewerkers van een lid-organisatie hoeven niet te worden toegevoegd: ze vragen een inloglink aan met hun werkadres. Daarmee maken ze een account aan en bevestigen ze het adres in één stap.

## Organisatie activeren (Niels)

**Via SQL** (Supabase-dashboard → SQL Editor). Nieuwe organisatie, direct actief tot en met 31 december 2027:

```sql
insert into public.organisaties (naam, type, emaildomeinen, status, geldig_tot)
values ('Naam samenwerkingsverband', 'samenwerkingsverband-groot', array['voorbeeld.nl'], 'actief', '2027-12-31');
```

Bestaande aanvraag activeren of verlengen:

```sql
update public.organisaties
set status = 'actief', geldig_tot = '2027-12-31'
where naam = 'Naam samenwerkingsverband';   -- of: where 'voorbeeld.nl' = any(emaildomeinen)
```

Extra domein toevoegen (bijvoorbeeld na een fusie): `update public.organisaties set emaildomeinen = emaildomeinen || array['tweededomein.nl'] where …;`

Toegestane waarden: `type` = `samenwerkingsverband-klein`, `samenwerkingsverband-groot`, `gemeente`, `verwerker`, `overig`; `status` = `aangevraagd`, `actief`, `opgezegd`, `verlopen`. `geldig_tot` leeg (`null`) betekent doorlopend. Publieke maildomeinen (gmail.com, outlook.com, ziggo.nl enzovoort) weigert de database, anders zou iedereen toegang krijgen.

**Via het dashboard**: Table Editor → tabel `organisaties` → rij toevoegen of bewerken, dezelfde velden. `emaildomeinen` is een lijst: vul in als `{voorbeeld.nl}`.

Domeinen altijd in kleine letters en zonder `@`. Controleer na activering met een medewerker van die organisatie: op `/account` moet "Actief" staan. Na activering ziet een al ingelogde gebruiker de ledenonderdelen na het vernieuwen van de pagina, of vanzelf binnen een uur (bij het verversen van het token).

## Wat er gebeurt bij verlopen lidmaatschap

- De database rekent zelf: zodra `geldig_tot` voorbij is, geeft `is_lid()` onwaar, ook als `status` nog op `actief` staat. Niemand hoeft op de einddatum iets te doen.
- In de browser: de status wordt gecontroleerd bij inloggen, bij het verversen van het token (ongeveer elk uur) en als het tabblad na meer dan 5 minuten weer actief wordt. Daarna verschijnt de betaalmuur weer.
- Op `/account` ziet de gebruiker vanaf 30 dagen voor het einde "Actief, loopt over N dagen af" met een knop **Verlenging regelen** (mail aan Niels). Na de einddatum: "Verlopen", met de datum en de uitleg dat het account blijft bestaan en dat na verlenging de toegang direct terug is.
- Bij verlopen of opgezegd lidmaatschap verwijdert het platform accounts **niet automatisch**: zo is de toegang na verlenging meteen terug. Vraagt een gebruiker zelf om verwijdering (de accountpagina en de privacyverklaring wijzen daarop), dan verwijdert Niels het account in het dashboard: Authentication → Users → het adres → Delete user. Verlengen = `geldig_tot` op een nieuwe datum zetten.
- Netjes houden (optioneel): `update public.organisaties set status = 'verlopen' where status = 'actief' and geldig_tot < current_date;`

## Nieuwe accounts alleen voor bekende domeinen (Auth-hook)

Zonder extra instelling kan iedereen via **Stuur mij een inloglink** een account aanmaken op elk e-mailadres; Supabase stuurt dan een mail. Dat geeft accounts die nooit toegang krijgen en is te misbruiken om mail naar willekeurige adressen te laten sturen. Daarom staat er een hookfunctie klaar: `public.hook_alleen_bekende_domeinen(event jsonb)`. Die laat een nieuw account alleen toe als het e-maildomein voorkomt in `organisaties` (elke status, dus ook `aangevraagd`), en weigert anders met de melding "Geen organisatie bekend voor dit e-maildomein." De site zet die om in: "Voor dit e-maildomein is geen organisatie aangemeld …" (test in `authFouten.test.ts` en `e2e/toegang.spec.ts`).

**Aanzetten (Niels, eenmalig):** Authentication → Hooks → Add hook → *Before User Created* → type *Postgres* → schema `public`, functie `hook_alleen_bekende_domeinen` → Create. Beschikbaar op het gratis plan (bron: https://supabase.com/docs/guides/auth/auth-hooks, geraadpleegd 26 oktober 2026). Controle daarna: op `/inloggen` een inloglink aanvragen voor een adres op een onbekend domein geeft de Nederlandse melding; een adres op `kplusv.nl` krijgt gewoon een mail.

Gevolgen: bestaande accounts blijven werken (de hook draait alleen bij aanmaken). Een organisatie moet in `organisaties` staan vóór haar medewerkers een account kunnen maken; dat gebeurt bij de aanmelding (status `aangevraagd`) of bij activering. Ook accounts die Niels zelf in het dashboard aanmaakt, gaan langs de hook. Getest op 26 oktober 2026 met `select public.hook_alleen_bekende_domeinen(...)`: `kplusv.nl` (ook in hoofdletters) toegestaan; `kplusv.nl.evil.com` en een leeg adres geweigerd; `anon` en `authenticated` mogen de functie niet uitvoeren, `supabase_auth_admin` wel. De hook is op 27 oktober 2026 nog niet aangezet; inloggen met het testaccount werkt (`/auth/v1/token` 200, `is_lid` waar).

CAPTCHA (Authentication → Attack Protection, bijvoorbeeld Cloudflare Turnstile) blijft een extra stap voor livegang; daarvoor moet de site een CAPTCHA-widget krijgen (nu niet gebouwd).

## Open aanbestedingen op de inlogpagina

Waarom: de inlogpagina was een inlogmuur. Sinds het besluit van Niels (27-10-2026) mogen bezoekers open aanbestedingen doorzoeken, dus de pagina laat dat meteen zien en is zonder account bruikbaar.

Wat bezoekers via de database kunnen opvragen (afgedwongen op de server, tabellen blijven dicht voor `anon`):

- `public.open_aanbestedingen_zoeken(p_zoek)`: alleen open aanbestedingen, vijf velden, maximaal 100 rijen (migratie `20261027190000_aanbestedingen_open_voor_bezoekers.sql`, van het onderdeel aanbestedingen).
- `public.aanbestedingen_openbare_stand()`: vier totalen, geen rijen (migratie `20261028090000_aanbestedingen_openbare_stand.sql`, dit onderdeel). "Open" gebruikt hetzelfde criterium als de functie hierboven, zodat het getal en de lijst kloppen met elkaar. Gecontroleerd op 28 oktober 2026 met alleen de publishable key: totaal 1.435, open 39, oudste 28 maart 2013, laatste verversing 28 oktober 2026 06:17.

Onderhoud: niets bijwerken. De cijfers volgen de dagelijkse verversing van het archief. Bron (TenderNed) en het tijdstip van de laatste verversing staan bij de lijst.

De prijsindicatie komt rechtstreeks uit `src/data/lidmaatschap.ts` (laagste staffel). Het label *Concept* verdwijnt vanzelf als `prijzenVastgesteld` op `true` gaat.

## Instellingen in het Supabase-dashboard

Gecontroleerd via `GET /auth/v1/settings` op 15, 19 en 20 oktober 2026: aanmelden staat aan (`disable_signup: false`) en e-mailbevestiging staat aan (`mailer_autoconfirm: false`). **Dat laatste moet zo blijven**: met automatische bevestiging kan iedereen een account maken op een domein van een lid-organisatie zonder toegang tot die mailbox.

Nog in te stellen door Niels (Authentication in het dashboard):

1. **URL Configuration → Site URL**: het productieadres op Netlify, naar verwachting `https://afvalverwerking-nl-prototype.netlify.app` (of het eigen domein zodra dat er is).
2. **URL Configuration → Redirect URLs**, toevoegen:
   - `https://afvalverwerking-nl-prototype.netlify.app/**`
   - `https://*--afvalverwerking-nl-prototype.netlify.app/**` (deploy previews en branch deploys)
   - `http://localhost:5173/**` en `http://localhost:4173/**` (lokaal ontwikkelen en preview)
   - later het eigen domein, bijvoorbeeld `https://www.<domein>.nl/**`

   De site stuurt in de inloglink `…/inloggen?terug=…` en in de herstellink `…/inloggen?stap=nieuw-wachtwoord` mee. Staat het adres niet in deze lijst, dan stuurt Supabase naar de Site URL. De site vangt de herstellink dan nog op (doorsturen naar het formulier), maar de gebruiker komt niet terug op de pagina waar hij was.
3. **Eigen SMTP (Authentication → Emails → SMTP Settings)**: verplicht voor gebruik. De ingebouwde mailserver van Supabase stuurt alleen naar e-mailadressen van leden van het Supabase-team en heeft een lage limiet per uur (bron: https://supabase.com/docs/guides/auth/auth-smtp, geraadpleegd 15 oktober 2026). Iedereen anders krijgt de melding "Het platform kan op dit moment geen e-mail sturen naar dit adres". Kies een dienst met servers in de EU (bijvoorbeeld de mailserver van KplusV of een transactionele maildienst), afzender bijvoorbeeld `ledenplatform@kplusv.nl`, en zet SPF/DKIM voor dat domein goed.
4. **Rate Limits**: na het instellen van eigen SMTP de limiet voor e-mails per uur verhogen naar een passend aantal (bijvoorbeeld 30).
5. **Emails → Templates**: de teksten in het Nederlands zetten voor *Confirm signup* (eerste inloglink van een nieuw adres), *Magic Link* en *Reset Password*. Voorstel onderwerpregels: "Uw inloglink voor het Ledenplatform Restafvalkaart", "Bevestig uw e-mailadres", "Nieuw wachtwoord instellen". Gebruik in de tekst `{{ .ConfirmationURL }}` en vermeld dat de link één uur geldig is en één keer werkt.
6. **Providers → Email**: *Confirm email* aan laten; *Secure email change* aan laten (een gewijzigd adres telt pas na bevestiging, zodat niemand zich via een adreswijziging in een organisatie kan praten). Minimale wachtwoordlengte op 10 zetten (gelijk aan `MIN_WACHTWOORD` in `authFouten.ts`).
7. **Leaked password protection** (advisor-waarschuwing): alleen beschikbaar op een betaald Supabase-plan. Zet aan zodra het project naar Pro gaat.

## Beveiliging en advisors

`get_advisors` (security), 15, 19, 20 en 26 oktober 2026 (zelfde uitkomst, ook na de hookfunctie; `get_advisors` performance op 20 oktober: geen meldingen):

- 28 oktober 2026, na `aanbestedingen_openbare_stand()`: `anon_security_definer_function_executable` en `authenticated_security_definer_function_executable` voor `aanbestedingen_openbare_stand()` en `open_aanbestedingen_zoeken()`: **bewust zo**, bezoekers moeten ze kunnen aanroepen; ze geven alleen totalen of open aanbestedingen met vijf velden.
- `authenticated_security_definer_function_executable` voor `is_lid()` en `mijn_domein()`: **bewust zo**. Ingelogde gebruikers moeten deze functies kunnen aanroepen; ze geven alleen informatie over de gebruiker zelf (eigen domein, eigen lidmaatschap). `mijn_domein()` moet SECURITY DEFINER zijn omdat het `auth.users` leest. Bezoekers zonder sessie (`anon`) kunnen ze niet aanroepen.
- `auth_leaked_password_protection`: zie punt 7 hierboven.

Gecontroleerd op 19 oktober 2026:

- Zonder sessie (alleen de publishable key) geven `rpc/is_lid`, `rpc/mijn_lidmaatschap` en `rpc/mijn_domein` "permission denied" (42501) en geeft `organisaties` een lege lijst (RLS).
- In een transactie die is teruggedraaid: `geldig_tot` van de testorganisatie op gisteren gezet; voor het testaccount gaf `is_lid()` daarna `false` en `mijn_lidmaatschap()` de effectieve status `verlopen`. De echte rij is niet gewijzigd.
- RLS staat aan op alle tabellen in `public` (nu alleen `organisaties`).

Gecontroleerd op 20 oktober 2026, met een tijdelijke gebruiker in een transactie die is teruggedraaid (er is niets blijvend aangemaakt):

| Situatie | `is_lid()` |
|---|---|
| Adres op `kplusv.nl`, e-mail nog niet bevestigd | onwaar (ziet ook geen organisatie via RLS) |
| Zelfde adres, e-mail bevestigd | waar |
| Adres op een lijkend domein (`kplusv.nl.evil.com`) | onwaar |

Subdomeinen tellen niet automatisch mee: `naam@mail.voorbeeld.nl` is geen lid via `voorbeeld.nl`. Voeg zo'n subdomein zo nodig apart toe aan `emaildomeinen`.

De bestandsnaam van de eerste migratie (`20261014203636_kern_organisaties_en_lidmaatschap.sql`) komt overeen met de versie in de database.

Let op: de betaalmuur in de browser bepaalt wat er in beeld komt. Het aanbestedingsarchief staat in Supabase met RLS `using (public.is_lid())`. De Pro-delen van de rekentools zitten wel in de JavaScript-bundel (rekenen in de browser met openbare bronnen); wie de bundel leest, kan ze dus zien. Nieuwe echte ledendata hoort in Supabase achter `is_lid()`.

Testorganisatie: de rij voor `kplusv.nl` heette "KplusV (eigen organisatie, beheer en test)" en die naam stond zichtbaar op `/account`. Op 26 oktober 2026 hernoemd naar "KplusV" (alleen de naam; type `overig`, status `actief`, geldig tot leeg).

Browseropslag na inloggen met het testaccount (27 oktober 2026, gecontroleerd in de browser): alleen `localStorage`-sleutel `sb-mnwynrioozcqqvhelqku-auth-token`; geen `sessionStorage`, geen cookies.

## Onderhoud

- Nieuwe foutcode van Supabase: toevoegen in `authFoutmelding()` (`src/lib/authFouten.ts`) met een test in `authFouten.test.ts`.
- Wat op de inlogpagina en het dashboard staat: `src/lib/authAanbod.ts` (volgt `src/data/tools.ts`); de live gegevens voor bezoekers in `src/lib/authOpen.ts`.
- Teksten per status: `beschrijfLidmaatschap()` in `src/lib/authStatus.ts` (met tests in `authStatus.test.ts`). De waarschuwingstermijn staat in `WAARSCHUW_DAGEN` (30).
- Wachtwoordlengte: `MIN_WACHTWOORD` in `authFouten.ts`, en dezelfde waarde in het dashboard.
- Testen: `npx vitest run src/lib/auth*` en de end-to-end test `e2e/toegang.spec.ts`. Voor de inlogtests zijn `E2E_EMAIL` en `E2E_WACHTWOORD` nodig (testaccount op een actief domein; het wachtwoord staat niet in de repository). E-mails worden in de test niet echt verstuurd: de aanroepen naar `/auth/v1/otp` en `/auth/v1/recover` worden onderschept. De situatie "ingelogd maar geen lid" en "verlopen" wordt nagebootst door de antwoorden van `is_lid` en `mijn_lidmaatschap` te onderscheppen.

## Open punten

1. Eigen SMTP, Site URL, Redirect URLs, Nederlandse mailteksten en minimale wachtwoordlengte instellen (zie hierboven). Zonder eigen SMTP werkt alleen inloggen met wachtwoord voor accounts die al bestaan.
2. Auth-hook *Before User Created* aanzetten (zie hierboven) en bij livegang CAPTCHA overwegen.
3. Echte ledendata achter RLS op `is_lid()`. Het aanbestedingsarchief doet dat al; de Pro-delen van de rekentools zitten nog in de JavaScript-bundel (rekenen in de browser, geen geheime data).
4. Koppeling met de aanmeldflow: na een aanmelding een rij in `organisaties` met status `aangevraagd`, zodat medewerkers op `/account` "Aangevraagd, nog niet actief" zien en (met de hook aan) een account kunnen maken. Hoort bij lidmaatschap/aanmelden.
5. Beheerscherm voor Niels (organisaties activeren zonder SQL) is nog niet gebouwd; nu via SQL of Table Editor.
6. Organisaties met medewerkers op een gedeeld of publiek maildomein kunnen niet via het domein worden herkend. Daarvoor is later een lijst met losse e-mailadressen per organisatie nodig.
7. Niet van dit onderdeel, wel nodig:
   - `zoek_aanbestedingen`/`aanbestedingen_zoeken` wordt ook op `/account` aangeroepen (drie regels, alleen voor leden). De beschrijving in `supabaseGebruik` (`src/pages/juridisch/gegevens.ts`) noemt alleen het archief.
   - Het archief heeft geen eigen pagina per aanbesteding. Met een route als `/aanbestedingsarchief/<kenmerk>` kan het dashboard naast "Bekijk op TenderNed" ook naar de tijdlijn in het archief linken.
   - Opgelost sinds ronde 2 (door anderen): ongebruikte rolschakelaar-stijl, de verouderde zin in `Cookies.tsx`, de naam van het eerste migratiebestand, de bètamelding als `<aside>`, en de terugval van Suspense.
8. `/inloggen` en de rest van de site staan op `noindex` (`index.html`, bètafase). Daardoor scoort Lighthouse SEO 66; bij livegang weghalen zodat de openbare zoekfunctie vindbaar wordt.
9. De openbare zoekfunctie zoekt alleen in titel en opdrachtgever en kent geen filter op afvalstroom (de functie geeft die kolom bewust niet terug). Een filter op afvalstroom voor bezoekers vraagt een productbesluit en een aanpassing van `open_aanbestedingen_zoeken` (onderdeel aanbestedingen).
