import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRol } from '../../components/betaalmuur/RolContext';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { BronRegels, BronStatusLabel, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { Inklapbaar, Kern, OngeldigeInvoer, useInklapBijPrintEnAnker, useOngeldigeInvoer } from '../../components/rekenen/Inklap';
import { OpDezePagina } from '../../components/rekenen/OpDezePagina';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../../components/ui';
import {
  cbsIndexeringUitleg,
  indexbron,
  indexreeksen,
  indexStandaardInvoer,
  indexToolVersie,
  isVoorlopig,
  reeksMetId,
  type CbsReeks,
} from '../../data/indexreeksen';
import {
  afrondingTekst,
  EIGEN_REEKS_ID,
  factorTussen,
  gemeenschappelijkePerioden,
  indexInvoerNaarParams,
  indexInvoerUitParams,
  kiesContractjaren,
  kiesPeriode,
  leesEigenReeks,
  MAX_BASISTARIEF,
  MAX_EIGEN_NAAM,
  periodeBereik,
  periodeLabel,
  periodenVan,
  rondAf,
  rondTarief,
  tariefPerContractjaar,
  waardeOp,
  type Afronding,
  type Contractjaar,
  type GewogenReeks,
  type IndexInvoer,
  type Periode,
  type Periodesoort,
  type ReeksWaarden,
} from '../../lib/calc/indexering';
import { datum, euro, getal, procent } from '../../lib/format';

const PAD = '/tools/indexcalculator';
const FORMULE = 'nieuw tarief = basistarief × indexcijfer peilperiode / indexcijfer basisperiode';
const FORMULE_PRO = 'nieuw tarief = basistarief × (vast deel + Σ weging_i × indexcijfer_i,peil / indexcijfer_i,basis)';
const FORMULE_GRENS =
  'met begrenzing: tarief_J = tarief_vorig × begrensd(factor_J / factor_vorig); plafond: hooguit 1 + plafond, geen daling: minstens 1';
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const VERSIE_TEKST = `Versie ${indexToolVersie.versie}, bijgewerkt ${datum(indexToolVersie.datum)}`;

/** Eigen indexcijfers van de gebruiker in dezelfde vorm als een CBS-reeks. Geen CBS-bron. */
function eigenAlsReeks(naam: string, waarden: ReeksWaarden): CbsReeks {
  const maanden = Object.keys(waarden.maanden).sort();
  const jaren = Object.keys(waarden.jaren).sort();
  const n = naam || 'Eigen reeks';
  return {
    id: EIGEN_REEKS_ID,
    naam: `${n} (eigen invoer)`,
    kort: n,
    gebruik: 'Eigen indexcijfers, bijvoorbeeld een sectorindex uit uw contract. Geen CBS-cijfers: controleer ze zelf.',
    tabelId: 'eigen invoer',
    tabelTitel: 'Eigen invoer van de gebruiker',
    dimensies: {},
    onderwerp: '',
    eenheid: 'index',
    basisjaar: 'eigen basis',
    tabelGewijzigd: '',
    peildatum: '',
    bronUrl: '',
    apiUrl: '',
    eersteMaand: maanden[0] ?? '',
    laatsteMaand: maanden[maanden.length - 1] ?? '',
    laatsteJaar: jaren.length ? Number(jaren[jaren.length - 1]) : null,
    voorlopig: [],
    maanden: waarden.maanden,
    jaren: waarden.jaren,
  };
}

const isEigen = (r: CbsReeks) => r.id === EIGEN_REEKS_ID;
/** Korte bronvermelding van een reeks voor labels: "CBS 86141NED" of "eigen invoer". */
const bronKort = (r: CbsReeks) => (isEigen(r) ? 'eigen invoer' : `CBS ${r.tabelId}`);

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

const geldigeIds = [...indexreeksen.map((r) => r.id), EIGEN_REEKS_ID];

/* ---------- Pro: alles wat het Pro-deel rekent, één keer voor kern en Pro-blok ---------- */

interface ProUitkomst {
  gewogen: GewogenReeks[];
  gebruikt: CbsReeks[];
  perioden: Periode[];
  basis: Periode | undefined;
  eersteJaar: number;
  laatsteJaar: number;
  grenzen: boolean;
  grensTekst: string;
  somPct: number;
  klopt: boolean;
  rijen: Contractjaar[];
  cpiPerJaar: Map<number, number>;
  a?: Contractjaar;
  b?: Contractjaar;
  verschil?: { verschil: number; verschilPct: number };
  ontbrekend: number;
}

function berekenPro(invoer: IndexInvoer, reeksen: CbsReeks[]): ProUitkomst {
  const { soort, afronding: afr } = invoer;
  const somPct = reeksen.reduce((s, r) => s + (invoer.wegingPct[r.id] ?? 0), 0) + invoer.vastPct;
  const gewogen: GewogenReeks[] = reeksen
    .filter((r) => (invoer.wegingPct[r.id] ?? 0) > 0)
    .map((r) => ({ naam: r.kort, weging: (invoer.wegingPct[r.id] ?? 0) / 100, reeks: r }));
  const gebruikt = gewogen.map((g) => g.reeks as CbsReeks);
  const perioden = gemeenschappelijkePerioden(gebruikt, soort);
  const basis = kiesPeriode(perioden.slice(0, -1).length ? perioden.slice(0, -1) : perioden, invoer.basisperiode);
  const eersteJaar = Math.min(invoer.eersteJaar, invoer.laatsteJaar);
  const laatsteJaar = Math.min(Math.max(invoer.eersteJaar, invoer.laatsteJaar), eersteJaar + 30);
  const contract = {
    basistarief: invoer.basistarief,
    vastDeel: invoer.vastPct / 100,
    soort,
    basisperiode: basis ?? '',
    eersteJaar,
    laatsteJaar,
    verschuiving: invoer.verschuiving,
    peilmaand: invoer.peilmaand,
    plafondPct: invoer.plafondPct,
    geenDaling: invoer.geenDaling,
    afronding: afr,
  };
  const grenzen = invoer.plafondPct !== null || invoer.geenDaling;
  const grensTekst = [invoer.plafondPct !== null ? `hooguit ${procent(invoer.plafondPct)} per indexatie` : '', invoer.geenDaling ? 'geen daling' : '']
    .filter(Boolean)
    .join(', ');
  const rijen = basis && gewogen.length ? tariefPerContractjaar({ ...contract, reeksen: gewogen }) : [];
  const cpi = reeksMetId('cpi')!;
  const cpiBasis = kiesPeriode(periodenVan(cpi, soort), basis);
  const alleenCpi = cpiBasis
    ? tariefPerContractjaar({ ...contract, basisperiode: cpiBasis, vastDeel: 0, plafondPct: null, geenDaling: false, reeksen: [{ naam: 'CPI', weging: 1, reeks: cpi }] })
    : [];
  const keuze = kiesContractjaren(rijen, invoer.vergelijk);
  return {
    gewogen,
    gebruikt,
    perioden,
    basis,
    eersteJaar,
    laatsteJaar,
    grenzen,
    grensTekst,
    somPct,
    klopt: Math.abs(somPct - 100) < 1e-6,
    rijen,
    cpiPerJaar: new Map(alleenCpi.map((r) => [r.jaar, r.tarief])),
    ...keuze,
    ontbrekend: laatsteJaar - eersteJaar + 1 - rijen.length,
  };
}

/** Uitleg bij het tarief van één contractjaar: welk cijfer en welke factor. */
function contractjaarUitleg(r: Contractjaar, invoer: IndexInvoer, basis: Periode | undefined, fd: number): string {
  const welk = invoer.soort === 'jaar' ? `het jaarcijfer ${periodeLabel(r.peilperiode)}` : `het cijfer van ${periodeLabel(r.peilperiode)}`;
  const waarom = invoer.verschuiving === 1 ? ' (indexcijfer uit het voorgaande jaar)' : ' (indexcijfer uit hetzelfde jaar)';
  return `Contractjaar ${r.jaar} rekent met ${welk}${waarom}: factor ${getal(r.factor, fd)} ten opzichte van ${basis ? periodeLabel(basis) : 'de basis'}${
    r.begrensd ? `, begrensd door plafond of bodem (zonder begrenzing ${euro(r.tariefZonderGrens, 2)})` : ''
  }.`;
}

export function Indexcalculator() {
  useInklapBijPrintEnAnker();
  const { laden, isLid } = useRol();
  const [toolRef, ongeldigeVelden] = useOngeldigeInvoer();
  const ok = ongeldigeVelden.length === 0;
  const [params, setParams] = useSearchParams();
  const [invoer, setInvoer] = useState<IndexInvoer>(() => indexInvoerUitParams(params, indexStandaardInvoer, geldigeIds));
  const zet = <K extends keyof IndexInvoer>(k: K, v: IndexInvoer[K]) => setInvoer((i) => ({ ...i, [k]: v }));
  const afr = invoer.afronding;

  const eigen = useMemo(() => leesEigenReeks(invoer.eigenTekst), [invoer.eigenTekst]);
  const eigenReeks = useMemo(() => eigenAlsReeks(invoer.eigenNaam.trim(), eigen.waarden), [invoer.eigenNaam, eigen]);
  const alleReeksen = useMemo(() => [...indexreeksen, eigenReeks], [eigenReeks]);

  // Gratis deel: één reeks.
  const reeks = invoer.reeks === EIGEN_REEKS_ID ? eigenReeks : (reeksMetId(invoer.reeks) ?? indexreeksen[0]);
  const beschikbaar = periodenVan(reeks, invoer.soort);
  const genoeg = beschikbaar.length >= 2;
  const basisOpties = beschikbaar.slice(0, -1).length ? beschikbaar.slice(0, -1) : beschikbaar;
  const basis = kiesPeriode(basisOpties, invoer.basisperiode) ?? '';
  const peilOpties = beschikbaar.filter((p) => p > basis);
  const peil = kiesPeriode(peilOpties.length ? peilOpties : basis ? [basis] : [], invoer.peilperiode) ?? '';
  const basisWaarde = basis ? waardeOp(reeks, invoer.soort, basis) : undefined;
  const peilWaarde = peil ? waardeOp(reeks, invoer.soort, peil) : undefined;
  const factor = genoeg ? (factorTussen([{ naam: reeks.kort, weging: 1, reeks }], invoer.soort, basis, peil, 0, afr) ?? 1) : 1;
  const tarief = rondTarief(invoer.basistarief * factor, afr);
  const stijgingPct = invoer.basistarief > 0 ? (tarief / invoer.basistarief - 1) * 100 : (factor - 1) * 100;
  const voorlopig = genoeg && (isVoorlopig(reeks, basis) || isVoorlopig(reeks, peil));
  const toonUitkomst = ok && genoeg;
  const fd = factorDecimalen(afr);

  // Effectieve invoer in de URL, zodat de adresbalk altijd een deelbare link is.
  const effectief: IndexInvoer = genoeg ? { ...invoer, basisperiode: basis, peilperiode: peil } : invoer;
  const deelParams = indexInvoerNaarParams(effectief);
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const pro = useMemo(
    () => berekenPro(invoer, alleReeksen),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(invoer), alleReeksen],
  );

  // Rekenvoorbeeld om na te rekenen: de afgeronde indexcijfers en de factor zoals de tool ze gebruikt.
  const bU = basisWaarde !== undefined ? rondAf(basisWaarde, afr.indexDecimalen) : undefined;
  const pU = peilWaarde !== undefined ? rondAf(peilWaarde, afr.indexDecimalen) : undefined;
  const factorVoorbeeld = afr.factorDecimalen === null ? getal(factor, 6) : getal(factor, afr.factorDecimalen);
  const cijferTekst = (v: number) => (reeks.eenheid === 'index' ? getal(v, afr.indexDecimalen ?? 2) : getal(v, afr.indexDecimalen ?? 3));
  const narekenen =
    bU !== undefined && pU !== undefined
      ? `${cijferTekst(pU)} ÷ ${cijferTekst(bU)} = ${factorVoorbeeld}${afr.factorDecimalen === null ? ' (6 decimalen getoond)' : ''}; ${euro(
          invoer.basistarief,
          2,
        )} × ${factorVoorbeeld} = ${euro(tarief, 2)}${afr.tariefCenten ? ' (op centen)' : ''}`
      : '';

  const invoerRegels = [
    { label: 'Soort indexcijfers', waarde: invoer.soort === 'jaar' ? 'Jaarcijfers (jaargemiddelde CBS)' : 'Maandcijfers' },
    { label: 'Basistarief', waarde: `${euro(invoer.basistarief, 2)} per ton` },
    { label: 'Indexreeks', waarde: isEigen(reeks) ? `${reeks.naam}` : `${reeks.kort} (CBS ${reeks.tabelId}, ${reeks.basisjaar})` },
    { label: `Basisperiode ${basis ? periodeLabel(basis) : ''}`, waarde: toonWaarde(reeks, basisWaarde, afr) + voorlopigTekst(reeks, basis) },
    { label: `Peilperiode ${peil ? periodeLabel(peil) : ''}`, waarde: toonWaarde(reeks, peilWaarde, afr) + voorlopigTekst(reeks, peil) },
    { label: 'Afronding', waarde: afrondingTekst(afr) },
  ];

  const csvGratis = (): CsvCel[][] => [
    ['Indexcalculator', 'KplusV'],
    ['Versie tool', `${indexToolVersie.versie} (${indexToolVersie.datum})`],
    ['Bron indexcijfers', isEigen(reeks) ? 'eigen invoer van de gebruiker (geen CBS)' : `CBS StatLine, tabel ${reeks.tabelId}`],
    ['Bron-URL', isEigen(reeks) ? '' : reeks.bronUrl],
    ['Peildatum (opgehaald)', isEigen(reeks) ? '' : indexbron.peildatum],
    [],
    ['Invoer', 'Waarde'],
    ['Soort indexcijfers', invoer.soort === 'jaar' ? 'jaarcijfers' : 'maandcijfers'],
    ['Basistarief (euro per ton)', invoer.basistarief],
    ['Indexreeks', reeks.naam],
    ['Basisjaar reeks', reeks.basisjaar],
    ['Basisperiode', basis ? periodeLabel(basis) : ''],
    [`Indexcijfer basisperiode (${bronKort(reeks)})`, basisWaarde ?? null],
    ['Peilperiode', peil ? periodeLabel(peil) : ''],
    [`Indexcijfer peilperiode (${bronKort(reeks)})`, peilWaarde ?? null],
    ['Voorlopige cijfers gebruikt', voorlopig ? 'ja' : 'nee'],
    ['Afronding', afrondingTekst(afr)],
    [],
    ['Uitkomst', 'Waarde'],
    ['Indexfactor', toonUitkomst ? factor : null],
    ['Nieuw tarief (euro per ton)', toonUitkomst ? tarief : null],
    ['Stijging (%)', toonUitkomst ? stijgingPct : null],
    ['Narekenen', narekenen],
    ['Formule', FORMULE],
    ['CBS-uitleg indexeren', cbsIndexeringUitleg.url],
  ];

  const bronRegels: BronRegel[] = [
    ...indexreeksen.map(
      (r): BronRegel => ({
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
      }),
    ),
    {
      onderwerp: 'Rekenmethode en contractafspraken',
      status: 'officieel',
      waarde: 'nieuwe index ÷ oude index × 100 − 100 = prijsverandering',
      toelichting:
        'CBS beschrijft welke cijfers contracten gebruiken, de keuze tussen eerste en definitieve cijfers, maand- of jaarcijfers, weging over meerdere reeksen en voorbeeldclausules.',
      bron: cbsIndexeringUitleg.titel,
      url: cbsIndexeringUitleg.url,
      peildatum: cbsIndexeringUitleg.geraadpleegd,
    },
    {
      onderwerp: 'Eigen indexreeks',
      status: 'aanname',
      toelichting: 'Cijfers die u zelf invult, bijvoorbeeld een sectorindex uit uw contract. De tool controleert ze niet.',
    },
  ];

  const kernPro = isLid && !laden && pro.b;

  return (
    <div className="ta-tool" ref={toolRef}>
      <RapportKop titel="Indexcalculator" ondertitel={`CBS-indexcijfers, opgehaald op ${datum(indexbron.peildatum)} · ${VERSIE_TEKST}`} />
      <PaginaKop titel="Indexcalculator" badges={<Badge soort="pro">Gratis deel + Pro voor leden</Badge>}>
        Reken uit hoe een tarief meebeweegt met indexcijfers van het CBS: cao-lonen, consumentenprijzen, energie en diesel, of uw
        eigen reeks. Jaar- of maandcijfers, met de afronding uit uw contract.
      </PaginaKop>

      <Kern>
        {!ok ? (
          <OngeldigeInvoer velden={ongeldigeVelden} />
        ) : genoeg ? (
          <p className="ta-kern-zin">
            Een tarief van <strong>{euro(invoer.basistarief, 2)}</strong> in {periodeLabel(basis)} wordt <strong>{euro(tarief, 2)}</strong> in{' '}
            {periodeLabel(peil)} met de {reeks.kort}: <strong>{stijgingPct >= 0 ? '+' : ''}{procent(stijgingPct)}</strong>.
          </p>
        ) : (
          <p className="ta-kern-zin">Vul bij “Eigen indexreeks” minstens twee perioden in om te rekenen.</p>
        )}
        <ul>
          {kernPro && ok && (
            <li>
              Met uw weging (Pro): <strong>{euro(pro.b!.tarief, 2)}</strong> per ton in contractjaar {pro.b!.jaar}, met het indexcijfer van{' '}
              {periodeLabel(pro.b!.peilperiode)}
              {pro.b!.begrensd ? ', begrensd' : ''}. <a href="#pro-uitkomst">Naar de contractjaren</a>.
            </li>
          )}
          <li>
            {isEigen(reeks) ? (
              'Bron: uw eigen indexcijfers (geen CBS-cijfers)'
            ) : (
              <>
                Bron: CBS-tabel {reeks.tabelId} ({reeks.basisjaar}), opgehaald op {datum(indexbron.peildatum)}
              </>
            )}
            {voorlopig ? '. Let op: een van de cijfers is nog voorlopig' : ''}. Afronding: {afrondingTekst(afr)}.
          </li>
          {!kernPro && <li>Eigen weging over meerdere reeksen en een tarief per contractjaar: zie Pro voor leden.</li>}
          <li className="ta-versie">
            {VERSIE_TEKST}. <a href="#versie">Wat is er veranderd</a>
          </li>
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
                hint="Tarief bij het indexcijfer van de basisperiode. 100 is een voorbeeld."
              />
              <KeuzeVeld
                label="Indexreeks"
                waarde={reeks.id}
                opties={[
                  ...indexreeksen.map((r) => ({ waarde: r.id, label: `${r.kort} (CBS ${r.tabelId})` })),
                  { waarde: EIGEN_REEKS_ID, label: `${invoer.eigenNaam.trim() || 'Eigen reeks'} (zelf invullen)` },
                ]}
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
              <EigenReeksInvoer
                naam={invoer.eigenNaam}
                tekst={invoer.eigenTekst}
                fouten={eigen.fouten}
                aantal={Object.keys(eigen.waarden.jaren).length + Object.keys(eigen.waarden.maanden).length}
                open={isEigen(reeks)}
                onNaam={(n) => zet('eigenNaam', n)}
                onTekst={(t) => zet('eigenTekst', t)}
              />
              {genoeg ? (
                <>
                  <KeuzeVeld
                    label="Basisperiode"
                    waarde={basis}
                    opties={basisOpties.map((p) => ({ waarde: p, label: periodeLabel(p) + voorlopigTekst(reeks, p) }))}
                    onChange={(p) => zet('basisperiode', p)}
                    hint="Meestal de periode van inschrijving of het jaar voor de start."
                  />
                  <KeuzeVeld
                    label="Peilperiode"
                    waarde={peil}
                    opties={(peilOpties.length ? peilOpties : [basis]).map((p) => ({ waarde: p, label: periodeLabel(p) + voorlopigTekst(reeks, p) }))}
                    onChange={(p) => zet('peilperiode', p)}
                    hint="Bepaalt het nieuwe tarief. Ligt altijd na de basisperiode: een indexatie rekent vooruit."
                  />
                </>
              ) : (
                <p className="notitie" role="status">
                  Uw eigen reeks heeft nog geen twee {invoer.soort === 'jaar' ? 'jaren' : 'maanden'}. Vul ze in bij “Eigen indexreeks”
                  {invoer.soort === 'jaar' ? ' of kies maandcijfers' : ' of kies jaarcijfers'}.
                </p>
              )}
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
            label={
              isEigen(reeks) ? (
                <BronStatusLabel status="aanname" />
              ) : (
                <Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>
              )
            }
            formule={FORMULE}
            toelichting={
              isEigen(reeks) ? (
                <>U rekent met eigen indexcijfers. Afronding: {afrondingTekst(afr)}.</>
              ) : (
                <>
                  Bron: CBS StatLine, tabel{' '}
                  <a href={reeks.bronUrl} target="_blank" rel="noopener noreferrer">
                    {reeks.tabelId}
                  </a>
                  , opgehaald op {datum(indexbron.peildatum)}. Het basisjaar van de reeks ({reeks.basisjaar}) maakt voor de
                  uitkomst niet uit: alleen de verhouding telt. Afronding: {afrondingTekst(afr)}.
                </>
              )
            }
            invoer={invoerRegels}
          >
            <div className="stapel">
              <div className="tegels">
                <Tegel
                  label={peil ? `Tarief peilperiode ${periodeLabel(peil)}` : 'Tarief'}
                  waarde={toonUitkomst ? euro(tarief, 2) : '–'}
                  toelichting={toonUitkomst ? 'per ton' : 'geen uitkomst: zie de melding'}
                  hero
                />
                <Tegel
                  label="Indexfactor"
                  waarde={toonUitkomst ? getal(factor, fd) : '–'}
                  toelichting={genoeg ? `${periodeLabel(peil)} t.o.v. ${periodeLabel(basis)}` : undefined}
                />
                <Tegel
                  label="Stijging"
                  waarde={toonUitkomst ? procent(stijgingPct) : '–'}
                  toelichting={toonUitkomst ? `${euro(tarief - invoer.basistarief, 2)} per ton` : undefined}
                />
              </div>
              {toonUitkomst && narekenen && (
                <div className="ta-narekenen">
                  <p className="ta-narekenen-kop">Zelf narekenen</p>
                  <p>
                    <span className="ta-som">{narekenen}</span>
                  </p>
                  <p className="klein muted">
                    Indexcijfers: {toonWaarde(reeks, basisWaarde, afr)} ({periodeLabel(basis)}) en {toonWaarde(reeks, peilWaarde, afr)} (
                    {periodeLabel(peil)})
                    {isEigen(reeks) ? (
                      ', uit uw eigen invoer.'
                    ) : (
                      <>
                        . Controleer ze in{' '}
                        <a href={reeks.bronUrl} target="_blank" rel="noopener noreferrer">
                          CBS-tabel {reeks.tabelId}
                        </a>
                        . Zelfde rekenmethode als het CBS: nieuwe index ÷ oude index × 100 − 100 = {procent((factor - 1) * 100)} (
                        <a href={cbsIndexeringUitleg.url} target="_blank" rel="noopener noreferrer">
                          CBS over indexeren in contracten
                        </a>
                        ).
                      </>
                    )}
                  </p>
                </div>
              )}
              {ok ? (
                <ExportKnoppen
                  naam="Indexcalculator"
                  csvRijen={csvGratis}
                  params={deelParams}
                  pad={PAD}
                  linkInklappen
                  toelichting="De CSV bevat invoer, indexcijfers, afronding, bron, uitkomst en de som om na te rekenen. De link bewaart al uw invoer, ook de Pro-instellingen en een eigen reeks."
                />
              ) : (
                <p className="klein muted">CSV en deellink staan weer klaar zodra de invoer klopt.</p>
              )}
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
          Weeg loon, prijzen, energie, diesel en uw eigen reeks zoals in uw contract en zie het tarief voor elk contractjaar, met
          plafond, bodem en afronding.
        </p>
        {laden ? (
          <p className="notitie info" role="status" style={{ minHeight: 120 }}>
            Ledentoegang controleren…
          </p>
        ) : (
          <Vergrendeld
            titel="Indexcalculator Pro"
            ledenKrijgen={[
              'Eigen weging over meerdere CBS-reeksen en een eigen reeks, met een vast deel dat niet meebeweegt',
              'Tarief per contractjaar met peilmaand of jaargemiddelde, in tabel en grafiek',
              'Twee contractjaren vergelijken en alles exporteren als CSV, met de indexcijfers per reeks',
              'Rapport maken met invoer, bronnen, formule en uitkomst',
            ]}
          >
            <IndexPro invoer={invoer} zet={zet} deelParams={deelParams} pro={pro} reeksen={alleReeksen} ok={ok} />
          </Vergrendeld>
        )}
      </section>

      <section className="ta-achtergrond" aria-labelledby="ta-achtergrond-kop">
        <h2 className="sectie" id="ta-achtergrond-kop">
          Achtergrond
        </h2>
        <Inklapbaar id="reeksen" titel="Waarom deze reeksen" sub={`${indexreeksen.length} CBS-reeksen en een eigen reeks`}>
          <p>
            Indexeringsclausules in afvalcontracten volgen meestal de kostenopbouw van de dienst. Loon, energie en brandstof zijn de
            grootste posten, aangevuld met de algemene prijsontwikkeling. Het CBS noemt cao-loonindex, consumentenprijsindex en
            producentenprijsindex als de cijfers die contracten het meest gebruiken (
            <a href={cbsIndexeringUitleg.url} target="_blank" rel="noopener noreferrer">
              CBS over indexeren in contracten
            </a>
            ).
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
            <li>
              <strong>Eigen reeks.</strong> Staat uw reeks er niet bij, zoals een dienstenprijsindex of een sectorindex, vul de
              cijfers dan zelf in. Die tellen als eigen invoer, niet als CBS-cijfer.
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
              van de gekozen peilmaand. De grote tegel in Pro toont altijd het tarief van een contractjaar, zoals in de tabel.
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
        <Inklapbaar id="versie" titel="Versie en wijzigingen" sub={VERSIE_TEKST}>
          <ul className="opsomming">
            {indexToolVersie.wijzigingen.map((w) => (
              <li key={w.versie}>
                <strong>
                  Versie {w.versie} ({datum(w.datum)}).
                </strong>{' '}
                {w.tekst}
              </li>
            ))}
          </ul>
        </Inklapbaar>
      </section>
      <RapportVoet tekst={`Indexcijfers: CBS StatLine (CC BY 4.0), opgehaald op ${datum(indexbron.peildatum)} · ${VERSIE_TEKST}`} />
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

interface EigenReeksProps {
  naam: string;
  tekst: string;
  fouten: string[];
  aantal: number;
  open: boolean;
  onNaam: (n: string) => void;
  onTekst: (t: string) => void;
}

/** Eigen indexcijfers invullen of plakken uit een spreadsheet. Ingeklapt tenzij de eigen reeks gekozen is. */
function EigenReeksInvoer({ naam, tekst, fouten, aantal, open, onNaam, onTekst }: EigenReeksProps) {
  const id = useId();
  return (
    <details className="ta-afronding" id="eigen-reeks" open={open || undefined}>
      <summary>
        <span className="veld-label">Eigen indexreeks</span>{' '}
        <span className="ta-inklap-sub">{aantal > 0 ? `${aantal} perioden ingevuld` : 'niet ingevuld'}</span>
      </summary>
      <div className="velden">
        <div className="veld">
          <label htmlFor={`${id}-naam`}>Naam van de reeks</label>
          <div className="invoer">
            <input id={`${id}-naam`} type="text" maxLength={MAX_EIGEN_NAAM} value={naam} placeholder="Bijv. DPI reiniging" onChange={(e) => onNaam(e.target.value)} />
          </div>
        </div>
        <div className="veld">
          <label htmlFor={`${id}-cijfers`}>Indexcijfers per periode</label>
          <div className="invoer">
            <textarea
              id={`${id}-cijfers`}
              rows={4}
              value={tekst}
              spellCheck={false}
              placeholder={'2024 102,4\n2025 105,1'}
              aria-describedby={`${id}-hint${fouten.length ? ` ${id}-fout` : ''}`}
              onChange={(e) => onTekst(e.target.value)}
            />
          </div>
          <span className="hint" id={`${id}-hint`}>
            Eén periode per regel met het cijfer erachter: 2024 102,4 of 2024-09 103,1. Plakken uit een spreadsheet (twee kolommen)
            werkt ook. Dit zijn uw eigen cijfers, geen CBS-cijfers. Kies daarna “{naam.trim() || 'Eigen reeks'} (zelf invullen)” bij
            Indexreeks of geef de reeks een weging in Pro.
          </span>
          {fouten.length > 0 && (
            <span className="foutmelding" id={`${id}-fout`}>
              Niet gelezen en overgeslagen: {fouten.slice(0, 3).join(', ')}
              {fouten.length > 3 ? ` en ${fouten.length - 3} andere` : ''}.
            </span>
          )}
        </div>
      </div>
    </details>
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
  pro: ProUitkomst;
  reeksen: CbsReeks[];
  /** Klopt alle invoer? Anders geen bedragen tonen. */
  ok: boolean;
}

function IndexPro({ invoer, zet, deelParams, pro, reeksen, ok }: ProProps) {
  const { soort, afronding: afr } = invoer;
  const { gebruikt, perioden, basis, rijen, cpiPerJaar, a, b, verschil, grenzen, grensTekst, eersteJaar, laatsteJaar } = pro;
  const grafiekRijen = rijen.filter((r) => cpiPerJaar.has(r.jaar));
  const voorlopigGebruikt = rijen.some((r) => gebruikt.some((g) => isVoorlopig(g, r.peilperiode)));
  const fd = factorDecimalen(afr);
  const toon = (s: string) => (ok ? s : '–');

  const csvPro = (): CsvCel[][] => [
    ['Indexcalculator Pro', 'KplusV'],
    ['Versie tool', `${indexToolVersie.versie} (${indexToolVersie.datum})`],
    ['Bron indexcijfers', gebruikt.some(isEigen) ? 'CBS StatLine (CC BY 4.0) en eigen invoer van de gebruiker' : 'CBS StatLine (CC BY 4.0)'],
    ['Peildatum (opgehaald)', indexbron.peildatum],
    [],
    ['Invoer', 'Waarde'],
    ['Soort indexcijfers', soort === 'jaar' ? 'jaarcijfers' : 'maandcijfers'],
    ['Basistarief (euro per ton)', invoer.basistarief],
    ['Basisperiode', basis ? periodeLabel(basis) : ''],
    ['Vast deel (%)', invoer.vastPct],
    ...reeksen.map((r): CsvCel[] => [`Weging ${r.kort} (%) [${bronKort(r)}]`, invoer.wegingPct[r.id] ?? 0]),
    ['Eerste contractjaar', eersteJaar],
    ['Laatste contractjaar', laatsteJaar],
    ['Indexcijfer uit', invoer.verschuiving === 1 ? 'voorgaand jaar' : 'zelfde jaar'],
    ...(soort === 'maand' ? [['Peilmaand', MAANDNAMEN[invoer.peilmaand - 1]] as CsvCel[]] : []),
    ['Plafond per indexatie (%)', invoer.plafondPct ?? 'geen'],
    ['Negatieve indexatie', invoer.geenDaling ? 'niet toegepast' : 'toegepast'],
    ['Afronding', afrondingTekst(afr)],
    [],
    ['Bronnen en indexcijfers basisperiode', 'Tabel', 'Bron-URL', `Indexcijfer ${basis ? periodeLabel(basis) : ''}`],
    ...gebruikt.map((g): CsvCel[] => [
      g.kort,
      isEigen(g) ? 'eigen invoer (geen CBS)' : `${g.tabelId} ${g.tabelTitel}`,
      g.bronUrl,
      basis ? (waardeOp(g, soort, basis) ?? null) : null,
    ]),
    [],
    [
      'Contractjaar',
      'Peilperiode',
      ...gebruikt.map((g): CsvCel => `Indexcijfer ${g.kort} peilperiode (${bronKort(g)})`),
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
    ...(verschil && a && b
      ? ([
          ['Getoond contractjaar', b.jaar],
          ['Tarief getoond contractjaar (euro per ton)', b.tarief],
          ['Vergeleken met contractjaar', a.jaar],
          ['Verschil tarief (euro per ton)', verschil.verschil],
          ['Verschil tarief (%)', verschil.verschilPct],
          [],
        ] as CsvCel[][])
      : []),
    ['Formule', FORMULE_PRO],
    ...(grenzen ? [['Begrenzing', FORMULE_GRENS] as CsvCel[]] : []),
  ];

  const jaarOpties = rijen.map((r) => ({ waarde: r.jaar, label: `${r.jaar} (peilperiode ${periodeLabel(r.peilperiode)})` }));

  return (
    <div className="stapel">
      <div className="raster raster-2">
        <Kaart titel="Eigen weging" kopNiveau={3} className="invoerkaart" sub="Neem de weging uit uw contract over. De standaard is een voorbeeld, geen norm.">
          <div className="velden ta-weging">
            {reeksen.map((r) => (
              <GetalVeld
                key={r.id}
                label={`${r.kort} (${isEigen(r) ? 'eigen' : r.tabelId})`}
                eenheid="%"
                max={100}
                waarde={invoer.wegingPct[r.id] ?? 0}
                onChange={(n) => zet('wegingPct', { ...invoer.wegingPct, [r.id]: n })}
                hint={isEigen(r) && periodenVan(r, soort).length === 0 ? 'Vul eerst de cijfers in bij “Eigen indexreeks” hierboven.' : undefined}
              />
            ))}
            <GetalVeld label="Vast deel, niet geïndexeerd" eenheid="%" max={100} waarde={invoer.vastPct} onChange={(n) => zet('vastPct', n)} />
            <p className={`notitie ${pro.klopt ? 'succes' : ''}`} role="status">
              {pro.klopt ? '✓ ' : '⚠ '}Samen {procent(pro.somPct, 0)}
              {pro.klopt ? '.' : '. Weging en vast deel moeten samen 100 % zijn. De uitkomst rekent nu met deze weging.'}
            </p>
            <p className="klein muted" style={{ margin: 0 }}>
              Vast deel: het deel van het tarief dat gelijk blijft, bijvoorbeeld afschrijving van een installatie.
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
            <div className="velden-2 ta-jaren">
              <GetalVeld label="Eerste contractjaar" eenheid="jaar" min={2000} max={2100} waarde={invoer.eersteJaar} onChange={(n) => zet('eersteJaar', Math.round(n))} />
              <GetalVeld label="Laatste contractjaar" eenheid="jaar" min={2000} max={2100} waarde={invoer.laatsteJaar} onChange={(n) => zet('laatsteJaar', Math.round(n))} />
            </div>
            <KeuzeVeld
              label="Indexcijfer uit"
              waarde={invoer.verschuiving}
              opties={[
                { waarde: 1, label: 'voorgaand jaar (per 1 januari)' },
                { waarde: 0, label: 'zelfde jaar (nacalculatie)' },
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
              <p className="klein muted" style={{ margin: 0 }}>
                Met jaarcijfers rekent de tool met het jaargemiddelde dat CBS publiceert.
              </p>
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

      <div id="pro-uitkomst">
        <Uitkomst
          inklapbaar
          titel="Tarief per contractjaar"
          label={<Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>}
          formule={`${FORMULE_PRO}\npeilperiode contractjaar J = ${soort === 'jaar' ? 'jaar' : `${MAANDNAMEN[invoer.peilmaand - 1]} van jaar`} J${
            invoer.verschuiving ? ' − 1' : ''
          }${grenzen ? `\n${FORMULE_GRENS}` : ''}\nafronding: ${afrondingTekst(afr)}`}
          toelichting={
            pro.ontbrekend > 0
              ? `${pro.ontbrekend} contractja${pro.ontbrekend === 1 ? 'ar ontbreekt' : 'ren ontbreken'}: voor de peilperiode is nog geen cijfer voor alle gekozen reeksen.`
              : undefined
          }
          invoer={[
            { label: 'Basistarief', waarde: `${euro(invoer.basistarief, 2)} per ton` },
            { label: 'Basisperiode', waarde: basis ? periodeLabel(basis) : '–' },
            ...pro.gewogen.map((g) => ({
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
            {jaarOpties.length > 1 && a && b && (
              <div className="velden-2 invoerkaart">
                <KeuzeVeld label="Tarief tonen voor contractjaar" waarde={b.jaar} opties={jaarOpties} onChange={(j) => zet('vergelijk', [a.jaar, j])} />
                <KeuzeVeld label="Vergelijken met contractjaar" waarde={a.jaar} opties={jaarOpties} onChange={(j) => zet('vergelijk', [j, b.jaar])} />
              </div>
            )}
            <div className="tegels">
              <Tegel
                label={b ? `Tarief contractjaar ${b.jaar}` : 'Tarief per contractjaar'}
                waarde={b ? toon(euro(b.tarief, 2)) : '–'}
                toelichting={b ? `per ton · indexcijfer ${periodeLabel(b.peilperiode)}${b.begrensd ? ' · begrensd' : ''}` : 'geen contractjaar met cijfers'}
                hero
              />
              {a && b && a.jaar !== b.jaar && (
                <Tegel label={`Tarief contractjaar ${a.jaar}`} waarde={toon(euro(a.tarief, 2))} toelichting={`per ton · indexcijfer ${periodeLabel(a.peilperiode)}`} />
              )}
              {verschil && a && b && a.jaar !== b.jaar && (
                <Tegel label={`Verschil ${a.jaar} → ${b.jaar}`} waarde={toon(procent(verschil.verschilPct))} toelichting={toon(`${euro(verschil.verschil, 2)} per ton`)} />
              )}
            </div>
            {b && ok && <p className="klein" style={{ margin: 0 }}>{contractjaarUitleg(b, invoer, basis, fd)}</p>}
            {voorlopigGebruikt && (
              <p className="notitie" role="status">
                Een of meer peilperioden gebruiken voorlopige CBS-cijfers. Die kunnen nog wijzigen.
              </p>
            )}
            <div className="tabel-container ta-kaarttabel-houder" tabIndex={0} role="region" aria-label="Tabel tarief per contractjaar">
              <table className="ta-kaarttabel">
                <caption>
                  Tarief per ton per contractjaar, met de peilperiode van het indexcijfer en de indexfactor bij het jaar. Bron indexcijfers: CBS, opgehaald op{' '}
                  {datum(indexbron.peildatum)}
                  {gebruikt.some(isEigen) ? ', en uw eigen reeks' : ''}.
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
                    <tr key={r.jaar} className={b && r.jaar === b.jaar ? 'ta-gekozen' : undefined}>
                      <th scope="row" style={{ fontWeight: 600 }}>
                        {r.jaar}
                        {b && r.jaar === b.jaar && <span className="ta-tag">in tegel</span>}
                        <span className="ta-onder">
                          indexcijfer {periodeLabel(r.peilperiode)}
                          {gebruikt.some((g) => isVoorlopig(g, r.peilperiode)) ? ' (voorlopig)' : ''} · factor {getal(r.factor, fd)}
                        </span>
                      </th>
                      <td className="num" data-label="Tarief per ton">
                        {toon(euro(r.tarief, 2))}
                      </td>
                      <td className="num" data-label="Stijging">
                        {r.stijgingPct === null ? '–' : toon(procent(r.stijgingPct))}
                        {r.begrensd && <span className="ta-onder">begrensd, zonder: {euro(r.tariefZonderGrens, 2)}</span>}
                      </td>
                      <td className="num" data-label="Alleen CPI">
                        {cpiPerJaar.has(r.jaar) ? toon(euro(cpiPerJaar.get(r.jaar)!, 2)) : '–'}
                      </td>
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
            {grafiekRijen.length > 1 && ok && (
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
            {ok && (
              <ExportKnoppen
                naam="Indexcalculator Pro"
                csvRijen={csvPro}
                params={deelParams}
                pad={PAD}
                linkInklappen
                toelichting="De CSV bevat per contractjaar de indexcijfers van elke gebruikte reeks, de factor, het tarief en de afronding."
              />
            )}
            <RapportKnop />
          </div>
        </Uitkomst>
      </div>
    </div>
  );
}
