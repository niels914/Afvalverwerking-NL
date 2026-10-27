import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { BandGrafiek } from '../../components/grafiek/Grafieken';
import type { BronRegel } from '../../components/rekenen/Bronnen';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet } from '../../components/rekenen/Uitkomst';
import { Ankers, Bandbreedte, Meldingen, Uitklap, useUitklapBijPrint, useVeldFouten } from '../../components/rekenen/b/Blokken';
import { BronVeld } from '../../components/rekenen/b/BronVeld';
import { CelGetal } from '../../components/rekenen/b/CelGetal';
import { BronLijst, Delen } from '../../components/rekenen/b/Delen';
import { Ontbreekt } from '../../components/rekenen/b/Knoppen';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../../components/ui';
import { bodemasStandaard } from '../../data/standaardwaarden';
import {
  aantalAvis2024,
  bodemasBereik,
  bodemasBron,
  bodemasContext,
  bodemasJaren,
  bodemasKental,
  bodemasKentallenPerJaar,
  bodemasKostenBron,
  bodemasKostenBronnen,
  bodemasScenario,
  cpi,
  gemiddeldPerAvi,
  kentalNettoOpwerking,
  kentalStortkosten,
  PEILDATUM,
  stortbelasting2026,
} from '../../data/tools-b-bodemas';
import { cbsGemeenten, cbsPmd } from '../../data/tools-b-pmd';
import {
  bandbreedte,
  bodemas,
  bodemasInstallaties,
  bodemasNaarParams,
  bodemasUitParams,
  controleerBodemas,
  gevoeligheid,
  type BedragVeld,
  type BodemasInvoer,
  type BodemasParameter,
  type Installatie,
  type Rekenwijze,
} from '../../lib/calc/bodemas';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/bodemassencalculator';
const FORMULE_KENTAL = [
  'ruwe bodemas     = verbrand afval × aandeel bodemas',
  'ferro, non-ferro = ruwe bodemas × aandeel ferro, aandeel non-ferro',
  'opwerking        = ruwe bodemas × netto opwerkingskosten (metalen al verrekend)',
  'storten residu   = ruwe bodemas × aandeel residu × (stortkosten + stortbelasting)',
  'netto kosten     = opwerking + storten residu',
].join('\n');
const FORMULE_CONTRACT = [
  'ruwe bodemas      = verbrand afval × aandeel bodemas',
  'ferro, non-ferro  = ruwe bodemas × aandeel ferro, aandeel non-ferro',
  'kosten opwerking  = ruwe bodemas × verwerkingstarief',
  'opbrengst metalen = (ferro × prijs ferro + non-ferro × prijs non-ferro) × uw deel',
  'storten residu    = ruwe bodemas × aandeel residu × (stortkosten + stortbelasting)',
  'netto kosten      = kosten opwerking − opbrengst metalen + storten residu',
].join('\n');
const formule = (w: Rekenwijze) => (w === 'kental' ? FORMULE_KENTAL : FORMULE_CONTRACT);

const parameterLabel: Record<BodemasParameter, string> = {
  tonnageVerbrand: 'Verbrand afval',
  aandeelBodemasPct: 'Aandeel bodemas',
  ferroPct: 'Aandeel ferro',
  nonFerroPct: 'Aandeel non-ferro',
  nettoOpwerking: 'Netto opwerkingskosten',
  residuPct: 'Aandeel residu',
  stortkosten: 'Stortkosten residu',
  verwerkingstarief: 'Verwerkingstarief',
  prijsFerro: 'Prijs ferro',
  prijsNonFerro: 'Prijs non-ferro',
};

const bedragLabel: Record<BedragVeld, string> = {
  verwerkingstarief: 'Verwerkingstarief opwerker (€ per ton ruwe bodemas)',
  prijsFerro: 'Opbrengst ferro (€ per ton)',
  prijsNonFerro: 'Opbrengst non-ferro (€ per ton)',
};

const rws = { titel: `Rijkswaterstaat, Afvalverwerking in Nederland ${bodemasKental.jaar}`, url: bodemasBron.url };
const besluit = { titel: 'Staatsblad 2021, 235 en CBS-CPI', url: bodemasKostenBronnen.besluit.url };
const asbBron = { titel: 'Belastingdienst, tarief 2026', url: bodemasKostenBronnen.asb.url };
const pctTekst = (n: number) => procent(n, 1);
const gemeenteOpties = [{ waarde: '', label: `Gemiddelde AVI (${getal(gemiddeldPerAvi)} ton)` }, ...cbsGemeenten.filter((g) => g.inwoners && g.restafvalKgPerInw).map((g) => ({ waarde: g.code, label: g.naam }))];

function tonnageVanGemeente(code: string): number | null {
  const g = cbsGemeenten.find((x) => x.code === code);
  return g?.inwoners && g.restafvalKgPerInw ? Math.round((g.inwoners * g.restafvalKgPerInw) / 1000) : null;
}

/** Kosten of opbrengst in woorden, zodat een min-teken niet de enige aanwijzing is. */
const kostTekst = (n: number, d = 0) => (n < 0 ? `${euro(-n, d)} opbrengst` : `${euro(n, d)} kosten`);

