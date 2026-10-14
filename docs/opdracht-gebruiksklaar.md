# Opdracht: platform gebruiksklaar maken (gauntlet loop)

Vastgelegd op 14 oktober 2026, als overdracht naar de sessie die het werk uitvoert.

## Opdracht

Maak het ledenplatform gebruiksklaar voor contractmanagers en beleidsmedewerkers van samenwerkingsverbanden,
gemeenten en afvalverwerkers. Elke rekentool moet echt bruikbaar zijn voor hun werk. Lidmaatschap en prijzen moeten
van aanmelding tot betaling kloppen. Algemene voorwaarden, privacyverklaring, cookieverklaring en
toegankelijkheidsverklaring moeten compleet zijn. Juridische teksten lever je op als concept ter toetsing, niet als
definitief.

**Lat:** crow.nl: kennisbank, online tools, organisatieabonnement en voorwaarden. Haal de echte pagina's op op 400 px
en op desktop. Meetbaar: Lighthouse toegankelijkheid en prestaties minimaal 95, en een end-to-end test die elke tool
en de hele lidmaatschapsflow doorloopt zonder fout.

**Werkwijze:** per onderdeel een bouwer en een aparte, strenge criticus met frisse context. De criticus vergelijkt
blind met CROW en noemt het grootste gat. Herhaal tot de criticus blind voor ons kiest. Houd een live
voortgangspagina bij.

## Keuzes van Niels

| Onderwerp | Keuze |
|---|---|
| Netwerk | Netwerktoegang "Full" voor de omgeving (nodig voor CROW, CBS, Belastingdienst, Netlify, OpenStreetMap) |
| Betaling | Op factuur: aanmelden via formulier, dan orderbevestiging en factuur van KplusV. Geen betaalprovider. |
| Login | Supabase-project `afvalverwerking-nl` (ref `mnwynrioozcqqvhelqku`, regio eu-central-1, organisatie "Niels Test KplusV", gratis plan). Hiervoor is het project `vaknieuws` gepauzeerd. |
| Deploy | Netlify-project `afvalverwerking-nl-prototype` (site-id `2e769a00-63f4-4a03-a1a4-1b04c72505b0`), formulieren staan aan. Nog geen deploy. |

## Wat al bekend is over de lat (uit zoekresultaten, nog verifiëren op de echte pagina's)

- CROW biedt een organisatieabonnement op de Online Kennisbank: vast jaarbedrag op basis van het aantal licenties,
  één of meer gelijktijdige gebruikers, SAML-SSO, gebruiksstatistieken voor de organisatie.
- Losse kennismodules hebben een prijs per gebruiker per jaar (excl. btw); individuele abonnementen verlengen
  automatisch.
- Pagina's: https://www.crow.nl/kennisproducten/organisatieabonnement-crow-online-kennisbank/ en
  https://www.crow.nl/online-kennis-tools
