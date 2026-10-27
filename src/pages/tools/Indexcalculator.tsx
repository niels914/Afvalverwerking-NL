import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRol } from '../../components/betaalmuur/RolContext';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { BronRegels, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { Inklapbaar, Kern, useInklapBijPrintEnAnker } from '../../components/rekenen/Inklap';
import { OpDezePagina } from '../../components/rekenen/OpDezePagina';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../../components/ui';
import { indexbron, indexreeksen, indexStandaardInvoer, isVoorlopig, reeksMetId, type CbsReeks } from '../../data/indexreeksen';
import {
  afrondingTekst,
  factorTussen,
  gemeenschappelijkePerioden,
  indexInvoerNaarParams,
  indexInvoerUitParams,
  kiesPeriode,
  MAX_BASISTARIEF,
  periodeBereik,
  periodeLabel,
  periodenVan,
  rondAf,
  rondTarief,
  tariefPerContractjaar,
  vergelijkJaren,
  waardeOp,
  type Afronding,
  type GewogenReeks,
  type IndexInvoer,
  type Periode,
  type Periodesoort,
} from '../../lib/calc/indexering';
import { datum, euro, getal, procent } from '../../lib/format';

const PAD = '/tools/indexcalculator';
const FORMULE = 'nieuw tarief = basistarief × indexcijfer peilperiode / indexcijfer basisperiode';
const FORMULE_PRO = 'nieuw tarief = basistarief × (vast deel + Σ weging_i × indexcijfer_i,peil / indexcijfer_i,basis)';
const FORMULE_GRENS =
  'met begrenzing: tarief_J = tarief_vorig × begrensd(factor_J / factor_vorig); plafond: hooguit 1 + plafond, geen daling: minstens 1';
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** Indexcijfer of prijs leesbaar maken (pompprijs is euro per liter, geen index). */
function toonWaarde(r: CbsReeks, v: number | undefined, afronding?: Afronding): string {
  if (v === undefined) return '–';
  if (r.eenheid !== 'index') return `${euro(rondAf(v, afronding?.indexDecimalen ?? null), 3)} per liter`;
  const d = afronding?.indexDecimalen;
  return getal(rondAf(v, d), d ?? 2);
}

function voorlopigTekst(r: CbsReeks, ...perioden: Periode[]): string {
  return perioden.some((p) => isVoorlopig(r, p)) ? ' (voorlopig)' : '';
}

/** Aantal decimalen om een factor te tonen: zoals afgerond, anders 4. */
function factorDecimalen(a: Afronding): number {
  return a.factorDecimalen ?? 4;
}

const geldigeIds = indexreeksen.map((r) => r.id);

export function Indexcalculator() {
  useInklapBijPrintEnAnker();
  const { laden } = useRol();
  const [params, setParams] = useSearchParams();
  const [invoer, setInvoer] = useState<IndexInvoer>(() => indexInvoerUitParams(params, indexStandaardInvoer, geldigeIds));
  const zet = <K extends keyof IndexInvoer>(k: K, v: IndexInvoer[K]) => setInvoer((i) => ({ ...i, [k]: v }));
  const afr = invoer.afronding;

  // Gratis deel: één reeks.
  const reeks = reeksMetId(invoer.reeks) ?? indexreeksen[0];
  const beschikbaar = periodenVan(reeks, invoer.soort);
  const basis = kiesPeriode(beschikbaar.slice(0, -1).length ? beschikbaar.slice(0, -1) : beschikbaar, invoer.basisperiode)!;
  const peilOpties = beschikbaar.filter((p) => p > basis);
  const peil = kiesPeriode(peilOpties.length ? peilOpties : [basis], invoer.peilperiode)!;
  const basisWaarde = waardeOp(reeks, invoer.soort, basis);
  const peilWaarde = waardeOp(reeks, invoer.soort, peil);
  const factor = factorTussen([{ naam: reeks.kort, weging: 1, reeks }], invoer.soort, basis, peil, 0, afr) ?? 1;
  const tarief = rondTarief(invoer.basistarief * factor, afr);
  const stijgingPct = invoer.basistarief > 0 ? (tarief / invoer.basistarief - 1) * 100 : (factor - 1) * 100;
  const voorlopig = isVoorlopig(reeks, basis) || isVoorlopig(reeks, peil);

  // Effectieve invoer in de URL, zodat de adresbalk altijd een deelbare link is.
  const effectief: IndexInvoer = { ...invoer, basisperiode: basis, peilperiode: peil };
  const deelParams = indexInvoerNaarParams(effectief);
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const invoerRegels = [
    { label: 'Soort indexcijfers', waarde: invoer.soort === 'jaar' ? 'Jaarcijfers (jaargemiddelde CBS)' : 'Maandcijfers' },
    { label: 'Basistarief', waarde: `${euro(invoer.basistarief, 2)} per ton` },
    { label: 'Indexreeks', waarde: `${reeks.kort} (CBS ${reeks.tabelId}, ${reeks.basisjaar})` },
    { label: `Basisperiode ${periodeLabel(basis)}`, waarde: toonWaarde(reeks, basisWaarde, afr) + voorlopigTekst(reeks, basis) },
    { label: `Peilperiode ${periodeLabel(peil)}`, waarde: toonWaarde(reeks, peilWaarde, afr) + voorlopigTekst(reeks, peil) },
    { label: 'Afronding', waarde: afrondingTekst(afr) },
  ];

  const csvGratis = (): CsvCel[][] => [
    ['Indexcalculator', 'KplusV'],
    ['Bron indexcijfers', `CBS StatLine, tabel ${reeks.tabelId}`],
    ['Bron-URL', reeks.bronUrl],
    ['Peildatum (opgehaald)', indexbron.peildatum],
    [],
    ['Invoer', 'Waarde'],
    ['Soort indexcijfers', invoer.soort === 'jaar' ? 'jaarcijfers' : 'maandcijfers'],
    ['Basistarief (euro per ton)', invoer.basistarief],
    ['Indexreeks', reeks.naam],
    ['Basisjaar reeks', reeks.basisjaar],
    ['Basisperiode', periodeLabel(basis)],
    ['Indexcijfer basisperiode (CBS)', basisWaarde ?? null],
    ['Peilperiode', periodeLabel(peil)],
    ['Indexcijfer peilperiode (CBS)', peilWaarde ?? null],
    ['Voorlopige cijfers gebruikt', voorlopig ? 'ja' : 'nee'],
    ['Afronding', afrondingTekst(afr)],
    [],
    ['Uitkomst', 'Waarde'],
    ['Indexfactor', factor],
    ['Nieuw tarief (euro per ton)', tarief],
    ['Stijging (%)', stijgingPct],
    ['Formule', FORMULE],
  ];

  const bronRegels: BronRegel[] = indexreeksen.map((r) => ({
    onderwerp: r.kort,
    status: 'officieel',
    waarde: `CBS-tabel ${r.tabelId} · ${r.basisjaar} · maandcijfers ${periodeLabel(r.eersteMaand)} t/m ${periodeLabel(r.laatsteMaand)}${
      r.laatsteJaar ? ` · jaarcijfers t/m ${r.laatsteJaar}` : ''
    }`,
    toelichting: (
      <>
        {r.naam}. {r.gebruik}
        {r.voorlopig.length > 0 && <> Voorlopige cijfers: {periodeBereik(r.voorlopig)}.</>}
      </>
    ),
    bron: `CBS StatLine ${r.tabelId}: ${r.tabelTitel} (tabel bijgewerkt ${datum(r.tabelGewijzigd.slice(0, 10))})`,
    url: r.bronUrl,
    peildatum: r.peildatum ?? indexbron.peildatum,
  }));

  return (
    <div className="ta-tool">
      <RapportKop titel="Indexcalculator" ondertitel={`CBS-indexcijfers, opgehaald op ${datum(indexbron.peildatum)}`} />
      <PaginaKop titel="Indexcalculator" badges={<Badge soort="pro">Gratis deel + Pro voor leden</Badge>}>
        Reken uit hoe een tarief meebeweegt met indexcijfers van het CBS: cao-lonen, consumentenprijzen, energie en diesel.
        Jaar- of maandcijfers, met de afronding uit uw contract.
      </PaginaKop>

      <Kern>
        <p className="ta-kern-zin">
          Een tarief van <strong>{euro(invoer.basistarief, 2)}</strong> in {periodeLabel(basis)} wordt <strong>{euro(tarief, 2)}</strong> in{' '}
          {periodeLabel(peil)} met de {reeks.kort}: <strong>{stijgingPct >= 0 ? '+' : ''}{procent(stijgingPct)}</strong>.
        </p>
        <ul>
          <li>
            Bron: CBS-tabel {reeks.tabelId} ({reeks.basisjaar}), opgehaald op {datum(indexbron.peildatum)}
            {voorlopig ? '. Let op: een van de cijfers is nog voorlopig' : ''}.
          </li>
          <li>Afronding: {afrondingTekst(afr)}.</li>
          <li>Eigen weging over meerdere reeksen en een tarief per contractjaar: zie Pro voor leden.</li>
        </ul>
      </Kern>

      <OpDezePagina
        links={[
          { id: 'gratis', label: 'Indexeren met één reeks' },
          { id: 'pro', label: 'Eigen weging en contractjaren (Pro)' },
          { id: 'reeksen', label: 'Waarom deze reeksen' },
          { id: 'bronnen', label: 'Bronnen en peildatum' },
        ]}
      />

      <section aria-labelledby="gratis">
        <div className="ta-sectiekop">
          <h2 className="sectie" id="gratis" style={{ margin: 0 }}>
            Indexeren met één reeks
          </h2>
          <Badge soort="gratis">Gratis</Badge>
        </div>
        <div className="raster raster-tool">
          <Kaart titel="Invoer" className="invoerkaart">
            <div className="velden">
              <SoortKeuze soort={invoer.soort} onChange={(s) => zet('soort', s)} />
              <GetalVeld
                label="Basistarief"
                eenheid="€/ton"
                max={MAX_BASISTARIEF}
                waarde={invoer.basistarief}
                onChange={(n) => zet('basistarief', n)}
                hint="Het tarief dat hoort bij het indexcijfer van de basisperiode. 100 is een voorbeeld: vul uw eigen tarief in."
              />
              <KeuzeVeld
                label="Indexreeks"
                waarde={reeks.id}
                opties={indexreeksen.map((r) => ({ waarde: r.id, label: `${r.kort} (CBS ${r.tabelId})` }))}
                onChange={(id) => zet('reeks', id)}
                hint={reeks.gebruik}
              />
              {reeks.eenheid !== 'index' && (
                <p className="notitie info" role="note">
                  De pompprijs is een consumentenprijs in euro per liter, inclusief accijns en btw. Btw verandert de verhouding
                  niet zolang het btw-tarief gelijk blijft. Accijns is een vast bedrag per liter en verandert de verhouding wel.
                  Rekent uw contract met een prijs zonder accijns, dan wijkt de uitkomst af.
                </p>
              )}
              <KeuzeVeld
                label="Basisperiode"
                waarde={basis}
                opties={beschikbaar.slice(0, -1).map((p) => ({ waarde: p, label: periodeLabel(p) + voorlopigTekst(reeks, p) }))}
                onChange={(p) => zet('basisperiode', p)}
                hint="Meestal de periode van inschrijving of het jaar voor de start van het contract."
              />
              <KeuzeVeld
                label="Peilperiode"
                waarde={peil}
                opties={(peilOpties.length ? peilOpties : [basis]).map((p) => ({ waarde: p, label: periodeLabel(p) + voorlopigTekst(reeks, p) }))}
                onChange={(p) => zet('peilperiode', p)}
                hint="De periode waarmee u het nieuwe tarief bepaalt. U kiest alleen perioden na de basisperiode: een indexatie rekent vooruit vanaf de basis."
              />
              {voorlopig && (
                <p className="notitie" role="status">
                  Let op: CBS noemt een van deze cijfers voorlopig. Het kan nog wijzigen. Veel contracten rekenen daarom met het
                  eerste gepubliceerde cijfer of wachten op het definitieve cijfer.
                </p>
              )}
              <AfrondingKeuze afronding={afr} onChange={(a) => zet('afronding', a)} />
            </div>
          </Kaart>
          <Uitkomst
            inklapbaar
            label={<Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>}
            formule={FORMULE}
            toelichting={
              <>
                Bron: CBS StatLine, tabel{' '}
                <a href={reeks.bronUrl} target="_blank" rel="noopener noreferrer">
                  {reeks.tabelId}
                </a>
                , opgehaald op {datum(indexbron.peildatum)}. Het basisjaar van de reeks ({reeks.basisjaar}) maakt voor de uitkomst
                niet uit: alleen de verhouding telt. Afronding: {afrondingTekst(afr)}.
              </>
            }
            invoer={invoerRegels}
          >
            <div className="stapel">
              <div className="tegels">
                <Tegel label={`Tarief ${periodeLabel(peil)}`} waarde={euro(tarief, 2)} toelichting="per ton" hero />
                <Tegel
                  label="Indexfactor"
                  waarde={getal(factor, factorDecimalen(afr))}
                  toelichting={`${periodeLabel(peil)} t.o.v. ${periodeLabel(basis)}`}
                />
                <Tegel label="Stijging" waarde={procent(stijgingPct)} toelichting={`${euro(tarief - invoer.basistarief, 2)} per ton`} />
              </div>
              <p className="klein muted" style={{ margin: 0 }}>
                Indexcijfers: {toonWaarde(reeks, basisWaarde, afr)} ({periodeLabel(basis)}) en {toonWaarde(reeks, peilWaarde, afr)} (
                {periodeLabel(peil)}), CBS-tabel{' '}
                <a href={reeks.bronUrl} target="_blank" rel="noopener noreferrer">
                  {reeks.tabelId}
                </a>
                .
              </p>
              <ExportKnoppen
                naam="Indexcalculator"
                csvRijen={csvGratis}
                params={deelParams}
                pad={PAD}
                linkInklappen
                toelichting="De CSV bevat invoer, indexcijfers, afronding, bron en uitkomst. De link bewaart al uw invoer, ook de Pro-instellingen."
              />
            </div>
          </Uitkomst>
        </div>
      </section>

      <section className="ta-pro" aria-labelledby="pro">
        <div className="ta-sectiekop">
          <h2 className="sectie" id="pro" style={{ margin: 0 }}>
            Eigen weging en contractjaren
          </h2>
          <Badge soort="pro">Pro voor leden</Badge>
        </div>
        <p className="ta-pro-uitleg">
          Weeg loon, prijzen, energie en diesel zoals in uw contract en zie het tarief voor elk contractjaar, met plafond, bodem en
          afronding.
        </p>
        {laden ? (
          <p className="notitie info" role="status" style={{ minHeight: 120 }}>
            Ledentoegang controleren…
          </p>
        ) : (
          <Vergrendeld
            titel="Indexcalculator Pro"
            ledenKrijgen={[
              'Eigen weging over meerdere CBS-reeksen, met een vast deel dat niet meebeweegt',
              'Tarief per contractjaar met peilmaand of jaargemiddelde, in tabel en grafiek',
              'Twee contractjaren vergelijken en alles exporteren als CSV, met de indexcijfers per reeks',
              'Rapport maken met invoer, bronnen, formule en uitkomst',
            ]}
          >
            <IndexPro invoer={invoer} zet={zet} deelParams={deelParams} />
          </Vergrendeld>
        )}
      </section>

      <section className="ta-achtergrond" aria-labelledby="ta-achtergrond-kop">
        <h2 className="sectie" id="ta-achtergrond-kop">
          Achtergrond
        </h2>
        <Inklapbaar id="reeksen" titel="Waarom deze reeksen" sub={`${indexreeksen.length} CBS-reeksen`}>
          <p>
            Indexeringsclausules in afvalcontracten volgen meestal de kostenopbouw van de dienst. Loon, energie en brandstof zijn de
            grootste posten, aangevuld met de algemene prijsontwikkeling.
          </p>
          <ul className="opsomming">
            <li>
              <strong>Cao-lonen per uur inclusief bijzondere beloningen</strong> voor de bedrijfstak waterbedrijven en afvalbeheer
              (SBI E). Voor inzamelcontracten ook vervoer en opslag (SBI H). Het totaal van alle bedrijfstakken is een alternatief als
              het contract geen bedrijfstak noemt.
            </li>
            <li>
              <strong>Consumentenprijsindex (CPI), alle bestedingen.</strong> De standaardreeks voor algemene prijsontwikkeling.
            </li>
            <li>
              <strong>Producentenprijsindex energie</strong> (elektriciteit, gas, stoom en warmte, afzet binnenland) voor de
              energiekosten van installaties.
            </li>
            <li>
              <strong>Pompprijs diesel</strong> voor brandstof van inzamelvoertuigen. Dit is een consumentenprijs in euro per liter,
              inclusief accijns en btw, geen index. De berekening werkt hetzelfde, want alleen de verhouding telt.
            </li>
          </ul>
          <p className="klein muted">
            Niet opgenomen: de producentenprijsindex voor gasolie. CBS publiceert die reeks met veel lege maanden, waardoor een
            indexatie niet betrouwbaar na te rekenen is.
          </p>
        </Inklapbaar>
        <Inklapbaar id="rekenregels" titel="Rekenregels en afronding" sub="formules, peilperiode, afronding">
          <ul className="opsomming">
            <li>
              Eén reeks: <code>{FORMULE}</code>.
            </li>
            <li>
              Meerdere reeksen (Pro): <code>{FORMULE_PRO}</code>. Weging en vast deel moeten samen 100 % zijn.
            </li>
            <li>
              De peilperiode ligt altijd na de basisperiode. Een contract indexeert vooruit: het nieuwe tarief volgt uit de
              ontwikkeling sinds de basisperiode.
            </li>
            <li>
              Contractjaar J gebruikt het cijfer van jaar J (nacalculatie) of J − 1 (tarief per 1 januari), als jaargemiddelde of
              van de gekozen peilmaand.
            </li>
            <li>
              Met een plafond of bodem indexeert de tool jaar op jaar: {FORMULE_GRENS}. Zonder begrenzing is dat gelijk aan basistarief
              × factor.
            </li>
            <li>
              Afronding: de tool rondt rekenkundig af (vanaf 5 naar boven). Eerst de indexcijfers (als u dat kiest), dan de
              indexfactor, dan het tarief. Bij jaar-op-jaar indexeren rekent elk jaar verder met het afgeronde tarief van het jaar
              ervoor.
            </li>
          </ul>
        </Inklapbaar>
        <Inklapbaar id="bronnen" titel="Bronnen en peildatum" sub={`CBS, opgehaald op ${datum(indexbron.peildatum)}`}>
          <p className="klein muted" style={{ margin: 0 }}>
            Opgehaald via de CBS Open Data API. {indexbron.licentie}.
          </p>
          <BronRegels regels={bronRegels} />
        </Inklapbaar>
      </section>
      <RapportVoet tekst={`Indexcijfers: CBS StatLine (CC BY 4.0), opgehaald op ${datum(indexbron.peildatum)}`} />
    </div>
  );
}

function SoortKeuze({ soort, onChange }: { soort: Periodesoort; onChange: (s: Periodesoort) => void }) {
  return (
    <fieldset>
      <legend>Soort indexcijfers</legend>
      <div className="keuzes">
        {(
          [
            ['jaar', 'Jaarcijfers'],
            ['maand', 'Maandcijfers'],
          ] as const
        ).map(([w, l]) => (
          <label key={w} className="keuze">
            <input type="radio" name="index-soort" value={w} checked={soort === w} onChange={() => onChange(w)} />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AfrondingKeuze({ afronding, onChange }: { afronding: Afronding; onChange: (a: Afronding) => void }) {
  const naarTekst = (n: number | null, leeg: string) => (n === null ? leeg : String(n));
  const naarGetal = (t: string) => (t === 'cbs' || t === 'nee' ? null : Number(t));
  return (
    <details className="ta-afronding" id="afronding">
      <summary>
        <span className="veld-label">Afronding</span> <span className="ta-inklap-sub">{afrondingTekst(afronding)}</span>
      </summary>
      <div className="velden">
        <KeuzeVeld
          label="Indexcijfers afronden"
          waarde={naarTekst(afronding.indexDecimalen, 'cbs')}
          opties={[
            { waarde: 'cbs', label: 'Nee, zoals CBS ze publiceert' },
            { waarde: '1', label: 'Op 1 decimaal' },
            { waarde: '2', label: 'Op 2 decimalen' },
          ]}
          onChange={(t) => onChange({ ...afronding, indexDecimalen: naarGetal(t) })}
        />
        <KeuzeVeld
          label="Indexfactor afronden"
          waarde={naarTekst(afronding.factorDecimalen, 'nee')}
          opties={[
            { waarde: 'nee', label: 'Nee' },
            { waarde: '3', label: 'Op 3 decimalen' },
            { waarde: '4', label: 'Op 4 decimalen' },
          ]}
          onChange={(t) => onChange({ ...afronding, factorDecimalen: naarGetal(t) })}
        />
        <label className="keuze">
          <input type="checkbox" checked={afronding.tariefCenten} onChange={(e) => onChange({ ...afronding, tariefCenten: e.target.checked })} />
          Tarief afronden op hele centen
        </label>
        <p className="klein muted" style={{ margin: 0 }}>
          Neem de afronding uit uw contract over. De keuze geldt ook voor Pro en staat in de CSV en de deellink.
        </p>
      </div>
    </details>
  );
}

interface ProProps {
  invoer: IndexInvoer;
  zet: <K extends keyof IndexInvoer>(k: K, v: IndexInvoer[K]) => void;
  deelParams: URLSearchParams;
}

function IndexPro({ invoer, zet, deelParams }: ProProps) {
  const { soort, afronding: afr } = invoer;
  const somPct = indexreeksen.reduce((s, r) => s + (invoer.wegingPct[r.id] ?? 0), 0) + invoer.vastPct;
  const klopt = Math.abs(somPct - 100) < 1e-6;
  const gewogen: GewogenReeks[] = indexreeksen
    .filter((r) => (invoer.wegingPct[r.id] ?? 0) > 0)
    .map((r) => ({ naam: r.kort, weging: (invoer.wegingPct[r.id] ?? 0) / 100, reeks: r }));
  const gebruikt = gewogen.map((g) => g.reeks as CbsReeks);
  const perioden = gemeenschappelijkePerioden(gebruikt, soort);
  const basis = kiesPeriode(perioden.slice(0, -1).length ? perioden.slice(0, -1) : perioden, invoer.basisperiode);
  const peilOpties = basis ? perioden.filter((p) => p > basis) : [];
  const peil = basis ? kiesPeriode(peilOpties.length ? peilOpties : [basis], invoer.peilperiode) : undefined;
  const vast = invoer.vastPct / 100;
  const factor = basis && peil ? factorTussen(gewogen, soort, basis, peil, vast, afr) : undefined;

  const eersteJaar = Math.min(invoer.eersteJaar, invoer.laatsteJaar);
  const laatsteJaar = Math.max(invoer.eersteJaar, invoer.laatsteJaar);
  const contract = {
    basistarief: invoer.basistarief,
    vastDeel: vast,
    soort,
    basisperiode: basis ?? '',
    eersteJaar,
    laatsteJaar: Math.min(laatsteJaar, eersteJaar + 30),
    verschuiving: invoer.verschuiving,
    peilmaand: invoer.peilmaand,
    plafondPct: invoer.plafondPct,
    geenDaling: invoer.geenDaling,
    afronding: afr,
  };
  const grenzen = invoer.plafondPct !== null || invoer.geenDaling;
  const grensTekst = [
    invoer.plafondPct !== null ? `hooguit ${procent(invoer.plafondPct)} per indexatie` : '',
    invoer.geenDaling ? 'geen daling' : '',
  ]
    .filter(Boolean)
    .join(', ');
  const rijen = useMemo(
    () => (basis && gewogen.length ? tariefPerContractjaar({ ...contract, reeksen: gewogen }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contract), JSON.stringify(invoer.wegingPct)],
  );
  const cpi = reeksMetId('cpi')!;
  const cpiBasis = kiesPeriode(periodenVan(cpi, soort), basis);
  const alleenCpi = cpiBasis
    ? tariefPerContractjaar({
        ...contract,
        basisperiode: cpiBasis,
        vastDeel: 0,
        plafondPct: null,
        geenDaling: false,
        reeksen: [{ naam: 'CPI', weging: 1, reeks: cpi }],
      })
    : [];
  const cpiPerJaar = new Map(alleenCpi.map((r) => [r.jaar, r.tarief]));
  const grafiekRijen = rijen.filter((r) => cpiPerJaar.has(r.jaar));

  // De vergelijking staat in de invoer, zodat de deellink hem bewaart.
  const [jaarA, jaarB] = invoer.vergelijk ?? [null, null];
  const a = jaarA !== null && rijen.some((r) => r.jaar === jaarA) ? jaarA : rijen[0]?.jaar;
  const b = jaarB !== null && rijen.some((r) => r.jaar === jaarB) ? jaarB : rijen[rijen.length - 1]?.jaar;
  const zetVergelijk = (na: number, nb: number) => zet('vergelijk', [na, nb]);
  const vergelijking = a !== undefined && b !== undefined ? vergelijkJaren(rijen, a, b) : undefined;
  const ontbrekend = laatsteJaar - eersteJaar + 1 - rijen.length;
  const voorlopigGebruikt =
    rijen.some((r) => gebruikt.some((g) => isVoorlopig(g, r.peilperiode))) || (peil !== undefined && gebruikt.some((g) => isVoorlopig(g, peil)));
  const fd = factorDecimalen(afr);

  const csvPro = (): CsvCel[][] => [
    ['Indexcalculator Pro', 'KplusV'],
    ['Bron indexcijfers', 'CBS StatLine (CC BY 4.0)'],
    ['Peildatum (opgehaald)', indexbron.peildatum],
    [],
    ['Invoer', 'Waarde'],
    ['Soort indexcijfers', soort === 'jaar' ? 'jaarcijfers' : 'maandcijfers'],
    ['Basistarief (euro per ton)', invoer.basistarief],
    ['Basisperiode', basis ? periodeLabel(basis) : ''],
    ['Vast deel (%)', invoer.vastPct],
    ...indexreeksen.map((r): CsvCel[] => [`Weging ${r.kort} (%) [CBS ${r.tabelId}]`, invoer.wegingPct[r.id] ?? 0]),
    ['Eerste contractjaar', eersteJaar],
    ['Laatste contractjaar', laatsteJaar],
    ['Indexcijfer uit', invoer.verschuiving === 1 ? 'voorgaand jaar' : 'zelfde jaar'],
    ...(soort === 'maand' ? [['Peilmaand', MAANDNAMEN[invoer.peilmaand - 1]] as CsvCel[]] : []),
    ['Plafond per indexatie (%)', invoer.plafondPct ?? 'geen'],
    ['Negatieve indexatie', invoer.geenDaling ? 'niet toegepast' : 'toegepast'],
    ['Afronding', afrondingTekst(afr)],
    [],
    ['Bronnen en indexcijfers basisperiode', 'CBS-tabel', 'Bron-URL', `Indexcijfer ${basis ? periodeLabel(basis) : ''} (CBS)`],
    ...gebruikt.map((g): CsvCel[] => [g.kort, `${g.tabelId} ${g.tabelTitel}`, g.bronUrl, basis ? (waardeOp(g, soort, basis) ?? null) : null]),
    [],
    [
      'Contractjaar',
      'Peilperiode',
      ...gebruikt.map((g): CsvCel => `Indexcijfer ${g.kort} peilperiode (CBS)`),
      'Indexfactor',
      'Tarief (euro per ton)',
      'Stijging t.o.v. vorig jaar (%)',
      'Tarief zonder plafond of bodem (euro per ton)',
      'Begrensd',
      'Voorlopig cijfer gebruikt',
      'Ter vergelijking: alleen CPI (euro per ton)',
    ],
    ...rijen.map((r): CsvCel[] => [
      r.jaar,
      periodeLabel(r.peilperiode),
      ...gebruikt.map((g): CsvCel => waardeOp(g, soort, r.peilperiode) ?? null),
      r.factor,
      r.tarief,
      r.stijgingPct,
      r.tariefZonderGrens,
      r.begrensd ? 'ja' : 'nee',
      gebruikt.some((g) => isVoorlopig(g, r.peilperiode)) ? 'ja' : 'nee',
      cpiPerJaar.get(r.jaar) ?? null,
    ]),
    [],
    ...(vergelijking && a !== undefined && b !== undefined
      ? ([
          ['Vergelijking contractjaren', `${a} met ${b}`],
          ['Verschil tarief (euro per ton)', vergelijking.verschil],
          ['Verschil tarief (%)', vergelijking.verschilPct],
          [],
        ] as CsvCel[][])
      : []),
    ['Formule', FORMULE_PRO],
    ...(grenzen ? [['Begrenzing', FORMULE_GRENS] as CsvCel[]] : []),
  ];

  const jaarOpties = rijen.map((r) => ({ waarde: r.jaar, label: String(r.jaar) }));

  return (
    <div className="stapel">
      <div className="raster raster-2">
        <Kaart titel="Eigen weging" kopNiveau={3} className="invoerkaart" sub="Neem de weging uit uw contract over. De standaard is een voorbeeld, geen norm.">
          <div className="velden">
            {indexreeksen.map((r) => (
              <GetalVeld
                key={r.id}
                label={`${r.kort} (CBS ${r.tabelId})`}
                eenheid="%"
                max={100}
                waarde={invoer.wegingPct[r.id] ?? 0}
                onChange={(n) => zet('wegingPct', { ...invoer.wegingPct, [r.id]: n })}
              />
            ))}
            <GetalVeld
              label="Vast deel, niet geïndexeerd"
              eenheid="%"
              max={100}
              waarde={invoer.vastPct}
              onChange={(n) => zet('vastPct', n)}
              hint="Deel van het tarief dat gelijk blijft, bijvoorbeeld afschrijving van een installatie."
            />
            <p className={`notitie ${klopt ? 'succes' : ''}`} role="status">
              {klopt ? '✓ ' : '⚠ '}Samen {procent(somPct, 0)}
              {klopt ? '.' : '. Weging en vast deel moeten samen 100 % zijn. De uitkomst rekent nu met deze weging.'}
            </p>
          </div>
        </Kaart>
        <Kaart titel="Contractjaren" kopNiveau={3} className="invoerkaart" sub="Per contractjaar een nieuw tarief, telkens ten opzichte van de basisperiode.">
          <div className="velden">
            <KeuzeVeld
              label="Basisperiode (voor alle gekozen reeksen)"
              waarde={basis ?? ''}
              opties={(perioden.slice(0, -1).length ? perioden.slice(0, -1) : perioden).map((p) => ({ waarde: p, label: periodeLabel(p) }))}
              onChange={(p) => zet('basisperiode', p)}
              hint={perioden.length ? `Gemeenschappelijke cijfers vanaf ${periodeLabel(perioden[0])}.` : 'Kies minstens één reeks met een weging.'}
            />
            <div className="velden-2">
              <GetalVeld label="Eerste contractjaar" eenheid="jaar" min={2000} max={2100} waarde={invoer.eersteJaar} onChange={(n) => zet('eersteJaar', Math.round(n))} />
              <GetalVeld label="Laatste contractjaar" eenheid="jaar" min={2000} max={2100} waarde={invoer.laatsteJaar} onChange={(n) => zet('laatsteJaar', Math.round(n))} />
            </div>
            <KeuzeVeld
              label="Indexcijfer uit"
              waarde={invoer.verschuiving}
              opties={[
                { waarde: 1, label: 'het voorgaande jaar (tarief per 1 januari)' },
                { waarde: 0, label: 'hetzelfde jaar (nacalculatie)' },
              ]}
              onChange={(v) => zet('verschuiving', v as 0 | 1)}
            />
            {soort === 'maand' ? (
              <KeuzeVeld
                label="Peilmaand"
                waarde={invoer.peilmaand}
                opties={MAANDNAMEN.map((m, i) => ({ waarde: i + 1, label: m }))}
                onChange={(m) => zet('peilmaand', m)}
                hint="Bijvoorbeeld: het indexcijfer van september bepaalt het tarief van het volgende jaar."
              />
            ) : (
              <p className="klein muted">Met jaarcijfers rekent de tool met het jaargemiddelde dat CBS publiceert.</p>
            )}
            <fieldset>
              <legend>Begrenzing uit het contract</legend>
              <div className="keuzes kolom">
                <label className="keuze">
                  <input type="checkbox" checked={invoer.plafondPct !== null} onChange={(e) => zet('plafondPct', e.target.checked ? 3 : null)} />
                  Plafond per indexatie
                </label>
                <label className="keuze">
                  <input type="checkbox" checked={invoer.geenDaling} onChange={(e) => zet('geenDaling', e.target.checked)} />
                  Geen negatieve indexatie (het tarief daalt niet)
                </label>
              </div>
            </fieldset>
            {invoer.plafondPct !== null && (
              <GetalVeld
                label="Maximale stijging per indexatie"
                eenheid="%"
                max={100}
                waarde={invoer.plafondPct}
                onChange={(n) => zet('plafondPct', n)}
                hint="Vul het percentage uit uw contract in. 3 % is een voorbeeldwaarde. Met een begrenzing indexeert de tool jaar op jaar."
              />
            )}
            <p className="klein muted" style={{ margin: 0 }}>
              Afronding: {afrondingTekst(afr)}. <a href="#afronding">Wijzigen bij de invoer hierboven</a>.
            </p>
          </div>
        </Kaart>
      </div>

      <Uitkomst
        inklapbaar
        titel="Tarief per contractjaar"
        label={<Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>}
        formule={`${FORMULE_PRO}\npeilperiode contractjaar J = ${soort === 'jaar' ? 'jaar' : `${MAANDNAMEN[invoer.peilmaand - 1]} van jaar`} J${
          invoer.verschuiving ? ' − 1' : ''
        }${grenzen ? `\n${FORMULE_GRENS}` : ''}\nafronding: ${afrondingTekst(afr)}`}
        toelichting={
          ontbrekend > 0
            ? `${ontbrekend} contractja${ontbrekend === 1 ? 'ar ontbreekt' : 'ren ontbreken'}: CBS heeft voor de peilperiode nog geen cijfer voor alle gekozen reeksen.`
            : undefined
        }
        invoer={[
          { label: 'Basistarief', waarde: `${euro(invoer.basistarief, 2)} per ton` },
          { label: 'Basisperiode', waarde: basis ? periodeLabel(basis) : '–' },
          ...gewogen.map((g) => ({
            label: `Weging ${g.naam}`,
            waarde: `${procent(g.weging * 100, 0)}${basis ? ` (indexcijfer ${periodeLabel(basis)}: ${toonWaarde(g.reeks as CbsReeks, waardeOp(g.reeks, soort, basis), afr)})` : ''}`,
          })),
          { label: 'Vast deel', waarde: procent(invoer.vastPct, 0) },
          { label: 'Contractjaren', waarde: `${eersteJaar} t/m ${laatsteJaar}` },
          { label: 'Begrenzing', waarde: grenzen ? grensTekst : 'geen' },
          { label: 'Afronding', waarde: afrondingTekst(afr) },
        ]}
      >
        <div className="stapel">
          <div className="tegels">
            <Tegel
              label={peil ? `Gewogen tarief ${periodeLabel(peil)}` : 'Gewogen tarief'}
              waarde={factor !== undefined ? euro(rondTarief(invoer.basistarief * factor, afr), 2) : '–'}
              toelichting={
                factor !== undefined && basis
                  ? `factor ${getal(factor, fd)} t.o.v. ${periodeLabel(basis)}${grenzen ? ', zonder begrenzing' : ''}`
                  : 'geen gemeenschappelijke cijfers'
              }
              hero
            />
            {vergelijking && a !== undefined && b !== undefined && (
              <Tegel label={`Verschil ${a} → ${b}`} waarde={procent(vergelijking.verschilPct)} toelichting={`${euro(vergelijking.verschil, 2)} per ton`} />
            )}
          </div>
          {voorlopigGebruikt && (
            <p className="notitie" role="status">
              Een of meer peilperioden gebruiken voorlopige CBS-cijfers. Die kunnen nog wijzigen.
            </p>
          )}
          {jaarOpties.length > 1 && (
            <div className="velden-2 invoerkaart">
              <KeuzeVeld label="Vergelijk contractjaar" waarde={a!} opties={jaarOpties} onChange={(j) => zetVergelijk(j, b!)} />
              <KeuzeVeld label="met contractjaar" waarde={b!} opties={jaarOpties} onChange={(j) => zetVergelijk(a!, j)} />
            </div>
          )}
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel tarief per contractjaar">
            <table>
              <caption>
                Tarief per ton per contractjaar, met de peilperiode en de indexfactor eronder. Bron indexcijfers: CBS, opgehaald op{' '}
                {datum(indexbron.peildatum)}.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Contractjaar</th>
                  <th scope="col" className="num">
                    Tarief per ton
                  </th>
                  <th scope="col" className="num">
                    Stijging
                  </th>
                  <th scope="col" className="num">
                    Alleen CPI
                  </th>
                </tr>
              </thead>
              <tbody>
                {rijen.map((r) => (
                  <tr key={r.jaar}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      {r.jaar}
                      <span className="ta-onder">
                        {periodeLabel(r.peilperiode)}
                        {gebruikt.some((g) => isVoorlopig(g, r.peilperiode)) ? ' (voorlopig)' : ''}
                      </span>
                    </th>
                    <td className="num">
                      {euro(r.tarief, 2)}
                      <span className="ta-onder">factor {getal(r.factor, fd)}</span>
                    </td>
                    <td className="num">
                      {r.stijgingPct === null ? '–' : procent(r.stijgingPct)}
                      {r.begrensd && <span className="ta-onder">begrensd, zonder: {euro(r.tariefZonderGrens, 2)}</span>}
                    </td>
                    <td className="num">{cpiPerJaar.has(r.jaar) ? euro(cpiPerJaar.get(r.jaar)!, 2) : '–'}</td>
                  </tr>
                ))}
                {rijen.length === 0 && (
                  <tr>
                    <td colSpan={4}>Geen contractjaren met cijfers. Controleer de jaren en de weging.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {grafiekRijen.length > 1 && (
            <LijnGrafiek
              titel="Tarief per contractjaar met gewogen index, vergeleken met alleen consumentenprijzen"
              labels={grafiekRijen.map((r) => r.jaar)}
              reeksen={[
                { naam: 'Tarief met gewogen index', waarden: grafiekRijen.map((r) => r.tarief) },
                { naam: 'Ter vergelijking: alleen CPI', waarden: grafiekRijen.map((r) => cpiPerJaar.get(r.jaar)!), vergelijking: true },
              ]}
              formatY={(n) => euro(n)}
              vanafNul={false}
            />
          )}
          <ExportKnoppen
            naam="Indexcalculator Pro"
            csvRijen={csvPro}
            params={deelParams}
            pad={PAD}
            linkInklappen
            toelichting="De CSV bevat per contractjaar de CBS-indexcijfers van elke gebruikte reeks, de factor, het tarief en de afronding."
          />
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