export function Bodemassencalculator() {
  useUitklapBijPrint();
  const [params, setParams] = useSearchParams();
  const [gemeente, setGemeente] = useState(() => {
    const gm = params.get('gm') ?? '';
    return tonnageVanGemeente(gm) !== null ? gm : '';
  });
  const [i, setI] = useState<BodemasInvoer>(() => {
    const gm = params.get('gm') ?? '';
    const t = tonnageVanGemeente(gm);
    return bodemasUitParams(params, t !== null ? { ...bodemasStandaard, tonnageVerbrand: t } : bodemasStandaard);
  });
  const { melder, melding } = useVeldFouten();
  const zet = <K extends keyof BodemasInvoer>(k: K) => (v: BodemasInvoer[K]) => setI((x) => ({ ...x, [k]: v }));
  const u = bodemas(i);
  const controle = controleerBodemas(i, bodemasBereik, bodemasKostenBron.residuVolgensBesluitPct);
  const band = bandbreedte(i, bodemasScenario);
  const g = cbsGemeenten.find((x) => x.code === gemeente);
  const bronTonnage = gemeente ? tonnageVanGemeente(gemeente) : gemiddeldPerAvi;

  const deelParams = bodemasNaarParams(i, gemeente ? { gm: gemeente } : {});
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  function kiesGemeente(code: string) {
    setGemeente(code);
    setI((x) => ({ ...x, tonnageVerbrand: tonnageVanGemeente(code) ?? gemiddeldPerAvi }));
  }

  const herkomst = (k: keyof BodemasInvoer): string => {
    const gelijk = (a: number | null, b: number) => a === b;
    switch (k) {
      case 'tonnageVerbrand':
        return i.tonnageVerbrand === bronTonnage ? (g ? `CBS ${cbsPmd.jaar}: inwoners × restafval ${g.naam}` : `Rijkswaterstaat ${bodemasKental.jaar}: gemiddelde per AVI`) : 'eigen waarde';
      case 'aandeelBodemasPct':
      case 'ferroPct':
      case 'nonFerroPct':
        return i[k] === bodemasKental[k] ? `kental Rijkswaterstaat ${bodemasKental.jaar}` : 'eigen waarde';
      case 'residuPct':
        return gelijk(i.residuPct, bodemasScenario.midden.residuPct) ? `kental Rijkswaterstaat ${bodemasKental.jaar} (gestort)` : 'eigen waarde';
      case 'nettoOpwerking':
        return gelijk(i.nettoOpwerking, kentalNettoOpwerking) ? 'kental Staatsblad 2021, 235, CPI 2021-2025' : 'eigen waarde';
      case 'stortkosten':
        return gelijk(i.stortkosten, kentalStortkosten) ? 'kental Staatsblad 2021, 235 (midden 30-40), CPI 2021-2025' : 'eigen waarde';
      case 'stortbelasting':
        return gelijk(i.stortbelasting, stortbelasting2026) ? 'Belastingdienst, tarief 2026' : 'eigen waarde';
      default:
        return i[k] === null ? 'niet ingevuld' : 'eigen waarde';
    }
  };

  const csv = (): CsvCel[][] => [
    ['Bodemassencalculator', 'KplusV'],
    ['Peildatum bronnen', PEILDATUM],
    ['Rekenwijze', i.rekenwijze === 'kental' ? 'kentallen uit openbare bronnen' : 'eigen contract: tarief en metaalprijzen'],
    ['Gebied', g ? g.naam : 'gemiddelde AVI in Nederland'],
    [],
    ['Invoer', 'Waarde', 'Herkomst'],
    ['Verbrand afval (ton per jaar)', i.tonnageVerbrand, herkomst('tonnageVerbrand')],
    ['Aandeel ruwe bodemas (% van verbrand)', i.aandeelBodemasPct, herkomst('aandeelBodemasPct')],
    ['Aandeel ferro (% van ruwe bodemas)', i.ferroPct, herkomst('ferroPct')],
    ['Aandeel non-ferro (% van ruwe bodemas)', i.nonFerroPct, herkomst('nonFerroPct')],
    ['Aandeel residu gestort (% van ruwe bodemas)', i.residuPct, herkomst('residuPct')],
    ['Stortkosten residu (euro per ton, excl. belasting)', i.stortkosten, herkomst('stortkosten')],
    ['Stortbelasting (euro per ton)', i.stortbelasting, herkomst('stortbelasting')],
    ...(i.rekenwijze === 'kental'
      ? ([['Netto opwerkingskosten (euro per ton ruwe bodemas, metalen verrekend)', i.nettoOpwerking, herkomst('nettoOpwerking')]] as CsvCel[][])
      : ([
          ['Verwerkingstarief (euro per ton ruwe bodemas)', i.verwerkingstarief, herkomst('verwerkingstarief')],
          ['Opbrengst ferro (euro per ton)', i.prijsFerro, herkomst('prijsFerro')],
          ['Opbrengst non-ferro (euro per ton)', i.prijsNonFerro, herkomst('prijsNonFerro')],
          ['Deel metaalopbrengst voor opdrachtgever (%)', i.aandeelOpbrengstPct, 'rekenkeuze gebruiker'],
        ] as CsvCel[][])),
    [],
    ['Uitkomst', 'Waarde'],
    ['Ruwe bodemas (ton)', u.bodemasTon],
    ['Ferro (ton)', u.ferroTon],
    ['Non-ferro (ton)', u.nonFerroTon],
    ['Residu gestort (ton)', u.residuTon],
    ['Overig, vooral mineralen (ton)', u.overigTon],
    ['Kosten opwerking (euro)', u.brutoKosten],
    ['Opbrengst metalen (euro)', i.rekenwijze === 'kental' ? 'verrekend in de netto opwerkingskosten' : u.opbrengst],
    ['Kosten storten residu (euro)', u.kostenStorten],
    ['Netto kosten (euro per jaar, negatief = opbrengst)', u.nettoKosten],
    ['Netto per ton verbrand (euro)', u.perTonVerbrand],
    ['Netto per ton ruwe bodemas (euro)', u.perTonBodemas],
    ...(band ? ([['Bandbreedte netto kosten laag (euro)', band.laag], ['Bandbreedte netto kosten hoog (euro)', band.hoog]] as CsvCel[][]) : []),
    ...(u.ontbrekend.length ? [['Niet berekend', `ontbreekt: ${u.ontbrekend.map((v) => bedragLabel[v]).join(', ')}`] as CsvCel[]] : []),
    ...controle.fouten.map((f): CsvCel[] => ['Fout in invoer', f]),
    ...controle.signalen.map((f): CsvCel[] => ['Let op', f]),
    [],
    ['Formule', formule(i.rekenwijze)],
    [],
    ['Bronnen', 'Link'],
    [`${bodemasBron.uitgever}, ${bodemasBron.titel}`, bodemasBron.url],
    [`${bodemasKostenBronnen.besluit.uitgever}, ${bodemasKostenBronnen.besluit.titel}`, bodemasKostenBronnen.besluit.url],
    [`${bodemasKostenBronnen.cpi.uitgever}, ${bodemasKostenBronnen.cpi.titel}`, bodemasKostenBronnen.cpi.url],
    [`${bodemasKostenBronnen.asb.uitgever}, ${bodemasKostenBronnen.asb.titel}`, bodemasKostenBronnen.asb.url],
    ...(g ? ([[`CBS ${cbsPmd.bronnen.gemeente.tabelId} en ${cbsPmd.bronnen.inwoners.tabelId}`, cbsPmd.bronnen.gemeente.url]] as CsvCel[][]) : []),
  ];

  const bronRegels: BronRegel[] = [
    {
      onderwerp: 'Aandeel ruwe bodemas, ferro en non-ferro',
      status: 'kental',
      waarde: `bodemas ${pctTekst(bodemasKental.aandeelBodemasPct)} van het verbrande afval; ferro ${pctTekst(bodemasKental.ferroPct)} en non-ferro ${pctTekst(
        bodemasKental.nonFerroPct,
      )} van de ruwe bodemas (${bodemasKental.jaar})`,
      toelichting: `Afgeleid uit ${getal(bodemasJaren[2].ruweBodemasKton)} kton ruwe bodemas, ${getal(bodemasJaren[2].ferroKton)} kton ferro en ${getal(
        bodemasJaren[2].nonFerroKton,
      )} kton non-ferro bij ${getal(bodemasJaren[2].verbrandKton)} kton verbrand in ${aantalAvis2024} AVI’s (tabel 9 en 13). Per installatie verschilt dit.`,
      bron: `${bodemasBron.uitgever}, ${bodemasBron.titel}`,
      url: bodemasBron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Residu dat wordt gestort',
      status: 'kental',
      waarde: `${pctTekst(bodemasScenario.midden.residuPct)} van de ruwe bodemas (${bodemasKental.jaar}); bandbreedte tot ${pctTekst(bodemasKostenBron.residuVolgensBesluitPct)}`,
      toelichting: `${getal(bodemasJaren[2].gestortKton)} kton gestorte bodemas en reinigingsresidu in ${bodemasKental.jaar} (tabel 13). Bij wassen tot vrij toepasbare bouwstof ontstaat meer residu: het besluit noemt ongeveer ${bodemasKostenBron.residuVolgensBesluitPct} %, Strategy& noemt 12–15 % (expertinterviews). Die waarde is de bovenkant van de bandbreedte.`,
      bron: `${bodemasBron.uitgever}; ${bodemasKostenBronnen.besluit.uitgever}`,
      url: bodemasBron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Netto opwerkingskosten',
      status: 'kental',
      waarde: `${euro(kentalNettoOpwerking, 2)} per ton ruwe bodemas (prijspeil 2025); bandbreedte ${euro(bodemasScenario.laag.nettoOpwerking, 2)} tot ${euro(kentalNettoOpwerking, 2)}`,
      toelichting: `Volgens de nota van toelichting kost opwerking de AVI per saldo ongeveer € ${bodemasKostenBron.opwerkingNetto2021} per ton: reinigen is duurder, maar de opbrengst van metalen en gereinigde bodemas maakt dat goed. KplusV rekent het bedrag van 2021 om naar 2025 met de consumentenprijsindex van CBS (${getal(cpi[2021], 2)} → ${getal(cpi[2025], 2)}).`,
      bron: `${bodemasKostenBronnen.besluit.uitgever}; ${bodemasKostenBronnen.cpi.uitgever}, ${bodemasKostenBronnen.cpi.titel}`,
      url: bodemasKostenBronnen.besluit.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Stortkosten en stortbelasting residu',
      status: 'kental',
      waarde: `${euro(kentalStortkosten, 2)} per ton plus ${euro(stortbelasting2026, 2)} afvalstoffenbelasting (2026)`,
      toelichting: `Het besluit noemt € ${bodemasKostenBron.stortkostenLaag2021}–${bodemasKostenBron.stortkostenHoog2021} per ton storten (2021), zonder belasting. De calculator rekent met het midden, omgerekend naar 2025 met de CPI. De afvalstoffenbelasting is één tarief voor storten en verbranden.`,
      bron: `${bodemasKostenBronnen.besluit.uitgever}; ${bodemasKostenBronnen.asb.uitgever}, ${bodemasKostenBronnen.asb.titel}`,
      url: bodemasKostenBronnen.asb.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Verbrand afval',
      status: g ? 'officieel' : 'kental',
      waarde: g ? `${g.naam}: ${getal(g.inwoners ?? 0)} inwoners × ${getal(g.restafvalKgPerInw ?? 0, 1)} kg fijn restafval` : `${getal(gemiddeldPerAvi)} ton: ${getal(bodemasJaren[2].verbrandKton)} kton in ${aantalAvis2024} AVI’s`,
      toelichting: g
        ? 'Fijn huishoudelijk restafval van de gemeente. Gaat een deel naar nascheiding of gaat er bedrijfsafval mee, vul dan uw eigen tonnage in.'
        : 'Landelijk gemiddelde per afvalverbrandingsinstallatie. Kies een gemeente of vul het tonnage van uw contract in.',
      bron: g ? `CBS ${cbsPmd.bronnen.gemeente.tabelId} en ${cbsPmd.bronnen.inwoners.tabelId}, ${cbsPmd.jaar}` : `${bodemasBron.uitgever}, ${bodemasBron.titel}`,
      url: g ? cbsPmd.bronnen.gemeente.url : bodemasBron.url,
      peildatum: g ? cbsPmd.peildatum : PEILDATUM,
    },
    {
      onderwerp: 'Samenstelling en betaling (context)',
      status: 'kental',
      waarde: bodemasContext.samenstelling,
      toelichting: `${bodemasContext.betaling} Op basis van expertinterviews; niet gebruikt in de berekening.`,
      bron: `${bodemasContext.bron.uitgever}, ${bodemasContext.bron.titel}`,
      url: bodemasContext.bron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Verwerkingstarief, metaalprijzen en uw deel van de opbrengst (rekenwijze contract)',
      status: 'aanname',
      toelichting: 'Hiervoor bestaat geen openbare bron. Tarieven volgen uit contracten tussen AVI’s en opwerkers; metaalprijzen bewegen met de schrootmarkt. Vul de bedragen uit uw contract of offerte in.',
    },
  ];

  const metalenTon = u.ferroTon + u.nonFerroTon;
  const fouten = [...(melding ? [melding] : []), ...controle.fouten];
  const kern =
    u.nettoKosten === null
      ? 'Vul het verwerkingstarief en de metaalprijzen uit uw contract in om de netto kosten te zien.'
      : u.nettoKosten < 0
        ? `Opwerken levert met deze invoer netto ${euro(-u.nettoKosten)} per jaar op: ${euro(-(u.perTonVerbrand ?? 0), 2)} per ton verbrand afval.`
        : `Opwerken en het storten van residu kosten netto ongeveer ${euro(u.nettoKosten)} per jaar: ${euro(u.perTonVerbrand ?? 0, 2)} per ton verbrand afval.`;

  return (
    <>
      <RapportKop
        titel="Bodemassencalculator"
        ondertitel={`Kentallen Rijkswaterstaat ${bodemasKental.jaar}, Staatsblad 2021, 235 en Belastingdienst; peildatum ${datum(PEILDATUM)}`}
      />
      <PaginaKop titel="Bodemassencalculator" badges={<Badge soort="pro">Gratis deel + Pro voor leden</Badge>}>
        Hoeveel bodemas en metalen komen vrij bij de verbranding van uw afval, en wat kost het opwerken? De calculator rekent
        met openbare cijfers van Rijkswaterstaat, de overheid en CBS. Elk getal kunt u vervangen door uw eigen waarde.
      </PaginaKop>
      <Ankers
        links={[
          { id: 'uitkomst', label: 'Uitkomst' },
          { id: 'invoer', label: 'Invoer' },
          { id: 'kentallen', label: 'Cijfers per jaar' },
          { id: 'bronnen', label: 'Bronnen' },
          { id: 'pro', label: 'Meerdere installaties (Pro)' },
        ]}
      />

      <div className="tb-tool">
        <Kaart titel="Uitkomst" id="uitkomst" className="tb-uitkomst" actie={<Badge soort="status-gegund">Openbare bronnen, peildatum {datum(PEILDATUM)}</Badge>}>
          <div className="stapel" aria-live="polite">
            <Meldingen fouten={fouten} signalen={controle.signalen} />
            <p className="tb-kern">
              Bij {metEenheid(i.tonnageVerbrand, 'ton')} verbrand afval komt ongeveer <strong>{metEenheid(u.bodemasTon, 'ton')} ruwe bodemas</strong> vrij, met{' '}
              {metEenheid(u.ferroTon, 'ton')} ferro en {metEenheid(u.nonFerroTon, 'ton')} non-ferro. {kern}
            </p>
            <div className={`tegels${melding ? ' tb-verouderd' : ''}`}>
              <Tegel
                label={u.nettoKosten !== null && u.nettoKosten < 0 ? 'Netto opbrengst per jaar' : 'Netto kosten per jaar'}
                waarde={u.nettoKosten === null ? '–' : euro(Math.abs(u.nettoKosten))}
                toelichting={u.nettoKosten === null ? 'vul tarief en prijzen in' : `${kostTekst(u.perTonVerbrand ?? 0, 2)} per ton verbrand`}
                hero
              />
              <Tegel label="Ruwe bodemas" waarde={metEenheid(u.bodemasTon, 'ton')} toelichting="per jaar" />
              <Tegel label="Metalen" waarde={metEenheid(metalenTon, 'ton')} toelichting={`ferro ${getal(u.ferroTon)} t, non-ferro ${getal(u.nonFerroTon)} t`} />
            </div>
            {band && band.volgtScenario.length > 0 && band.hoog - band.laag > 0.5 && (
              <Bandbreedte
                laag={band.laag}
                hoog={band.hoog}
                toelichting={`per jaar, als ${band.volgtScenario.map((k) => parameterLabel[k as BodemasParameter].toLowerCase()).join(', ')} binnen de bronwaarden variëren.`}
              />
            )}
            <Ontbreekt
              velden={u.ontbrekend.map((v) => bedragLabel[v])}
              uitleg="Hiervoor bestaat geen openbare bron. Vul de bedragen uit uw contract in, of kies de rekenwijze met kentallen."
            />
            <dl className="invoerlijst">
              <dt>{i.rekenwijze === 'kental' ? 'Opwerking (metalen verrekend)' : 'Kosten opwerking'}</dt>
              <dd>{u.brutoKosten === null ? '–' : euro(u.brutoKosten)}</dd>
              {i.rekenwijze === 'contract' && (
                <>
                  <dt>Opbrengst metalen voor u</dt>
                  <dd>{u.opbrengst === null ? '–' : `− ${euro(u.opbrengst)}`}</dd>
                </>
              )}
              <dt>Storten residu ({metEenheid(u.residuTon, 'ton')})</dt>
              <dd>{euro(u.kostenStorten)}</dd>
              <dt>Netto per ton ruwe bodemas</dt>
              <dd>{u.perTonBodemas === null ? '–' : kostTekst(u.perTonBodemas, 2)}</dd>
            </dl>
            <Delen
              naam="Bodemassencalculator"
              csvRijen={csv}
              params={deelParams}
              pad={PAD}
              toelichting="De link bewaart uw invoer, ook de bedragen. Lokaal getest toont hij het adres van uw eigen computer."
              extra={
                <button type="button" onClick={() => window.print()}>
                  Printen of opslaan als PDF
                </button>
              }
            />
            <Uitklap titel="Zo ontstaat deze uitkomst" sub="formule en gebruikte invoer" kopNiveau={3}>
              <code className="formule">{formule(i.rekenwijze)}</code>
              <p className="klein muted" style={{ margin: 0 }}>
                Bedragen excl. btw. Transport van de bodemas en de CO2-heffing zitten er niet in.
              </p>
              <dl className="invoerlijst">
                <dt>Verbrand afval</dt>
                <dd>{metEenheid(i.tonnageVerbrand, 'ton/jaar')}</dd>
                <dt>Aandeel bodemas</dt>
                <dd>{pctTekst(i.aandeelBodemasPct)}</dd>
                <dt>Ferro / non-ferro</dt>
                <dd>
                  {pctTekst(i.ferroPct)} / {pctTekst(i.nonFerroPct)}
                </dd>
                <dt>Residu gestort</dt>
                <dd>{pctTekst(i.residuPct)}</dd>
                <dt>Stortkosten + belasting</dt>
                <dd>
                  {euro(i.stortkosten, 2)} + {euro(i.stortbelasting, 2)} per ton
                </dd>
                {i.rekenwijze === 'kental' ? (
                  <>
                    <dt>Netto opwerkingskosten</dt>
                    <dd>{euro(i.nettoOpwerking, 2)} per ton bodemas</dd>
                  </>
                ) : (
                  <>
                    <dt>Verwerkingstarief</dt>
                    <dd>{i.verwerkingstarief === null ? 'niet ingevuld' : `${euro(i.verwerkingstarief, 2)} per ton`}</dd>
                    <dt>Opbrengst ferro / non-ferro</dt>
                    <dd>
                      {i.prijsFerro === null ? 'niet ingevuld' : euro(i.prijsFerro, 2)} / {i.prijsNonFerro === null ? 'niet ingevuld' : euro(i.prijsNonFerro, 2)} per ton
                    </dd>
                    <dt>Uw deel van de opbrengst</dt>
                    <dd>{procent(i.aandeelOpbrengstPct, 0)}</dd>
                  </>
                )}
              </dl>
            </Uitklap>
          </div>
        </Kaart>

        <Kaart titel="Invoer" id="invoer" className="invoerkaart">
          <div className="velden">
            <KeuzeVeld
              label="Gemeente of gemiddelde AVI"
              waarde={gemeente}
              opties={gemeenteOpties}
              onChange={kiesGemeente}
              hint={`Een gemeente vult het tonnage fijn restafval in met CBS-cijfers over ${cbsPmd.jaar}.`}
            />
            <BronVeld
              label="Verbrand afval"
              eenheid="ton/jaar"
              waarde={i.tonnageVerbrand}
              onChange={(n) => zet('tonnageVerbrand')(n ?? 0)}
              onFout={melder('verbrand afval')}
              status={g ? 'officieel' : 'kental'}
              magLeeg={false}
              bronwaarde={bronTonnage}
              bronwaardeTekst={bronTonnage !== null ? metEenheid(bronTonnage, 'ton') : undefined}
              bron={g ? { titel: `CBS ${cbsPmd.jaar}`, url: cbsPmd.bronnen.gemeente.url } : rws}
            />
            <fieldset className="tb-keuze">
              <legend>Rekenwijze</legend>
              <label>
                <input type="radio" name="bodemas-wijze" checked={i.rekenwijze === 'kental'} onChange={() => zet('rekenwijze')('kental')} />
                Met kentallen uit openbare bronnen
              </label>
              <label>
                <input type="radio" name="bodemas-wijze" checked={i.rekenwijze === 'contract'} onChange={() => zet('rekenwijze')('contract')} />
                Met mijn contract: tarief en metaalprijzen
              </label>
            </fieldset>
            {i.rekenwijze === 'contract' && (
              <>
                <BronVeld
                  label="Verwerkingstarief opwerker"
                  eenheid="€/t bodemas"
                  waarde={i.verwerkingstarief}
                  onChange={zet('verwerkingstarief')}
                  onFout={melder('verwerkingstarief')}
                  status="aanname"
                  toelichting="Wat de opwerker per ton ruwe bodemas rekent, volgens uw contract."
                />
                <div className="velden-2">
                  <BronVeld label="Opbrengst ferro" eenheid="€/t" waarde={i.prijsFerro} onChange={zet('prijsFerro')} onFout={melder('opbrengst ferro')} status="aanname" />
                  <BronVeld label="Opbrengst non-ferro" eenheid="€/t" waarde={i.prijsNonFerro} onChange={zet('prijsNonFerro')} onFout={melder('opbrengst non-ferro')} status="aanname" />
                </div>
                <GetalVeld
                  label="Uw deel van de metaalopbrengst"
                  eenheid="%"
                  max={100}
                  waarde={i.aandeelOpbrengstPct}
                  onChange={zet('aandeelOpbrengstPct')}
                  hint="Contractafspraak. Bij 0 % houdt de opwerker de metalen."
                />
              </>
            )}
            <Uitklap
              titel="Kosten van opwerken en storten"
              sub={i.rekenwijze === 'kental' ? `${euro(i.nettoOpwerking, 2)}/t bodemas · residu ${pctTekst(i.residuPct)}` : `residu ${pctTekst(i.residuPct)}`}
              kopNiveau={3}
            >
              {i.rekenwijze === 'kental' && (
                <BronVeld
                  label="Netto opwerkingskosten"
                  eenheid="€/t bodemas"
                  waarde={i.nettoOpwerking}
                  onChange={(n) => zet('nettoOpwerking')(n ?? 0)}
                  onFout={melder('netto opwerkingskosten')}
                  status="kental"
                  bronwaarde={kentalNettoOpwerking}
                  bronwaardeTekst={euro(kentalNettoOpwerking, 2)}
                  bron={besluit}
                  toelichting={`De metaalopbrengst is al verrekend. € ${bodemasKostenBron.opwerkingNetto2021} per ton in 2021, omgerekend naar 2025.`}
                />
              )}
              <BronVeld
                label="Residu dat wordt gestort"
                eenheid="% van bodemas"
                max={100}
                waarde={i.residuPct}
                onChange={(n) => zet('residuPct')(n ?? 0)}
                onFout={melder('residu')}
                status="kental"
                bronwaarde={bodemasScenario.midden.residuPct}
                bronwaardeTekst={pctTekst(bodemasScenario.midden.residuPct)}
                bron={rws}
                toelichting={
                  i.rekenwijze === 'contract'
                    ? 'Zit het storten van residu al in uw tarief? Zet dit dan op 0.'
                    : `Gemeten in ${bodemasKental.jaar}. Bij volledig wassen tot ongeveer ${bodemasKostenBron.residuVolgensBesluitPct} %.`
                }
              />
              <div className="velden-2">
                <BronVeld
                  label="Stortkosten residu"
                  eenheid="€/t"
                  waarde={i.stortkosten}
                  onChange={(n) => zet('stortkosten')(n ?? 0)}
                  onFout={melder('stortkosten')}
                  status="kental"
                  bronwaarde={kentalStortkosten}
                  bronwaardeTekst={euro(kentalStortkosten, 2)}
                  bron={besluit}
                />
                <BronVeld
                  label="Stortbelasting"
                  eenheid="€/t"
                  waarde={i.stortbelasting}
                  onChange={(n) => zet('stortbelasting')(n ?? 0)}
                  onFout={melder('stortbelasting')}
                  status="officieel"
                  bronwaarde={stortbelasting2026}
                  bronwaardeTekst={euro(stortbelasting2026, 2)}
                  bron={asbBron}
                />
              </div>
            </Uitklap>
            <Uitklap
              titel="Aandelen bodemas en metalen"
              sub={`bodemas ${pctTekst(i.aandeelBodemasPct)} · ferro ${pctTekst(i.ferroPct)} · non-ferro ${pctTekst(i.nonFerroPct)}`}
              kopNiveau={3}
            >
              <BronVeld
                label="Aandeel ruwe bodemas"
                eenheid="% van verbrand"
                max={100}
                waarde={i.aandeelBodemasPct}
                onChange={(n) => zet('aandeelBodemasPct')(n ?? 0)}
                onFout={melder('aandeel bodemas')}
                status="kental"
                bronwaarde={bodemasKental.aandeelBodemasPct}
                bronwaardeTekst={pctTekst(bodemasKental.aandeelBodemasPct)}
                bron={rws}
                peildatum={PEILDATUM}
              />
              <div className="velden-2">
                <BronVeld
                  label="Aandeel ferro"
                  eenheid="% van bodemas"
                  max={100}
                  waarde={i.ferroPct}
                  onChange={(n) => zet('ferroPct')(n ?? 0)}
                  onFout={melder('aandeel ferro')}
                  status="kental"
                  bronwaarde={bodemasKental.ferroPct}
                  bronwaardeTekst={pctTekst(bodemasKental.ferroPct)}
                  bron={rws}
                />
                <BronVeld
                  label="Aandeel non-ferro"
                  eenheid="% van bodemas"
                  max={100}
                  waarde={i.nonFerroPct}
                  onChange={(n) => zet('nonFerroPct')(n ?? 0)}
                  onFout={melder('aandeel non-ferro')}
                  status="kental"
                  bronwaarde={bodemasKental.nonFerroPct}
                  bronwaardeTekst={pctTekst(bodemasKental.nonFerroPct)}
                  bron={rws}
                />
              </div>
            </Uitklap>
          </div>
        </Kaart>
      </div>

      <div className="stapel" style={{ marginTop: 16 }}>
        <Uitklap id="kentallen" titel="Bodemas en metalen in Nederland per jaar" sub={`${bodemasJaren[0].jaar}–${bodemasKental.jaar}, alle AVI’s samen`}>
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel bodemas en metalen per jaar">
            <table>
              <caption>
                Kiloton en percentages. Bron:{' '}
                <a href={bodemasBron.url} target="_blank" rel="noopener noreferrer">
                  Rijkswaterstaat, Afvalverwerking in Nederland, gegevens 2024
                </a>
                , tabel 9 en 13. Percentages afgeleid door KplusV.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Verbrand
                  </th>
                  <th scope="col" className="num">
                    Ruwe bodemas
                  </th>
                  <th scope="col" className="num">
                    Ferro
                  </th>
                  <th scope="col" className="num">
                    Non-ferro
                  </th>
                  <th scope="col" className="num">
                    Gestort
                  </th>
                </tr>
              </thead>
              <tbody>
                {bodemasJaren.map((j, n) => {
                  const k = bodemasKentallenPerJaar[n];
                  return (
                    <tr key={j.jaar}>
                      <th scope="row" style={{ fontWeight: 500 }}>
                        {j.jaar}
                      </th>
                      <td className="num">{getal(j.verbrandKton)} kt</td>
                      <td className="num">
                        {getal(j.ruweBodemasKton)} kt
                        <br />
                        <span className="klein muted">{pctTekst(k.aandeelBodemasPct)}</span>
                      </td>
                      <td className="num">
                        {getal(j.ferroKton)} kt
                        <br />
                        <span className="klein muted">{pctTekst(k.ferroPct)}</span>
                      </td>
                      <td className="num">
                        {getal(j.nonFerroKton)} kt
                        <br />
                        <span className="klein muted">{pctTekst(k.nonFerroPct)}</span>
                      </td>
                      <td className="num">
                        {getal(j.gestortKton)} kt
                        <br />
                        <span className="klein muted">{pctTekst(k.gestortPct)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="klein muted" style={{ margin: 0 }}>
            In 2024 werd minder verbrand door de brand bij AVR Rozenburg in september 2023. Gestort: bodemas en reinigingsresidu,
            inclusief steunlaag.
          </p>
        </Uitklap>
        <Uitklap id="bronnen" titel="Bronnen en peildatum" sub={`geraadpleegd op ${datum(PEILDATUM)}`}>
          <BronLijst regels={bronRegels} />
        </Uitklap>
      </div>

      <h2 className="sectie tb-pro-scheiding" id="pro">
        Voor leden: meerdere installaties en gevoeligheid
      </h2>
      <p className="klein muted" style={{ marginTop: 0 }}>
        Het gratis deel hierboven is compleet. Leden vergelijken daarnaast installaties, zien welke aanname het meeste uitmaakt
        en maken een rapport.
      </p>
      <Vergrendeld
        titel="Bodemassencalculator Pro"
        ledenKrijgen={['Meerdere installaties naast elkaar, met totaal', 'Gevoeligheidsanalyse per parameter', 'CSV van alle installaties en rapport maken']}
      >
        <BodemasPro basis={i} />
      </Vergrendeld>
      <RapportVoet tekst={`Bronnen: Rijkswaterstaat ${bodemasKental.jaar}, Staatsblad 2021, 235, CBS en Belastingdienst; peildatum ${datum(PEILDATUM)}`} />
    </>
  );
}

/* ---------- Pro ---------- */

type Kolom = { sleutel: Exclude<keyof BodemasInvoer, 'aandeelOpbrengstPct' | 'rekenwijze' | 'stortbelasting'>; label: string; eenheid: string; leeg?: boolean; max?: number };

const kolommenKental: Kolom[] = [
  { sleutel: 'tonnageVerbrand', label: 'Verbrand', eenheid: 'ton' },
  { sleutel: 'aandeelBodemasPct', label: 'Bodemas', eenheid: '%', max: 100 },
  { sleutel: 'nettoOpwerking', label: 'Opwerking', eenheid: '€/t' },
  { sleutel: 'residuPct', label: 'Residu', eenheid: '%', max: 100 },
  { sleutel: 'stortkosten', label: 'Storten', eenheid: '€/t' },
];
const kolommenContract: Kolom[] = [
  { sleutel: 'tonnageVerbrand', label: 'Verbrand', eenheid: 'ton' },
  { sleutel: 'aandeelBodemasPct', label: 'Bodemas', eenheid: '%', max: 100 },
  { sleutel: 'ferroPct', label: 'Ferro', eenheid: '%', max: 100 },
  { sleutel: 'nonFerroPct', label: 'Non-ferro', eenheid: '%', max: 100 },
  { sleutel: 'verwerkingstarief', label: 'Tarief', eenheid: '€/t', leeg: true },
  { sleutel: 'prijsFerro', label: 'Ferro', eenheid: '€/t', leeg: true },
  { sleutel: 'prijsNonFerro', label: 'Non-ferro', eenheid: '€/t', leeg: true },
  { sleutel: 'residuPct', label: 'Residu', eenheid: '%', max: 100 },
];

function BodemasPro({ basis }: { basis: BodemasInvoer }) {
  const [opgeslagen, setInstallaties] = useState<Installatie[]>(() => [{ id: 'i1', naam: 'Installatie 1', ...basis }]);
  const [volgnummer, setVolgnummer] = useState(2);
  const [gekozen, setGekozen] = useState('i1');
  const [variatie, setVariatie] = useState(20);

  // Alle installaties rekenen met de rekenwijze die in het gratis deel is gekozen.
  const installaties = opgeslagen.map((x) => ({ ...x, rekenwijze: basis.rekenwijze }));
  const kolommen = basis.rekenwijze === 'kental' ? kolommenKental : kolommenContract;
  const { regels, totaal } = bodemasInstallaties(installaties);
  const analyseVan = installaties.find((x) => x.id === gekozen) ?? installaties[0];
  const analyse = analyseVan ? gevoeligheid(analyseVan, variatie / 100) : [];
  const basisNetto = analyseVan ? bodemas(analyseVan).nettoKosten : null;

  function wijzig(id: string, sleutel: keyof Installatie, w: string | number | null) {
    setInstallaties((l) => l.map((x) => (x.id === id ? { ...x, [sleutel]: w } : x)));
  }
  function voegToe() {
    const id = `i${volgnummer}`;
    setVolgnummer((v) => v + 1);
    setInstallaties((l) => [...l, { id, naam: `Installatie ${volgnummer}`, ...basis }]);
  }
  function verwijder(id: string) {
    setInstallaties((l) => l.filter((x) => x.id !== id));
    if (gekozen === id) setGekozen(installaties.find((x) => x.id !== id)?.id ?? '');
  }

  const csvPro = (): CsvCel[][] => [
    ['Bodemassencalculator Pro', 'KplusV'],
    ['Peildatum bronnen', PEILDATUM],
    ['Rekenwijze', basis.rekenwijze === 'kental' ? 'kentallen uit openbare bronnen' : 'eigen contract'],
    [],
    [
      'Installatie',
      ...kolommen.map((k) => `${k.label} (${k.eenheid.replace('€', 'euro')})`),
      'Ruwe bodemas (ton)',
      'Ferro (ton)',
      'Non-ferro (ton)',
      'Kosten opwerking (euro)',
      'Opbrengst metalen (euro)',
      'Storten residu (euro)',
      'Netto (euro)',
    ],
    ...installaties.map((x, n): CsvCel[] => {
      const r = regels[n];
      return [x.naam, ...kolommen.map((k) => x[k.sleutel]), r.bodemasTon, r.ferroTon, r.nonFerroTon, r.brutoKosten, r.opbrengst, r.kostenStorten, r.nettoKosten];
    }),
    ['Totaal', totaal.tonnageVerbrand, ...kolommen.slice(1).map(() => ''), totaal.bodemasTon, totaal.ferroTon, totaal.nonFerroTon, totaal.brutoKosten, totaal.opbrengst, totaal.kostenStorten, totaal.nettoKosten],
    [],
    ...(analyse.length
      ? ([
          [`Gevoeligheid ${analyseVan?.naam ?? ''}`, `variatie ${variatie} %`],
          ['Parameter', 'Netto bij −', 'Netto bij +', 'Bandbreedte'],
          ...analyse.map((a): CsvCel[] => [parameterLabel[a.parameter], a.laag, a.hoog, a.bandbreedte]),
          [],
        ] as CsvCel[][])
      : []),
    ['Formule', formule(basis.rekenwijze)],
  ];

  return (
    <div className="stapel">
      <Kaart
        titel="Installaties"
        kopNiveau={3}
        className="invoerkaart"
        sub={`Elke nieuwe installatie begint met de invoer uit het gratis deel. Rekenwijze: ${basis.rekenwijze === 'kental' ? 'kentallen' : 'eigen contract'}.`}
        actie={
          <button type="button" onClick={voegToe}>
            + Installatie toevoegen
          </button>
        }
      >
        <div className="tabel-container" tabIndex={0} role="region" aria-label="Invoer per installatie">
          <table>
            <thead>
              <tr>
                <th scope="col">Naam</th>
                {kolommen.map((k) => (
                  <th key={k.sleutel} scope="col">
                    {k.label} ({k.eenheid})
                  </th>
                ))}
                {basis.rekenwijze === 'contract' && <th scope="col">Uw deel (%)</th>}
                <th scope="col">
                  <span className="visueel-verborgen">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {installaties.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="invoer">
                      <input type="text" aria-label="Naam installatie" value={x.naam} onChange={(e) => wijzig(x.id, 'naam', e.target.value)} style={{ width: 170 }} />
                    </div>
                  </td>
                  {kolommen.map((k) => (
                    <td key={k.sleutel}>
                      <CelGetal
                        label={`${k.label} in ${k.eenheid}, ${x.naam}`}
                        waarde={x[k.sleutel]}
                        magLeeg={k.leeg}
                        max={k.max}
                        onChange={(n) => wijzig(x.id, k.sleutel, k.leeg ? n : (n ?? 0))}
                      />
                    </td>
                  ))}
                  {basis.rekenwijze === 'contract' && (
                    <td>
                      <CelGetal label={`Uw deel van de opbrengst in %, ${x.naam}`} waarde={x.aandeelOpbrengstPct} max={100} onChange={(n) => wijzig(x.id, 'aandeelOpbrengstPct', n ?? 0)} />
                    </td>
                  )}
                  <td>
                    <button type="button" onClick={() => verwijder(x.id)} disabled={installaties.length <= 1}>
                      Verwijder<span className="visueel-verborgen"> {x.naam}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kaart>

      <Kaart titel="Uitkomst per installatie" kopNiveau={3} actie={<Badge soort="status-gegund">Openbare bronnen</Badge>}>
        <div className="stapel" aria-live="polite">
          <div className="tegels">
            <Tegel
              label={totaal.nettoKosten !== null && totaal.nettoKosten < 0 ? 'Netto opbrengst totaal' : 'Netto kosten totaal'}
              waarde={totaal.nettoKosten === null ? '–' : euro(Math.abs(totaal.nettoKosten))}
              toelichting={totaal.volledig ? 'per jaar, alle installaties' : 'vul bij elke installatie tarief en prijzen in'}
              hero
            />
            <Tegel label="Ruwe bodemas totaal" waarde={metEenheid(totaal.bodemasTon, 'ton')} />
            <Tegel label="Metalen totaal" waarde={metEenheid(totaal.ferroTon + totaal.nonFerroTon, 'ton')} />
          </div>
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Uitkomst per installatie">
            <table>
              <thead>
                <tr>
                  <th scope="col">Installatie</th>
                  <th scope="col" className="num">
                    Bodemas (t)
                  </th>
                  <th scope="col" className="num">
                    Metalen (t)
                  </th>
                  <th scope="col" className="num">
                    Opwerking
                  </th>
                  <th scope="col" className="num">
                    Storten
                  </th>
                  <th scope="col" className="num">
                    Netto
                  </th>
                </tr>
              </thead>
              <tbody>
                {regels.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      {r.naam}
                    </th>
                    <td className="num">{getal(r.bodemasTon)}</td>
                    <td className="num">{getal(r.ferroTon + r.nonFerroTon)}</td>
                    <td className="num">{r.brutoKosten === null ? '–' : euro(r.brutoKosten - (r.opbrengst ?? 0))}</td>
                    <td className="num">{euro(r.kostenStorten)}</td>
                    <td className="num">{r.nettoKosten === null ? 'onvolledig' : euro(r.nettoKosten)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Totaal</th>
                  <td className="num">
                    <strong>{getal(totaal.bodemasTon)}</strong>
                  </td>
                  <td className="num">
                    <strong>{getal(totaal.ferroTon + totaal.nonFerroTon)}</strong>
                  </td>
                  <td className="num">
                    <strong>{totaal.brutoKosten === null ? '–' : euro(totaal.brutoKosten - (totaal.opbrengst ?? 0))}</strong>
                  </td>
                  <td className="num">
                    <strong>{euro(totaal.kostenStorten)}</strong>
                  </td>
                  <td className="num">
                    <strong>{totaal.nettoKosten === null ? '–' : euro(totaal.nettoKosten)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="klein muted" style={{ margin: 0 }}>
            Opwerking is na aftrek van de metaalopbrengst. Een negatief bedrag is een netto opbrengst.
          </p>

          {analyseVan && (
            <>
              <h4>Gevoeligheidsanalyse</h4>
              <div className="velden-2 geen-print">
                <KeuzeVeld label="Installatie" waarde={analyseVan.id} opties={installaties.map((x) => ({ waarde: x.id, label: x.naam }))} onChange={setGekozen} />
                <GetalVeld label="Variatie per parameter" eenheid="%" max={90} waarde={variatie} onChange={setVariatie} />
              </div>
              {analyse.length === 0 || basisNetto === null ? (
                <p className="notitie" role="status">
                  Vul voor {analyseVan.naam} het verwerkingstarief en beide metaalprijzen in om de gevoeligheid te zien.
                </p>
              ) : (
                <>
                  <p className="klein muted">
                    Netto kosten van {analyseVan.naam} als één parameter {procent(variatie, 0)} lager of hoger is. Grootste invloed bovenaan.
                  </p>
                  <BandGrafiek
                    titel={`Gevoeligheid netto kosten ${analyseVan.naam}`}
                    basis={basisNetto}
                    banden={analyse.map((a) => ({ label: parameterLabel[a.parameter], laag: a.laag, hoog: a.hoog }))}
                    formatX={(n) => euro(n)}
                  />
                  <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel gevoeligheidsanalyse">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Parameter</th>
                          <th scope="col" className="num">
                            {variatie} % lager
                          </th>
                          <th scope="col" className="num">
                            {variatie} % hoger
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyse.map((a) => (
                          <tr key={a.parameter}>
                            <th scope="row" style={{ fontWeight: 500 }}>
                              {parameterLabel[a.parameter]}
                            </th>
                            <td className="num">{euro(a.laag)}</td>
                            <td className="num">{euro(a.hoog)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
          <Delen
            naam="Bodemassencalculator Pro"
            csvRijen={csvPro}
            params={bodemasNaarParams(basis)}
            pad={PAD}
            toelichting="De CSV bevat alle installaties, het totaal en de gevoeligheidsanalyse. De link bewaart alleen de invoer van het gratis deel."
          />
          <RapportKnop />
        </div>
      </Kaart>
    </div>
  );
}
