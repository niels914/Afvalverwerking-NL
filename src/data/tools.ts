import type { Tool, Toegang } from './types';

// Overzicht van de rekentools. De rekenlogica staat in src/lib/calc/, de cijfers met bron in src/data/.

export const toegangLabel: Record<Toegang, string> = {
  gratis: 'Gratis',
  'gratis+pro': 'Gratis deel + Pro voor leden',
  leden: 'Alleen leden',
};

export const tools: Tool[] = [
  {
    id: 'aanbesteding',
    titel: 'Aanbestedingstool',
    pad: '/tools/aanbestedingstool',
    toegang: 'gratis',
    extraLabel: 'In ontwikkeling met CE Delft, publiek beschikbaar',
    omschrijving:
      'Kies per afvalstroom eisen, gunningscriteria en contractbepalingen, verdeel de weging en download het overzicht. Verwijst naar de officiële MVI-criteria en toetst de geraamde waarde aan de Europese drempel.',
  },
  {
    id: 'index',
    titel: 'Indexcalculator',
    pad: '/tools/indexcalculator',
    toegang: 'gratis+pro',
    omschrijving: 'Bereken hoe een verwerkings- of inzameltarief meebeweegt met indexcijfers van CBS.',
    gratisDeel: 'Eén CBS-reeks, jaar- of maandcijfers, eigen basis- en peilperiode.',
    proDeel: 'Eigen weging over zes CBS-reeksen, tarief per contractjaar met plafond, vergelijking en rapport.',
  },
  {
    id: 'co2',
    titel: 'CO2-heffingenscan',
    pad: '/tools/co2-heffingenscan',
    toegang: 'gratis+pro',
    omschrijving: 'Schat wat de CO2-heffing voor afvalverbranding kost bij uw tonnage restafval, volgens wet en wetsvoorstel.',
    gratisDeel: 'Heffing in één jaar tot en met 2035, met wettelijke of eigen vrijstelling.',
    proDeel: 'Verloop tot en met 2035, drie scenario’s voor scheiding, effect per inwoner, CSV en rapport.',
  },
  {
    id: 'bodemas',
    titel: 'Bodemassencalculator',
    pad: '/tools/bodemassencalculator',
    toegang: 'gratis+pro',
    omschrijving: 'Bereken hoeveel bodemas en metalen vrijkomen en wat opwerken en het storten van residu netto kosten, met bandbreedte.',
    gratisDeel: 'Eén installatie of gemeente, ingevuld met openbare kentallen of met uw eigen contracttarieven.',
    proDeel: 'Meerdere installaties, gevoeligheidsanalyse, CSV en rapport.',
  },
  {
    id: 'pmd',
    titel: 'Rekenmodel bron- en nascheiding PMD',
    pad: '/tools/pmd-rekenmodel',
    toegang: 'leden',
    omschrijving:
      'Vergelijk de netto kosten van bron- en nascheiding van PMD voor uw gemeente, met de vergoedingen van Verpact voor 2026, de afvalcijfers van CBS en een bandbreedte.',
  },
];

/** Waar elke tool mee rekent. Getoond op de overzichtspagina. */
export const toolBronnen: Record<string, string> = {
  aanbesteding: 'MVI-criteriatool (Rijksoverheid), drempelbedragen van PIANOo en tariefkental Strategy& 2025',
  index: 'CBS: CPI, cao-lonen, producentenprijzen en dieselprijs',
  co2: 'Wet belastingen op milieugrondslag, Wet milieubeheer, NEa en Belastingplan 2027',
  bodemas: 'Rijkswaterstaat, Afvalverwerking in Nederland 2024; Staatsblad 2021, 235; CBS en Belastingdienst',
  pmd: 'Akkoord Verpact, VNG en NVRD (2025), CBS per gemeente, IPR Normag (2021), Strategy& en Belastingdienst',
};
