// Eisen, gunningscriteria en contractbepalingen per afvalstroom voor de Aanbestedingstool (onderdeel tools-b).
//
// Opzet naar het voorbeeld van de MVI-criteriatool (productgroep → eisen en gunningscriteria → selecteren → downloaden).
// Alle teksten hieronder zijn eigen formuleringen van KplusV. Waar een officieel MVI-criterium bestaat, staat de code
// erbij met een link naar de MVI-criteriatool; de officiële tekst staat alleen daar. Criteria zonder MVI-code zijn
// voorbeelden van KplusV, geen officiële criteria en geen juridisch advies.
// Onderhoud: controleer de MVI-codes en versiedatum bij elke nieuwe versie van de MVI-criteriatool (zie docs/stukken/tools-b.md).

import { bronnen, PEILDATUM, type Bron } from './tools-b-bronnen';
import { kentalVerbrandingstarief, poorttariefBandbreedte, asb2026, verbrandingstariefBand, cbsPmd, pmdGrenzen } from './tools-b-pmd';

export { PEILDATUM };

export type StroomId = 'restafval' | 'grof' | 'gft' | 'pmd' | 'papier' | 'textiel' | 'inzameling' | 'minicontainers';
export type CriteriumSoort = 'eis' | 'gunning' | 'contract' | 'aandachtspunt';
export type Thema = 'klimaat' | 'circulair' | 'kwaliteit' | 'sociaal' | 'prijs';

export const soortLabel: Record<CriteriumSoort, string> = {
  eis: 'Eis',
  gunning: 'Gunningscriterium',
  contract: 'Contractbepaling',
  aandachtspunt: 'Aandachtspunt',
};
export const soortMeervoud: Record<CriteriumSoort, string> = {
  eis: 'Eisen',
  gunning: 'Gunningscriteria',
  contract: 'Contractbepalingen',
  aandachtspunt: 'Aandachtspunten',
};
export const soortUitleg: Record<CriteriumSoort, string> = {
  eis: 'Minimumeisen. Een inschrijving die er niet aan voldoet, valt af.',
  gunning: 'Hiermee onderscheiden inschrijvers zich. U geeft elk gekozen criterium een weging.',
  contract: 'Afspraken die in de overeenkomst komen en gelden tijdens de uitvoering.',
  aandachtspunt: 'Om rekening mee te houden bij de voorbereiding, bijvoorbeeld in een marktconsultatie.',
};
export const themaLabel: Record<Thema, string> = {
  klimaat: 'Klimaat',
  circulair: 'Circulair',
  kwaliteit: 'Kwaliteit',
  sociaal: 'Social return',
  prijs: 'Prijs en risico',
};

/** Ambitieniveaus zoals de MVI-criteriatool ze gebruikt. 0 = suggestie zonder niveau. */
export const ambitieLabel: Record<0 | 1 | 2 | 3, string> = {
  0: 'Suggestie',
  1: 'Basis',
  2: 'Significant',
  3: 'Ambitieus',
};

export interface MviVerwijzing {
  /** Code in de MVI-criteriatool, bijv. "049.003". */
  code: string;
  ambitie: 0 | 1 | 2 | 3;
  /** Productgroep in de MVI-criteriatool. */
  bron: Bron;
}

export interface Criterium {
  id: string;
  stromen: StroomId[] | 'alle';
  soort: CriteriumSoort;
  thema: Thema;
  titel: string;
  /** Wat u vraagt, in eigen woorden. */
  tekst: string;
  /** Hoe u het toetst of wat de inschrijver aanlevert. */
  toetsing?: string;
  mvi?: MviVerwijzing;
  /** Link naar een rekentool op dit platform die helpt bij dit criterium. */
  tool?: { pad: string; naam: string };
  /** Voorstel voor punten in de weging (alleen gunningscriteria). */
  punten?: number;
}

