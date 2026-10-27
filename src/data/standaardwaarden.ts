// Standaardwaarden van de rekentools.
// Bodemassencalculator, Rekenmodel PMD en Aanbestedingstool (onderdeel tools-b) rekenen met kentallen uit openbare
// bronnen; die staan met bron en peildatum in src/data/tools-b-*.ts. Waarden zonder openbare bron staan hier op
// null: de gebruiker vult ze zelf in en de tool zegt dat.

import type { BodemasInvoer } from '../lib/calc/bodemas';
import type { PmdInvoer } from '../lib/calc/pmd';
import { bodemasKental, bodemasScenario, gemiddeldPerAvi, stortbelasting2026 } from './tools-b-bodemas';
import { cbsPmd, kentalNascheidingskosten, kentalVerbrandingstarief, kostenbasisBron, nascheiding, nascheidingRendement, staffelPerCategorie, type StaffelCategorie } from './tools-b-pmd';
import { prijsPuntenVoorstel, standaardSelectie, type DrempelId, type StroomId } from './tools-b-aanbesteding';

// Indexcalculator en CO2-heffingenscan (onderdeel tools-a) gebruiken eigen databestanden. Deze twee exports
// blijven staan voor oudere imports.
export const indexStandaard = {
  basistarief: 110, // € per ton, voorbeeld
  startjaar: 2021,
};

export const co2Standaard = {
  tonnage: 50000,
  emissiefactor: 0.5,
  heffing: 50,
  vrijstelling: 10000,
  inwoners: 300000,
  scheidingNuPct: 60,
  scenarioPct: [60, 70, 75],
  startjaar: 2027,
  aantalJaren: 6,
  stijgingPerJaar: 10,
};

/**
 * Bodemas: aandelen uit Rijkswaterstaat 2024, tonnage = landelijk gemiddelde per AVI 2024, kosten volgens de
 * kentallen (midden van de bandbreedte). Tarief en metaalprijzen voor de rekenwijze "contract" vult de gebruiker in.
 */
export const bodemasStandaard: BodemasInvoer = {
  tonnageVerbrand: gemiddeldPerAvi,
  aandeelBodemasPct: bodemasKental.aandeelBodemasPct,
  ferroPct: bodemasKental.ferroPct,
  nonFerroPct: bodemasKental.nonFerroPct,
  rekenwijze: 'kental',
  nettoOpwerking: bodemasScenario.midden.nettoOpwerking,
  residuPct: bodemasScenario.midden.residuPct,
  stortkosten: bodemasScenario.midden.stortkosten,
  stortbelasting: stortbelasting2026,
  verwerkingstarief: null, // geen openbare bron
  prijsFerro: null, // geen openbare bron
  prijsNonFerro: null, // geen openbare bron
  aandeelOpbrengstPct: 100, // rekenkeuze: alle metaalopbrengst meetellen
};

/** Standaard staffelcategorie voor bronscheiding. 3a is de categorie met het grootste tonnage in het akkoord (116 kton). */
export const pmdStandaardCategorie: StaffelCategorie = '3a';

/** PMD: landelijke CBS-cijfers, kostenbasis en vergoedingen uit het akkoord 2025, kentallen verbranding en nascheiding. */
export const pmdStandaard: PmdInvoer = {
  inwoners: 100000, // voorbeeld, kies uw gemeente of vul in
  responsBron: cbsPmd.landelijk.pmdKgPerInw,
  inzamelkostenBron: kostenbasisBron,
  overigeKostenBron: 0, // 0 = niet meegerekend
  vergoedingBron: staffelPerCategorie[pmdStandaardCategorie].euroPerTon[2026],
  restafvalNa: Math.round((cbsPmd.landelijk.restafvalKgPerInw + cbsPmd.landelijk.pmdKgPerInw) * 10) / 10,
  nascheidingskosten: kentalNascheidingskosten,
  vergoedingNa: nascheiding.vergoeding2026,
  teruggewonnenNa: nascheidingRendement.midden, // kental IPR Normag 2021: 15–25 kg per inwoner
  verbrandingstarief: kentalVerbrandingstarief,
};

export const aanbestedingStandaard = {
  stroom: 'restafval' as StroomId,
  drempel: 'decentraal' as DrempelId,
  looptijdJaren: 5, // voorbeeld
  verlengingJaren: 2, // voorbeeld
  volumeTon: 40000, // voorbeeld
  prijsPunten: prijsPuntenVoorstel,
  selectie: standaardSelectie('restafval'),
};
