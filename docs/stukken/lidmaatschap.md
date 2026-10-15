# Lidmaatschap en prijzen (ronde 1)

Stand: 15 oktober 2026. Prijzen en voorwaarden zijn **concept** tot Niels ze vaststelt.

## Wat er gebouwd is

### `/lidmaatschap`: Lidmaatschap en prijzen
- Inhoudsopgave “Op deze pagina” met ankers.
- Vier staffels **per organisatie, niet per gebruiker**: samenwerkingsverband klein (2–3 gemeenten), samenwerkingsverband groot (4 of meer), gemeente, verwerker. Elke kaart toont de jaarprijs excl. btw, de prijs incl. 21 % btw en een knop die het aanmeldformulier opent met het type al gekozen (`?staffel=…`).
- Prijstabel met excl. btw, btw-bedrag en incl. btw, met bronregel (Belastingdienst, peildatum).
- Wat is inbegrepen, looptijd/verlenging/opzegging/betaling/prijswijziging/proeftoegang in het kort (met bron voor de betaaltermijn), link naar de algemene voorwaarden.
- Vergelijkingstabel gratis versus lid; de betekenis staat in tekst (“Ja”, “Nee”, of een omschrijving), het vinkje is alleen versiering.
- Stappenplan aanmelden → orderbevestiging → toegang → factuur, met knoppen naar het formulier en “Offerte aanvragen per e-mail”.
- Veelgestelde vragen (offerte en inkoopordernummer, e-factuur, aantal gebruikers, proefperiode, looptijd en opzeggen, factuurmoment, prijswijziging, maatwerk) als uitklapblokken.
- Bronnenlijst met alle externe gegevens, URL en peildatum.

### `/lidmaatschap/aanmelden`: aanmelden op factuur
Drie stappen met stappenindicator:
1. **Gegevens**: organisatienaam, type (keuzerondjes), aantal gemeenten (alleen bij samenwerkingsverband), KVK-nummer, btw-id (optioneel voor overheden, verplicht voor verwerkers), OIN (optioneel), factuuradres/postcode/plaats, t.a.v. (optioneel), e-mailadres crediteurenadministratie, factuurvorm (pdf of e-factuur via Peppol, dan Peppol-ID of OIN), inkoopordernummer (optioneel), contactpersoon (naam, functie, e-mail, telefoon), e-maildomeinen voor toegang (met knop “@domein van de contactpersoon toevoegen”), gewenste startdatum (vandaag tot 6 maanden vooruit, standaard de eerste van de volgende maand), opmerkingen. Ernaast (op mobiel eronder) een prijsblok dat meerekent.
2. **Controleren en verzenden**: prijs en looptijd (staffel, excl./btw/incl., eerste contractjaar, factuurdatum en vervaldatum, uiterste opzegdatum, verlengd tot), alle gegevens met “Gegevens wijzigen”, akkoord met algemene voorwaarden (inclusief bevoegdheid) en privacyverklaring via links die in een nieuw tabblad openen.
3. **Bevestiging**: ordernummer (`LID-jjjjmmdd-XXXXX`), prijs en looptijd, “Wat er nu gebeurt” (bevestiging binnen 2 werkdagen, toegang vanaf startdatum, factuur met inkoopordernummer en vervaldatum, opzeggen), samenvatting, afdrukknop.

Validatie: foutsamenvatting bovenaan (krijgt focus, links springen naar het veld), foutmelding per veld via `aria-describedby`, `aria-invalid`. Controles: KVK 8 cijfers, btw-id `NL` + 9 cijfers + `B` + 2 cijfers, OIN 20 cijfers, postcode, e-mail, telefoon, Peppol-ID `0000:nummer`, domeinen (geen openbare maildomeinen zoals gmail.com, dezelfde lijst als de check in Supabase-tabel `organisaties`), startdatum.

Een concept van het formulier blijft bewaard in `sessionStorage` (`afvalplatform-aanmelding-concept`), zodat het niet verloren gaat als iemand de voorwaarden opent. Lukt opslaan niet, dan werkt het formulier gewoon.

### Verzenden
- Netlify Forms, formulier **`aanmelding`**, POST naar `/` als `application/x-www-form-urlencoded`, honeypot `bot-field`. De verborgen statische kopie staat in `index.html`; een Vitest-test controleert dat de velden daarin gelijk zijn aan `aanmeldVelden` in `src/data/lidmaatschap.ts`.
- Meegestuurd worden ook de berekende velden: `ordernummer`, `staffel`, `einddatum`, `prijs_excl_btw`, `btw`, `prijs_incl_btw`.
- Mislukt verzenden (lokaal, of serverfout), dan: duidelijke melding dat de aanmelding **niet** is verzonden, bewaren in `localStorage` onder `afvalplatform-aanmelding`, een knop “Aanmelding per e-mail sturen” (mailto met alle gegevens) en “Opnieuw proberen”.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `src/data/lidmaatschap.ts` | Staffels en prijzen (met onderbouwing per staffel), voorwaarden, organisatietypen, inbegrepen, vergelijking, FAQ, bronnen, veldnamen formulier |
| `src/lib/prijs.ts` (+ `prijs.test.ts`) | Pure functies: staffel bepalen, btw, looptijd en datums, startdatum controleren, ordernummer |
| `src/components/lidmaatschap/aanmelding.ts` (+ test) | Formuliergegevens, controles, opschonen, Netlify-codering |
| `src/components/lidmaatschap/Velden.tsx` | Toegankelijke formuliervelden |
| `src/components/lidmaatschap/onderdelen.tsx` | Staffelkaarten, prijstabel, voorwaarden, vergelijking, FAQ, bronnen, prijsregels |
| `src/components/lidmaatschap/lidmaatschap.css` | Opmaak, alleen tokens |
| `src/pages/Lidmaatschap.tsx`, `src/pages/Aanmelden.tsx` | De twee pagina’s |
| `src/pages/Over.tsx` | Verdienmodel toont nu de conceptstaffels; rekenvoorbeeld als aanname gelabeld |
| `index.html` | Verborgen kopie formulier `aanmelding` |
| `e2e/lidmaatschap.spec.ts` | End-to-end: prijzenpagina, foutmeldingen, volledige aanmelding met controle van de verzonden velden, terugval bij mislukt verzenden; op 400 px en 1280 px |