export interface Stroom {
  id: StroomId;
  naam: string;
  omschrijving: string;
  /** Soort opdracht, voor de drempeltoets. */
  opdrachtsoort: 'dienst' | 'levering';
  /** MVI-productgroep als die bestaat. */
  mvi?: Bron;
  /** Eenheid van het volume. */
  volumeEenheid: string;
  /** Eenheid van het geraamde tarief. */
  tariefEenheid: string;
  /** Kental voor het tarief met bron, als die er is. */
  tariefKental?: { waarde: number; laag: number; hoog: number; toelichting: string; bron: Bron[] };
}

const mviAfval = bronnen.mviAfval;
const mviVoertuigen = bronnen.mviZwareVoertuigen;

export const stroomLijst: Stroom[] = [
  {
    id: 'restafval',
    naam: 'Fijn huishoudelijk restafval',
    omschrijving: 'Verwerking in een afvalenergiecentrale, eventueel met nascheiding vooraf.',
    opdrachtsoort: 'dienst',
    mvi: mviAfval,
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
    tariefKental: {
      waarde: kentalVerbrandingstarief,
      laag: verbrandingstariefBand.laag,
      hoog: verbrandingstariefBand.hoog,
      toelichting: `Kental: midden van het poorttarief bij aanbesteding (€ ${poorttariefBandbreedte.laag}–${poorttariefBandbreedte.hoog} per ton, Strategy& 2025 op basis van ACM 2023) plus afvalstoffenbelasting 2026 (€ ${String(asb2026).replace('.', ',')} per ton). De raming toont daarom een bandbreedte. Vul uw eigen raming in.`,
      bron: [bronnen.strategyVa2025, bronnen.asb],
    },
  },
  {
    id: 'grof',
    naam: 'Grof huishoudelijk restafval',
    omschrijving: 'Verwerking en nascheiding van grof restafval van haal- en brengservice (milieustraat).',
    opdrachtsoort: 'dienst',
    mvi: mviAfval,
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'gft',
    naam: 'GFT-afval',
    omschrijving: 'Vergisten en composteren van groente-, fruit- en tuinafval.',
    opdrachtsoort: 'dienst',
    mvi: mviAfval,
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'pmd',
    naam: 'PMD',
    omschrijving: 'Inzameling en op- en overslag van plastic verpakkingen, metalen verpakkingen en drankenkartons.',
    opdrachtsoort: 'dienst',
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'papier',
    naam: 'Oud papier en karton',
    omschrijving: 'Inzameling, op- en overslag en vermarkting van oud papier en karton.',
    opdrachtsoort: 'dienst',
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'textiel',
    naam: 'Textiel',
    omschrijving: 'Inzameling en sortering van textiel voor hergebruik en recycling.',
    opdrachtsoort: 'dienst',
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'inzameling',
    naam: 'Inzameling huishoudelijk afval',
    omschrijving: 'Inzameldienst met voertuigen en personeel. De MVI-productgroep huishoudelijk afval omvat ook het inzamelen van restafval.',
    opdrachtsoort: 'dienst',
    mvi: mviAfval,
    volumeEenheid: 'ton/jaar',
    tariefEenheid: '€/ton',
  },
  {
    id: 'minicontainers',
    naam: 'Minicontainers',
    omschrijving: 'Levering, onderhoud en terugname van minicontainers.',
    opdrachtsoort: 'levering',
    mvi: mviAfval,
    volumeEenheid: 'stuks/jaar',
    tariefEenheid: '€/stuk',
  },
];

export const stromen = Object.fromEntries(stroomLijst.map((s) => [s.id, s])) as Record<StroomId, Stroom>;

