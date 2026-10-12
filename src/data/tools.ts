import type { Tool, Toegang } from './types';

// Overzicht van de rekentools. De rekenlogica staat in src/lib/calc/.

export const toegangLabel: Record<Toegang, string> = {
  gratis: 'Gratis',
  'gratis+pro': 'Gratis voorbeeld + Pro',
  leden: 'Alleen leden',
};

export const tools: Tool[] = [
  {
    id: 'aanbesteding',
    titel: 'Aanbestedingstool',
    pad: '/tools/aanbestedingstool',
    toegang: 'gratis',
    extraLabel: 'In ontwikkeling met CE Delft, publiek beschikbaar',
    omschrijving: 'Stel in drie stappen de scope en de weging van gunningscriteria op en krijg een checklist voor uw aanbesteding.',
  },
  {
    id: 'index',
    titel: 'Indexcalculator',
    pad: '/tools/indexcalculator',
    toegang: 'gratis+pro',
    omschrijving: 'Bereken hoe een verwerkingstarief meebeweegt met een gewogen mix van loon-, energie- en prijsindexen.',
    gratisDeel: 'Eén voorbeeldberekening met vaste weging.',
    proDeel: 'Eigen wegingen en indexreeksen, meerdere contractjaren in tabel en grafiek, rapport.',
  },
  {
    id: 'co2',
    titel: 'CO2-heffingenscan',
    pad: '/tools/co2-heffingenscan',
    toegang: 'gratis+pro',
    omschrijving: 'Schat wat een CO2-heffing op afvalverbranding kost bij uw tonnage restafval.',
    gratisDeel: 'Eén jaar, met instelbare voorbeeldwaarden.',
    proDeel: 'Meerjarig verloop, scenario’s voor scheidingspercentages en effect per inwoner.',
  },
  {
    id: 'bodemas',
    titel: 'Bodemassencalculator',
    pad: '/tools/bodemassencalculator',
    toegang: 'gratis+pro',
    omschrijving: 'Bereken de netto kosten van bodemasverwerking, na aftrek van de opbrengst van teruggewonnen metalen.',
    gratisDeel: 'Eén installatie met instelbare voorbeeldwaarden.',
    proDeel: 'Meerdere installaties, gevoeligheidsanalyse en rapport.',
  },
  {
    id: 'pmd',
    titel: 'Rekenmodel bron- en nascheiding PMD',
    pad: '/tools/pmd-rekenmodel',
    toegang: 'leden',
    omschrijving: 'Vergelijk de kosten van bron- en nascheiding van PMD: totaal, per inwoner en ingezameld tonnage.',
  },
];
