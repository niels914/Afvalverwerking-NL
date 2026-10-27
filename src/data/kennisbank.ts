// Kennisbank: echte, openbare publicaties over afvalbeleid en afvalverwerking.
// Elke link is gecontroleerd op HTTP 200 op de datum in `linksGecontroleerd`.
// De samenvattingen zijn eigen tekst van de redactie, geen overgenomen teksten van de uitgever.
// Onderhoud: zie docs/stukken/inhoud.md (paragraaf Kennisbank).

export const linksGecontroleerd = '2026-10-27';

export const kennisbankThemas = [
  'Verwerking en capaciteit',
  'Heffingen en belastingen',
  'Inzameling en scheiding',
  'Circulaire economie',
  'Verpakkingen',
  'Textiel',
  'Aanbesteden',
  'Cijfers',
] as const;
export type KennisbankThema = (typeof kennisbankThemas)[number];

export const publicatieTypes = ['Rapport', 'Beleid', 'Kamerbrief', 'Cijfers', 'Handreiking', 'Hulpmiddel'] as const;
export type PublicatieType = (typeof publicatieTypes)[number];

export interface Publicatie {
  id: string;
  titel: string;
  uitgever: string;
  /** Opdrachtgever of mede-auteur, als die er is. */
  inOpdrachtVan?: string;
  /** Jaar van publicatie; null voor een webpagina of tool die doorlopend wordt bijgewerkt. */
  jaar: number | null;
  /** Publicatiedatum (jjjj-mm-dd) als die bekend is. */
  datum?: string;
  type: PublicatieType;
  themas: KennisbankThema[];
  /** Eigen samenvatting, twee of drie zinnen. */
  samenvatting: string;
  /** Waarom dit nuttig is voor contractmanagers en beleidsmedewerkers. */
  bruikbaarVoor: string;
  url: string;
  formaat: 'Webpagina' | 'PDF' | 'Webpagina met PDF' | 'Online tool' | 'Dataset';
  taal?: 'Engels';
}

