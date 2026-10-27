# Lidmaatschap en prijzen

Stand: 27 oktober 2026 (ronde 2). Prijzen en voorwaarden zijn **concept** tot Niels ze vaststelt.

## Wat er in ronde 2 veranderd is

Naar aanleiding van de inspectie en het blinde oordeel van ronde 1 (aanmeldpagina verloor van de MVI-criteriatool; prijspagina op mobiel te lang):

- **Aanmelden: prijs direct bij de typekeuze.** Elk keuzerondje voor het type organisatie toont de jaarprijs. Het prijsblok staat in de HTML vóór het formulier: op brede schermen rechts, meescrollend; tot 900 px breed een compacte balk die bovenaan in beeld blijft zolang het formulier in beeld is (velden krijgen `scroll-margin-top`, zodat een veld met focus niet achter de balk valt).
- **Prijsblok rekent eerlijker:** nieuwe pure functie `prijsStand()` in `aanmelding.ts`. Samenwerkingsverband zonder aantal: beide prijzen. Aantal `2.5`, `1`, `abc`: melding over het aantal (eerder stond er ten onrechte “Kies een geldige startdatum”). Een ongeldige startdatum verbergt alleen de looptijd, niet de prijs.
- **Formulier korter:** alleen de verplichte velden staan open, in drie blokken (Organisatie, Factuur, Contactpersoon en toegang), plus het optionele inkoopordernummer. Btw-nummer (voor overheden), OIN, factuur t.a.v., e-factuur/Peppol, functie, telefoon en opmerkingen staan in een ingeklapt blok **Aanvullende gegevens (optioneel)**. Dat klapt vanzelf open als er al iets in staat of als er een fout in zit. Voor een verwerker is het btw-nummer verplicht en staat het bij Organisatie. Telefoon staat niet meer half naast e-mail; postcode en plaats staan op één lijn.
- **Eén banner minder** op de aanmeldpagina: het conceptlabel staat alleen nog in het prijsblok (de bètabalk van de lead blijft).
- **Mailto-terugval met lengtegrens:** `mailtoMetVelden()` kort lange opmerkingen in tot de link onder 1.900 tekens blijft en de pagina zegt dat er is ingekort. De grens is een praktische aanname (sommige mailprogramma's kappen rond 2.000 tekens af), geen norm.
- **Prijspagina korter op mobiel** (≈ 8.400 → 5.600 px op 400 px): staffelkaarten compact (naam links, prijs rechts), prijstabel alleen vanaf 601 px (de kaarten tonen dezelfde bedragen), vergelijkingstabel en bronnenlijst inklapbaar (dicht op smal, open op breed) met een kernzin erboven die uit `src/data/tools.ts` wordt afgeleid, “Zo meldt u aan” direct na de prijzen.
- **Gemeenteprijs zichtbaar als aanname** (veld `aanname` in de staffel): label “Aanname” op de kaart, “(aanname)” in tabel, prijsblok en Over het platform.
- **Btw-uitzondering (artikel 6.7 AV)** staat nu bij Looptijd en opzeggen en in de vraag “Kan de prijs veranderen?”.
- **Veelgestelde vragen uitgebreid:** eigen inkoopvoorwaarden (AV 2.3), wie mag aanmelden/mandaat (AV 3.2), verwerkersovereenkomst (AV 12, privacyverklaring). Vragen kunnen nu een bron, links naar het artikel en een kant-en-klare e-mail hebben. De drempelbron staat direct onder het antwoord waarin de drempel genoemd wordt.
- **E-mail per actie:** opzeggen, proeftoegang aanvragen en maatwerk hebben een mailto met onderwerp en invulsjabloon.

## Wat er gebouwd is

### `/lidmaatschap`: Lidmaatschap en prijzen
- Inhoudsopgave “Op deze pagina” met ankers.
- Vier staffels **per organisatie, niet per gebruiker**: samenwerkingsverband klein (2–3 gemeenten), samenwerkingsverband groot (4 of meer), gemeente, verwerker. Elke kaart toont de jaarprijs excl. btw, de prijs incl. 21 % btw en een knop die het aanmeldformulier opent met het type al gekozen (`?staffel=…`).
- Prijstabel met excl. btw, btw-bedrag en incl. btw, met bronregel (Belastingdienst, peildatum).
- Wat is inbegrepen, looptijd/verlenging/opzegging/betaling/prijswijziging/proeftoegang in het kort (met bron voor de betaaltermijn), link naar de algemene voorwaarden.
- Vergelijkingstabel gratis versus lid; de betekenis staat in tekst (“Ja”, “Nee”, of een omschrijving), het vinkje is alleen versiering. De rijen per rekentool komen rechtstreeks uit `src/data/tools.ts` (`toegang`, `gratisDeel`, `proDeel`), zodat de tabel niet uit de pas loopt met wat de tools zelf vrij en betaald maken.
- Prijstabel en vergelijkingstabel worden tot 600 px breed per rij gestapeld (kolomnaam vóór elke waarde). Zo valt op 400 px de kolom “Incl. btw” of “Lid” niet meer weg achter een horizontale scrollbalk.
- Stappenplan aanmelden → orderbevestiging → toegang → factuur, met knoppen naar het formulier en “Eerst een offerte aanvragen” (opent hetzelfde formulier met `?soort=offerte`).
- Veelgestelde vragen (offerte en inkoopordernummer, e-factuur, aantal gebruikers, proefperiode, looptijd en opzeggen, factuurmoment, prijswijziging, maatwerk) als uitklapblokken.
- Bronnenlijst met alle externe gegevens, URL en peildatum.
- Onderaan een link “Naar boven” naar de inhoudsopgave (zoals op PIANOo).

### `/lidmaatschap/aanmelden`: aanmelden op factuur of eerst een offerte
Kruimelpad Home › Lidmaatschap en prijzen › Aanmelden. Bovenaan de keuze **Wat wilt u doen?**: *Lid worden* of *Eerst een offerte ontvangen* (voor gemeenten die eerst een offerte in hun inkoopsysteem zetten en dan pas een inkoopordernummer krijgen). Bij een offerte:
- zijn de toegangsdomeinen nog optioneel (ingevulde domeinen worden wel gecontroleerd);
- is akkoord met de algemene voorwaarden nog niet nodig, alleen de privacyverklaring; Netlify krijgt `akkoord_voorwaarden = nvt (offerte)`;
- krijgt de aanvraag een referentienummer `OFF-jjjjmmdd-XXXXX`, en de bevestiging zegt: offerte als pdf binnen 2 werkdagen, 30 dagen geldig, geen factuur zonder akkoord;
- blijven de gegevens in `sessionStorage` staan, zodat “meld u aan via het aanmeldformulier” een ingevuld formulier opent.

Drie stappen met stappenindicator:
1. **Gegevens**: type organisatie (met prijs per keuze), aantal gemeenten (alleen bij samenwerkingsverband), organisatienaam, KVK-nummer, btw-id (verplicht voor verwerkers); factuuradres/postcode/plaats, e-mailadres crediteurenadministratie, inkoopordernummer (optioneel); contactpersoon (naam, e-mail), e-maildomeinen voor toegang (met knop “@domein van de contactpersoon toevoegen”), gewenste startdatum (vandaag tot 6 maanden vooruit, standaard de eerste van de volgende maand). Ingeklapt onder **Aanvullende gegevens (optioneel)**: btw-id voor overheden, OIN, t.a.v., factuurvorm (pdf of e-factuur via Peppol, dan Peppol-ID of OIN), functie, telefoon, opmerkingen. Het prijsblok rekent mee (breed: ernaast; smal: vaste balk bovenaan).
2. **Controleren en verzenden**: prijs en looptijd (staffel, excl./btw/incl., eerste contractjaar, factuurdatum en vervaldatum, uiterste opzegdatum, verlengd tot), alle gegevens met “Gegevens wijzigen”, akkoord met algemene voorwaarden (inclusief bevoegdheid) en privacyverklaring via links die in een nieuw tabblad openen.
3. **Bevestiging**: ordernummer (`LID-jjjjmmdd-XXXXX`), met de zin dat het lidmaatschap rond is zodra KplusV de orderbevestiging mailt (gelijk aan artikel 3 van de algemene voorwaarden), prijs en looptijd, “Wat er nu gebeurt” (bevestiging binnen 2 werkdagen, toegang vanaf startdatum, factuur met inkoopordernummer en vervaldatum, opzeggen), samenvatting, afdrukknop.

Validatie: foutsamenvatting bovenaan (krijgt focus, links springen naar het veld), foutmelding per veld via `aria-describedby`, `aria-invalid`. Controles: KVK 8 cijfers, btw-id `NL` + 9 cijfers + `B` + 2 cijfers, OIN 20 cijfers, postcode, e-mail, telefoon, Peppol-ID `0000:nummer`, domeinen (geen openbare maildomeinen zoals gmail.com, dezelfde lijst als de check in Supabase-tabel `organisaties`), startdatum.

Een concept van het formulier blijft bewaard in `sessionStorage` (`afvalplatform-aanmelding-concept`), zodat het niet verloren gaat als iemand de voorwaarden opent. Lukt opslaan niet, dan werkt het formulier gewoon.

### Verzenden
- Netlify Forms, formulier **`aanmelding`**, POST naar `/` als `application/x-www-form-urlencoded`, honeypot `bot-field`. De verborgen statische kopie staat in `index.html`; een Vitest-test controleert dat de velden daarin gelijk zijn aan `aanmeldVelden` in `src/data/lidmaatschap.ts`.
- Veld `soort` (`aanmelding` of `offerte`) staat vooraan, zodat aanmeldingen en offerteaanvragen in Netlify te filteren zijn.
- Meegestuurd worden ook de berekende velden: `ordernummer`, `staffel`, `einddatum`, `prijs_excl_btw`, `btw`, `prijs_incl_btw`.
- Mislukt verzenden (lokaal, of serverfout), dan: duidelijke melding dat de aanmelding **niet** is verzonden, bewaren in `localStorage` onder `afvalplatform-aanmelding`, een knop “Aanmelding per e-mail sturen” (mailto met alle gegevens) en “Opnieuw proberen”.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `src/data/lidmaatschap.ts` | Staffels en prijzen (met onderbouwing per staffel), voorwaarden, organisatietypen, inbegrepen, vergelijking, FAQ, bronnen, veldnamen formulier |
| `src/lib/prijs.ts` (+ `prijs.test.ts`) | Pure functies: staffel bepalen, btw, looptijd en datums, startdatum controleren, ordernummer |
| `src/components/lidmaatschap/aanmelding.ts` (+ test) | Formuliergegevens, controles, opschonen, Netlify-codering, `prijsStand` (prijsblok tijdens invullen), `aanvullendeVelden`, `mailtoMetVelden` |
| `src/components/lidmaatschap/vergelijking.test.ts` | Controleert dat de vergelijking gratis/lid voor elke rekentool gelijk is aan `src/data/tools.ts` |
| `src/components/lidmaatschap/Velden.tsx` | Toegankelijke formuliervelden |
| `src/components/lidmaatschap/onderdelen.tsx` | Staffelkaarten, prijstabel, voorwaarden, vergelijking, FAQ (met bron, links en e-mail per vraag), bronnen, prijsregels, `Uitklap` |
| `src/components/lidmaatschap/lidmaatschap.css` | Opmaak, alleen tokens |
| `src/pages/Lidmaatschap.tsx`, `src/pages/Aanmelden.tsx` | De twee pagina’s |
| `src/pages/Over.tsx` | Verdienmodel toont de conceptstaffels; gemeenteprijs en rekenvoorbeeld als aanname gelabeld |
| `index.html` | Verborgen kopie formulier `aanmelding` |
| `e2e/lidmaatschap.spec.ts` | End-to-end: prijzenpagina, kruimelpad, foutmeldingen, volledige aanmelding met controle van de verzonden velden, offerteaanvraag en doorstap naar aanmelden, terugval bij mislukt verzenden, tabellen zonder horizontaal scrollen, FAQ met mailto per actie, prijs bij typekeuze en meldingen bij ongeldig aantal gemeenten, prijsblok in beeld bij scrollen, aanvullend blok dat openklapt bij een fout, ingekorte mailto; op 400 px en 1280 px (24 tests) |

## Onderhoud

- **Prijs wijzigen:** alleen `prijsExclBtw` in `staffels` (`src/data/lidmaatschap.ts`). Pas `onderbouwing` en het commentaarblok “Keuze per staffel” aan. Haal `aanname` weg zodra een prijs niet meer op een aanname rust.
- **Veelgestelde vraag toevoegen:** in `veelgesteldeVragen`; optioneel `bron` (sleutel uit `bronnen`), `links` (bijv. naar een artikel van de algemene voorwaarden met anker) en `mail` (knoptekst, onderwerp, invulsjabloon).
- **Prijzen vaststellen:** zet `prijzenVastgesteld` op `true`. Het conceptlabel en de conceptzinnen verdwijnen dan overal.
- **Voorwaarden** (looptijd, opzegtermijn, betaaltermijn, proefdagen, geldigheid offerte, maximale startdatum): object `voorwaarden`. Pagina’s, berekening en bevestiging volgen vanzelf. Houd de algemene voorwaarden gelijk.
- **Vergelijking gratis/lid:** de rijen voor rekentools pas je aan in `src/data/tools.ts` (`gratisDeel`, `proDeel`, `toegang`); de overige rijen in `vergelijking` in `src/data/lidmaatschap.ts`. Een rij met `inLijsten: false` staat wel in de tabel maar niet in de korte lijsten op Over het platform.
- **Btw-tarief:** `btwPercentage`; werk dan ook `bronnen.btw.peildatum` bij.
- **Bronnen:** controleer de links in `bronnen` jaarlijks en zet de nieuwe peildatum. De Europese drempelbedragen wijzigen per 1 januari 2028.
- **Formulierveld toevoegen:** in `AanmeldGegevens` en `formulierVelden` (`aanmelding.ts`), in `aanmeldVelden` (`lidmaatschap.ts`) én in de verborgen kopie in `index.html`. De test faalt als die drie uit de pas lopen.
- **Aanmeldingen terugvinden:** Netlify → Forms → `aanmelding` (export als CSV). Zet een e-mailmelding aan onder Notifications.
- **Na een offerteaanvraag (handmatig, KplusV):** offerte als pdf binnen 2 werkdagen naar de contactpersoon, met het referentienummer `OFF-…`, staffel, prijs en de gekozen startdatum.
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
5. **Vergelijkingstabel**: opgelost voor de rekentools (rijen volgen nu `src/data/tools.ts`). De rij “Aanbestedingsarchief” en de regel in “Wat is inbegrepen” beloven een archief dat nu nog alleen verzonnen aanbestedingen bevat. Vóór de eerste echte factuur moet het archief echte data hebben, of moet deze belofte uit de prijspagina.
6. **Automatisch lidmaatschap activeren** gebeurt nog handmatig in Supabase. Een volgende stap is een Netlify-functie of Supabase-edge-functie die de inzending als `status = 'aangevraagd'` in `organisaties` zet.
7. Netlify Forms vangt inzendingen alleen op na een deploy met form detection aan; testen kan pas na de eerste deploy. Netlify stuurt de aanvrager zelf geen e-mail; de bevestiging op het scherm (afdrukbaar) en de mail van KplusV zijn de bevestiging.
8. **Kleurtoken voor fouten** ontbreekt in `src/styles/tokens.css`; `components.css` en deze module gebruiken `#b91c1c`. Deze module gebruikt nu `var(--fout, #b91c1c)`, zodat een token `--fout` vanzelf doorwerkt.
9. ~~Offertegeldigheid in AV artikel 3 als vaste tekst~~: opgelost, de AV gebruikt nu `voorwaarden.offerteGeldigDagen`.
10. **Kruimelpad** staat nu alleen op de aanmeldpagina. Een kruimelpad voor de hele site hoort in de layout (andere bouwer).
11. **Algemene voorwaarden, artikel 3** loopt nog achter op het formulier (bestand van de juridische bouwer): 3.1 zegt “of vraagt per e-mail een offerte aan”, terwijl het formulier ook de keuze “Eerst een offerte ontvangen” heeft; en zolang de prijzen concept zijn, zegt het formulier dat de orderbevestiging de definitieve prijs noemt. Voorstel voor 3.1: “… of vraagt via hetzelfde formulier of per e-mail een offerte aan.” Voorstel voor een nieuw lid: “Wijkt de prijs in de orderbevestiging af van de prijs bij de aanmelding, dan kan de organisatie binnen 14 dagen kosteloos van de aanmelding afzien.” (termijn ter beslissing van Niels).
12. **FAQ-standpunten ter toetsing:** dat een verwerkersovereenkomst niet nodig is (AV 12) en de regeling voor eigen inkoopvoorwaarden (AV 2.3) staan als concept in de FAQ; wijzigt de juridische toets dat, pas dan de FAQ in `src/data/lidmaatschap.ts` aan.
13. **Mailto-grens van 1.900 tekens** is een praktische aanname zonder officiële bron.
