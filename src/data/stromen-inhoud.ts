// Teksten per stroom op /stromen/<id>: verwerking en geldstromen, regels en beleid, en wat niet te onderbouwen was.
//
// Spelregels (zie docs/stukken/stromen.md):
// - Alleen wat op de peildatum bij een officiële of gezaghebbende bron is nagelezen. Elke regel hieronder heeft een bron met URL.
// - Teksten zijn eigen formuleringen, geen overname van de bron.
// - Wat niet openbaar of niet te vinden was, staat bij `open` ("geen openbare bron gevonden") en wordt niet ingevuld.
// - Bijwerken: lees de bron opnieuw, pas tekst, bron en PEILDATUM aan.

import type { StroomId } from './stromen';

/** Datum waarop de bronnen in dit bestand zijn nagelezen. */
export const PEILDATUM = '2026-11-13';

export interface Bron {
  titel: string;
  uitgever: string;
  /** Datum of versie van de bron zoals die zelf vermeldt. */
  datum: string;
  url: string;
}

export const bronnen = {
  cbs83558: {
    titel: 'Gemeentelijke afvalstoffen; hoeveelheden (tabel 83558NED)',
    uitgever: 'CBS',
    datum: 'tabel gewijzigd op 16 juli 2026',
    url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83558NED/table',
  },
  rws2024: {
    titel: 'Afvalverwerking in Nederland, gegevens 2024 (tabel S1, par. 3.1 en 3.4)',
    uitgever: 'Rijkswaterstaat, Werkgroep Afvalregistratie',
    datum: 'juni 2026',
    url: 'https://open.rijkswaterstaat.nl/@306655/afvalverwerking-nederland-gegevens-2024/',
  },
  strategy2025: {
    titel: 'Gevolgen van fiscale maatregelen voor concurrentiepositie afvalverwerkingssector (p. 31)',
    uitgever: 'Strategy& (PwC), in opdracht van de Vereniging Afvalbedrijven',
    datum: '11 september 2025',
    url: 'https://verenigingafvalbedrijven.nl/public/News/507/download/25.09.10%20-%20PwC%20-%20Gevolgen%20fiscale%20maatregelen%20afvalsector.pdf',
  },
  asb: {
    titel: 'Tarief afvalstoffenbelasting',
    uitgever: 'Belastingdienst',
    datum: 'tarieven 2019 tot en met 2026',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/overige_belastingen/belastingen_op_milieugrondslag/afvalstoffenbelasting/tarief_afvalstoffenbelasting',
  },
  wm: {
    titel: 'Wet milieubeheer, hoofdstuk 10 (art. 10.21 tot en met 10.29) en art. 15.33',
    uitgever: 'Wetten.overheid.nl (Rijksoverheid)',
    datum: 'geldend per 22 oktober 2026',
    url: 'https://wetten.overheid.nl/BWBR0003245/2026-10-22',
  },
  besluitGescheiden: {
    titel: 'Besluit gescheiden inzameling huishoudelijke afvalstoffen (Staatsblad 2020, 197), met nota van toelichting',
    uitgever: 'Staatsblad (Officiële bekendmakingen)',
    datum: '18 juni 2020',
    url: 'https://zoek.officielebekendmakingen.nl/stb-2020-197.html',
  },
  upvTextiel: {
    titel: 'Besluit uitgebreide producentenverantwoordelijkheid textiel',
    uitgever: 'Wetten.overheid.nl (Rijksoverheid)',
    datum: 'in werking sinds 1 juli 2023',
    url: 'https://wetten.overheid.nl/BWBR0048093/2023-07-01',
  },
  rijksTextiel: {
    titel: 'Regels voor hergebruik en recycling van textiel',
    uitgever: 'Rijksoverheid',
    datum: 'doorlopend bijgewerkt, gelezen op de peildatum',
    url: 'https://www.rijksoverheid.nl/themas/klimaat-milieu-en-natuur/afval/regels-voor-hergebruik-en-recycling-van-textiel',
  },
  nvrdTextiel: {
    titel: 'Hoe ga ik als gemeente om met UPV Textiel (presentatie Grondstoffencongres)',
    uitgever: 'NVRD',
    datum: '21 maart 2024',
    url: 'https://www.nvrd.nl/wp-content/uploads/2024/04/Hoe-ga-ik-als-gemeente-om-met-UPV-Textiel.pdf',
  },
  sov: {
    titel: 'Samenwerkingsovereenkomst Verpakkingen 2025–2030, art. 7 en bijlage 4 (tekenversie)',
    uitgever: 'Verpact, VNG en NVRD',
    datum: 'getekend op 19 september 2025',
    url: 'https://vng.nl/sites/default/files/2025-09/20250919-samenwerkingsovereenkomst-verpakkingen-18-september-2025.pdf',
  },
  nvrdSov: {
    titel: 'Nieuwe afspraken verpakkingsafval geven gemeenten meer zekerheid en stimuleren kwaliteit',
    uitgever: 'NVRD',
    datum: '19 september 2025',
    url: 'https://www.nvrd.nl/nieuws/nieuwe-afspraken-verpakkingsafval-geven-gemeenten-meer-zekerheid-en-stimuleren-kwaliteit/',
  },
  nvrdPrullenbak: {
    titel: 'Prullenbakken-vergoeding 2026 bekend',
    uitgever: 'NVRD',
    datum: '23 april 2026',
    url: 'https://www.nvrd.nl/nieuws/prullenbakvergoeding-2026-bekend/',
  },
  cmpBrief: {
    titel: 'Kamerbrief over vaststelling Circulair Materialenplan (CMP)',
    uitgever: 'Rijksoverheid (staatssecretaris Infrastructuur en Waterstaat)',
    datum: '1 december 2025',
    url: 'https://www.rijksoverheid.nl/documenten/2025/12/01/vaststelling-circulair-materialenplan',
  },
  rwsWetgeving: {
    titel: 'Afvalwetgeving (Circulair materialenplan is van kracht)',
    uitgever: 'Rijkswaterstaat',
    datum: 'gelezen op de peildatum',
    url: 'https://www.rijkswaterstaat.nl/leefomgeving/wetten-regels-en-vergunningen/afvalwetgeving',
  },
  vngRaadgever: {
    titel: 'Raadgever Afval (samenvatting CMP deel B)',
    uitgever: 'VNG',
    datum: 'gelezen op de peildatum',
    url: 'https://vng.nl/artikelen/raadgever-afval',
  },
  nvrdVang: {
    titel: 'Nieuwe VANG recycledoelstelling: minder kilo’s, meer procenten',
    uitgever: 'NVRD',
    datum: '20 maart 2024',
    url: 'https://www.nvrd.nl/nieuws/nieuwe-vang-recycledoelstelling-meer-procenten/',
  },
} satisfies Record<string, Bron>;

