import type { Publicatie } from './types';

// FICTIEF: tien verzonnen publicaties van generieke, verzonnen uitgevers.
// Geen titels op naam van echte organisaties.

export const kennisbankThemas = ['Aanbesteden', 'Indexering', 'CO2-heffing', 'Bodemas', 'PMD', 'GFT', 'Textiel'] as const;

export const publicaties: Publicatie[] = [
  {
    id: 'k01',
    titel: 'Handreiking aanbesteden van restafvalverwerking',
    jaar: 2026,
    type: 'Handreiking',
    thema: 'Aanbesteden',
    uitgever: 'Brancheorganisatie (voorbeeld)',
    samenvatting: 'Stappenplan voor het voorbereiden en uitvoeren van een aanbesteding voor de verwerking van restafval.',
  },
  {
    id: 'k02',
    titel: 'Indexeringsformules in afvalcontracten: een vergelijking',
    jaar: 2025,
    type: 'Rapport',
    thema: 'Indexering',
    uitgever: 'Onderzoeksbureau (voorbeeld)',
    samenvatting: 'Vergelijkt twintig indexeringsclausules en laat zien hoe verschillende wegingen uitpakken over tien jaar.',
  },
  {
    id: 'k03',
    titel: 'Factsheet CO2-heffing bij afvalverbranding',
    jaar: 2026,
    type: 'Factsheet',
    thema: 'CO2-heffing',
    uitgever: 'Kennisinstituut (voorbeeld)',
    samenvatting: 'Legt in twee pagina’s uit hoe een heffing op CO2-uitstoot bij verbranding werkt en wie de kosten draagt.',
  },
  {
    id: 'k04',
    titel: 'Bodemas als bouwstof: kosten en kansen',
    jaar: 2024,
    type: 'Rapport',
    thema: 'Bodemas',
    uitgever: 'Onderzoeksbureau (voorbeeld)',
    samenvatting: 'Brengt de keten van bodemasopwerking in kaart, van verbrandingsoven tot toepassing in de wegenbouw.',
  },
  {
    id: 'k05',
    titel: 'Bron- of nascheiding van PMD? Een afwegingskader',
    jaar: 2025,
    type: 'Handreiking',
    thema: 'PMD',
    uitgever: 'Adviesbureau (voorbeeld)',
    samenvatting: 'Helpt gemeenten bij de keuze tussen bron- en nascheiding met criteria voor kosten, kwaliteit en service.',
  },
  {
    id: 'k06',
    titel: 'Kwaliteit van GFT en eisen aan compost',
    jaar: 2024,
    type: 'Factsheet',
    thema: 'GFT',
    uitgever: 'Kennisinstituut (voorbeeld)',
    samenvatting: 'Vat samen welke verontreinigingen in GFT het vaakst voorkomen en wat dat betekent voor de verwerking.',
  },
  {
    id: 'k07',
    titel: 'Gunningscriteria voor duurzame afvalverwerking',
    jaar: 2026,
    type: 'Handreiking',
    thema: 'Aanbesteden',
    uitgever: 'Brancheorganisatie (voorbeeld)',
    samenvatting: 'Geeft voorbeelden van criteria voor CO2, kwaliteit en circulariteit en hoe je die meetbaar maakt.',
  },
  {
    id: 'k08',
    titel: 'Inzameling van textiel onder producentenverantwoordelijkheid',
    jaar: 2025,
    type: 'Rapport',
    thema: 'Textiel',
    uitgever: 'Onderzoeksbureau (voorbeeld)',
    samenvatting: 'Beschrijft de rolverdeling tussen gemeenten en producenten en de gevolgen voor bestaande inzamelcontracten.',
  },
  {
    id: 'k09',
    titel: 'Monitor verwerkingstarieven restafval',
    jaar: 2026,
    type: 'Factsheet',
    thema: 'Indexering',
    uitgever: 'Kennisinstituut (voorbeeld)',
    samenvatting: 'Toont de spreiding van verwerkingstarieven per regio en de ontwikkeling over de afgelopen vijf jaar.',
  },
  {
    id: 'k10',
    titel: 'Scenario’s voor verbrandingscapaciteit tot 2035',
    jaar: 2025,
    type: 'Rapport',
    thema: 'CO2-heffing',
    uitgever: 'Adviesbureau (voorbeeld)',
    samenvatting: 'Verkent drie scenario’s voor aanbod en capaciteit en het effect van een stijgende heffing op tarieven.',
  },
];