/** Soort opdracht voor de drempeltoets. */
export type OpdrachtType = 'diensten' | 'sociaal' | 'concessie';
export const opdrachtTypen: Record<OpdrachtType, { label: string; uitleg: string }> = {
  diensten: { label: 'Diensten of leveringen', uitleg: 'De gewone opdracht: inzamelen, verwerken of leveren voor een vergoeding van de opdrachtgever.' },
  sociaal: {
    label: 'Sociale en andere specifieke diensten',
    uitleg: 'Alleen voor diensten uit bijlage XIV van de aanbestedingsrichtlijn, zoals zorg en re-integratie. Afvalinzameling en -verwerking vallen daar in de regel niet onder.',
  },
  concessie: {
    label: 'Dienstenconcessie',
    uitleg: 'De opdrachtnemer krijgt het recht de dienst te exploiteren en draagt zelf het exploitatierisico, bijvoorbeeld omdat hij zijn inkomsten bij gebruikers haalt.',
  },
};

/**
 * Drempelbedragen 1 januari 2026 tot en met 31 december 2027, euro excl. btw. Bron: PIANOo.
 * `bedrag` is het drempelbedrag voor leveringen en diensten; `bedragen` per soort opdracht.
 */
export const drempels = {
  decentraal: {
    kort: 'Decentrale overheid',
    label: 'Decentrale overheid (gemeente, provincie, waterschap, gemeenschappelijke regeling)',
    bedrag: 216000,
    bedragen: { diensten: 216000, sociaal: 750000, concessie: 5404000 },
  },
  centraal: { kort: 'Centrale overheid', label: 'Centrale overheid (Rijk)', bedrag: 140000, bedragen: { diensten: 140000, sociaal: 750000, concessie: 5404000 } },
  speciaal: { kort: 'Speciale-sectorbedrijf', label: 'Speciale-sectorbedrijf', bedrag: 432000, bedragen: { diensten: 432000, sociaal: 1000000, concessie: 5404000 } },
} as const satisfies Record<string, { kort: string; label: string; bedrag: number; bedragen: Record<OpdrachtType, number> }>;
export type DrempelId = keyof typeof drempels;
export const drempelBron = bronnen.pianooDrempels;

const index = { pad: '/tools/indexcalculator', naam: 'Indexcalculator' };
const co2 = { pad: '/tools/co2-heffingenscan', naam: 'CO2-heffingenscan' };
const bodemas = { pad: '/tools/bodemassencalculator', naam: 'Bodemassencalculator' };
const pmd = { pad: '/tools/pmd-rekenmodel', naam: 'Rekenmodel bron- en nascheiding PMD' };