export interface Feit {
  tekst: string;
  bronnen: Bron[];
}
export interface Regel {
  titel: string;
  /** Wat de regel zegt, in eigen woorden. */
  inhoud: string;
  /** Eén zin: wat het voor een gemeente betekent. */
  gemeente: string;
  bron: Bron;
  /** Tweede bron, als de regel uit twee bronnen is samengesteld. */
  bron2?: Bron;
}
export interface Inhoud {
  /** Toon de CBS-verdeling over verwerkingsmethoden uit tabel 83558NED (alleen voor restafval en grof restafval). */
  cbsVerwerking?: 'restafval' | 'grofRestafval';
  verwerking: Feit[];
  regels: Regel[];
  /** Wat niet te onderbouwen was: staat zo op de pagina. */
  open: string[];
}

const wmZorgplicht: Regel = {
  titel: 'Wet milieubeheer art. 10.21 en 10.26: inzameling bij elk perceel',
  inhoud:
    'Gemeenteraad en college zorgen dat huishoudelijke afvalstoffen, behalve grove, ten minste eenmaal per week bij elk perceel worden ingezameld waar ze geregeld ontstaan. De raad kan daar in de afvalstoffenverordening of het omgevingsplan van afwijken, bijvoorbeeld voor de frequentie.',
  gemeente: 'Frequentie en wijze van inzamelen kiest u zelf, maar een afwijking van de wekelijkse inzameling vraagt een raadsbesluit.',
  bron: bronnen.wm,
};
const wmVerordening: Regel = {
  titel: 'Wet milieubeheer art. 10.23 en 10.24: afvalstoffenverordening',
  inhoud:
    'De gemeenteraad stelt een afvalstoffenverordening vast, tenzij de regels in het omgevingsplan staan. Die bevat ten minste regels over het aanbieden of overdragen van huishoudelijke afvalstoffen aan de aangewezen inzameldienst.',
  gemeente: 'Wat inwoners waar en hoe mogen aanbieden, legt u hier vast; een wijziging van de inzameling begint dus bij de verordening.',
  bron: bronnen.wm,
};
const wmHeffing: Regel = {
  titel: 'Wet milieubeheer art. 15.33: afvalstoffenheffing',
  inhoud: 'De gemeenteraad kan een heffing instellen ter bestrijding van de kosten die de gemeente maakt voor het beheer van huishoudelijke afvalstoffen.',
  gemeente: 'De kosten van inzameling en verwerking kunt u via de afvalstoffenheffing op huishoudens verhalen.',
  bron: bronnen.wm,
};
const besluitGescheiden = (stroomZin: string, gemeente: string): Regel => ({
  titel: 'Besluit gescheiden inzameling huishoudelijke afvalstoffen, art. 1 en 2',
  inhoud: `Gemeenten zorgen bij de uitvoering van art. 10.21 Wm voor gescheiden inzameling van ten minste bioafval, papier, metaal, kunststof, glas, textiel, gevaarlijke afvalstoffen en afgedankte elektrische en elektronische apparatuur. ${stroomZin}`,
  gemeente,
  bron: bronnen.besluitGescheiden,
});

