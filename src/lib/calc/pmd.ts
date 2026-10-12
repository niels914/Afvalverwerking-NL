// Rekenmodel bron- en nascheiding PMD.
// Bronscheiding: tonnage = inwoners × respons_bron / 1000
//                kosten  = tonnage × (inzameling + sortering − vergoeding)
// Nascheiding:   tonnage = inwoners × respons_na / 1000
//                kosten  = tonnage × (nascheiding − vergoeding)
// Aannames: nascheidingskosten zijn inclusief sortering; de inzameling van restafval (waar het PMD
// bij nascheiding in zit) loopt al en telt niet mee; de vergoeding per ton is voor beide routes gelijk.
// DUMMY: indicatief en fictief.

export interface PmdInvoer {
  inwoners: number;
  /** kg PMD per inwoner per jaar bij bronscheiding. */
  responsBron: number;
  /** kg PMD per inwoner per jaar bij nascheiding. */
  responsNa: number;
  /** € per ton, inzameling bij bronscheiding. */
  kostenInzameling: number;
  /** € per ton, sortering bij bronscheiding. */
  kostenSortering: number;
  /** € per ton, nascheiding inclusief sortering. */
  kostenNascheiding: number;
  /** € per ton, vergoeding voor ingezameld PMD. */
  vergoeding: number;
}

export interface PmdScenario {
  naam: string;
  tonnage: number;
  kostenPerTon: number;
  totaleKosten: number;
  perInwoner: number;
}

export function pmdVergelijking(i: PmdInvoer): { bron: PmdScenario; na: PmdScenario; verschil: number } {
  const maak = (naam: string, respons: number, kostenPerTon: number): PmdScenario => {
    const tonnage = (i.inwoners * respons) / 1000;
    const totaleKosten = tonnage * kostenPerTon;
    return { naam, tonnage, kostenPerTon, totaleKosten, perInwoner: i.inwoners > 0 ? totaleKosten / i.inwoners : 0 };
  };
  const bron = maak('Bronscheiding', i.responsBron, i.kostenInzameling + i.kostenSortering - i.vergoeding);
  const na = maak('Nascheiding', i.responsNa, i.kostenNascheiding - i.vergoeding);
  return { bron, na, verschil: na.totaleKosten - bron.totaleKosten };
}