export const criteria: Criterium[] = [
  /* ---------- Alle stromen ---------- */
  {
    id: 'alg-index',
    stromen: 'alle',
    soort: 'contract',
    thema: 'prijs',
    titel: 'Indexering van het tarief',
    tekst: 'Leg vast met welke openbare indexreeksen het tarief jaarlijks meebeweegt, met welke weging, welk peilmoment en of er een plafond geldt.',
    toetsing: 'Gebruik reeksen die CBS publiceert, zodat beide partijen de indexatie kunnen narekenen.',
    tool: index,
  },
  {
    id: 'alg-volume',
    stromen: 'alle',
    soort: 'contract',
    thema: 'prijs',
    titel: 'Bandbreedte voor het volume',
    tekst: 'Spreek af binnen welke bandbreedte rond het geraamde volume het tarief gelijk blijft en wat er gebeurt bij meer of minder aanbod.',
  },
  {
    id: 'alg-rapportage',
    stromen: 'alle',
    soort: 'contract',
    thema: 'kwaliteit',
    titel: 'Rapportage over hoeveelheden en eindbestemming',
    tekst: 'De opdrachtnemer rapporteert periodiek per afvalstroomnummer: aangeleverde hoeveelheden, verwerkingsroute en eindbestemming van de reststromen.',
    toetsing: 'Leg frequentie, vorm (bijvoorbeeld CSV) en termijn van aanlevering vast.',
  },
  {
    id: 'alg-uitwijk',
    stromen: 'alle',
    soort: 'eis',
    thema: 'prijs',
    titel: 'Uitwijk bij storing of calamiteit',
    tekst: 'De inschrijver beschrijft hoe het afval wordt verwerkt als de eigen installatie of route uitvalt, en tegen welke voorwaarden.',
    toetsing: 'Vraag een uitwijkplan met de beoogde locaties en de maximale reactietijd.',
  },
  {
    id: 'alg-aanpak',
    stromen: 'alle',
    soort: 'gunning',
    thema: 'kwaliteit',
    titel: 'Plan van aanpak voor uitvoering en overdracht',
    tekst: 'Beoordeel hoe de inschrijver de start, de dagelijkse uitvoering, het contractoverleg en de overdracht aan het einde van de looptijd regelt.',
    toetsing: 'Maak vooraf bekend waarop u let en hoe u punten toekent, bijvoorbeeld met een beoordelingsschaal per aspect.',
    punten: 15,
  },
  {
    id: 'alg-sr-eis',
    stromen: 'alle',
    soort: 'eis',
    thema: 'sociaal',
    titel: 'Social return als minimumeis',
    tekst: 'Een vast percentage van de opdrachtwaarde (de MVI-criteriatool gaat uit van 5 %) besteedt de opdrachtnemer aan werk voor mensen met afstand tot de arbeidsmarkt, met een plan van aanpak na gunning.',
    mvi: { code: '049.012', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'alg-sr-gc',
    stromen: 'alle',
    soort: 'gunning',
    thema: 'sociaal',
    titel: 'Meer social return dan het minimum',
    tekst: 'Inschrijvers die meer social return aanbieden dan de minimumeis en dat onderbouwen, scoren hoger.',
    mvi: { code: '049.013', ambitie: 2, bron: mviAfval },
    punten: 5,
  },
  {
    id: 'alg-sr-rapport',
    stromen: 'alle',
    soort: 'contract',
    thema: 'sociaal',
    titel: 'Verantwoording van social return',
    tekst: 'De opdrachtnemer verantwoordt periodiek hoeveel mensen uit welke doelgroep zijn ingezet en welke waarde daarmee is gerealiseerd, zonder namen.',
    mvi: { code: '049.015', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'alg-sr-maatwerk',
    stromen: 'alle',
    soort: 'aandachtspunt',
    thema: 'sociaal',
    titel: 'Ruimte voor maatwerk bij social return',
    tekst: 'Overweeg een vormvrije invulling die de opdrachtnemer samen met u uitwerkt, in plaats van een vast percentage.',
    mvi: { code: '049.014', ambitie: 0, bron: mviAfval },
  },

  /* ---------- Fijn huishoudelijk restafval ---------- */
  {
    id: 'rest-co2-basis',
    stromen: ['restafval'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'CO2-score van de verwerking, basismethode',
    tekst: 'Inschrijvers berekenen de CO2-score van hun verwerking met de basisversie van de methodiek duurzaam aanbesteden afval: energieterugwinning, biogas en terugwinning van metalen, kunststoffen en glas. Een betere score levert meer punten op.',
    toetsing: 'Neem de invultabel en weegfactoren uit de MVI-criteriatool over en vraag de onderbouwing per installatie.',
    mvi: { code: '049.001', ambitie: 2, bron: mviAfval },
    punten: 15,
  },
  {
    id: 'rest-co2-detail',
    stromen: ['restafval'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'CO2-score van de verwerking, gedetailleerde methode',
    tekst: 'Als de basismethode, maar uitgebreider: elektriciteit en warmte apart, meer teruggewonnen materialen, transport en eventuele CO2-afvang, op basis van jaargemiddelden per installatie.',
    toetsing: 'Kies de basis- of de gedetailleerde methode, niet allebei.',
    mvi: { code: '049.002', ambitie: 3, bron: mviAfval },
    punten: 20,
  },
  {
    id: 'rest-r1',
    stromen: ['restafval'],
    soort: 'eis',
    thema: 'klimaat',
    titel: 'Verbranding met energieterugwinning',
    tekst: 'Het restafval wordt verwerkt in een installatie die als nuttige toepassing (R1) is aangemerkt, of in een gelijkwaardige route met energieterugwinning.',
    toetsing: 'Vraag naar de status en de laatst vastgestelde energie-efficiëntie van de installatie.',
  },
  {
    id: 'rest-bodemas',
    stromen: ['restafval'],
    soort: 'contract',
    thema: 'circulair',
    titel: 'Bodemas en teruggewonnen metalen',
    tekst: 'Leg vast hoe de opdrachtnemer rapporteert over bodemas, teruggewonnen ferro en non-ferro en de toepassing van de opgewerkte bodemas, en of de opdrachtgever deelt in de metaalopbrengst.',
    tool: bodemas,
  },
  {
    id: 'rest-co2-heffing',
    stromen: ['restafval'],
    soort: 'contract',
    thema: 'prijs',
    titel: 'Doorberekening van de CO2-heffing',
    tekst: 'Regel of en hoe de CO2-heffing voor afvalverbranding apart in het tarief zit, hoe die wordt berekend en wat er gebeurt als de wet verandert.',
    tool: co2,
  },
  {
    id: 'rest-transport',
    stromen: ['restafval'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'Uitstoot door transport naar de verwerking',
    tekst: 'Inschrijvers geven de afstand van overslag naar verwerking en de inzet van schone vervoersmiddelen op. Minder uitstoot levert meer punten op.',
    punten: 5,
  },
  {
    id: 'rest-nascheiding',
    stromen: ['restafval'],
    soort: 'aandachtspunt',
    thema: 'circulair',
    titel: 'Nascheiding als variant',
    tekst: 'Bepaal vooraf of u nascheiding van PMD uit restafval wilt toestaan of vragen. Dat hangt samen met uw inzamelsysteem en de afspraken met Verpact.',
    tool: pmd,
  },

  /* ---------- Grof huishoudelijk restafval ---------- */
  {
    id: 'grof-nsp-eis',
    stromen: ['grof'],
    soort: 'eis',
    thema: 'circulair',
    titel: 'Gegarandeerde nascheidingsprestatie',
    tekst: 'De inschrijver garandeert dat minimaal een door u gekozen percentage van het grof restafval na nascheiding naar recycling gaat, gedurende de hele looptijd, en beschrijft de technieken.',
    toetsing: 'Geef aan welk deel via de haalservice en welk deel via de milieustraat binnenkomt. Vraag een periodieke uitdraai van wat werkelijk naar recycling ging.',
    mvi: { code: '049.003', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'grof-nsp-gc',
    stromen: ['grof'],
    soort: 'gunning',
    thema: 'circulair',
    titel: 'Hogere nascheidingsprestatie',
    tekst: 'Hoe hoger de gegarandeerde nascheidingsprestatie boven uw minimum, hoe meer punten.',
    mvi: { code: '049.004', ambitie: 2, bron: mviAfval },
    punten: 15,
  },
  {
    id: 'grof-transport',
    stromen: ['grof'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'Klimaatprestatie van het transport',
    tekst: 'De uitstoot van broeikasgassen voor het vervoer naar de nascheider en van de nascheider naar de verbranding, per ton grof restafval. Lager is beter.',
    mvi: { code: '049.005', ambitie: 2, bron: mviAfval },
    punten: 5,
  },
  {
    id: 'grof-samenstelling',
    stromen: ['grof'],
    soort: 'aandachtspunt',
    thema: 'kwaliteit',
    titel: 'Samenstelling en herkomst meegeven',
    tekst: 'Inschrijvers kunnen een nascheidingsprestatie alleen goed opgeven als ze weten wat er in uw grof restafval zit. Geef een recente samenstelling en de verdeling haal/breng mee.',
  },

  /* ---------- GFT ---------- */
  {
    id: 'gft-co2-basis',
    stromen: ['gft'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'CO2-score van de GFT-verwerking, basismethode',
    tekst: 'Inschrijvers berekenen de CO2-score met de basisversie van de methodiek duurzaam aanbesteden afval: biogas, CO2-afvang bij opwerking tot groengas en de hoeveelheid en afzet van compost.',
    mvi: { code: '049.006', ambitie: 2, bron: mviAfval },
    punten: 15,
  },
  {
    id: 'gft-co2-detail',
    stromen: ['gft'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'CO2-score van de GFT-verwerking, gedetailleerde methode',
    tekst: 'Als de basismethode, aangevuld met netto energieproductie, transport, methaanemissie en afzet van biomassa, op basis van driejarige gemiddelden.',
    toetsing: 'Kies de basis- of de gedetailleerde methode, niet allebei.',
    mvi: { code: '049.007', ambitie: 3, bron: mviAfval },
    punten: 20,
  },
  {
    id: 'gft-acceptatie',
    stromen: ['gft'],
    soort: 'aandachtspunt',
    thema: 'kwaliteit',
    titel: 'Acceptatie van vervuild GFT',
    tekst: 'Leg vast tot welk vervuilingspercentage de verwerker GFT accepteert, hoe dat wordt gemeten en wat afkeur kost. Vraag in een marktconsultatie welke voorbehandeling mogelijk is.',
    mvi: { code: '049.008', ambitie: 0, bron: mviAfval },
  },
  {
    id: 'gft-compost',
    stromen: ['gft'],
    soort: 'eis',
    thema: 'circulair',
    titel: 'Kwaliteit en afzet van compost',
    tekst: 'De compost voldoet aan de wettelijke eisen voor meststoffen. De inschrijver beschrijft waar de compost wordt afgezet.',
    toetsing: 'Vraag naar analyses en een eventueel keurmerk.',
  },
  {
    id: 'gft-piek',
    stromen: ['gft'],
    soort: 'contract',
    thema: 'prijs',
    titel: 'Piekaanvoer in voorjaar en najaar',
    tekst: 'Spreek af hoe de verwerker omgaat met de hogere aanvoer in het groeiseizoen en of daarvoor een ander tarief of een andere locatie geldt.',
  },

  /* ---------- PMD ---------- */
  {
    id: 'pmd-overslag',
    stromen: ['pmd'],
    soort: 'eis',
    thema: 'kwaliteit',
    titel: 'Op- en overslag volgens de afspraken met Verpact',
    tekst: 'De overslaglocatie werkt mee aan de vaste opschoning van binnenkomende vrachten, de overdracht aan Verpact en de toegang voor metingen, zoals in het akkoord tussen Verpact, VNG en NVRD is afgesproken.',
    toetsing: 'Neem de actuele protocollen van Verpact op als bijlage bij het bestek.',
  },
  {
    id: 'pmd-kwaliteit',
    stromen: ['pmd'],
    soort: 'gunning',
    thema: 'kwaliteit',
    titel: 'Aanpak voor betere kwaliteit en respons',
    tekst: 'De inschrijver beschrijft hoe hij bijdraagt aan een hoger aandeel PMD-verpakkingen in het ingezamelde materiaal, bijvoorbeeld met terugkoppeling per route.',
    toetsing: 'Een hogere staffelcategorie levert per ton meer inzamelvergoeding op. Reken het effect door met het rekenmodel.',
    tool: pmd,
    punten: 15,
  },
  {
    id: 'pmd-metingen',
    stromen: ['pmd'],
    soort: 'contract',
    thema: 'kwaliteit',
    titel: 'Medewerking aan samenstellingsanalyses',
    tekst: 'De opdrachtnemer houdt vrachten per inzamelmiddel en route gescheiden aan, zodat meetbureaus de samenstelling kunnen bepalen voor de staffelindeling.',
  },
  {
    id: 'pmd-residu',
    stromen: ['pmd'],
    soort: 'contract',
    thema: 'prijs',
    titel: 'Kosten van het residu na opschoning',
    tekst: 'Regel wie de verwerking betaalt van materiaal dat bij de opschoning wordt verwijderd. Volgens het akkoord komen die kosten voor rekening van de gemeente.',
  },

  /* ---------- Papier en karton ---------- */
  {
    id: 'pap-kwaliteit',
    stromen: ['papier'],
    soort: 'eis',
    thema: 'kwaliteit',
    titel: 'Kwaliteit volgens een erkende papiersoortenlijst',
    tekst: 'Leg vast in welke kwaliteit het papier wordt afgezet, met verwijzing naar de Europese lijst van standaardsoorten oud papier (EN 643).',
  },
  {
    id: 'pap-prijs',
    stromen: ['papier'],
    soort: 'contract',
    thema: 'prijs',
    titel: 'Vergoeding die meebeweegt met de markt',
    tekst: 'Koppel de vergoeding aan een onafhankelijk gepubliceerde marktnotering, met een vaste rekenregel en eventueel een bodemprijs.',
  },
  {
    id: 'pap-verenigingen',
    stromen: ['papier'],
    soort: 'aandachtspunt',
    thema: 'sociaal',
    titel: 'Inzameling door scholen en verenigingen',
    tekst: 'Bepaal of verenigingen blijven inzamelen en hoe hun vergoeding en hoeveelheden in de opdracht meetellen.',
  },

  /* ---------- Textiel ---------- */
  {
    id: 'tex-upv',
    stromen: ['textiel'],
    soort: 'aandachtspunt',
    thema: 'circulair',
    titel: 'Afstemming met de producentenverantwoordelijkheid',
    tekst: 'Voor textiel geldt een uitgebreide producentenverantwoordelijkheid. Stem de opdracht af op de afspraken die producenten en gemeenten daarover maken.',
  },
  {
    id: 'tex-hergebruik',
    stromen: ['textiel'],
    soort: 'gunning',
    thema: 'circulair',
    titel: 'Aandeel hergebruik en recycling',
    tekst: 'Inschrijvers geven op welk deel van het ingezamelde textiel naar hergebruik en welk deel naar recycling gaat. Meer hergebruik en recycling levert meer punten op.',
    toetsing: 'Laat het aandeel jaarlijks aantonen met sorteercijfers.',
    punten: 15,
  },
  {
    id: 'tex-bestemming',
    stromen: ['textiel'],
    soort: 'contract',
    thema: 'circulair',
    titel: 'Inzicht in de eindbestemming',
    tekst: 'De opdrachtnemer rapporteert naar welke landen en afnemers het gesorteerde textiel gaat.',
  },

  /* ---------- Inzameling ---------- */
  {
    id: 'inz-ze',
    stromen: ['inzameling'],
    soort: 'eis',
    thema: 'klimaat',
    titel: 'Zero-emissie inzamelvoertuigen',
    tekst: 'De voertuigen die voor de opdracht worden ingezet, stoten bij gebruik geen uitlaatgassen uit.',
    toetsing: 'Overweeg een ingroeipad als de looptijd lang is of de markt nog niet zover is.',
    mvi: { code: '042.002', ambitie: 2, bron: mviVoertuigen },
  },
  {
    id: 'inz-ze-gc',
    stromen: ['inzameling'],
    soort: 'gunning',
    thema: 'klimaat',
    titel: 'Sneller zero-emissie',
    tekst: 'Als zero-emissie (nog) geen eis is: inschrijvers die eerder of met meer zero-emissievoertuigen werken, scoren hoger.',
    punten: 10,
  },
  {
    id: 'inz-banden',
    stromen: ['inzameling'],
    soort: 'eis',
    thema: 'klimaat',
    titel: 'Zuinige en stille banden',
    tekst: 'Banden voldoen aan minimumklassen voor brandstofefficiëntie, grip op nat wegdek en rolgeluid.',
    mvi: { code: '042.003', ambitie: 1, bron: mviVoertuigen },
  },
  {
    id: 'inz-dienst',
    stromen: ['inzameling'],
    soort: 'gunning',
    thema: 'kwaliteit',
    titel: 'Dienstverlening aan inwoners',
    tekst: 'Beoordeel hoe de inschrijver gemiste ledigingen, meldingen en klachten afhandelt en welke prestatie-indicatoren hij voorstelt.',
    punten: 15,
  },

  /* ---------- Minicontainers ---------- */
  {
    id: 'mc-garantie',
    stromen: ['minicontainers'],
    soort: 'eis',
    thema: 'kwaliteit',
    titel: 'Garantie op productiefouten van minimaal zeven jaar',
    tekst: 'De leverancier geeft fabrieksgarantie van ten minste zeven jaar en toont aan dat het materiaal bij normaal gebruik niet zodanig veroudert dat de container gaat lekken.',
    mvi: { code: '049.009', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'mc-onderdelen',
    stromen: ['minicontainers'],
    soort: 'eis',
    thema: 'circulair',
    titel: 'Reserveonderdelen tien jaar leverbaar',
    tekst: 'Deksels, assen en wielen blijven tot tien jaar na het einde van de productie leverbaar.',
    mvi: { code: '049.010', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'mc-recyclaat',
    stromen: ['minicontainers'],
    soort: 'eis',
    thema: 'circulair',
    titel: 'Minimaal 80 % recyclaat in de grijze onderdelen',
    tekst: 'De grijze onderdelen bestaan voor ten minste 80 % uit gerecycled materiaal met aantoonbare herkomst.',
    mvi: { code: '049.011', ambitie: 1, bron: mviAfval },
  },
  {
    id: 'mc-terugname',
    stromen: ['minicontainers'],
    soort: 'contract',
    thema: 'circulair',
    titel: 'Terugname van afgedankte containers',
    tekst: 'De leverancier neemt afgedankte containers terug en verwerkt het materiaal tot nieuw product, met rapportage over hoeveelheden.',
  },
];

/** Criteria die bij een stroom horen, in vaste volgorde: eerst stroomspecifiek, dan algemeen. */
export function criteriaVoorStroom(stroom: StroomId): Criterium[] {
  const eigen = criteria.filter((c) => c.stromen !== 'alle' && c.stromen.includes(stroom));
  const alg = criteria.filter((c) => c.stromen === 'alle');
  return [...eigen, ...alg];
}

/** Standaardselectie: alle eisen en gunningscriteria van ambitieniveau 1 en 2 plus KplusV-criteria, geen dubbele CO2-methode. */
export function standaardSelectie(stroom: StroomId): string[] {
  return criteriaVoorStroom(stroom)
    .filter((c) => c.soort !== 'aandachtspunt')
    .filter((c) => !c.mvi || (c.mvi.ambitie >= 1 && c.mvi.ambitie <= 2))
    .map((c) => c.id);
}

/** Of een MVI-criterium bij de productgroep van deze stroom hoort ('eigen') of uit een andere productgroep komt. */
export type MviStatus = 'eigen' | 'andere';
export function mviStatus(c: Criterium, stroom: StroomId): MviStatus | null {
  if (!c.mvi) return null;
  return stromen[stroom].mvi === c.mvi.bron ? 'eigen' : 'andere';
}

/** Naam van de MVI-productgroep. */
export function productgroepNaam(b: Bron): string {
  if (b === mviAfval) return 'Verwerking huishoudelijk afval';
  if (b === mviVoertuigen) return 'Zware voertuigen – aanschaf';
  return b.titel;
}

/** Landelijke hoeveelheid fijn huishoudelijk restafval (ton), voor de plausibiliteitscontrole van het volume. */
export const restafvalNlTon = Math.round((pmdGrenzen.inwonersNl * cbsPmd.landelijk.restafvalKgPerInw) / 1000);
export const inwonersNl = pmdGrenzen.inwonersNl;

/** Voorstel punten voor prijs, als uitgangspunt voor de weging. De gebruiker stelt zelf in. */
export const prijsPuntenVoorstel = 50;

export const aanbestedingBronnen = {
  mviAfval,
  mviVoertuigen,
  drempels: bronnen.pianooDrempels,
  gunning: bronnen.pianooGunning,
  bpkv: bronnen.pianooBpkv,
  plicht: bronnen.pianooPlicht,
  mvi: bronnen.pianooMvi,
};
