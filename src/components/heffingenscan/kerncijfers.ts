import { heffingPaden, PEILDATUM, PRIJSPEIL } from '../../data/heffingen-tarieven';
import { aangepasteVelden, jaarUit, type HeffingGemeente, type HeffingInvoer, type PadVergelijking } from '../../lib/calc/heffingen';
import { euro, getal } from '../../lib/format';

/** Namen van de velden voor meldingen ("met aangepaste cijfers: inwoners, fijn restafval"). */
export const veldNamen: Record<keyof HeffingInvoer, string> = {
  inwoners: 'inwoners',
  huishoudens: 'huishoudens',
  fijnKg: 'fijn restafval per inwoner',
  grofKg: 'grof restafval',
  grofVerbrandPct: 'verbrand deel van het grove restafval',
  overigTon: 'overig verbrand afval',
  verbrandPct: 'verbrand deel van het fijne restafval',
  trendPct: 'ontwikkeling restafval',
  asbGrondslagPct: 'grondslag afvalstoffenbelasting',
  doorberekeningPct: 'doorberekening door de AVI',
  indexatiePct: 'indexatie',
  pad: 'tariefpad',
};

/**
 * Eén regel tekst met de kerncijfers van de scan op dit moment. Gaat als verborgen veld mee met de rapportaanvraag, zodat
 * Niels ziet waarover het gaat zonder de pagina na te rekenen.
 */
export function kerncijfersTekst(g: Pick<HeffingGemeente, 'naam' | 'code'>, invoer: HeffingInvoer, standaard: HeffingInvoer, v: PadVergelijking, link: string): string {
  const r26 = jaarUit(v.gekozen, 2026);
  const r30 = jaarUit(v.gekozen, 2030);
  const r35 = jaarUit(v.gekozen, 2035);
  const afwijkend = aangepasteVelden(invoer, standaard);
  const delen = [
    `${g.naam} (${g.code})`,
    `${getal(invoer.inwoners)} inwoners, ${getal(invoer.huishoudens)} huishoudens, ${getal(invoer.fijnKg, 1)} kg fijn restafval per inwoner, ${getal(r26.ton)} ton verbrand`,
    `${heffingPaden[invoer.pad].naam} (${heffingPaden[invoer.pad].status}), prijspeil ${PRIJSPEIL}, peildatum ${PEILDATUM}`,
    `heffingen 2026 ${euro(r26.totaal)}, 2030 ${euro(r30.totaal)}, 2035 ${euro(r35.totaal)} (${euro(r35.perHuishouden)} per huishouden)`,
    `cumulatief 2026-2035 ${euro(v.cumulatief)} tegen ${euro(v.cumulatiefAnder)} bij ${heffingPaden[v.ander].naam}`,
    afwijkend.length > 0 ? `AANGEPASTE CIJFERS: ${afwijkend.map((k) => `${veldNamen[k]} ${String(invoer[k])}`).join(', ')}` : 'CBS-cijfers, niet aangepast',
    link,
  ];
  return delen.join('; ');
}
