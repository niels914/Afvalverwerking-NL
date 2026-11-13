import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MeerWeten } from '../components/contact/MeerWeten';
import { EigenCijfers } from '../components/heffingenscan/EigenCijfers';
import { MethodeBronnen } from '../components/heffingenscan/MethodeBronnen';
import { Rapportaanvraag } from '../components/heffingenscan/Rapportaanvraag';
import { GestapeldeStaafGrafiek } from '../components/grafiek/Grafieken';
import { DrieTegels, JaarTabel, WetsstatusBlok, euroKort, mln } from '../components/heffingenscan/Onderdelen';
import { GemeenteZoeker } from '../components/heffingenscan/GemeenteZoeker';
import { bewaarBronUitUrl } from '../components/heffingenscan/bron';
import { kerncijfersTekst, veldNamen } from '../components/heffingenscan/kerncijfers';
import { Inklapbaar, useInklapBijPrintEnAnker } from '../components/rekenen/Inklap';
import { RapportKop, RapportVoet } from '../components/rekenen/Uitkomst';
import type { CsvCel } from '../components/rekenen/csv';
import { Kaart, PaginaKop } from '../components/ui';
import { aanbodPrijzen } from '../data/heffingen-aanbod';
import { heffingGemeenten, heffingGemeentenBron } from '../data/heffingen-gemeenten';
import { PEILDATUM, PRIJSPEIL, aannames, heffingBronnen, heffingPaden, heffingenscanVersie, wetsstatus } from '../data/heffingen-tarieven';
import {
  aangepasteVelden,
  besparingMinderRestafval,
  invoerNaarParams,
  invoerUitParams,
  jaarUit,
  landelijkTotaal,
  standaardInvoer,
  vergelijkPaden,
  vindOpSlug,
  type HeffingInvoer,
  type Landelijk,
} from '../lib/calc/heffingen';
import { datum, euro, getal, procent } from '../lib/format';
import { HEFFINGENSCAN_PAD, heffingenscanPad } from '../lib/heffingenVoorbeeld';
import type { HeffingPadId } from '../data/heffingen-tarieven';

const landelijkCache: Partial<Record<HeffingPadId, Landelijk>> = {};
function landelijkVoor(pad: HeffingPadId): Landelijk {
  return (landelijkCache[pad] ??= landelijkTotaal(heffingGemeenten, pad));
}

/** Zet titel en beschrijving van de pagina (voor het tabblad en voor wie de link deelt vanuit de app). */
function useMeta(titel: string, beschrijving: string) {
  useEffect(() => {
    document.title = titel;
    document.querySelector('meta[name="description"]')?.setAttribute('content', beschrijving);
  }, [titel, beschrijving]);
}

export function HeffingenscanGemeente() {
  const { slug = '' } = useParams();
  const g = vindOpSlug(slug, heffingGemeenten);
  if (!g) return <OnbekendeGemeente slug={slug} />;
  return <Rapport key={g.code} gemeenteCode={g.code} />;
}

function OnbekendeGemeente({ slug }: { slug: string }) {
  useMeta('Gemeente niet gevonden · Heffingenscan restafval', 'Deze gemeente staat niet in de Heffingenscan restafval.');
  return (
    <>
      <PaginaKop titel="Gemeente niet gevonden">Er is geen gemeente met de naam “{slug}” in de Heffingenscan. Zoek hieronder uw gemeente, of bekijk de lijst met alle gemeenten.</PaginaKop>
      <div className="stapel" style={{ marginTop: 24 }}>
        <GemeenteZoeker gemeenten={heffingGemeenten} />
        <p>
          <Link to={HEFFINGENSCAN_PAD}>Naar alle gemeenten</Link>
        </p>
      </div>
    </>
  );
}