## Onderhoud

- **Prijs wijzigen:** alleen `prijsExclBtw` in `staffels` (`src/data/lidmaatschap.ts`). Pas `onderbouwing` en het commentaarblok “Keuze per staffel” aan.
- **Prijzen vaststellen:** zet `prijzenVastgesteld` op `true`. Het conceptlabel en de conceptzinnen verdwijnen dan overal.
- **Voorwaarden** (looptijd, opzegtermijn, betaaltermijn, proefdagen, maximale startdatum): object `voorwaarden`. Pagina’s, berekening en bevestiging volgen vanzelf. Houd de algemene voorwaarden gelijk.
- **Btw-tarief:** `btwPercentage`; werk dan ook `bronnen.btw.peildatum` bij.
- **Bronnen:** controleer de links in `bronnen` jaarlijks en zet de nieuwe peildatum. De Europese drempelbedragen wijzigen per 1 januari 2028.
- **Formulierveld toevoegen:** in `AanmeldGegevens` en `formulierVelden` (`aanmelding.ts`), in `aanmeldVelden` (`lidmaatschap.ts`) én in de verborgen kopie in `index.html`. De test faalt als die drie uit de pas lopen.
- **Aanmeldingen terugvinden:** Netlify → Forms → `aanmelding` (export als CSV). Zet een e-mailmelding aan onder Notifications.
- **Na een aanmelding (handmatig, KplusV):** orderbevestiging sturen binnen 2 werkdagen, in Supabase een rij in `public.organisaties` aanmaken met `type` = `staffel`, `emaildomeinen` = `toegang`, `status` = `actief`, `geldig_tot` = `einddatum`; factuur op de startdatum.

## Bronnen (gecontroleerd)

| Gegeven | Bron | Peildatum |
|---|---|---|
| Btw 21 % | https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/ | 14-10-2026 |
| Betaaltermijn overheid 30 dagen, max. 60 bij uitdrukkelijke afspraak (BW 6:119b lid 2 en 5) | https://wetten.overheid.nl/jci1.3:c:BWBR0005289&boek=6&titeldeel=1&afdeling=11&artikel=119b | 15-10-2026 |
| EU-drempel diensten decentrale overheid € 216.000 (2026–2027) | https://www.pianoo.nl/nl/regelgeving/drempelbedragen-europees-aanbesteden | 14-10-2026 |
| OIN 20 posities | https://gitdocumentatie.logius.nl/publicatie/dk/oin/2.2.2/ | 14-10-2026 |
| E-factureren via Peppol | https://www.logius.nl/onze-dienstverlening/gegevensuitwisseling/e-factureren | 14-10-2026 |
| KVK-nummer acht cijfers, overheid in Handelsregister | https://www.kvk.nl/over-het-handelsregister/kvk-nummer-alles-wat-je-moet-weten/ | 15-10-2026 |
| Btw-id NL + 9 cijfers + B + 2 cijfers | https://ondernemersplein.overheid.nl/geldzaken-en-belastingen/omzetbelasting-btw/nummers-voor-de-btw/ | 15-10-2026 |

Correctie ten opzichte van de vorige ronde: de betaaltermijn verwees naar “art. 6:119ab BW”; dat artikel bestaat niet. De regel staat in art. 6:119b.

## Open punten

1. **Prijzen vaststellen (Niels).** Gemeente € 1.500 is een aanname zonder richtprijs; de andere staffels zijn het midden van de oude bandbreedtes.
2. **Proeftoegang van 30 dagen** en **bevestiging binnen 2 werkdagen** zijn interne afspraken in concept.
3. **E-factuur via Peppol** is nog niet ingericht bij KplusV; het formulier zegt dat KplusV bevestigt of het kan.
4. **Algemene voorwaarden en privacyverklaring** (andere bouwer) moeten dezelfde looptijd, verlenging, opzegtermijn, betaaltermijn en prijswijzigingsregel bevatten als `voorwaarden`, en de verwerking van aanmeldgegevens (Netlify Forms, bewaartermijn) noemen.
5. **Vergelijkingstabel**: de teksten per tool (“Eén jaar”, “Meerdere installaties” enz.) moeten kloppen met wat de toolbouwers uiteindelijk vrij en betaald maken.
6. **Automatisch lidmaatschap activeren** gebeurt nog handmatig in Supabase. Een volgende stap is een Netlify-functie of Supabase-edge-functie die de inzending als `status = 'aangevraagd'` in `organisaties` zet.
7. Netlify Forms vangt inzendingen alleen op na een deploy met form detection aan; testen kan pas na de eerste deploy.
