# Toegang: inloggen, account en betaalmuur

Stand: 19 oktober 2026 (ronde 1, gecontroleerd en aangevuld). Supabase-project `afvalverwerking-nl`, ref `mnwynrioozcqqvhelqku`.

## Wat er gebouwd is

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Sessiestatus | `src/lib/auth.tsx` | `AuthProvider` en `useAuth()`: sessie uit Supabase Auth, `isLid` uit `rpc('is_lid')`, organisatie en status uit `rpc('mijn_lidmaatschap')`. Controleert opnieuw na inloggen, na een ververst token en als het tabblad na meer dan 5 minuten weer actief wordt. |
| Compatibele hook | `src/components/betaalmuur/RolContext.tsx` | `useRol()` geeft nog steeds `{ isLid }` (plus `rol` en `laden`), zodat andere onderdelen niets hoeven te veranderen. De demo-schakelaar "Bekijk als" is weg. |
| Foutmeldingen | `src/lib/authFouten.ts` | Supabase-foutcodes naar gewoon Nederlands; de Engelse tekst komt nooit in beeld. Ook: controle op e-mailadres, veilig terugpad na inloggen (alleen paden binnen de site), controle nieuw wachtwoord (minimaal 10 tekens). |
| Status in woorden | `src/lib/authStatus.ts` | Zet de lidmaatschapsrij om in label, uitleg en "geldig tot" (actief, loopt binnen 30 dagen af, verlopen, aangevraagd, opgezegd, geen organisatie). |
| `/inloggen` | `src/pages/Inloggen.tsx` | E-mail + wachtwoord, inloglink per e-mail (magic link, ook voor de eerste keer), wachtwoord vergeten, nieuw wachtwoord instellen na de herstellink, melding bij verlopen links, "opnieuw versturen" pas na 60 seconden. Na inloggen terug naar de pagina waar de gebruiker vandaan kwam (`?terug=`). |
| `/account` | `src/pages/Account.tsx` | Organisatie, soort organisatie, status, geldig tot, e-maildomein, uitleg per status, wachtwoord instellen of wijzigen, uitloggen, verwijzing naar privacyverklaring en hoe u verwijdering of inzage aanvraagt. Zonder sessie door naar `/inloggen?terug=/account`. |
| Accountknop | `src/components/betaalmuur/AccountKnop.tsx` | Rechts in de navbar: "Inloggen" of "Mijn account" met de status als tekst ("Lid" / "Geen lid"). |
| Betaalmuur | `src/components/betaalmuur/Vergrendeld.tsx` | Leden zien de inhoud. Bezoekers: uitleg, wat leden krijgen, knoppen **Inloggen** en **Lid worden**. Ingelogde niet-leden: met welk adres ze zijn ingelogd, waarom ze geen toegang hebben (geen organisatie, verlopen, aangevraagd, opgezegd) en knoppen **Lid worden** en **Inloggen met ander adres**. Tijdens het controleren: "Ledentoegang controleren…" (geen knipperende slotkaart). |
| Stijl | `src/components/betaalmuur/toegang.css` | Alleen tokens uit `tokens.css`. Status heeft altijd tekst en een teken (✓, !, –), nooit alleen kleur. |
| Database | `supabase/migrations/20261014204324_is_lid_niet_voor_anon.sql`, `20261014205119_mijn_lidmaatschap.sql` | `is_lid()` niet voor bezoekers zonder sessie; `mijn_lidmaatschap()` (SECURITY INVOKER, valt onder de RLS-policy op `organisaties`). Beide staan in de database (gecontroleerd met `list_migrations`). |

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
- Accounts worden niet verwijderd. Verlengen = `geldig_tot` op een nieuwe datum zetten.
- Netjes houden (optioneel): `update public.organisaties set status = 'verlopen' where status = 'actief' and geldig_tot < current_date;`

## Instellingen in het Supabase-dashboard

Gecontroleerd via `GET /auth/v1/settings` op 15 en opnieuw op 19 oktober 2026: aanmelden staat aan (`disable_signup: false`) en e-mailbevestiging staat aan (`mailer_autoconfirm: false`). **Dat laatste moet zo blijven**: met automatische bevestiging kan iedereen een account maken op een domein van een lid-organisatie zonder toegang tot die mailbox.

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