function Rapport({ gemeenteCode }: { gemeenteCode: string }) {
  const g = heffingGemeenten.find((x) => x.code === gemeenteCode)!;
  const [params, setParams] = useSearchParams();
  useInklapBijPrintEnAnker();
  useEffect(() => void bewaarBronUitUrl(window.location.search), []);

  const standaard = useMemo(() => standaardInvoer(g), [g]);
  const paramTekst = params.toString();
  const invoer = useMemo(() => invoerUitParams(new URLSearchParams(paramTekst), standaard), [paramTekst, standaard]);
  const afwijkend = aangepasteVelden(invoer, standaard);
  const aangepast = afwijkend.length > 0;

  const vgl = useMemo(() => vergelijkPaden(invoer), [invoer]);
  const rijen = vgl.gekozen;
  const besparing = useMemo(() => besparingMinderRestafval(invoer), [invoer]);
  const land = landelijkVoor(invoer.pad);
  const pad = heffingPaden[invoer.pad];
  const ander = heffingPaden[vgl.ander];
  const r26 = jaarUit(rijen, 2026);
  const r30 = jaarUit(rijen, 2030);
  const r35 = jaarUit(rijen, 2035);
  const l26 = jaarUit(vgl.anderPad, 2026);
  const l35 = jaarUit(vgl.anderPad, 2035);
  const land35 = land.jaren.find((j) => j.jaar === 2035)!;
  const land26 = land.jaren.find((j) => j.jaar === 2026)!;
  const nascheiding = g.nascheiding !== null;

  const titel = `Heffingenscan restafval: ${g.naam}`;
  useMeta(
    `Heffingenscan ${g.naam}: ${euro(r35.totaal)} aan heffingen op restafval in 2035`,
    `Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding ${g.naam} tot 2035? In 2026 ${euro(r26.totaal)}, in 2035 ${euro(r35.totaal)}. Indicatief, prijspeil ${PRIJSPEIL}.`,
  );

  function zet<K extends keyof HeffingInvoer>(veld: K, waarde: HeffingInvoer[K]) {
    const nieuw = invoerNaarParams({ ...invoer, [veld]: waarde }, standaard);
    const bron = params.get('bron');
    if (bron) nieuw.set('bron', bron);
    setParams(nieuw, { replace: true, preventScrollReset: true });
  }
  function terugzetten() {
    const nieuw = new URLSearchParams();
    const bron = params.get('bron');
    if (bron) nieuw.set('bron', bron);
    setParams(nieuw, { replace: true, preventScrollReset: true });
  }
  const deelParams = useMemo(() => invoerNaarParams(invoer, standaard), [invoer, standaard]);
  const deelLink = `${typeof window === 'undefined' ? '' : window.location.origin}${heffingenscanPad(g.slug)}${deelParams.toString() ? `?${deelParams}` : ''}`;
  const kern = kerncijfersTekst(g, invoer, standaard, vgl, deelLink);

  const csvRijen = (): CsvCel[][] => [
    [titel, 'KplusV'],
    ['Indicatief, prijspeil', PRIJSPEIL],
    ['Peildatum tarieven en wetsstatus', PEILDATUM],
    ['Versie scan', heffingenscanVersie.versie],
    ['Wetsstatus', wetsstatus.kort],
    ['Tariefpad', `${pad.naam} (${pad.status})`],
    ['CBS-cijfers opgehaald', heffingGemeentenBron.opgehaald],
    ['Cijfers aangepast', aangepast ? `ja: ${afwijkend.map((k) => veldNamen[k]).join(', ')}` : 'nee'],
    [],
    ['Invoer', 'Waarde'],
    ['Inwoners', invoer.inwoners],
    ['Huishoudens', invoer.huishoudens],
    ['Fijn restafval (kg per inwoner)', invoer.fijnKg],
    ['Verbrand deel fijn restafval (%)', invoer.verbrandPct],
    ['Grof restafval meegerekend (kg per inwoner)', invoer.grofKg],
    ['Verbrand deel grof restafval (%, aanname KplusV)', invoer.grofVerbrandPct],
    ['Overig verbrand afval (ton per jaar)', invoer.overigTon],
    ['Ontwikkeling restafval (% per jaar)', invoer.trendPct],
    ['Grondslag afvalstoffenbelasting (%, aanname KplusV)', invoer.asbGrondslagPct],
    ['Doorberekening door de AVI (%)', invoer.doorberekeningPct],
    ['Indexatie tarieven (% per jaar)', invoer.indexatiePct],
    [],
    ['Jaar', 'Ton restafval', 'Afvalstoffenbelasting (euro)', 'CO2-heffing (euro)', 'Totaal (euro)', 'Per huishouden (euro)', 'Per ton (euro)', 'Aandeel CO2-heffing (%)', `Totaal bij ${ander.naam} (euro)`],
    ...rijen.map((r, i): CsvCel[] => [r.jaar, r.ton, r.asb, r.co2, r.totaal, r.perHuishouden, r.perTon, r.aandeelCo2 * 100, vgl.anderPad[i].totaal]),
    [],
    ['Cumulatief 2026-2035', vgl.cumulatief, `bij ${ander.naam}`, vgl.cumulatiefAnder],
    ['Bronnen en aannames', 'Zie de pagina, onder "Methode en bronnen"'],
  ];

  const verschil = vgl.cumulatiefAnder - vgl.cumulatief;
  const perHhVerschil = r35.perHuishouden - land35.perHuishouden;

  return (
    <div className="hs-pagina stapel">
      <RapportKop titel={titel} ondertitel={`Indicatief, prijspeil ${PRIJSPEIL} · tarieven per ${datum(PEILDATUM)}`} />
      <div className="geen-print">
        <nav aria-label="Kruimelpad" className="hs-kruimelpad">
          <ol>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to={HEFFINGENSCAN_PAD}>Heffingenscan</Link>
            </li>
            <li aria-current="page">{g.naam}</li>
          </ol>
        </nav>
        <PaginaKop titel={titel}>
          {g.naam} heeft {getal(invoer.inwoners)} inwoners en {getal(invoer.huishoudens)} huishoudens en {getal(invoer.fijnKg, 1)} kg fijn restafval per inwoner. De berekening volgt het tariefpad van het{' '}
          {pad.status === 'wetsvoorstel' ? 'wetsvoorstel ' : ''}
          {pad.naam}, in prijspeil {PRIJSPEIL}. Het is een indicatieve berekening.
        </PaginaKop>
      </div>

      {aangepast && (
        <div className="notitie" role="status">
          <strong>Deze pagina rekent met aangepaste cijfers.</strong> Aangepast: {afwijkend.map((k) => veldNamen[k]).join(', ')}. De CBS-cijfers van {g.naam} zijn iets anders.{' '}
          <button type="button" className="hs-linkknop geen-print" onClick={terugzetten}>
            Terug naar de CBS-cijfers
          </button>
        </div>
      )}

      <section aria-labelledby="hs-uitkomst" className="stapel">
        <h2 id="hs-uitkomst" className="visueel-verborgen">
          Wat kosten de heffingen {g.naam}?
        </h2>
        <DrieTegels rijen={rijen} label={` voor ${g.naam}`} />
        <p className="klein muted" style={{ margin: 0 }}>
          Totaal van afvalstoffenbelasting en CO2-heffing op verbrand restafval, per jaar, en omgerekend per huishouden. In 2035 is het {getal(r35.totaal / r26.totaal, 1)} keer zoveel als in 2026.
        </p>
      </section>

      <div className="stapel">
        {nascheiding && (
          <div className="notitie" role="note" aria-label="Nascheiding">
            <p>
              <strong>De bedragen zijn een bovengrens.</strong> CBS meldt voor {g.naam} dat {getal(g.nascheiding!, 1)} kg restafval per inwoner naar een nascheidingsinstallatie ging. Een deel daarvan wordt niet verbrand. De scan rekent met al het
              fijne restafval ({getal(g.fijn, 1)} kg per inwoner). Het werkelijk verbrande deel vult u in onder “Rekenen met eigen cijfers”.
            </p>
          </div>
        )}
        <WetsstatusBlok />
      </div>

      <Kaart titel="Heffingen per jaar" sub={`${pad.naam}, ${pad.status}. De gestreepte lijn is het totaal bij ${ander.naam} (${ander.status}).`}>
        <GestapeldeStaafGrafiek
          titel={`Heffingen op restafval per jaar voor ${g.naam}, ${pad.naam}: in 2026 ${euro(r26.totaal)}, in 2030 ${euro(r30.totaal)}, in 2035 ${euro(r35.totaal)}. Afvalstoffenbelasting en CO2-heffing gestapeld, met het totaal bij ${ander.naam} als gestreepte lijn. De tabel eronder bevat alle jaren.`}
          labels={rijen.map((r) => r.jaar)}
          reeksen={[
            { naam: 'Afvalstoffenbelasting', waarden: rijen.map((r) => r.asb) },
            { naam: 'CO2-heffing', waarden: rijen.map((r) => r.co2) },
          ]}
          lijn={{ naam: `Totaal bij ${ander.naam}`, waarden: vgl.anderPad.map((r) => r.totaal) }}
          formatY={(n) => euro(n)}
          formatKort={euroKort}
        />
        <details className="hs-details ta-afronding" style={{ marginTop: 12 }}>
          <summary>
            <span className="veld-label">Tabel per jaar</span> <span className="ta-inklap-sub">alle bedragen, 2026–2035</span>
          </summary>
          <JaarTabel rijen={rijen} caption={`Heffingen op restafval voor ${g.naam} per jaar bij ${pad.naam}, prijspeil ${PRIJSPEIL}. Per ton: afvalstoffenbelasting en CO2-heffing samen.`} />
        </details>
      </Kaart>

      <Kaart titel="De CO2-heffing drijft de stijging">
        <div className="stapel lees">
          <p>
            In 2026 is {procent(r26.aandeelCo2 * 100, 0)} van de heffingen CO2-heffing, in 2035 {procent(r35.aandeelCo2 * 100, 0)}. Het CO2-tarief voor afvalverbrandingsinstallaties gaat van {euro(r26.co2Tarief, 2)} per ton CO2 in 2026 naar{' '}
            {euro(r35.co2Tarief, 2)} in 2035, terwijl de vrijstelling voor AVI’s afbouwt (correctiefactor van {getal(r26.correctiefactor, 2)} naar {getal(r35.correctiefactor, 2)}). De afvalstoffenbelasting gaat van {euro(r26.asbTarief, 2)} naar{' '}
            {euro(r35.asbTarief, 2)} per ton afval.
          </p>
          <p>
            Samen kosten beide heffingen {euro(r26.perTon, 2)} per ton restafval in 2026, {euro(r30.perTon, 2)} in 2030 en {euro(r35.perTon, 2)} in 2035.
          </p>
        </div>
      </Kaart>

      <Kaart titel={`${pad.naam} tegenover ${ander.naam}`}>
        <div className="stapel lees">
          <p>
            Over 2026–2035 samen kosten de heffingen {g.naam} {mln(vgl.cumulatief)} bij {pad.naam} en {mln(vgl.cumulatiefAnder)} bij {ander.naam}.{' '}
            {Math.abs(verschil) < 1
              ? 'Het verschil is verwaarloosbaar.'
              : verschil > 0
                ? `${pad.naam} scheelt ${mln(verschil)}.`
                : `${pad.naam} kost ${mln(-verschil)} meer.`}{' '}
            Het grootste verschil per jaar zit in {vgl.grootsteVerschil.jaar}: {euro(Math.abs(vgl.grootsteVerschil.bedrag))}. In 2035 is het verschil {euro(Math.abs(l35.totaal - r35.totaal))}; in 2026 zijn beide paden gelijk
            {Math.abs(l26.totaal - r26.totaal) < 1 ? '' : ` (verschil ${euro(Math.abs(l26.totaal - r26.totaal))})`}.
          </p>
          <p className="klein muted">
            Het {heffingPaden.bp2027.naam} is een wetsvoorstel: {wetsstatus.kort}
          </p>
        </div>
      </Kaart>

      <Kaart titel="Wat een gemeente kan doen">
        <ul className="opsomming lees">
          <li>
            <strong>Neem de stijgende heffingen op</strong> in de meerjarenbegroting en in de afvalstoffenheffing.
          </li>
          <li>
            <strong>Verminder restafval</strong> met bronscheiding (gft, pmd, papier, textiel), diftar of een andere inzamelstructuur.{' '}
            {besparing.bedrag > 0 ? (
              <>
                In {g.naam} scheelt {getal(besparing.kg)} kg minder fijn restafval per inwoner in {besparing.jaar} circa {euro(besparing.bedrag)} aan heffingen ({euro(besparing.perHuishouden, 2)} per huishouden).
              </>
            ) : null}
          </li>
          <li>
            <strong>Beoordeel nascheiding</strong>, of een combinatie met bronscheiding: dat verlaagt het verbrande volume en het fossiele aandeel.
          </li>
          <li>
            <strong>Leg in verwerkingscontracten</strong> een vergoeding vast die meebeweegt met de NEa-parameters.
          </li>
        </ul>
      </Kaart>

      <Kaart titel={`${g.naam} naast het landelijk gemiddelde`}>
        <div className="stapel lees">
          <p>
            Per huishouden betaalt {g.naam} in 2026 {euro(r26.perHuishouden)} aan heffingen en in 2035 {euro(r35.perHuishouden)}. Het landelijk gemiddelde (alle {land.aantalGemeenten} gemeenten, zelfde berekening) is {euro(land26.perHuishouden)}{' '}
            in 2026 en {euro(land35.perHuishouden)} in 2035. {g.naam} zit in 2035 {Math.abs(perHhVerschil) < 0.5 ? 'op het landelijk gemiddelde' : perHhVerschil > 0 ? `${euro(perHhVerschil)} per huishouden boven het gemiddelde` : `${euro(-perHhVerschil)} per huishouden onder het gemiddelde`}.
          </p>
          <p className="klein muted">
            Het landelijk gemiddelde is een bovengrens: gemeenten met nascheiding verbranden minder dan de scan aanneemt. Het verschil zegt vooral iets over de hoeveelheid restafval per huishouden, niet over de prestaties van de gemeente.
          </p>
        </div>
      </Kaart>

      <div className="geen-print">
      <Inklapbaar id="eigen-cijfers" titel="Rekenen met eigen cijfers" sub={aangepast ? `${afwijkend.length} ${afwijkend.length === 1 ? 'veld' : 'velden'} aangepast` : 'inwoners, restafval, grondslag, indexatie, tariefpad'}>
        <EigenCijfers gemeente={g} invoer={invoer} zet={zet} terugzetten={terugzetten} aangepast={aangepast} csvRijen={csvRijen} params={deelParams} pad={heffingenscanPad(g.slug)} />
      </Inklapbaar>
      </div>

      <Inklapbaar id="methode" titel="Methode en bronnen" sub={`tarieventabel, aannames en bronnen, peildatum ${datum(PEILDATUM)}`}>
        <MethodeBronnen />
      </Inklapbaar>

      <div className="geen-print">
        <MeerWeten id="hs-meer" kop={`Betaalt ${g.naam} niet te veel?`}>
          <p>
            Deze scan rekent met CBS-cijfers en landelijke factoren. Wilt u weten wat de heffingen voor {g.naam} werkelijk worden, met uw eigen tonnage en uw verwerkingscontract? KplusV maakt een rapport voor uw gemeente en loopt het met u
            door.
          </p>
          <ul className="opsomming">
            <li>
              Rapport voor één gemeente: <strong>{euro(aanbodPrijzen.rapport)}</strong>
            </li>
            <li>
              Toelichting en sparringssessie: <strong>{euro(aanbodPrijzen.toelichtingExtra)} extra</strong>
            </li>
            <li>Meerdere gemeenten: maatwerk, op aanvraag</li>
          </ul>
          <p className="klein muted">Alle bedragen {aanbodPrijzen.btwTekst}. De scan zelf blijft gratis en vraagt geen account.</p>
          <div className="knoppen">
            <a className="knop cta" href="#aanvragen">
              Rapport aanvragen
            </a>
          </div>
        </MeerWeten>
      </div>

      <div className="geen-print" style={{ marginTop: 24 }}>
        <Rapportaanvraag gemeente={{ code: g.code, naam: g.naam }} kerncijfers={kern} />
      </div>

      <section className="print-alleen hs-printbronnen" aria-label="Bronnen en aannames bij de afdruk">
        <h2>Bronnen en aannames</h2>
        <p>
          Indicatief, prijspeil {PRIJSPEIL}. Tarieven en wetsstatus per {datum(PEILDATUM)}: {heffingBronnen.mvtBp2027.titel}; {heffingBronnen.stemmingTweedeKamer.titel}; {heffingBronnen.iploAsb2026.titel}; {heffingBronnen.neaTarieven.titel};{' '}
          {heffingBronnen.neaAvi.titel}; {heffingBronnen.neaFactoren.titel}. Gemeentecijfers: CBS {heffingGemeentenBron.bronnen.afval.tabelId} (restafval {heffingGemeentenBron.bronnen.afval.peiljaar}), {heffingGemeentenBron.bronnen.nascheiding.tabelId}{' '}
          (nascheiding), {heffingGemeentenBron.bronnen.kerncijfers.tabelId} (inwoners en huishoudens per {datum(heffingGemeentenBron.bronnen.kerncijfers.peildatum)}), opgehaald {datum(heffingGemeentenBron.opgehaald)}. Aannames:{' '}
          {aannames.map((a) => `${a.onderwerp.toLowerCase()} (${a.waarde})`).join('; ')}. De scan telt geen poorttarief, inzamelkosten, btw of overgang naar het EU ETS mee. Volledige methode en bronlinks: {typeof window === 'undefined' ? '' : window.location.origin}
          {heffingenscanPad(g.slug)}.
        </p>
      </section>

      <RapportVoet tekst={`Indicatief, prijspeil ${PRIJSPEIL} · bronnen: CBS, NEa, Belastingplan 2027 · kplusv.nl`} />
    </div>
  );
}
