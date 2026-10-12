import type { NieuwsThema, Nieuwsbericht } from './types';

// FICTIEF: twaalf verzonnen voorbeeldberichten. Geen echte personen, geen citaten, geen echte artikelen.
// In het echte platform verwijzen berichten naar de oorspronkelijke bron, zoals Afval Online.

export const nieuwsBron = { naam: 'Afval Online', url: 'https://www.afvalonline.nl' };

export const nieuwsThemas: NieuwsThema[] = [
  'Verbrandingscapaciteit',
  'CO2-heffing',
  'PMD',
  'GFT',
  'Bodemas',
  'Textiel (UPV)',
  'Contracten en indexering',
];

export const nieuws: Nieuwsbericht[] = [
  {
    id: 'n01',
    titel: 'Verwerker neemt verbrandingslijn tijdelijk uit bedrijf voor onderhoud',
    datum: '2026-10-08',
    thema: 'Verbrandingscapaciteit',
    samenvatting:
      'Een verwerker in het noorden zet een van zijn verbrandingslijnen een half jaar stil voor groot onderhoud. Aangesloten samenwerkingsverbanden laten een deel van hun restafval in die periode elders verwerken. De extra transportkosten komen volgens het contract voor rekening van de verwerker.',
  },
  {
    id: 'n02',
    titel: 'Samenwerkingsverbanden rekenen scenario’s door voor hogere CO2-heffing',
    datum: '2026-10-02',
    thema: 'CO2-heffing',
    samenvatting:
      'Meerdere samenwerkingsverbanden laten doorrekenen wat een stijgende CO2-heffing op afvalverbranding betekent voor hun verwerkingstarief. De uitkomsten verschillen sterk per contract, omdat niet elk contract regelt wie de heffing draagt.',
  },
  {
    id: 'n03',
    titel: 'Gemeenten vergelijken bron- en nascheiding van PMD na eerste contractperiode',
    datum: '2026-09-24',
    thema: 'PMD',
    samenvatting:
      'Een groep gemeenten evalueert na vijf jaar nascheiding van PMD de kosten en de kwaliteit van het sorteerresultaat. Ze vergelijken die met buurgemeenten die aan de bron scheiden. De evaluatie moet uitwijzen welke route bij de volgende aanbesteding het voordeligst is.',
  },
  {
    id: 'n04',
    titel: 'Aanbesteding GFT-verwerking trekt minder inschrijvers dan verwacht',
    datum: '2026-09-17',
    thema: 'GFT',
    samenvatting:
      'Op een regionale aanbesteding voor de verwerking van GFT kwamen twee inschrijvingen binnen. De opdrachtgever had er meer verwacht. Als mogelijke oorzaken worden de lange looptijd en strenge kwaliteitseisen aan het eindproduct genoemd.',
  },
  {
    id: 'n05',
    titel: 'Meer vraag naar bodemas als bouwstof in wegenbouw',
    datum: '2026-09-09',
    thema: 'Bodemas',
    samenvatting:
      'Verwerkers zien meer belangstelling voor opgewerkte bodemas als funderingsmateriaal. Tegelijk lopen de kosten voor opwerking en keuring op. Voor samenwerkingsverbanden is de vraag hoe die ontwikkeling doorwerkt in het verwerkingstarief.',
  },
  {
    id: 'n06',
    titel: 'Gemeenten zoeken afspraken met producenten over inzameling textiel',
    datum: '2026-09-01',
    thema: 'Textiel (UPV)',
    samenvatting:
      'Onder de uitgebreide producentenverantwoordelijkheid voor textiel moeten gemeenten en producenten afspraken maken over inzameling en vergoeding. Meerdere gemeenten melden dat de onderhandelingen langer duren dan gepland. Lopende inzamelcontracten worden daarom tijdelijk verlengd.',
  },
  {
    id: 'n07',
    titel: 'Indexering van verwerkingscontracten opnieuw onderwerp van gesprek',
    datum: '2026-08-26',
    thema: 'Contracten en indexering',
    samenvatting:
      'Na een aantal jaren met sterk schommelende energieprijzen herzien opdrachtgevers de indexeringsformules in hun contracten. Vaker wordt gekozen voor een mix van loon-, energie- en prijsindexen met een vaste weging. Ook een plafond op de jaarlijkse stijging komt vaker voor.',
  },
  {
    id: 'n08',
    titel: 'Verwerkers verwachten krappere verbrandingsmarkt na 2028',
    datum: '2026-08-14',
    thema: 'Verbrandingscapaciteit',
    samenvatting:
      'Volgens een brancheverkenning daalt de aanvoer van restafval langzaam, terwijl een deel van de installaties het einde van de levensduur nadert. Dat kan de onderhandelingspositie bij nieuwe contracten veranderen. Samenwerkingsverbanden met een contract dat na 2028 afloopt, bereiden zich daarom eerder voor.',
  },
  {
    id: 'n09',
    titel: 'Kwaliteitseisen nagescheiden PMD aangescherpt',
    datum: '2026-08-05',
    thema: 'PMD',
    samenvatting:
      'Sorteerinstallaties krijgen strengere eisen aan de zuiverheid van PMD dat uit restafval is gehaald. Voor nascheidingscontracten kan dat leiden tot hogere kosten of een lagere vergoeding. Opdrachtgevers kijken hoe ze die risico’s in nieuwe contracten verdelen.',
  },
  {
    id: 'n10',
    titel: 'Regio’s onderzoeken gezamenlijke inkoop van CO2-reductie bij verbranding',
    datum: '2026-07-29',
    thema: 'CO2-heffing',
    samenvatting:
      'Een aantal samenwerkingsverbanden verkent of ze samen kunnen afspreken dat verwerkers investeren in het afvangen van CO2. In ruil daarvoor zouden de verbanden een langere contractduur bieden. De verkenning staat nog aan het begin.',
  },
  {
    id: 'n11',
    titel: 'Seizoensschommelingen in GFT zetten druk op vergistingscapaciteit',
    datum: '2026-07-22',
    thema: 'GFT',
    samenvatting:
      'In het voorjaar en het najaar komt veel meer GFT binnen dan in de rest van het jaar. Vergisters kunnen die pieken niet altijd verwerken, waardoor een deel wordt gecomposteerd. Opdrachtgevers nemen piekafspraken vaker op in het bestek.',
  },
  {
    id: 'n12',
    titel: 'Opdrachtgevers vragen vaker om open boekhouding bij indexering',
    datum: '2026-07-15',
    thema: 'Contracten en indexering',
    samenvatting:
      'Steeds meer opdrachtgevers willen inzicht in de kostenopbouw achter een tariefsverhoging. Sommige nieuwe contracten bevatten daarom een jaarlijkse toets op de werkelijke kosten. Verwerkers vragen op hun beurt om duidelijke afspraken over vertrouwelijkheid.',
  },
];