const cmpRegel: Regel = {
  titel: 'Circulair Materialenplan (CMP), sinds 30 december 2025 het kader voor afvalbeleid',
  inhoud:
    'Het CMP is op 30 december 2025 in werking getreden en vervangt het Landelijk afvalbeheerplan (LAP3). Overheden houden er rekening mee bij hun taken rond afval. Volgens de samenvatting van de VNG noemt deel B een richtwaarde van ten hoogste 30 kg restafval per inwoner per jaar in 2030.',
  gemeente: 'Uw afval- of grondstoffenplan en vergunningverlening toetst u voortaan aan het CMP in plaats van aan het LAP3; de richtwaarde van 30 kg is richtinggevend, geen wettelijke norm.',
  bron: bronnen.rwsWetgeving,
  bron2: bronnen.vngRaadgever,
};

export const inhoud: Record<StroomId, Inhoud> = {
  restafval: {
    cbsVerwerking: 'restafval',
    verwerking: [
      {
        tekst:
          'In 2024 verbrandden 13 afvalverbrandingsinstallaties samen 6.422 kton afval. Dat is afval uit alle herkomsten: ook bedrijfsafval en geïmporteerd afval komt bij deze installaties terecht, niet alleen restafval van huishoudens.',
        bronnen: [bronnen.rws2024, bronnen.strategy2025],
      },
      {
        tekst:
          'Gemeenten betalen de verwerker een poorttarief per ton. Bij aanbesteding ligt dat voor gemeentelijk huishoudelijk afval rond € 55 tot € 70 per ton restafval. Dit is een bandbreedte uit een studie in opdracht van de sector, geen tarief van een bepaalde installatie.',
        bronnen: [bronnen.strategy2025],
      },
      {
        tekst:
          'Voor het storten en verbranden van afvalstoffen geldt één tarief afvalstoffenbelasting per 1.000 kg: € 40,85 in 2026 (€ 39,70 in 2025). Wat dat plus de CO2-heffing per gemeente betekent, rekent de Heffingenscan uit.',
        bronnen: [bronnen.asb],
      },
    ],
    regels: [wmZorgplicht, wmVerordening, wmHeffing, cmpRegel,
      {
        titel: 'Europese recyclingnorm 2035',
        inhoud:
          'Volgens de NVRD ligt er vanuit Europa een norm dat in 2035 65 procent van al het afval wordt gerecycled, en verschuift de focus voor gemeenten van kilo’s restafval naar het aandeel recyclebaar materiaal. De Europese richtlijntekst zelf hebben wij niet kunnen raadplegen.',
        gemeente: 'Sturen op alleen kilo’s restafval volstaat niet meer; ook de kwaliteit van de gescheiden stromen telt.',
        bron: bronnen.nvrdVang,
      },
    ],
    open: [
      'Hoeveel grondstof een nascheidingsinstallatie uit restafval terugwint: CBS geeft alleen het aandeel restafval dat achteraf wordt gescheiden, niet de teruggewonnen hoeveelheid. Geen openbare bron gevonden.',
      'Poorttarieven per installatie of contract: geen openbare bron gevonden. De bandbreedte hierboven is het enige openbare kental.',
    ],
  },
  gft: {
    verwerking: [
      {
        tekst:
          'In 2024 verwerkten 20 installaties samen 1.638 kton gescheiden ingezameld gft-afval (Euralcode 200108) door composteren of vergisten, 2 procent meer dan in 2023. Hiervan is 387 kton eerst vergist; bij installaties waar vergisting kan, gaat 37 procent van het beschikbare gft-afval die route op.',
        bronnen: [bronnen.rws2024],
      },
    ],
    regels: [
      besluitGescheiden(
        'Een gemeente mag bioafval alleen ongescheiden laten als in de afvalstoffenverordening is vastgelegd dat aan de voorwaarden uit de kaderrichtlijn afvalstoffen is voldaan (art. 2).',
        'Gft apart inzamelen is de hoofdregel; afwijken moet u in de verordening onderbouwen en regelmatig toetsen.',
      ),
      wmZorgplicht,
      wmHeffing,
    ],
    open: [
      'Verwerkingstarief per ton gft en opbrengst van compost of biogas: geen openbare bron gevonden.',
    ],
  },
  papier: {
    verwerking: [
      {
        tekst:
          'Voor papier en karton als verpakkingsmateriaal gelden de afspraken tussen Verpact en de VNG uit de vorige overeenkomst door onder de Samenwerkingsovereenkomst Verpakkingen 2025–2030: de vergoedingssystematiek blijft ongewijzigd. Verpact publiceert de vergoedingen in factsheets; de laatste die de overeenkomst noemt is de factsheet vergoedingen 2025 van 24 juni 2025.',
        bronnen: [bronnen.sov, bronnen.nvrdSov],
      },
      {
        tekst: 'CBS telt ook het oud papier mee dat verenigingen, scholen en liefdadigheidsorganisaties inzamelen. Het cijfer per gemeente is daarom breder dan wat de gemeente zelf contracteert.',
        bronnen: [bronnen.cbs83558],
      },
    ],
    regels: [
      besluitGescheiden('Voor papier gold de verplichting al bij inwerkingtreding van het besluit in 2020.', 'Gescheiden inzameling van papier is verplicht; de toelichting uit 2020 meldt dat alle gemeenten het ophalen of verzamelcontainers aanbieden.'),
      wmZorgplicht,
    ],
    open: [
      'Opbrengst of kosten per ton oud papier en de actuele vergoeding per gemeente: geen openbare bron gevonden (de factsheet van Verpact hebben wij niet kunnen raadplegen).',
    ],
  },
  pmd: {
    verwerking: [
      {
        tekst:
          'Inzamelvergoeding 2026 per ton gescheiden ingezameld PMD, naar kwaliteitsstaffel: € 325 (staffel 1), € 277 (2), € 228 (3a), € 195 (3b) en € 0 (4). De overeenkomst noemt deze tarieven voor de periode tot en met 2028; in 2029 volgt een nieuw kostenonderzoek. Het tarief van staffel 1 wordt geïndexeerd en de andere staffels zijn daar een percentage van.',
        bronnen: [bronnen.sov],
      },
      {
        tekst: 'Voor nascheiding van PMD uit restafval is het nascheidingstarief 2026 vastgesteld op € 17,26 per ton nascheidingsgewicht; voor 2027 en 2028 wordt het geïndexeerd.',
        bronnen: [bronnen.sov],
      },
      {
        tekst:
          'Uitgangspunt van de overeenkomst, die loopt tot en met 2030: gescheiden inzameling waar mogelijk, nascheiding alleen waar nodig. De vergoedingen zijn gekoppeld aan de kwaliteit van het ingezamelde materiaal en niet meer aan afkeur. Gemeenten sluiten daarnaast elk een deelnemersovereenkomst met Verpact.',
        bronnen: [bronnen.nvrdSov],
      },
      {
        tekst: 'Voor het verpakkingsafval in openbare prullenbakken vergoedt Verpact in 2026 € 1,02 per inwoner (2025: € 0,98).',
        bronnen: [bronnen.nvrdPrullenbak],
      },
    ],
    regels: [
      besluitGescheiden('Voor kunststof en metaal kan de verordening afwijken als de voorwaarden uit de kaderrichtlijn zijn vervuld (art. 2), bijvoorbeeld bij nascheiding.', 'Kiest u voor nascheiding van PMD, dan legt u dat vast in de verordening en toetst u het regelmatig.'),
      {
        titel: 'Samenwerkingsovereenkomst Verpakkingen 2025–2030 (Verpact, VNG, NVRD)',
        inhoud:
          'De overeenkomst regelt de inzameling van plastic en metalen verpakkingen en drankenkartons, en daarnaast papier, karton, glas en piepschuim. Ze loopt vijf jaar, tot en met 2030, en vervangt de overeenkomst die in 2024 werd beëindigd.',
        gemeente: 'De vergoeding krijgt u pas via uw eigen deelnemersovereenkomst met Verpact; zonder die overeenkomst gelden de afspraken niet voor uw gemeente.',
        bron: bronnen.nvrdSov,
      },
      wmZorgplicht,
    ],
    open: [
      'Hoe vaak gemeenten per staffel zijn ingedeeld en welk bedrag een gemeente in werkelijkheid ontvangt: geen openbare bron gevonden.',
      'Het PMD-rekenmodel rekent met bedragen uit het onderhandelingsresultaat van mei 2025. Controleer ze aan de getekende overeenkomst, vooral voor 2027 en 2028 bij staffel 3b: de overeenkomst noemt één tarief tot en met 2028.',
    ],
  },
  textiel: {
    verwerking: [
      {
        tekst:
          'Producenten van kleding en huishoudtextiel moeten ervoor zorgen dat consumenten het hele jaar gratis oud textiel kunnen inleveren, en moeten opgeven hoeveel textiel zij verkopen, hergebruiken en recyclen. Hoe zij dat inzamelen, bepalen zij zelf; bestaande systemen van gemeenten mogen ze gebruiken.',
        bronnen: [bronnen.rijksTextiel, bronnen.nvrdTextiel],
      },
      {
        tekst:
          'Doelen voor producenten, als gewichtspercentage van het in het vorige jaar verkochte textiel: 2025 minimaal 50 procent voorbereiding voor hergebruik of recycling (waarvan 20 procent hergebruik, 10 procent hergebruik in Nederland en 25 procent van de recycling vezel-tot-vezel), 2026 minimaal 55 procent (21, 11 en 27 procent) en 2030 minimaal 75 procent (25, 15 en 33 procent).',
        bronnen: [bronnen.upvTextiel, bronnen.nvrdTextiel],
      },
      {
        tekst: 'In Nederland komt meer dan de helft van het textiel bij het huishoudelijk restafval terecht, zegt de Rijksoverheid.',
        bronnen: [bronnen.rijksTextiel],
      },
    ],
    regels: [
      besluitGescheiden('Voor textiel en gevaarlijke afvalstoffen gaat de verplichting uiterlijk 1 januari 2025 in.', 'Sinds 1 januari 2025 moet u textiel gescheiden inzamelen; de producentenverantwoordelijkheid ligt daar naast.'),
      {
        titel: 'Besluit uitgebreide producentenverantwoordelijkheid textiel (UPV textiel), sinds 1 juli 2023',
        inhoud: 'Producenten en importeurs van kleding en huishoudtextiel zijn verantwoordelijk voor de afvalfase van wat zij in Nederland op de markt brengen en moeten jaarlijkse doelen voor hergebruik en recycling halen en erover rapporteren.',
        gemeente: 'Gemeenten blijven verantwoordelijk voor inzameling in de openbare ruimte; maak afspraken met de producentenorganisatie voordat u uw eigen inzameling aanbesteedt.',
        bron: bronnen.upvTextiel,
      },
      {
        titel: 'Aanpassing van de regels, verwacht in 2027',
        inhoud: 'In het tweede beleidsprogramma circulair textiel 2025–2030 kondigt het kabinet aan dat regels voor producenten veranderen; ook schoenen gaan onder de UPV vallen. Het kabinet verwacht dit in 2027 in te voeren.',
        gemeente: 'Houd bij een contract met een looptijd tot na 2027 rekening met wijzigende afspraken; een herzieningsclausule is dan verstandig.',
        bron: bronnen.rijksTextiel,
      },
    ],
    open: [
      'Vergoeding aan gemeenten voor textielinzameling: geen openbare bron met bedragen gevonden.',
      'Het aandeel textiel dat daadwerkelijk wordt hergebruikt of gerecycled, per gemeente of per sorteerder: geen openbare bron gevonden.',
    ],
  },
  glas: {
    verwerking: [
      {
        tekst:
          'Voor verpakkingsglas gelden de afspraken tussen Verpact en de VNG uit de vorige overeenkomst door onder de Samenwerkingsovereenkomst Verpakkingen 2025–2030, met ongewijzigde vergoedingssystematiek. Verpact publiceert de vergoedingen in factsheets.',
        bronnen: [bronnen.sov, bronnen.nvrdSov],
      },
      {
        tekst: 'CBS beschrijft bij verwerking alleen de eerst toegepaste methode; bij glas blijft een niet herbruikbare fractie over die wordt verbrand of gestort.',
        bronnen: [bronnen.cbs83558],
      },
    ],
    regels: [
      besluitGescheiden('Voor glas kan de verordening afwijken als de voorwaarden uit de kaderrichtlijn zijn vervuld (art. 2).', 'Glas apart inzamelen is de hoofdregel; afwijken moet u onderbouwen in de verordening.'),
      wmZorgplicht,
    ],
    open: [
      'Vergoeding per ton glas aan gemeenten en de prijs die de glasrecycler betaalt: geen openbare bron gevonden (de factsheet van Verpact hebben wij niet kunnen raadplegen).',
    ],
  },
  grof: {
    cbsVerwerking: 'grofRestafval',
    verwerking: [
      {
        tekst: 'Het grof restafval is hier niet in het cijfer van de stroom opgenomen, maar de verwerking ervan staat in de CBS-verdeling hierboven, omdat het bij de milieustraat hoort.',
        bronnen: [bronnen.cbs83558],
      },
    ],
    regels: [
      {
        titel: 'Wet milieubeheer art. 10.22: grove huishoudelijke afvalstoffen',
        inhoud:
          'Elke gemeente zorgt dat grove huishoudelijke afvalstoffen worden ingezameld bij elk perceel waar ze ontstaan, en dat er op ten minste één plaats in de gemeente (of bij samenwerkende gemeenten) voldoende gelegenheid is om ze achter te laten.',
        gemeente: 'Een milieustraat of brengplaats is verplicht; haalservice voor grof afval ook, tenzij een algemene maatregel van bestuur daarvoor een uitzondering maakt.',
        bron: bronnen.wm,
      },
      wmVerordening,
      wmHeffing,
    ],
    open: [
      'Tarieven voor verwerking van hout (A-, B- en C-hout), matrassen en grof tuinafval en de afzetprijzen: geen openbare bron gevonden.',
      'Of en hoe matrassen onder een producentenverantwoordelijkheid vallen: niet nagelezen, dus hier niet opgenomen.',
    ],
  },
  luiers: {
    verwerking: [],
    regels: [
      {
        titel: 'Geen aparte verplichting gevonden voor luiers',
        inhoud:
          'Het Besluit gescheiden inzameling huishoudelijke afvalstoffen noemt luiers niet bij de verplichte stromen, en de nota van toelichting zegt dat het gemeenten vrijstaat ook andere bestanddelen gescheiden in te zamelen.',
        gemeente: 'Luiers apart inzamelen is uw eigen keuze; maak die keuze in de afvalstoffenverordening en let op het effect op het restafval.',
        bron: bronnen.besluitGescheiden,
      },
    ],
    open: [
      'Hoe apart ingezamelde luiers worden verwerkt en wat dat kost: geen openbare bron gevonden.',
      'Of er een producentenverantwoordelijkheid voor luiers komt: niet nagelezen, dus hier niet opgenomen.',
    ],
  },
  kca: {
    verwerking: [],
    regels: [
      besluitGescheiden(
        'Gevaarlijke afvalstoffen vallen onder de verplichting vanaf 1 januari 2025. Klein chemisch afval is de gevaarlijke fractie uit huishoudens; deze duiding is van de redactie, het besluit zegt het niet in die woorden.',
        'Zorg dat inwoners klein chemisch afval gescheiden kwijt kunnen, bijvoorbeeld bij de milieustraat.',
      ),
    ],
    open: [
      'Verwerking van klein chemisch afval en de kosten: geen openbare bron gevonden.',
      'Vergoedingen via producentenverantwoordelijkheid voor onderdelen van deze stroom (zoals batterijen en afgewerkte olie): niet nagelezen, dus hier niet opgenomen.',
    ],
  },
};
