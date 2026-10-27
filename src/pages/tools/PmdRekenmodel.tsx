import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { reeksKleuren, StaafGrafiek } from '../../components/grafiek/Grafieken';
import type { BronRegel } from '../../components/rekenen/Bronnen';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet } from '../../components/rekenen/Uitkomst';
import { Ankers, Meldingen, UitkomstBronnen, Uitklap, useUitklapBijPrint, useVeldFouten } from '../../components/rekenen/b/Blokken';
import { BronVeld } from '../../components/rekenen/b/BronVeld';
import { BronLijst, Delen } from '../../components/rekenen/b/Delen';
import { Ontbreekt } from '../../components/rekenen/b/Knoppen';
import { euroRond, kostBand, kostRond, rond } from '../../components/rekenen/b/opmaak';
import { Badge, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { pmdStandaard, pmdStandaardCategorie } from '../../data/standaardwaarden';
import {
  asb2026,
  cbsGemeenten,
  cbsPmd,
  iprBron,
  kentalNascheidingskosten,
  kentalVerbrandingstarief,
  kostenbasisBron,
  nascheiding,
  nascheidingRendement,
  nascheidingskostenLezingen,
  PEILDATUM,
  pmdBronnen,
  pmdGrenzen,
  pmdVarianten,
  poorttariefBandbreedte,
  staffel,
  staffelJaren,
  staffelPerCategorie,
  verbrandingstariefBand,
  voorschot2026,
  type StaffelCategorie,
} from '../../data/tools-b-pmd';
import {
  breakEvenTeruggewonnen,
  controleerPmd,
  omslagNascheidingskosten,
  pmdBandbreedte,
  pmdConclusieMogelijk,
  pmdNaarParams,
  pmdUitParams,
  pmdVergelijking,
  vergoedingVoorTonnage,
  type PmdInvoer,
} from '../../lib/calc/pmd';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/pmd-rekenmodel';
const FORMULE = `Nulsituatie: al het PMD gaat met het restafval naar de verbranding.
bronscheiding: PMD = inwoners × respons / 1000
               netto = PMD × (inzamelkosten + overige kosten − inzamelvergoeding − verbrandingstarief)
nascheiding:   restafval = inwoners × restafval naar nascheider / 1000
               netto = restafval × (nascheidingskosten − nascheidingsvergoeding) − teruggewonnen PMD × verbrandingstarief
per inwoner = netto / inwoners
omslagpunt nascheidingstarief = (netto bronscheiding + teruggewonnen PMD × verbrandingstarief) / restafval + nascheidingsvergoeding`;

const categorieen = staffel.map((s) => s.categorie);
const r1 = (n: number) => Math.round(n * 10) / 10;
const cbsBron = {
  titel: `CBS ${cbsPmd.bronnen.gemeente.tabelId}, ${cbsPmd.jaar}`,
  url: cbsPmd.bronnen.gemeente.url,
};
const cbsNlBron = {
  titel: `CBS ${cbsPmd.bronnen.landelijk.tabelId}, ${cbsPmd.landelijk.jaar}`,
  url: cbsPmd.bronnen.landelijk.url,
};
const akkoordBron = {
  titel: 'akkoord Verpact, VNG en NVRD (2025)',
  url: pmdBronnen.akkoord.url,
};
const iprVeldBron = { titel: 'IPR Normag 2021', url: iprBron.url };

/** Standaardinvoer met de CBS-cijfers van een gemeente (of landelijk als de code onbekend is). */
function basisVoorGemeente(code: string): PmdInvoer {
  const n = cbsGemeenten.find((x) => x.code === code);
  const resp = n?.pmdKgPerInw ?? cbsPmd.landelijk.pmdKgPerInw;
  return {
    ...pmdStandaard,
    inwoners: n?.inwoners ?? pmdStandaard.inwoners,
    responsBron: resp,
    restafvalNa: r1((n?.restafvalKgPerInw ?? cbsPmd.landelijk.restafvalKgPerInw) + resp),
  };
}

const rnd = (n: number | null) => (n === null ? null : rond(n));
const csvBedrag = (n: number) => getal(n, 2);
const kostTekst = (n: number | null, d = 0) => (n === null ? '–' : n < 0 ? `${euro(-n, d)} opbrengst` : `${euro(n, d)} kosten`);

export function PmdRekenmodel() {
  useUitklapBijPrint();
  return (
    <>
      <RapportKop
        titel="Rekenmodel bron- en nascheiding PMD"
        ondertitel={`Vergoedingen 2026 volgens akkoord Verpact, VNG en NVRD; CBS ${cbsPmd.jaar}; peildatum ${datum(PEILDATUM)}`}
      />
      <PaginaKop titel="Rekenmodel bron- en nascheiding PMD" badges={<ToegangBadge toegang="leden" />}>
        Wat kosten bronscheiding en nascheiding van PMD uw gemeente per jaar? Het model rekent met de vergoedingen van Verpact voor 2026, de afvalcijfers van
        CBS voor uw gemeente en kentallen met bron. Elk getal kunt u vervangen door uw eigen waarde.
      </PaginaKop>
      <Ankers
        links={[
          { id: 'model', label: 'Rekenmodel (leden)' },
          { id: 'staffel', label: 'Vergoedingen 2026–2028' },
          { id: 'bronnen', label: 'Bronnen' },
        ]}
      />
      <h2 className="sectie visueel-verborgen" id="model">
        Rekenmodel
      </h2>
      <Vergrendeld
        titel="Rekenmodel bron- en nascheiding PMD"
        ledenKrijgen={[
          'Afvalcijfers van CBS voor uw gemeente met één keuze',
          'Bronscheiding en nascheiding naast elkaar, totaal, per inwoner en met bandbreedte',
          'Opbrengst per staffelcategorie en verloop 2026–2028',
          'CSV, deellink en rapport',
        ]}
      >
        <PmdModel />
      </Vergrendeld>

      <div className="stapel" style={{ marginTop: 16 }}>
        <Uitklap id="staffel" titel="Staffel inzamelvergoeding 2026–2028" sub="openbaar · euro per ton ingezameld PMD">
          <StaffelInhoud />
        </Uitklap>
        <Uitklap id="bronnen" titel="Bronnen en peildatum" sub={`geraadpleegd op ${datum(PEILDATUM)}`}>
          <BronLijst regels={bronRegels} />
        </Uitklap>
      </div>
      <RapportVoet tekst={`Vergoedingen: akkoord Verpact, VNG en NVRD; CBS ${cbsPmd.jaar}; peildatum ${datum(PEILDATUM)}`} />
    </>
  );
}

function StaffelInhoud() {
  return (
    <>
      <p className="klein muted" style={{ margin: 0 }}>
        De categorie hangt af van het aandeel PMD-verpakkingen in wat u inzamelt.
      </p>
      <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel staffel inzamelvergoeding">
        <table>
          <caption>
            Bron:{' '}
            <a href={pmdBronnen.akkoord.url} target="_blank" rel="noopener noreferrer">
              onderhandelingsresultaat Verpact, VNG en NVRD, par. 6.2
            </a>
            . Bedragen afgerond zoals in de bron. 100 % = kostenbasis {euro(kostenbasisBron)}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Categorie</th>
              {staffelJaren.map((j) => (
                <th key={j} scope="col" className="num">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffel.map((s) => (
              <tr key={s.categorie}>
                <th
                  scope="row"
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'normal',
                    minWidth: 150,
                  }}
                >
                  {s.categorie}: {s.aandeel}
                </th>
                {staffelJaren.map((j) => (
                  <td key={j} className="num">
                    {euro(s.euroPerTon[j])}
                    <br />
                    <span className="klein muted">{procent(s.pctKostenbasis[j], 0)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="opsomming klein">
        <li>
          Voor 2027 en 2028 worden de bedragen geïndexeerd met een methode die partijen samen vaststellen. De euro’s daarvan zijn nog niet gepubliceerd; de
          tabel toont alleen de afgesproken daling van categorie 3b.
        </li>
        <li>
          Voorschot 2026 voor gemeenten met (overwegend) een haalsysteem: {euro(voorschot2026)} per ton. Verrekening volgt op basis van de gemeten kwaliteit (
          <a href={pmdBronnen.nvrd.url} target="_blank" rel="noopener noreferrer">
            NVRD, 11 juni 2025
          </a>
          ).
        </li>
        <li>
          Nascheiding: {euro(nascheiding.vergoeding2026, 2)} per ton restafval dat bij een door Verpact gecontracteerde nascheider is nagescheiden (par. 7).
        </li>
        <li>Na overdracht op de overslag wordt apart ingezameld PMD eigendom van Verpact, dat sortering en verdere verwerking regelt.</li>
      </ul>
    </>
  );
}

const bronRegels: BronRegel[] = [
  {
    onderwerp: 'Inzamelvergoeding bronscheiding (staffel)',
    status: 'officieel',
    waarde: `${staffel.map((s) => `${s.categorie}: ${euro(s.euroPerTon[2026])}`).join(' · ')} per ton (2026)`,
    toelichting: 'Ingestemd door de ledenvergaderingen van VNG en NVRD op 18 en 19 juni 2025. Uw deelnemersovereenkomst met Verpact is leidend.',
    bron: `${pmdBronnen.akkoord.uitgever}, ${pmdBronnen.akkoord.titel}`,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Inzamelkosten bronscheiding',
    status: 'kental',
    waarde: `${euro(kostenbasisBron)} per ton PMD`,
    toelichting:
      'Dit is de kostenbasis waarop de staffel is gebouwd, geen onafhankelijke raming van uw kosten: de gemiddelde inzamelkosten van gemeenten uit het kostenonderzoek 2021 (gecontroleerd door EY, zonder uitschieters, 90 % haal- en 10 % brengsystemen, plus € 5 voor flankerend beleid), geïndexeerd naar 2025. In categorie 1 dekt de vergoeding precies dit bedrag. Een nieuw kostenonderzoek volgt vóór 2029.',
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Nascheidingsvergoeding',
    status: 'officieel',
    waarde: `${euro(nascheiding.vergoeding2026, 2)} per ton restafval (2026)`,
    toelichting: `(${getal(nascheiding.kosten2021, 2)} + ${getal(nascheiding.opslagTransport, 2)}) × ${procent(nascheiding.pmdAandeel * 100, 1)} PMD × ${getal(nascheiding.inflatiefactor, 4)} inflatiecorrectie.`,
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Nascheidingskosten (eenheid onzeker)',
    status: 'kental',
    waarde: `${euro(nascheidingskostenLezingen.perTonPmd, 2)} tot ${euro(kentalNascheidingskosten, 2)} per ton restafval, afhankelijk van de lezing`,
    toelichting: `Het akkoord noemt "gemiddelde kosten voor nascheiding van ${euro(nascheiding.kosten2021, 2)} per ton" (kostenonderzoek 2021) en telt daar ${euro(
      nascheiding.opslagTransport,
      2,
    )} voor transport en overslag bij, maar zegt niet per ton wát. Gelezen als per ton restafval, met dezelfde inflatiecorrectie als de vergoeding (× ${getal(
      nascheiding.inflatiefactor,
      4,
    )}), wordt dat ${euro(kentalNascheidingskosten, 2)} per ton restafval. Die lezing ligt het meest voor de hand: de opslag is € 3 mln gedeeld door ongeveer ${getal(
      nascheidingskostenLezingen.tonnageOpslagKton,
    )} kton, en dat past bij nagescheiden restafval, niet bij teruggewonnen PMD. Gelezen als per ton PMD is het omgerekend ${euro(
      nascheidingskostenLezingen.perTonPmd,
      2,
    )} per ton restafval (× ${procent(nascheiding.pmdAandeel * 100, 1)} PMD). De tool rekent met beide en trekt pas een conclusie als u het tarief van uw nascheider invult.`,
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Teruggewonnen PMD bij nascheiding',
    status: 'kental',
    waarde: `${getal(nascheidingRendement.midden)} kg per inwoner; bandbreedte ${getal(nascheidingRendement.laag)} tot ${getal(nascheidingRendement.hoog)} kg`,
    toelichting: `In de praktijk van verschillende nascheidingsinstallaties gaat 15 tot 25 kg per inwoner per jaar naar recyclers; een van de meest effectieve installaties haalde in 2019 gemiddeld 25 kg. Vaak zonder blik gerapporteerd. Het midden is een keuze van KplusV. Ter vergelijking: in het kostenonderzoek 2021 bestond nascheidingsrestafval voor ${procent(
      nascheiding.pmdAandeel * 100,
      1,
    )} uit PMD.`,
    bron: `${iprBron.uitgever}, ${iprBron.titel}`,
    url: iprBron.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Verbrandingstarief restafval',
    status: 'kental',
    waarde: `${euro(kentalVerbrandingstarief, 2)} per ton; bandbreedte ${euro(verbrandingstariefBand.laag, 2)} tot ${euro(verbrandingstariefBand.hoog, 2)}`,
    toelichting: `Poorttarief bij aanbesteding van gemeentelijk restafval ${euro(poorttariefBandbreedte.laag)}–${euro(
      poorttariefBandbreedte.hoog,
    )} per ton (Strategy& 2025 op basis van ACM 2023) plus afvalstoffenbelasting 2026 (${euro(asb2026, 2)} per ton, Belastingdienst). De bron zegt niet of het poorttarief belasting bevat; de tool telt de belasting apart op. CO2-heffing zit er niet in.`,
    bron: `${pmdBronnen.strategy.uitgever}; ${pmdBronnen.asb.uitgever}`,
    url: pmdBronnen.strategy.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Inwoners, PMD en restafval per gemeente',
    status: 'officieel',
    waarde: `${cbsGemeenten.length} gemeenten, ${cbsPmd.jaar}; landelijk ${getal(cbsPmd.landelijk.pmdKgPerInw)} kg PMD en ${getal(cbsPmd.landelijk.restafvalKgPerInw)} kg restafval per inwoner (${cbsPmd.landelijk.jaar})`,
    toelichting: `PMD = PMD-fractie + kunststof verpakkingen + drankenkartons + blik, gescheiden ingezameld. Het landelijk gemiddelde telt ook gemeenten die nascheiden en dus weinig PMD apart inzamelen. Inwoners: ${cbsPmd.bronnen.inwoners.titel} (${cbsPmd.bronnen.inwoners.tabelId}).`,
    bron: `CBS, ${cbsPmd.bronnen.gemeente.titel} (${cbsPmd.bronnen.gemeente.tabelId}) en ${cbsPmd.bronnen.landelijk.titel} (${cbsPmd.bronnen.landelijk.tabelId})`,
    url: cbsPmd.bronnen.gemeente.url,
    peildatum: cbsPmd.peildatum,
  },
  {
    onderwerp: 'Overige kosten bronscheiding',
    status: 'aanname',
    toelichting:
      'Geen openbare bron. Bijvoorbeeld het residu na opschoning, dat volgens het akkoord voor rekening van de gemeente komt. Standaard 0: niet meegerekend.',
  },
];

function PmdModel() {
  const [params, setParams] = useSearchParams();
  const [gemeente, setGemeente] = useState<string>(() => {
    const gm = params.get('gm') ?? '';
    return cbsGemeenten.some((g) => g.code === gm) ? gm : '';
  });
  const [categorie, setCategorie] = useState<StaffelCategorie>(() => {
    const c = params.get('cat') as StaffelCategorie | null;
    return c && categorieen.includes(c) ? c : pmdStandaardCategorie;
  });
  // Met gemeente en categorie in de link zijn hun cijfers de basis; expliciete waarden in de link gaan voor.
  const [i, setI] = useState<PmdInvoer>(() =>
    pmdUitParams(params, {
      ...basisVoorGemeente(params.get('gm') ?? ''),
      vergoedingBron: staffelPerCategorie[categorie].euroPerTon[2026],
    }),
  );
  const { melder, melding } = useVeldFouten();
  const zet =
    <K extends keyof PmdInvoer>(k: K) =>
    (v: PmdInvoer[K]) =>
      setI((x) => ({ ...x, [k]: v }));

  const g = cbsGemeenten.find((x) => x.code === gemeente);
  const bronRespons = g?.pmdKgPerInw ?? cbsPmd.landelijk.pmdKgPerInw;
  const bronRest = r1((g?.restafvalKgPerInw ?? cbsPmd.landelijk.restafvalKgPerInw) + bronRespons);
  const vergoedingCategorie = staffelPerCategorie[categorie].euroPerTon[2026];

  function kiesGemeente(code: string) {
    setGemeente(code);
    const b = basisVoorGemeente(code);
    setI((x) => ({
      ...x,
      inwoners: b.inwoners,
      responsBron: b.responsBron,
      restafvalNa: b.restafvalNa,
    }));
  }
  function kiesCategorie(c: StaffelCategorie) {
    setCategorie(c);
    setI((x) => ({
      ...x,
      vergoedingBron: staffelPerCategorie[c].euroPerTon[2026],
    }));
  }

  const { bron, na, verschil } = pmdVergelijking(i);
  const breakEven = breakEvenTeruggewonnen(i);
  const controle = controleerPmd(i, pmdGrenzen);
  const band = pmdBandbreedte(i, pmdVarianten);

  const deelParams = pmdNaarParams(i, {
    ...(gemeente ? { gm: gemeente } : {}),
    cat: categorie,
  });
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const gebied = g ? `${g.naam} (CBS ${cbsPmd.jaar})` : 'eigen invoer, landelijke gemiddelden';

  const conclusie = pmdConclusieMogelijk(i, kentalNascheidingskosten);
  const omslag = omslagNascheidingskosten(i);
  const omslagBand = band?.omslagTarief && band.omslagTarief.hoog - band.omslagTarief.laag >= 1 ? band.omslagTarief : null;
  const naKostenBand = conclusie
    ? null
    : {
        laag: na.grondslagTon * nascheidingskostenLezingen.perTonPmd,
        hoog: na.grondslagTon * nascheidingskostenLezingen.perTonRestafval,
      };
  const velden = (band?.volgt ?? [])
    .filter((k) => k !== 'nascheidingskosten')
    .map((k) => (k === 'teruggewonnenNa' ? 'teruggewonnen PMD' : 'verbrandingstarief'));

  const status = (eigen: boolean, bronStatus: 'officieel' | 'kental' | 'afgeleid' | 'aanname' | 'voorbeeld') => (eigen ? 'eigen waarde' : bronStatus);
  const csv = (): CsvCel[][] => [
    ['Rekenmodel bron- en nascheiding PMD', 'KplusV'],
    ['Peildatum', PEILDATUM],
    ['Gebied', gebied],
    [
      'Uitkomst',
      conclusie
        ? 'Met uw eigen nascheidingstarief'
        : 'Indicatief: het kental voor nascheidingskosten heeft in de bron geen vaste eenheid; de tool rekent met beide lezingen en trekt geen conclusie',
    ],
    ['Afronding', 'Bedragen in de uitkomst afgerond naar grootte (tientallen, honderdtallen of duizendtallen); invoer niet afgerond'],
    [],
    ['Invoer', 'Waarde', 'Status', 'Herkomst'],
    [
      'Inwoners',
      i.inwoners,
      g && i.inwoners === g.inwoners ? 'officieel' : i.inwoners === pmdStandaard.inwoners ? 'voorbeeld' : 'eigen waarde',
      g && i.inwoners === g.inwoners ? `CBS ${cbsPmd.bronnen.inwoners.tabelId}` : '',
    ],
    [
      'Respons bronscheiding (kg per inwoner)',
      i.responsBron,
      status(i.responsBron !== bronRespons, 'officieel'),
      g ? `CBS ${cbsPmd.bronnen.gemeente.tabelId}` : `CBS ${cbsPmd.bronnen.landelijk.tabelId}`,
    ],
    ['Staffelcategorie', categorie, 'keuze', staffelPerCategorie[categorie].aandeel],
    ['Inzamelvergoeding (euro per ton PMD)', i.vergoedingBron, status(i.vergoedingBron !== vergoedingCategorie, 'officieel'), pmdBronnen.akkoord.url],
    [
      'Inzamelkosten (euro per ton PMD)',
      i.inzamelkostenBron,
      status(i.inzamelkostenBron !== kostenbasisBron, 'kental'),
      'kostenbasis akkoord 2025, geen raming van eigen kosten',
    ],
    ['Overige kosten bronscheiding (euro per ton PMD)', i.overigeKostenBron, i.overigeKostenBron === 0 ? 'niet meegerekend' : 'eigen waarde', ''],
    ['Restafval naar nascheider (kg per inwoner)', i.restafvalNa, status(i.restafvalNa !== bronRest, 'afgeleid'), 'CBS restafval + CBS PMD'],
    [
      'Nascheidingskosten (euro per ton restafval)',
      i.nascheidingskosten,
      conclusie ? 'eigen waarde' : 'kental, eenheid onzeker',
      `akkoord 2025 par. 7; per ton restafval ${csvBedrag(nascheidingskostenLezingen.perTonRestafval)}, per ton PMD omgerekend ${csvBedrag(nascheidingskostenLezingen.perTonPmd)}`,
    ],
    [
      'Nascheidingsvergoeding (euro per ton restafval)',
      i.vergoedingNa,
      status(i.vergoedingNa !== nascheiding.vergoeding2026, 'officieel'),
      pmdBronnen.akkoord.url,
    ],
    [
      'Teruggewonnen PMD bij nascheiding (kg per inwoner)',
      i.teruggewonnenNa,
      i.teruggewonnenNa === null ? 'niet ingevuld' : status(i.teruggewonnenNa !== nascheidingRendement.midden, 'kental'),
      `IPR Normag 2021 (15-25 kg), ${iprBron.url}`,
    ],
    [
      'Verbrandingstarief incl. afvalstoffenbelasting (euro per ton)',
      i.verbrandingstarief,
      status(i.verbrandingstarief !== kentalVerbrandingstarief, 'kental'),
      'Strategy& 2025 + ASB 2026',
    ],
    [],
    ['Uitkomst (afgerond)', 'Bronscheiding', 'Nascheiding'],
    ['PMD gescheiden of teruggewonnen (ton)', bron.pmdTon === null ? null : Math.round(bron.pmdTon), na.pmdTon === null ? null : Math.round(na.pmdTon)],
    ['Restafval door nascheider (ton)', '', Math.round(na.grondslagTon)],
    ['Kosten (euro)', rond(bron.kosten), naKostenBand ? `${rond(naKostenBand.laag)} tot ${rond(naKostenBand.hoog)}` : rond(na.kosten)],
    ['Vergoeding Verpact (euro)', rond(bron.vergoeding), rond(na.vergoeding)],
    ['Vermeden verbranding (euro)', rnd(bron.vermedenVerbranding), rnd(na.vermedenVerbranding)],
    ['Netto per jaar (euro, negatief = opbrengst)', rnd(bron.netto), conclusie ? rnd(na.netto) : 'zie bandbreedte'],
    ...(band
      ? ([
          ['Bandbreedte netto laag (euro)', rnd(band.bron?.laag ?? null), rnd(band.na?.laag ?? null)],
          ['Bandbreedte netto hoog (euro)', rnd(band.bron?.hoog ?? null), rnd(band.na?.hoog ?? null)],
        ] as CsvCel[][])
      : []),
    ['Verschil nascheiding − bronscheiding (euro, positief = bronscheiding goedkoper)', conclusie ? rnd(verschil) : 'zie bandbreedte'],
    ...(band?.verschil ? ([['Bandbreedte verschil (euro)', rnd(band.verschil.laag), rnd(band.verschil.hoog)]] as CsvCel[][]) : []),
    [
      'Omslagpunt nascheidingstarief (euro per ton restafval)',
      omslag === null ? null : Math.round(omslag * 100) / 100,
      omslagBand ? `bandbreedte ${csvBedrag(omslagBand.laag)} tot ${csvBedrag(omslagBand.hoog)}` : '',
    ],
    ...(conclusie
      ? ([['Teruggewonnen PMD waarbij beide even duur zijn (kg per inwoner)', breakEven === null ? null : Math.round(breakEven * 10) / 10]] as CsvCel[][])
      : []),
    ...controle.fouten.map((f): CsvCel[] => ['Fout in invoer', f]),
    ...controle.signalen.map((f): CsvCel[] => ['Let op', f]),
    [],
    ['Formule', FORMULE],
  ];

  const ontbrekend = i.teruggewonnenNa === null ? ['Teruggewonnen PMD bij nascheiding (kg per inwoner)'] : [];
  const fouten = [...(melding ? [melding] : []), ...controle.fouten];
  const goedkoper = verschil === null || verschil === 0 ? null : verschil > 0 ? 'bronscheiding' : 'nascheiding';

  const verschilTekst = (v: { laag: number; hoog: number }) =>
    v.laag > 0
      ? `bronscheiding ${euroRond(v.laag)} tot ${euroRond(v.hoog)} per jaar goedkoper`
      : v.hoog < 0
        ? `nascheiding ${euroRond(-v.hoog)} tot ${euroRond(-v.laag)} per jaar goedkoper`
        : `van nascheiding ${euroRond(-v.laag)} goedkoper tot bronscheiding ${euroRond(v.hoog)} goedkoper per jaar`;
  const omslagTekst = omslag === null ? null : omslagBand ? `${euro(omslagBand.laag)} tot ${euro(omslagBand.hoog)}` : euro(omslag);

  let kern: ReactNode;
  if (verschil === null) {
    kern = (
      <>
        <strong>Bronscheiding: {kostRond(bron.netto ?? 0)} per jaar.</strong> Vul teruggewonnen PMD in om nascheiding te vergelijken.
      </>
    );
  } else if (!conclusie) {
    kern = (
      <>
        <strong>
          Indicatief, want de nascheidingskosten zijn een kental zonder vaste eenheid in de bron: met de kentallen ligt het verschil{' '}
          {band?.verschil ? verschilTekst(band.verschil) : `rond ${euroRond(Math.abs(verschil))}`}.
        </strong>{' '}
        Nascheiding is goedkoper als uw nascheider minder rekent dan {omslagTekst} per ton restafval. Vul het tarief van uw nascheider hieronder in voor een
        conclusie.
      </>
    );
  } else {
    const v = band?.verschil && velden.length && band.verschil.hoog - band.verschil.laag >= 1 ? band.verschil : null;
    kern = (
      <>
        <strong>
          {verschil === 0
            ? 'Met uw nascheidingstarief kosten beide routes evenveel.'
            : `Met uw nascheidingstarief is ${goedkoper} ongeveer ${euroRond(Math.abs(verschil))} per jaar goedkoper (${euro(Math.abs(verschil) / Math.max(1, i.inwoners), 2)} per inwoner).`}
        </strong>{' '}
        {v &&
          (v.laag > 0 || v.hoog < 0
            ? `Dat blijft zo als ${velden.join(' en ')} binnen de bronwaarden variëren: ${verschilTekst(v)}.`
            : `Als ${velden.join(' en ')} binnen de bronwaarden variëren, kan de uitkomst omslaan: ${verschilTekst(v)}.`)}
      </>
    );
  }

  const tarievenVeld = (
    <BronVeld
      label="Tarief van uw nascheider (nascheidingskosten)"
      eenheid="€/t rest"
      waarde={i.nascheidingskosten}
      onChange={(n) => zet('nascheidingskosten')(n ?? 0)}
      onFout={melder('nascheidingskosten')}
      status="kental"
      statusTekst="Kental, eenheid onzeker: vul eigen tarief in"
      bronwaarde={kentalNascheidingskosten}
      bronwaardeTekst={euro(kentalNascheidingskosten, 2)}
      bron={akkoordBron}
      toelichting={`Wat de nascheider per ton restafval rekent voor het nascheiden, zonder verbranding van het residu. Het akkoord noemt ${euro(
        nascheiding.kosten2021,
        2,
      )} per ton (2021) zonder eenheid: per ton restafval wordt dat ${euro(nascheidingskostenLezingen.perTonRestafval, 2)}, per ton PMD omgerekend ${euro(
        nascheidingskostenLezingen.perTonPmd,
        2,
      )} per ton restafval.`}
    />
  );

  return (
    <div className="tb-tool">
      <Kaart
        titel="Uitkomst"
        kopNiveau={3}
        className="tb-uitkomst"
        actie={<Badge soort={conclusie ? 'status-gegund' : 'voorbeeld'}>{conclusie ? 'Met uw tarief' : 'Indicatief'}</Badge>}
      >
        <div className="stapel" aria-live="polite">
          <Meldingen fouten={fouten} signalen={controle.signalen} />
          <p className="tb-kern">{kern}</p>
          <div className={`tegels${melding ? ' tb-verouderd' : ''}`}>
            {conclusie || verschil === null ? (
              <Tegel
                label={goedkoper ? `Voordeel ${goedkoper}` : 'Verschil per jaar'}
                waarde={verschil === null ? '–' : euroRond(Math.abs(verschil))}
                toelichting={verschil === null ? 'vul teruggewonnen PMD in' : 'per jaar, met uw tarief'}
                hero
              />
            ) : (
              <Tegel
                label="Omslagpunt nascheidingstarief"
                waarde={omslag === null ? '–' : `${euro(omslag)} per ton`}
                toelichting={`Rekent uw nascheider minder per ton restafval, dan is nascheiding goedkoper.${omslagBand ? ` Bandbreedte ${euro(omslagBand.laag)} tot ${euro(omslagBand.hoog)}.` : ''}`}
                hero
              />
            )}
            <Tegel
              label="Bronscheiding"
              waarde={kostRond(bron.netto ?? 0)}
              toelichting={
                band?.bron && band.bron.hoog - band.bron.laag >= 1
                  ? `per jaar; bandbreedte ${kostBand(band.bron.laag, band.bron.hoog)}`
                  : `per jaar; ${kostTekst(bron.perInwoner, 2)} per inwoner`
              }
            />
            <Tegel
              label={conclusie ? 'Nascheiding' : 'Nascheiding (indicatief)'}
              waarde={na.netto === null ? '–' : conclusie ? kostRond(na.netto) : band?.na ? kostBand(band.na.laag, band.na.hoog) : kostRond(na.netto)}
              toelichting={
                na.netto === null
                  ? 'nog niet te berekenen'
                  : conclusie
                    ? `per jaar; ${kostTekst(na.perInwoner, 2)} per inwoner`
                    : 'per jaar, afhankelijk van uw nascheidingstarief'
              }
            />
          </div>
          {tarievenVeld}
          <Ontbreekt velden={ontbrekend} uitleg="Zonder deze waarde rekent de tool de nascheidingsroute niet af." />
          <div className="tabel-container tb-stapeltabel" tabIndex={0} role="region" aria-label="Opbouw per route">
            <table>
              <caption>Euro per jaar, afgerond, ten opzichte van alles verbranden. Vermeden verbranding verlaagt de kosten.</caption>
              <thead>
                <tr>
                  <th scope="col">Post</th>
                  <th scope="col" className="num">
                    Bronscheiding
                  </th>
                  <th scope="col" className="num">
                    Nascheiding
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Hoeveelheid</th>
                  <td className="num" data-label="Bronscheiding">
                    {metEenheid(bron.grondslagTon, 't PMD')}
                  </td>
                  <td className="num" data-label="Nascheiding">
                    {metEenheid(na.grondslagTon, 't rest')}
                    {na.pmdTon !== null && (
                      <>
                        <br />
                        <span className="klein muted">{metEenheid(na.pmdTon, 't PMD')}</span>
                      </>
                    )}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Kosten</th>
                  <td className="num" data-label="Bronscheiding">
                    {euroRond(bron.kosten)}
                  </td>
                  <td className="num" data-label="Nascheiding">
                    {naKostenBand ? `${euroRond(naKostenBand.laag)} tot ${euroRond(naKostenBand.hoog)}` : euroRond(na.kosten)}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Vergoeding Verpact</th>
                  <td className="num" data-label="Bronscheiding">
                    − {euroRond(bron.vergoeding)}
                  </td>
                  <td className="num" data-label="Nascheiding">
                    − {euroRond(na.vergoeding)}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Vermeden verbranding</th>
                  <td className="num" data-label="Bronscheiding">
                    − {bron.vermedenVerbranding === null ? '–' : euroRond(bron.vermedenVerbranding)}
                  </td>
                  <td className="num" data-label="Nascheiding">
                    {na.vermedenVerbranding === null ? 'onbekend' : `− ${euroRond(na.vermedenVerbranding)}`}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Netto</th>
                  <td className="num" data-label="Bronscheiding">
                    <strong>{bron.netto === null ? '–' : kostRond(bron.netto)}</strong>
                  </td>
                  <td className="num" data-label="Nascheiding">
                    <strong>{na.netto === null ? '–' : !conclusie && band?.na ? kostBand(band.na.laag, band.na.hoog) : kostRond(na.netto)}</strong>
                  </td>
                </tr>
                {conclusie && band && (band.bron || band.na) && (
                  <tr>
                    <th scope="row">Bandbreedte</th>
                    <td className="num klein" data-label="Bronscheiding">
                      {band.bron ? kostBand(band.bron.laag, band.bron.hoog) : '–'}
                    </td>
                    <td className="num klein" data-label="Nascheiding">
                      {band.na ? kostBand(band.na.laag, band.na.hoog) : '–'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {conclusie && (
            <p className="klein muted" style={{ margin: 0 }}>
              {breakEven === null
                ? 'Zonder verbrandingstarief of inwoners is er geen omslagpunt te berekenen.'
                : breakEven <= 0
                  ? 'Nascheiding is met dit tarief al goedkoper zonder dat er PMD wordt teruggewonnen.'
                  : breakEven <= i.restafvalNa
                    ? `Omslagpunt: bij ${getal(breakEven, 0)} kg teruggewonnen PMD per inwoner zijn beide routes even duur.`
                    : 'Met dit tarief blijft nascheiding duurder dan bronscheiding, hoeveel PMD er ook wordt teruggewonnen.'}{' '}
              {omslag !== null && `Nascheiding is goedkoper bij een tarief onder ${omslagTekst} per ton restafval.`}
            </p>
          )}
          <UitkomstBronnen
            peildatum={PEILDATUM}
            bronnen={[
              {
                titel: 'akkoord Verpact, VNG en NVRD (2025)',
                url: pmdBronnen.akkoord.url,
              },
              {
                titel: g ? `CBS ${cbsPmd.jaar}` : `CBS ${cbsPmd.landelijk.jaar}`,
                url: g ? cbsPmd.bronnen.gemeente.url : cbsPmd.bronnen.landelijk.url,
              },
              { titel: 'IPR Normag 2021', url: iprBron.url },
              { titel: 'Strategy& 2025', url: pmdBronnen.strategy.url },
            ]}
          />
          <Delen
            naam="Rekenmodel PMD"
            csvRijen={csv}
            params={deelParams}
            pad={PAD}
            toelichting="De CSV bevat invoer met status en herkomst, de opbouw per route (afgerond), de bandbreedte en de formule. De link bewaart gemeente, categorie en alle invoer."
          />
          <RapportKnop />
          {conclusie && bron.netto !== null && na.netto !== null && (
            <Uitklap titel="Vergelijking in grafiek" sub="netto per jaar en per inwoner" kopNiveau={3}>
              <div className="raster raster-2">
                <StaafGrafiek
                  titel="Netto kosten per jaar"
                  kop={<h4 className="klein">Netto per jaar</h4>}
                  formatY={(n) => euro(n)}
                  staven={[
                    {
                      label: 'Bronscheiding',
                      waarde: bron.netto,
                      kleur: reeksKleuren[0],
                    },
                    {
                      label: 'Nascheiding',
                      waarde: na.netto,
                      kleur: reeksKleuren[1],
                    },
                  ]}
                />
                <StaafGrafiek
                  titel="Netto kosten per inwoner"
                  kop={<h4 className="klein">Netto per inwoner</h4>}
                  formatY={(n) => euro(n, 2)}
                  staven={[
                    {
                      label: 'Bronscheiding',
                      waarde: bron.perInwoner ?? 0,
                      kleur: reeksKleuren[0],
                    },
                    {
                      label: 'Nascheiding',
                      waarde: na.perInwoner ?? 0,
                      kleur: reeksKleuren[1],
                    },
                  ]}
                />
              </div>
            </Uitklap>
          )}
          <Uitklap titel="Wat levert een hogere staffelcategorie op?" sub={`vergoeding voor ${metEenheid(bron.pmdTon ?? 0, 'ton')} PMD`} kopNiveau={3}>
            <p className="klein muted" style={{ margin: 0 }}>
              Inzamelvergoeding per categorie en jaar. Bedragen voor 2027 en 2028 zonder de nog onbekende indexatie.
            </p>
            <div className="tabel-container" tabIndex={0} role="region" aria-label="Inzamelvergoeding per staffelcategorie">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Categorie</th>
                    {staffelJaren.map((j) => (
                      <th key={j} scope="col" className="num">
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffel.map((s) => (
                    <tr key={s.categorie} aria-current={s.categorie === categorie ? 'true' : undefined}>
                      <th
                        scope="row"
                        style={{
                          fontWeight: s.categorie === categorie ? 700 : 500,
                        }}
                      >
                        {s.categorie}
                        {s.categorie === categorie ? ' (uw keuze)' : ''}
                      </th>
                      {staffelJaren.map((j) => (
                        <td key={j} className="num">
                          {euro(vergoedingVoorTonnage(bron.pmdTon ?? 0, s.euroPerTon[j]))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Uitklap>
          <Uitklap titel="Zo ontstaat deze uitkomst" sub="formule en uitgangspunten" kopNiveau={3}>
            <code className="formule">{FORMULE}</code>
            <p className="klein muted" style={{ margin: 0 }}>
              Bedragen per jaar, excl. btw. Een negatief bedrag is een netto opbrengst ten opzichte van de nulsituatie. Inzameling van restafval zelf telt in
              beide routes gelijk en staat er niet in. Vervuiling in bronscheidings-PMD en residu na opschoning zitten alleen in het model als u ze onder
              overige kosten invult.
            </p>
          </Uitklap>
        </div>
      </Kaart>

      <Kaart titel="Invoer" kopNiveau={3} className="invoerkaart">
        <div className="velden">
          <KeuzeVeld
            label="Gemeente"
            waarde={gemeente}
            opties={[{ waarde: '', label: 'Geen keuze: landelijk gemiddelde' }, ...cbsGemeenten.map((x) => ({ waarde: x.code, label: x.naam }))]}
            onChange={kiesGemeente}
            hint={`Vult inwoners, PMD en restafval in met CBS-cijfers over ${cbsPmd.jaar}.`}
          />
          <BronVeld
            label="Inwoners"
            eenheid="inw"
            min={1}
            waarde={i.inwoners}
            onChange={(n) => zet('inwoners')(n ?? 0)}
            onFout={melder('inwoners')}
            status={g ? 'officieel' : 'aanname'}
            magLeeg={false}
            voorbeeld={g ? undefined : pmdStandaard.inwoners}
            bronwaarde={g?.inwoners ?? undefined}
            bronwaardeTekst={g?.inwoners ? getal(g.inwoners) : undefined}
            bron={
              g
                ? {
                    titel: `CBS ${cbsPmd.bronnen.inwoners.tabelId}, 1 januari ${cbsPmd.jaar}`,
                    url: cbsPmd.bronnen.inwoners.url,
                  }
                : undefined
            }
          />
          <KeuzeVeld
            label="Staffelcategorie"
            waarde={categorie}
            opties={staffel.map((s) => ({
              waarde: s.categorie,
              label: `${s.categorie}: ${s.aandeel} (${euro(s.euroPerTon[2026])})`,
            }))}
            onChange={kiesCategorie}
            hint="Volgt uit het gemeten aandeel PMD-verpakkingen in uw ingezamelde PMD."
          />
          <Uitklap
            titel="Bronscheiding"
            sub={`${getal(i.responsBron, 1)} kg/inw · kosten ${euro(i.inzamelkostenBron)}/t · vergoeding ${euro(i.vergoedingBron)}/t`}
            kopNiveau={3}
          >
            <BronVeld
              label="PMD gescheiden ingezameld"
              eenheid="kg/inw"
              waarde={i.responsBron}
              onChange={(n) => zet('responsBron')(n ?? 0)}
              onFout={melder('PMD gescheiden ingezameld')}
              status="officieel"
              bronwaarde={bronRespons}
              bronwaardeTekst={`${getal(bronRespons, 1)} kg`}
              bron={g ? cbsBron : cbsNlBron}
              toelichting={g ? undefined : 'Landelijk gemiddelde, inclusief gemeenten die nascheiden. Kies uw gemeente voor een beter beeld.'}
            />
            <BronVeld
              label="Inzamelvergoeding Verpact"
              eenheid="€/t PMD"
              waarde={i.vergoedingBron}
              onChange={(n) => zet('vergoedingBron')(n ?? 0)}
              onFout={melder('inzamelvergoeding')}
              status="officieel"
              bronwaarde={vergoedingCategorie}
              bronwaardeTekst={euro(vergoedingCategorie)}
              bron={akkoordBron}
            />
            <BronVeld
              label="Inzamelkosten"
              eenheid="€/t PMD"
              waarde={i.inzamelkostenBron}
              onChange={(n) => zet('inzamelkostenBron')(n ?? 0)}
              onFout={melder('inzamelkosten')}
              status="kental"
              bronwaarde={kostenbasisBron}
              bronwaardeTekst={euro(kostenbasisBron)}
              bron={akkoordBron}
              toelichting="Gemiddelde kostenbasis van het akkoord, geen raming van uw eigen kosten. Kent u uw kosten per ton, vul die dan in."
            />
            <BronVeld
              label="Overige kosten bronscheiding"
              eenheid="€/t PMD"
              waarde={i.overigeKostenBron}
              onChange={(n) => zet('overigeKostenBron')(n ?? 0)}
              onFout={melder('overige kosten')}
              status="aanname"
              magLeeg={false}
              voorbeeld={0}
              toelichting="Bijvoorbeeld residu na opschoning of extra communicatie. 0 betekent: niet meegerekend."
            />
          </Uitklap>
          <Uitklap
            titel="Nascheiding"
            sub={`${getal(i.restafvalNa, 1)} kg rest/inw · ${i.teruggewonnenNa === null ? 'teruggewonnen niet ingevuld' : `${getal(i.teruggewonnenNa, 1)} kg PMD terug`}`}
            kopNiveau={3}
          >
            <BronVeld
              label="Restafval naar de nascheider"
              eenheid="kg/inw"
              waarde={i.restafvalNa}
              onChange={(n) => zet('restafvalNa')(n ?? 0)}
              onFout={melder('restafval naar de nascheider')}
              status="kental"
              bronwaarde={bronRest}
              bronwaardeTekst={`${getal(bronRest, 1)} kg`}
              bron={g ? cbsBron : cbsNlBron}
              toelichting="Restafval plus het PMD dat nu apart wordt ingezameld, want bij nascheiding zit dat in het restafval."
            />
            <BronVeld
              label="Teruggewonnen PMD"
              eenheid="kg/inw"
              waarde={i.teruggewonnenNa}
              onChange={zet('teruggewonnenNa')}
              onFout={melder('teruggewonnen PMD')}
              status="kental"
              magLeeg
              bronwaarde={nascheidingRendement.midden}
              bronwaardeTekst={`${getal(nascheidingRendement.midden)} kg`}
              bron={iprVeldBron}
              toelichting={`In de praktijk ${nascheidingRendement.laag} tot ${nascheidingRendement.hoog} kg per inwoner, vaak zonder blik. Vraag de opgave van uw nascheider.`}
            />
            <BronVeld
              label="Nascheidingsvergoeding Verpact"
              eenheid="€/t rest"
              waarde={i.vergoedingNa}
              onChange={(n) => zet('vergoedingNa')(n ?? 0)}
              onFout={melder('nascheidingsvergoeding')}
              status="officieel"
              bronwaarde={nascheiding.vergoeding2026}
              bronwaardeTekst={euro(nascheiding.vergoeding2026, 2)}
              bron={akkoordBron}
            />
            <p className="klein muted" style={{ margin: 0 }}>
              Het tarief van uw nascheider vult u in bij de uitkomst: daar hangt de conclusie van af.
            </p>
          </Uitklap>
          <Uitklap titel="Verbranding" sub={`${euro(i.verbrandingstarief, 2)} per ton incl. belasting`} kopNiveau={3}>
            <BronVeld
              label="Verbrandingstarief restafval, incl. afvalstoffenbelasting"
              eenheid="€/t"
              waarde={i.verbrandingstarief}
              onChange={(n) => zet('verbrandingstarief')(n ?? 0)}
              onFout={melder('verbrandingstarief')}
              status="kental"
              bronwaarde={kentalVerbrandingstarief}
              bronwaardeTekst={euro(kentalVerbrandingstarief, 2)}
              bron={{
                titel: 'Strategy& 2025 en Belastingdienst',
                url: pmdBronnen.strategy.url,
              }}
              toelichting={`Vermeden kosten: PMD dat niet wordt verbrand. Bandbreedte ${euro(verbrandingstariefBand.laag, 2)} tot ${euro(verbrandingstariefBand.hoog, 2)}. Vul het tarief uit uw verwerkingscontract in.`}
            />
          </Uitklap>
        </div>
      </Kaart>
    </div>
  );
}