export const publicaties: Publicatie[] = [
  {
    id: 'rws-afvalverwerking-2024',
    titel: 'Afvalverwerking in Nederland, gegevens 2024',
    uitgever: 'Rijkswaterstaat (Werkgroep Afvalregistratie)',
    jaar: 2026,
    datum: '2026-06-01',
    type: 'Rapport',
    themas: ['Verwerking en capaciteit', 'Cijfers'],
    samenvatting:
      'Jaarlijks overzicht van wat er in Nederland is gestort, verbrand, vergist en gecomposteerd, op basis van een enquête onder alle verwerkingsinstallaties. Bevat ook de capaciteit per installatie en vergelijkt met eerdere jaren; de bijlagen geven de tabellen.',
    bruikbaarVoor: 'Inzicht in beschikbare verbrandings- en vergistingscapaciteit bij het voorbereiden van een verwerkingscontract.',
    url: 'https://open.rijkswaterstaat.nl/@306655/afvalverwerking-nederland-gegevens-2024/',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'rws-sorteeranalyses-2025',
    titel: 'Samenstelling van het huishoudelijk restafval, sorteeranalyses 2025',
    uitgever: 'Rijkswaterstaat',
    jaar: 2026,
    datum: '2026-07-01',
    type: 'Rapport',
    themas: ['Inzameling en scheiding', 'Cijfers'],
    samenvatting:
      'Jaarlijkse sorteeranalyse van het Nederlandse huishoudelijk restafval, met de gemiddelde samenstelling over drie jaar. Laat per hoofdcomponent de trend zien en gaat apart in op verpakkingen die nog in het restafval zitten. Dient als monitoring voor het Circulair Materialenplan.',
    bruikbaarVoor: 'Onderbouwen hoeveel grondstoffen er nog in het restafval zitten, bijvoorbeeld bij een keuze voor bron- of nascheiding.',
    url: 'https://open.rijkswaterstaat.nl/@307655/samenstelling-huishoudelijk-restafval/',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'cbs-83452ned',
    titel: 'Huishoudelijk afval per gemeente per inwoner (StatLine-tabel 83452NED)',
    uitgever: 'CBS',
    jaar: 2026,
    datum: '2026-07-16',
    type: 'Cijfers',
    themas: ['Cijfers', 'Inzameling en scheiding'],
    samenvatting:
      'Kilo’s ingezameld huishoudelijk afval per inwoner, per gemeente en per afvalsoort, vanaf 2001. Dit is de bron van de Restafvalkaart op dit platform. CBS meldt in de tabeltoelichting welke jaren nog voorlopig zijn en welke breuken er in reeksen zitten.',
    bruikbaarVoor: 'Gemeenten met elkaar vergelijken en de eigen ontwikkeling volgen.',
    url: 'https://www.cbs.nl/nl-nl/cijfers/detail/83452NED',
    formaat: 'Dataset',
  },
  {
    id: 'cbs-afval-2025',
    titel: '6 kilo minder afval per inwoner in 2025',
    uitgever: 'CBS',
    jaar: 2026,
    datum: '2026-07-16',
    type: 'Cijfers',
    themas: ['Cijfers'],
    samenvatting:
      'Nieuwsbericht met voorlopige landelijke cijfers over 2025: totaal ingezameld huishoudelijk afval, restafval, gft en papier per inwoner, en restafval per provincie. Volgens CBS wordt ongeveer 60 procent van het huishoudelijk afval gescheiden ingezameld.',
    bruikbaarVoor: 'Snel landelijk referentiekader voor het eigen restafvalcijfer.',
    url: 'https://www.cbs.nl/nl-nl/nieuws/2026/29/6-kilo-minder-afval-per-inwoner-in-2025',
    formaat: 'Webpagina',
  },
  {
    id: 'cmp-vaststelling',
    titel: 'Kamerbrief over vaststelling Circulair Materialenplan (CMP)',
    uitgever: 'Ministerie van Infrastructuur en Waterstaat',
    jaar: 2025,
    datum: '2025-12-01',
    type: 'Kamerbrief',
    themas: ['Circulaire economie', 'Verwerking en capaciteit'],
    samenvatting:
      'Met deze brief is het Circulair Materialenplan vastgesteld, de opvolger van het Landelijk Afvalbeheerplan (LAP3). De brief bevat de reactienota op de zienswijzen en een bijlagendocument.',
    bruikbaarVoor: 'Nagaan welk beleidskader geldt voor verwerkingsroutes en minimumstandaarden.',
    url: 'https://www.rijksoverheid.nl/documenten/2025/12/01/vaststelling-circulair-materialenplan',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'beleidsvisie-afvalverbranding',
    titel: 'Beleidsvisie afvalverbranding in 2030 en richting 2050',
    uitgever: 'Ministerie van Infrastructuur en Waterstaat',
    inOpdrachtVan: 'Samen met het ministerie van Economische Zaken en Klimaat',
    jaar: 2025,
    datum: '2025-01-17',
    type: 'Beleid',
    themas: ['Verwerking en capaciteit', 'Heffingen en belastingen'],
    samenvatting:
      'Visie van het Rijk op de rol van afvalverbranding in een circulaire economie. Het kabinet wil richting 2050 stap voor stap naar minder verbrandingscapaciteit en wil met bedrijven met afvalverbrandingsinstallaties praten over verduurzaming. Hoort bij een Kamerbrief met ook een TNO-verkenning en een verkenning naar maatwerkafspraken.',
    bruikbaarVoor: 'Inschatten hoe capaciteit en tarieven zich op lange termijn kunnen ontwikkelen, bijvoorbeeld voor de looptijd van een contract.',
    url: 'https://www.rijksoverheid.nl/documenten/2025/01/17/bijlage-2-beleidsvisie-afvalverbranding-in-2030-en-richting-2050',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'tno-verbranding-2030-2050',
    titel: 'Een verkenning naar de verbranding van Nederlands afval en de milieuprestatie in 2030 en 2050',
    uitgever: 'TNO',
    inOpdrachtVan: 'Ministerie van Infrastructuur en Waterstaat',
    jaar: 2025,
    datum: '2025-01-17',
    type: 'Rapport',
    themas: ['Verwerking en capaciteit'],
    samenvatting:
      'Raming van de hoeveelheid Nederlands afval die in 2030 en 2050 nog naar verbrandingsinstallaties gaat, met de verwachte samenstelling en de milieuprestatie van het verwerkingssysteem. Bijlage bij de Kamerbrief over de beleidsvisie afvalverbranding.',
    bruikbaarVoor: 'Onderbouwing van verwachtingen over het aanbod aan verbrandingsinstallaties.',
    url: 'https://www.rijksoverheid.nl/documenten/2025/01/17/bijlage-3-een-verkenning-naar-de-verbranding-van-nederlands-afval-en-de-milieuprestatie-in-2030-en-2050',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'intentieverklaring-avi',
    titel: 'Intentieverklaring investeringszekerheid verduurzaming afvalverbrandingsinstallaties (Kamerstuk 30872, nr. 319)',
    uitgever: 'Tweede Kamer (brief van IenW, Financiën en KGG)',
    jaar: 2025,
    datum: '2025-10-22',
    type: 'Kamerbrief',
    themas: ['Verwerking en capaciteit', 'Heffingen en belastingen'],
    samenvatting:
      'Brief over een intentieverklaring van het kabinet richting bedrijven met afvalverbrandingsinstallaties, bedoeld om investeringen in verduurzaming zoals CO2-afvang zekerder te maken. De brief beschrijft ook de lastenverzwaring voor de afvalsector na het schrappen van de plasticheffing. De verklaring schept uitdrukkelijk geen juridische verplichtingen.',
    bruikbaarVoor: 'Achtergrond bij te verwachten kostenontwikkeling en heffingen in verwerkingstarieven.',
    url: 'https://zoek.officielebekendmakingen.nl/kst-30872-319.html',
    formaat: 'Webpagina',
  },
  {
    id: 'evaluatie-afvalstoffenbelasting',
    titel: 'Evaluatie afvalstoffenbelasting, eindrapportage',
    uitgever: 'Ecorys en CE Delft',
    inOpdrachtVan: 'Ministerie van Financiën',
    jaar: 2024,
    datum: '2024-08-12',
    type: 'Rapport',
    themas: ['Heffingen en belastingen'],
    samenvatting:
      'Evaluatie van de afvalstoffenbelasting sinds de herinvoering in 2014, in samenhang met de CO2-heffing industrie. De belasting levert de schatkist veel op (gemiddeld 238 miljoen euro per jaar over 2019 tot en met 2023 volgens CE Delft), maar het effect op afvalpreventie en CO2 is minder eenduidig. Met aanbevelingen, waaronder het in balans houden van verbrandingscapaciteit en vraag.',
    bruikbaarVoor: 'Begrijpen hoe de afvalstoffenbelasting doorwerkt in verwerkingstarieven.',
    url: 'https://zoek.officielebekendmakingen.nl/blg-1177997.pdf',
    formaat: 'PDF',
  },
  {
    id: 'trinomics-asb-co2',
    titel: 'Impacts of the reform of the waste tax and CO2 levy for waste incinerators',
    uitgever: 'Trinomics',
    inOpdrachtVan: 'Ministerie van Financiën',
    jaar: 2025,
    datum: '2025-09-08',
    type: 'Rapport',
    themas: ['Heffingen en belastingen', 'Verwerking en capaciteit'],
    samenvatting:
      'Engelstalige impactstudie naar de voorgestelde aanpassing van de afvalstoffenbelasting en de CO2-heffing voor afvalverbrandingsinstallaties. Kijkt naar de businesscase voor CO2-afvang en recycling, vergelijkt kosten met België, Duitsland, Zweden en Polen, en naar het risico dat afval naar het buitenland gaat.',
    bruikbaarVoor: 'Risico’s inschatten van hogere heffingen voor verwerkingstarieven en afvalstromen.',
    url: 'https://zoek.officielebekendmakingen.nl/blg-1214755.pdf',
    formaat: 'PDF',
    taal: 'Engels',
  },
  {
    id: 'pbl-opties-afvalstoffenbelasting',
    titel: 'Opties voor een afvalstoffenbelasting',
    uitgever: 'PBL Planbureau voor de Leefomgeving',
    inOpdrachtVan: 'Ministerie van Financiën',
    jaar: 2014,
    datum: '2014-07-02',
    type: 'Rapport',
    themas: ['Heffingen en belastingen'],
    samenvatting:
      'Analyse van varianten voor een afvalstoffenbelasting bij de herinvoering. Een belasting op restafval of op verbranden levert volgens het PBL relatief de meeste milieuwinst op; alleen een stortbelasting levert te weinig op en heeft ongewenste neveneffecten.',
    bruikbaarVoor: 'Achtergrond bij de keuzes achter de huidige afvalstoffenbelasting.',
    url: 'https://www.pbl.nl/publicaties/opties-voor-een-afvalstoffenbelasting',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'icer-2025',
    titel: 'Integrale Circulaire Economie Rapportage 2025',
    uitgever: 'PBL Planbureau voor de Leefomgeving',
    jaar: 2025,
    datum: '2025-02-20',
    type: 'Rapport',
    themas: ['Circulaire economie', 'Verpakkingen'],
    samenvatting:
      'Tweejaarlijkse stand van zaken van de circulaire economie in Nederland. Het grondstoffengebruik daalt nog niet structureel en voor veel circulaire producten ontbreekt een markt. Bevat een verdieping op plastic verpakkingen en drankenkartons en aanbevelingen voor beleid.',
    bruikbaarVoor: 'Onafhankelijk beeld van de voortgang en de beleidsrichting, bruikbaar in beleidsnota’s.',
    url: 'https://www.pbl.nl/publicaties/integrale-circulaire-economie-rapportage-2025',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'npce-2023-2030',
    titel: 'Nationaal Programma Circulaire Economie 2023–2030',
    uitgever: 'Ministerie van Infrastructuur en Waterstaat',
    jaar: 2023,
    datum: '2023-02-03',
    type: 'Beleid',
    themas: ['Circulaire economie'],
    samenvatting:
      'Het overkoepelende programma van het kabinet met maatregelen voor zuiniger grondstoffengebruik, op weg naar een volledig circulaire economie in 2050. In 2025 verscheen een geactualiseerde versie; die staat via dezelfde pagina.',
    bruikbaarVoor: 'Aansluiten van gemeentelijk afval- en grondstoffenbeleid op landelijke doelen.',
    url: 'https://www.rijksoverheid.nl/documenten/2023/02/03/nationaal-programma-circulaire-economie-2023-2030',
    formaat: 'Webpagina met PDF',
  },
  {
    id: 'ce-delft-blik',
    titel: 'Blik: bron- of nascheiden? Afwegingskader voor gemeenten',
    uitgever: 'CE Delft',
    inOpdrachtVan: 'NVRD, gefinancierd door het uitvoeringsprogramma VANG-HHA',
    jaar: 2017,
    datum: '2017-03-01',
    type: 'Handreiking',
    themas: ['Inzameling en scheiding', 'Verpakkingen'],
    samenvatting:
      'Afwegingskader voor de keuze tussen bronscheiding en nascheiding van blik, op milieu, kosten en service. Voor staal is er milieukundig weinig verschil omdat metalen goed uit bodemas worden teruggewonnen; bij aluminium hangt het af van de afscheiding bij de verbrandingsinstallatie.',
    bruikbaarVoor: 'Voorbeeld van een onderbouwde afweging tussen bron- en nascheiding; let op het jaar.',
    url: 'https://cedelft.eu/wp-content/uploads/sites/2/2021/04/CE_Delft_2K27_Blik_bron-_of_nascheiden_Def_1493204780.pdf',
    formaat: 'PDF',
  },
  {
    id: 'verpact-2024',
    titel: 'Publieksverslag 2024',
    uitgever: 'Verpact',
    jaar: 2025,
    datum: '2025-09-09', // aanmaakdatum van de pdf
    type: 'Rapport',
    themas: ['Verpakkingen', 'Cijfers'],
    samenvatting:
      'Jaarverslag van de producentenorganisatie voor verpakkingen over 2024. Beschrijft de recycling- en circulariteitsresultaten per materiaal ten opzichte van de wettelijke doelen, de inzameling via statiegeld en de vergoedingen aan gemeenten.',
    bruikbaarVoor: 'Achtergrond bij PMD-vergoedingen en recyclingprestaties in verpakkingsketens.',
    url: 'https://www.verpact.nl/sites/default/files/2025-09/VRP_PDF_Publieksverslag_2024_13.pdf',
    formaat: 'PDF',
  },
  {
    id: 'verpact-2025-voorlopig',
    titel: 'Voorlopige resultaten 2025',
    uitgever: 'Verpact',
    jaar: 2026,
    datum: '2026-04-29', // aanmaakdatum van de pdf
    type: 'Rapport',
    themas: ['Verpakkingen', 'Cijfers'],
    samenvatting:
      'Voorlopige recycle- en inzamelresultaten voor verpakkingen over 2025, met bandbreedtes per materiaal en de inname van statiegeldverpakkingen. De definitieve cijfers volgen in het publieksverslag.',
    bruikbaarVoor: 'Meest recente beeld van recycling per verpakkingsmateriaal.',
    url: 'https://www.verpact.nl/sites/default/files/2026-05/VRP_voorlopig_report_2025_17_0.pdf',
    formaat: 'PDF',
  },
  {
    id: 'rijksoverheid-textiel',
    titel: 'Regels voor hergebruik en recycling van textiel',
    uitgever: 'Rijksoverheid',
    jaar: null,
    type: 'Beleid',
    themas: ['Textiel'],
    samenvatting:
      'Uitleg over de uitgebreide producentenverantwoordelijkheid (UPV) voor textiel: producenten moeten zorgen dat consumenten het hele jaar gratis textiel kunnen inleveren. Het kabinet wil de regels aanpassen, onder meer door schoenen onder de UPV te brengen; invoering wordt verwacht in 2027.',
    bruikbaarVoor: 'Gevolgen van de UPV textiel voor gemeentelijke textielinzameling.',
    url: 'https://www.rijksoverheid.nl/themas/klimaat-milieu-en-natuur/afval/regels-voor-hergebruik-en-recycling-van-textiel',
    formaat: 'Webpagina',
  },
  {
    id: 'mvi-criteria-afval',
    titel: 'MVI-criteriatool, productgroep Verwerking huishoudelijk afval',
    uitgever: 'PIANOo',
    jaar: null,
    type: 'Hulpmiddel',
    themas: ['Aanbesteden'],
    samenvatting:
      'Online tool met criteria voor maatschappelijk verantwoord inkopen. De productgroep Verwerking huishoudelijk afval gaat over inzamelen en verwerken van fijn en grof restafval en gft, via verbranding met metaalterugwinning uit bodemas of via nascheiding.',
    bruikbaarVoor: 'Eisen en gunningscriteria kiezen voor een aanbesteding van afvalverwerking.',
    // Directe link naar productgroep 54 (cluster Energie en afval); de tool leest het deel na # zelf.
    url: 'https://www.mvicriteria.nl/nl/webtool#//54/5//nl',
    formaat: 'Online tool',
  },
];
