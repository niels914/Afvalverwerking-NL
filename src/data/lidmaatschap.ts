// Lidmaatschap: wat gratis is, wat leden krijgen en de richtprijzen.
// CONCEPT: de prijzen zijn indicatief en nog niet vastgesteld.

export const gratisOnderdelen = [
  'Restafvalkaart van Nederland met kerncijfers per samenwerkingsverband',
  'Nieuwsoverzicht over afvalverwerking',
  'Kennisbank met onderzoeken, factsheets en handreikingen',
  'Aanbestedingstool (in ontwikkeling met CE Delft)',
  'Voorbeeldberekening van de indexcalculator, CO2-heffingenscan en bodemassencalculator',
];

export const ledenOnderdelen = [
  'Lopende en afgeronde aanbestedingen per samenwerkingsverband op de kaart',
  'Aanbestedingsarchief met filters op stroom, status en regio',
  'Pro-versies van de rekentools: eigen invoer, meerdere jaren en scenario’s',
  'Rekenmodel bron- en nascheiding PMD',
  'Rapport maken: een printbare weergave van invoer, formule en uitkomst',
  'Jaarlijks bijgewerkte indexcijfers',
];

export interface Prijsklasse {
  doelgroep: string;
  toelichting: string;
  van: number;
  tot: number;
}

export const prijsklassen: Prijsklasse[] = [
  { doelgroep: 'Samenwerkingsverband, klein', toelichting: '2 tot 3 gemeenten', van: 2000, tot: 3000 },
  { doelgroep: 'Samenwerkingsverband, groot', toelichting: 'Meer dan 3 gemeenten', van: 7000, tot: 10000 },
  { doelgroep: 'Verwerker', toelichting: 'Afhankelijk van omvang', van: 3000, tot: 8000 },
];