`get_advisors` (security), 15 oktober 2026 en opnieuw 19 oktober 2026 (zelfde uitkomst):

- `authenticated_security_definer_function_executable` voor `is_lid()` en `mijn_domein()`: **bewust zo**. Ingelogde gebruikers moeten deze functies kunnen aanroepen; ze geven alleen informatie over de gebruiker zelf (eigen domein, eigen lidmaatschap). `mijn_domein()` moet SECURITY DEFINER zijn omdat het `auth.users` leest. Bezoekers zonder sessie (`anon`) kunnen ze niet aanroepen.
- `auth_leaked_password_protection`: zie punt 7 hierboven.

Gecontroleerd op 19 oktober 2026:

- Zonder sessie (alleen de publishable key) geven `rpc/is_lid`, `rpc/mijn_lidmaatschap` en `rpc/mijn_domein` "permission denied" (42501) en geeft `organisaties` een lege lijst (RLS).
- In een transactie die is teruggedraaid: `geldig_tot` van de testorganisatie op gisteren gezet; voor het testaccount gaf `is_lid()` daarna `false` en `mijn_lidmaatschap()` de effectieve status `verlopen`. De echte rij is niet gewijzigd.
- RLS staat aan op alle tabellen in `public` (nu alleen `organisaties`).

Let op voor de lead: het bestand `20261014_kern_organisaties_en_lidmaatschap.sql` heeft een andere versie in de naam dan de migratie in de database (`20261014203636`). Wie later `supabase db push` gebruikt, moet dat bestand hernoemen naar `20261014203636_kern_organisaties_en_lidmaatschap.sql`, anders probeert de CLI het opnieuw toe te passen.

Let op: de betaalmuur in de browser bepaalt wat er in beeld komt. De inhoud achter de muur zit nu nog in de JavaScript-bundel (het is voorbeelddata). Zodra er echte ledendata komt (aanbestedingsarchief, rapporten), moet die in Supabase staan met RLS `using (public.is_lid())`, zodat niet-leden de data ook via de API niet kunnen ophalen.

## Onderhoud

- Nieuwe foutcode van Supabase: toevoegen in `authFoutmelding()` (`src/lib/authFouten.ts`) met een test in `authFouten.test.ts`.
- Teksten per status: `beschrijfLidmaatschap()` in `src/lib/authStatus.ts` (met tests in `authStatus.test.ts`). De waarschuwingstermijn staat in `WAARSCHUW_DAGEN` (30).
- Wachtwoordlengte: `MIN_WACHTWOORD` in `authFouten.ts`, en dezelfde waarde in het dashboard.
- Testen: `npx vitest run src/lib/auth*` en de end-to-end test `e2e/toegang.spec.ts`. Voor de inlogtests zijn `E2E_EMAIL` en `E2E_WACHTWOORD` nodig (testaccount op een actief domein; het wachtwoord staat niet in de repository). E-mails worden in de test niet echt verstuurd: de aanroepen naar `/auth/v1/otp` en `/auth/v1/recover` worden onderschept. De situatie "ingelogd maar geen lid" en "verlopen" wordt nagebootst door de antwoorden van `is_lid` en `mijn_lidmaatschap` te onderscheppen.

## Open punten

1. Eigen SMTP, Site URL, Redirect URLs en Nederlandse mailteksten instellen (zie hierboven). Zonder eigen SMTP werkt alleen inloggen met wachtwoord voor accounts die al bestaan.
2. Echte ledendata achter RLS op `is_lid()` (zie Beveiliging).
3. Koppeling met de aanmeldflow: na een aanmelding een rij in `organisaties` met status `aangevraagd`, zodat medewerkers op `/account` "Aangevraagd, nog niet actief" zien. Dat hoort bij het onderdeel lidmaatschap/aanmelden.
4. Beheerscherm voor Niels (organisaties activeren zonder SQL) is nog niet gebouwd; nu via SQL of Table Editor.
5. Misbruik van "Stuur mij een inloglink" (veel mails naar willekeurige adressen) wordt alleen begrensd door de rate limits van Supabase. Overweeg CAPTCHA (Authentication → Attack Protection) bij livegang.
6. Organisaties met medewerkers op een gedeeld of publiek maildomein kunnen niet via het domein worden herkend. Daarvoor is later een lijst met losse e-mailadressen per organisatie nodig.
