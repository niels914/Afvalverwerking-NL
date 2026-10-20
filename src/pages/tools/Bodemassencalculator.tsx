import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { BandGrafiek } from '../../components/grafiek/Grafieken';
import { Bronnenlijst, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { OpDezePagina } from '../../components/rekenen/OpDezePagina';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { BronVeld } from '../../components/rekenen/b/BronVeld';
import { CelGetal } from '../../components/rekenen/b/CelGetal';
import { Ontbreekt } from '../../components/rekenen/b/Knoppen';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../../components/ui';
import { bodemasStandaard } from '../../data/standaardwaarden';
import { bodemasBron, bodemasContext, bodemasJaren, bodemasKental, bodemasKentallenPerJaar, PEILDATUM } from '../../data/tools-b-bodemas';
import {
  bodemas,
  bodemasInstallaties,
  bodemasNaarParams,
  bodemasUitParams,
  gevoeligheid,
  type BedragVeld,
  type BodemasInvoer,
  type BodemasParameter,
  type Installatie,
} from '../../lib/calc/bodemas';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/bodemassencalculator';
const FORMULE = [
  'ruwe bodemas      = verbrand afval × aandeel bodemas',
  'ferro, non-ferro  = ruwe bodemas × aandeel ferro, aandeel non-ferro',
  'kosten opwerking  = ruwe bodemas × verwerkingstarief',
  'opbrengst metalen = (ferro × prijs ferro + non-ferro × prijs non-ferro) × uw deel',
  'netto kosten      = kosten opwerking − opbrengst metalen',
].join('\n');

const parameterLabel: Record<BodemasParameter, string> = {
  tonnageVerbrand: 'Verbrand afval',
  aandeelBodemasPct: 'Aandeel bodemas',
  ferroPct: 'Aandeel ferro',
  nonFerroPct: 'Aandeel non-ferro',
  verwerkingstarief: 'Verwerkingstarief',
  prijsFerro: 'Prijs ferro',
  prijsNonFerro: 'Prijs non-ferro',
};

const bedragLabel: Record<BedragVeld, string> = {
  verwerkingstarief: 'Verwerkingstarief opwerker (€ per ton ruwe bodemas)',
  prijsFerro: 'Opbrengst ferro (€ per ton)',
  prijsNonFerro: 'Opbrengst non-ferro (€ per ton)',
};

const bron = { titel: `Rijkswaterstaat, Afvalverwerking in Nederland ${bodemasKental.jaar}`, url: bodemasBron.url };
const pctTekst = (n: number) => procent(n, 1);

export function Bodemassencalculator() {
  const [params, setParams] = useSearchParams();
  const [i, setI] = useState<BodemasInvoer>(() => bodemasUitParams(params, bodemasStandaard));
  const zet = <K extends keyof BodemasInvoer>(k: K) => (v: BodemasInvoer[K]) => setI((x) => ({ ...x, [k]: v }));
  const u = bodemas(i);

  const deelParams = bodemasNaarParams(i);
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const herkomst = (k: keyof BodemasInvoer): string => {
    if (k === 'aandeelBodemasPct' || k === 'ferroPct' || k === 'nonFerroPct') return i[k] === bodemasKental[k] ? `kental Rijkswaterstaat ${bodemasKental.jaar}` : 'eigen waarde';
    if (k === 'tonnageVerbrand') return i[k] === bodemasStandaard.tonnageVerbrand ? 'voorbeeld' : 'eigen waarde';
    return i[k] === null ? 'niet ingevuld' : 'eigen waarde';
  };

  const csv = (): CsvCel[][] => [
    ['Bodemassencalculator', 'KplusV'],
    ['Peildatum kentallen', PEILDATUM],
    ['Bron kentallen', bodemasBron.url],
    [],
    ['Invoer', 'Waarde', 'Herkomst'],
    ['Verbrand afval (ton per jaar)', i.tonnageVerbrand, herkomst('tonnageVerbrand')],
    ['Aandeel ruwe bodemas (% van verbrand)', i.aandeelBodemasPct, herkomst('aandeelBodemasPct')],
    ['Aandeel ferro (% van ruwe bodemas)', i.ferroPct, herkomst('ferroPct')],
    ['Aandeel non-ferro (% van ruwe bodemas)', i.nonFerroPct, herkomst('nonFerroPct')],
    ['Verwerkingstarief (euro per ton ruwe bodemas)', i.verwerkingstarief, herkomst('verwerkingstarief')],
    ['Opbrengst ferro (euro per ton)', i.prijsFerro, herkomst('prijsFerro')],
    ['Opbrengst non-ferro (euro per ton)', i.prijsNonFerro, herkomst('prijsNonFerro')],
    ['Deel metaalopbrengst voor opdrachtgever (%)', i.aandeelOpbrengstPct, 'rekenkeuze gebruiker'],
    [],
    ['Uitkomst', 'Waarde'],
    ['Ruwe bodemas (ton)', u.bodemasTon],
    ['Ferro (ton)', u.ferroTon],
    ['Non-ferro (ton)', u.nonFerroTon],
    ['Overig: mineralen, onverbrand, residu (ton)', u.overigTon],
    ['Kosten opwerking (euro)', u.brutoKosten],
    ['Opbrengst metalen (euro)', u.opbrengst],
    ['Netto kosten (euro, negatief = opbrengst)', u.nettoKosten],
    ['Netto per ton verbrand (euro)', u.perTonVerbrand],
    ['Netto per ton ruwe bodemas (euro)', u.perTonBodemas],
    ...(u.ontbrekend.length ? [['Niet berekend', `ontbreekt: ${u.ontbrekend.map((v) => bedragLabel[v]).join(', ')}`] as CsvCel[]] : []),
    [],
    ['Formule', FORMULE],
  ];

  const bronRegels: BronRegel[] = [
    {
      onderwerp: 'Aandeel ruwe bodemas',
      status: 'kental',
      waarde: `${pctTekst(bodemasKental.aandeelBodemasPct)} van het verbrande afval (${bodemasKental.jaar})`,
      toelichting: `Afgeleid: ${getal(bodemasJaren[2].ruweBodemasKton)} kton ruwe bodemas ÷ ${getal(bodemasJaren[2].verbrandKton)} kton verbrand in 13 AVI’s (tabel 9 en 13). Eerdere jaren: ${bodemasKentallenPerJaar
        .slice(0, -1)
        .map((k) => `${k.jaar} ${pctTekst(k.aandeelBodemasPct)}`)
        .join(', ')}. Per installatie verschilt dit; vraag de waarde van uw verwerker op.`,
      bron: `${bodemasBron.uitgever}, ${bodemasBron.titel}`,
      url: bodemasBron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Aandeel ferro en non-ferro',
      status: 'kental',
      waarde: `ferro ${pctTekst(bodemasKental.ferroPct)}, non-ferro ${pctTekst(bodemasKental.nonFerroPct)} van de ruwe bodemas`,
      toelichting: `Afgeleid uit landelijk afgescheiden ferro (${getal(bodemasJaren[2].ferroKton)} kton) en non-ferro inclusief rvs (${getal(bodemasJaren[2].nonFerroKton)} kton), tabel 13.`,
      bron: `${bodemasBron.uitgever}, ${bodemasBron.titel}`,
      url: bodemasBron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Samenstelling en betaling (context)',
      status: 'kental',
      waarde: bodemasContext.samenstelling,
      toelichting: `${bodemasContext.betaling} Reinigingsresidu mag maximaal ${bodemasContext.residuMaxPct} % van het gewicht van de ruwe bodemas zijn. Op basis van expertinterviews; niet gebruikt in de berekening.`,
      bron: `${bodemasContext.bron.uitgever}, ${bodemasContext.bron.titel}`,
      url: bodemasContext.bron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Verwerkingstarief, metaalprijzen en uw deel van de opbrengst',
      status: 'aanname',
      toelichting:
        'Hiervoor bestaat geen openbare bron. Tarieven voor opwerking volgen uit contracten tussen AVI’s en opwerkers; metaalprijzen bewegen met de schrootmarkt. Vul de bedragen uit uw contract of offerte in.',
    },
    {
      onderwerp: 'Verbrand afval',
      status: 'aanname',
      toelichting: `Het tonnage van ${getal(bodemasStandaard.tonnageVerbrand)} ton is een voorbeeld. Vul het tonnage van uw installatie of uw contract in.`,
    },
  ];

  const metalenTon = u.ferroTon + u.nonFerroTon;

  return (
    <>
      <RapportKop titel="Bodemassencalculator" ondertitel={`Kentallen Rijkswaterstaat ${bodemasKental.jaar}, peildatum ${datum(PEILDATUM)}; tarieven en prijzen eigen invoer`} />
      <PaginaKop titel="Bodemassencalculator" badges={<Badge soort="pro">Gratis deel + Pro voor leden</Badge>}>
        Hoeveel bodemas en metalen komen vrij bij de verbranding van uw afval, en wat kost de opwerking na aftrek van de
        metaalopbrengst? De aandelen komen uit de landelijke afvalregistratie van Rijkswaterstaat. Tarieven en prijzen hebben
        geen openbare bron: die vult u zelf in.
      </PaginaKop>
      <OpDezePagina
        links={[
          { id: 'berekening', label: 'Berekening' },
          { id: 'pro', label: 'Meerdere installaties en gevoeligheid (Pro)' },
          { id: 'kentallen', label: 'Kentallen per jaar' },
          { id: 'bronnen', label: 'Bronnen en peildatum' },
        ]}
      />

      <h2 className="sectie" id="berekening" style={{ marginBottom: 12 }}>
        Gratis: één installatie
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <BronVeld
              label="Verbrand afval"
              eenheid="ton/jaar"
              waarde={i.tonnageVerbrand}
              onChange={(n) => zet('tonnageVerbrand')(n ?? 0)}
              status="aanname"
              magLeeg={false}
              voorbeeld={bodemasStandaard.tonnageVerbrand}
              toelichting="Tonnage van uw installatie of uw contract."
            />
            <BronVeld
              label="Aandeel ruwe bodemas"
              eenheid="% van verbrand"
              max={100}
              waarde={i.aandeelBodemasPct}
              onChange={(n) => zet('aandeelBodemasPct')(n ?? 0)}
              status="kental"
              bronwaarde={bodemasKental.aandeelBodemasPct}
              bronwaardeTekst={pctTekst(bodemasKental.aandeelBodemasPct)}
              bron={bron}
              peildatum={PEILDATUM}
            />
            <div className="velden-2">
              <BronVeld
                label="Aandeel ferro"
                eenheid="% van bodemas"
                max={100}
                waarde={i.ferroPct}
                onChange={(n) => zet('ferroPct')(n ?? 0)}
                status="kental"
                bronwaarde={bodemasKental.ferroPct}
                bronwaardeTekst={pctTekst(bodemasKental.ferroPct)}
                bron={bron}
              />
              <BronVeld
                label="Aandeel non-ferro"
                eenheid="% van bodemas"
                max={100}
                waarde={i.nonFerroPct}
                onChange={(n) => zet('nonFerroPct')(n ?? 0)}
                status="kental"
                bronwaarde={bodemasKental.nonFerroPct}
                bronwaardeTekst={pctTekst(bodemasKental.nonFerroPct)}
                bron={bron}
              />
            </div>
            <BronVeld
              label="Verwerkingstarief opwerker"
              eenheid="€/t bodemas"
              waarde={i.verwerkingstarief}
              onChange={zet('verwerkingstarief')}
              status="aanname"
              toelichting="Wat de opwerker per ton ruwe bodemas rekent, volgens uw contract."
            />
            <div className="velden-2">
              <BronVeld label="Opbrengst ferro" eenheid="€/t" waarde={i.prijsFerro} onChange={zet('prijsFerro')} status="aanname" />
              <BronVeld label="Opbrengst non-ferro" eenheid="€/t" waarde={i.prijsNonFerro} onChange={zet('prijsNonFerro')} status="aanname" />
            </div>
            <GetalVeld
              label="Uw deel van de metaalopbrengst"
              eenheid="%"
              max={100}
              waarde={i.aandeelOpbrengstPct}
              onChange={zet('aandeelOpbrengstPct')}
              hint="Contractafspraak. Bij 100 % telt de hele opbrengst mee; bij 0 % houdt de opwerker de metalen."
            />
          </div>
        </Kaart>
        <Uitkomst
          label={<Badge soort="status-gegund">Kentallen Rijkswaterstaat {bodemasKental.jaar}</Badge>}
          formule={FORMULE}
          toelichting="Bedragen excl. btw. Een negatief bedrag is een netto opbrengst. Transport, stortkosten van residu en afvalstoffenbelasting zitten er niet in."
          invoer={[
            { label: 'Verbrand afval', waarde: metEenheid(i.tonnageVerbrand, 'ton/jaar') },
            { label: 'Aandeel bodemas', waarde: pctTekst(i.aandeelBodemasPct) },
            { label: 'Ferro / non-ferro', waarde: `${pctTekst(i.ferroPct)} / ${pctTekst(i.nonFerroPct)}` },
            { label: 'Verwerkingstarief', waarde: i.verwerkingstarief === null ? 'niet ingevuld' : `${euro(i.verwerkingstarief, 2)}/t` },
            {
              label: 'Opbrengst ferro / non-ferro',
              waarde: `${i.prijsFerro === null ? 'niet ingevuld' : `${euro(i.prijsFerro, 2)}/t`} / ${i.prijsNonFerro === null ? 'niet ingevuld' : `${euro(i.prijsNonFerro, 2)}/t`}`,
            },
            { label: 'Uw deel van de opbrengst', waarde: procent(i.aandeelOpbrengstPct, 0) },
          ]}
        >
          <div className="stapel">
            <div className="tegels">
              <Tegel
                label={u.nettoKosten !== null && u.nettoKosten < 0 ? 'Netto opbrengst per jaar' : 'Netto kosten per jaar'}
                waarde={u.nettoKosten === null ? '–' : euro(Math.abs(u.nettoKosten))}
                toelichting={u.nettoKosten === null ? 'vul tarief en prijzen in' : `${euro(u.perTonVerbrand ?? 0, 2)} per ton verbrand`}
                hero
              />
              <Tegel label="Ruwe bodemas" waarde={metEenheid(u.bodemasTon, 'ton')} toelichting="per jaar" />
              <Tegel label="Metalen" waarde={metEenheid(metalenTon, 'ton')} toelichting={`ferro ${getal(u.ferroTon)} t, non-ferro ${getal(u.nonFerroTon)} t`} />
            </div>
            <Ontbreekt
              velden={u.ontbrekend.map((v) => bedragLabel[v])}
              uitleg="Hiervoor bestaat geen openbare bron. Vul de bedragen uit uw contract of offerte in; de hoeveelheden hierboven kloppen al."
            />
            <dl className="invoerlijst">
              <dt>Kosten opwerking</dt>
              <dd>{u.brutoKosten === null ? '–' : euro(u.brutoKosten)}</dd>
              <dt>Opbrengst metalen voor u</dt>
              <dd>{u.opbrengst === null ? '–' : euro(u.opbrengst)}</dd>
              <dt>Netto per ton ruwe bodemas</dt>
              <dd>{u.perTonBodemas === null ? '–' : euro(u.perTonBodemas, 2)}</dd>
              <dt>Overig (mineralen, onverbrand, residu)</dt>
              <dd>{metEenheid(u.overigTon, 'ton')}</dd>
            </dl>
            <ExportKnoppen
              naam="Bodemassencalculator"
              csvRijen={csv}
              params={deelParams}
              pad={PAD}
              toelichting="De CSV bevat invoer met herkomst, uitkomst, formule en bron. De link bewaart uw invoer, ook de bedragen."
            />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" id="pro" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld
        titel="Bodemassencalculator Pro"
        ledenKrijgen={['Meerdere installaties naast elkaar, met totaal', 'Gevoeligheidsanalyse per parameter', 'CSV van alle installaties en rapport maken']}
      >
        <BodemasPro basis={i} />
      </Vergrendeld>

      <h2 className="sectie" id="kentallen" style={{ margin: '28px 0 12px' }}>
        Kentallen per jaar
      </h2>
      <div className="raster raster-2">
        <Kaart titel="Bodemas en metalen in Nederland" sub="Alle afvalverbrandingsinstallaties samen. De calculator gebruikt het laatste jaar.">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="klein muted">
            In 2024 werd minder verbrand door de brand bij AVR Rozenburg in september 2023. Gestort (bodemas en reinigingsresidu,
            inclusief steunlaag): {bodemasKentallenPerJaar.map((k) => `${k.jaar} ${pctTekst(k.gestortPct)}`).join(', ')} van de ruwe bodemas.
          </p>
        </Kaart>
        <Bronnenlijst id="bronnen" regels={bronRegels} sub={<>Alle bronnen geraadpleegd op {datum(PEILDATUM)}.</>} />
      </div>
      <RapportVoet tekst={`Kentallen: Rijkswaterstaat ${bodemasKental.jaar}, peildatum ${datum(PEILDATUM)}`} />
    </>
  );
}

/* ---------- Pro ---------- */

const kolommen: { sleutel: Exclude<keyof BodemasInvoer, 'aandeelOpbrengstPct'>; label: string; eenheid: string; leeg?: boolean; max?: number }[] = [
  { sleutel: 'tonnageVerbrand', label: 'Verbrand', eenheid: 'ton' },
  { sleutel: 'aandeelBodemasPct', label: 'Bodemas', eenheid: '%', max: 100 },
  { sleutel: 'ferroPct', label: 'Ferro', eenheid: '%', max: 100 },
  { sleutel: 'nonFerroPct', label: 'Non-ferro', eenheid: '%', max: 100 },
  { sleutel: 'verwerkingstarief', label: 'Tarief', eenheid: '€/t', leeg: true },
  { sleutel: 'prijsFerro', label: 'Ferro', eenheid: '€/t', leeg: true },
  { sleutel: 'prijsNonFerro', label: 'Non-ferro', eenheid: '€/t', leeg: true },
];

function BodemasPro({ basis }: { basis: BodemasInvoer }) {
  const [installaties, setInstallaties] = useState<Installatie[]>(() => [{ id: 'i1', naam: 'Installatie 1', ...basis }]);
  const [volgnummer, setVolgnummer] = useState(2);
  const [gekozen, setGekozen] = useState('i1');
  const [variatie, setVariatie] = useState(20);

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
    ['Peildatum kentallen', PEILDATUM],
    ['Bron kentallen', bodemasBron.url],
    [],
    [
      'Installatie',
      'Verbrand (ton)',
      'Aandeel bodemas (%)',
      'Ferro (%)',
      'Non-ferro (%)',
      'Tarief (euro/t bodemas)',
      'Prijs ferro (euro/t)',
      'Prijs non-ferro (euro/t)',
      'Uw deel opbrengst (%)',
      'Ruwe bodemas (ton)',
      'Ferro (ton)',
      'Non-ferro (ton)',
      'Kosten opwerking (euro)',
      'Opbrengst metalen (euro)',
      'Netto (euro)',
    ],
    ...installaties.map((x, n): CsvCel[] => {
      const r = regels[n];
      return [x.naam, x.tonnageVerbrand, x.aandeelBodemasPct, x.ferroPct, x.nonFerroPct, x.verwerkingstarief, x.prijsFerro, x.prijsNonFerro, x.aandeelOpbrengstPct, r.bodemasTon, r.ferroTon, r.nonFerroTon, r.brutoKosten, r.opbrengst, r.nettoKosten];
    }),
    ['Totaal', totaal.tonnageVerbrand, '', '', '', '', '', '', '', totaal.bodemasTon, totaal.ferroTon, totaal.nonFerroTon, totaal.brutoKosten, totaal.opbrengst, totaal.nettoKosten],
    [],
    ...(analyse.length
      ? ([
          [`Gevoeligheid ${analyseVan?.naam ?? ''}`, `variatie ${variatie} %`],
          ['Parameter', 'Netto bij −', 'Netto bij +', 'Bandbreedte'],
          ...analyse.map((a): CsvCel[] => [parameterLabel[a.parameter], a.laag, a.hoog, a.bandbreedte]),
          [],
        ] as CsvCel[][])
      : []),
    ['Formule', FORMULE],
  ];

  return (
    <div className="stapel">
      <Kaart
        titel="Installaties"
        kopNiveau={3}
        className="invoerkaart"
        sub="Elke nieuwe installatie begint met de invoer uit het gratis deel. Lege bedragen tellen niet mee in het totaal."
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
                <th scope="col">Uw deel (%)</th>
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
                        onChange={(n) => wijzig(x.id, k.sleutel, n)}
                      />
                    </td>
                  ))}
                  <td>
                    <CelGetal label={`Uw deel van de opbrengst in %, ${x.naam}`} waarde={x.aandeelOpbrengstPct} max={100} onChange={(n) => wijzig(x.id, 'aandeelOpbrengstPct', n ?? 0)} />
                  </td>
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

      <Uitkomst
        titel="Uitkomst per installatie"
        label={<Badge soort="status-gegund">Kentallen Rijkswaterstaat {bodemasKental.jaar}</Badge>}
        formule={`${FORMULE}\ntotaal = Σ per installatie\ngevoeligheid: elke parameter apart × (1 ± ${variatie} %), de rest gelijk`}
        invoer={[
          ...installaties.map((x) => ({
            label: x.naam,
            waarde: `${getal(x.tonnageVerbrand)} t · ${pctTekst(x.aandeelBodemasPct)} bodemas · tarief ${x.verwerkingstarief === null ? '–' : euro(x.verwerkingstarief, 2)}`,
          })),
          { label: 'Variatie gevoeligheidsanalyse', waarde: `± ${procent(variatie, 0)}` },
        ]}
      >
        <div className="stapel">
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
                    Kosten
                  </th>
                  <th scope="col" className="num">
                    Opbrengst
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
                    <td className="num">{r.brutoKosten === null ? '–' : euro(r.brutoKosten)}</td>
                    <td className="num">{r.opbrengst === null ? '–' : euro(r.opbrengst)}</td>
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
                    <strong>{totaal.brutoKosten === null ? '–' : euro(totaal.brutoKosten)}</strong>
                  </td>
                  <td className="num">
                    <strong>{totaal.opbrengst === null ? '–' : euro(totaal.opbrengst)}</strong>
                  </td>
                  <td className="num">
                    <strong>{totaal.nettoKosten === null ? '–' : euro(totaal.nettoKosten)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {analyseVan && (
            <>
              <h3>Gevoeligheidsanalyse</h3>
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
          <ExportKnoppen naam="Bodemassencalculator Pro" csvRijen={csvPro} params={bodemasNaarParams(basis)} pad={PAD} toelichting="De CSV bevat alle installaties, het totaal en de gevoeligheidsanalyse. De link bewaart alleen de invoer van het gratis deel." />
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
