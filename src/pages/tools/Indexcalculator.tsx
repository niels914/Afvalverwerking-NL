import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { Bronnenlijst, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { indexbron, indexreeksen, indexStandaardInvoer, isVoorlopig, reeksMetId, type CbsReeks } from '../../data/indexreeksen';
import {
  factorTussen,
  gemeenschappelijkePerioden,
  indexInvoerNaarParams,
  indexInvoerUitParams,
  kiesPeriode,
  periodeBereik,
  periodeLabel,
  periodenVan,
  tariefPerContractjaar,
  vergelijkJaren,
  waardeOp,
  type GewogenReeks,
  type IndexInvoer,
  type Periode,
  type Periodesoort,
} from '../../lib/calc/indexering';
import { datum, euro, getal, procent } from '../../lib/format';

const PAD = '/tools/indexcalculator';
const FORMULE = 'nieuw tarief = basistarief × indexcijfer peilperiode / indexcijfer basisperiode';
const FORMULE_PRO = 'nieuw tarief = basistarief × (vast deel + Σ weging_i × indexcijfer_i,peil / indexcijfer_i,basis)';
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** Indexcijfer of prijs leesbaar maken (pompprijs is euro per liter, geen index). */
function toonWaarde(r: CbsReeks, v: number | undefined): string {
  if (v === undefined) return '–';
  return r.eenheid === 'index' ? getal(v, 2) : `${euro(v, 3)} per liter`;
}

function voorlopigTekst(r: CbsReeks, ...perioden: Periode[]): string {
  return perioden.some((p) => isVoorlopig(r, p)) ? ' (voorlopig)' : '';
}

const geldigeIds = indexreeksen.map((r) => r.id);

export function Indexcalculator() {
  const [params, setParams] = useSearchParams();
  const [invoer, setInvoer] = useState<IndexInvoer>(() => indexInvoerUitParams(params, indexStandaardInvoer, geldigeIds));
  const zet = <K extends keyof IndexInvoer>(k: K, v: IndexInvoer[K]) => setInvoer((i) => ({ ...i, [k]: v }));

  // Gratis deel: één reeks.
  const reeks = reeksMetId(invoer.reeks) ?? indexreeksen[0];
  const beschikbaar = periodenVan(reeks, invoer.soort);
  const basis = kiesPeriode(beschikbaar.slice(0, -1).length ? beschikbaar.slice(0, -1) : beschikbaar, invoer.basisperiode)!;
  const peilOpties = beschikbaar.filter((p) => p > basis);
  const peil = kiesPeriode(peilOpties.length ? peilOpties : [basis], invoer.peilperiode)!;
  const basisWaarde = waardeOp(reeks, invoer.soort, basis);
  const peilWaarde = waardeOp(reeks, invoer.soort, peil);
  const factor = factorTussen([{ naam: reeks.kort, weging: 1, reeks }], invoer.soort, basis, peil) ?? 1;
  const tarief = invoer.basistarief * factor;
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
    { label: `Basisperiode ${periodeLabel(basis)}`, waarde: toonWaarde(reeks, basisWaarde) + voorlopigTekst(reeks, basis) },
    { label: `Peilperiode ${periodeLabel(peil)}`, waarde: toonWaarde(reeks, peilWaarde) + voorlopigTekst(reeks, peil) },
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
    ['Indexcijfer basisperiode', basisWaarde ?? null],
    ['Peilperiode', periodeLabel(peil)],
    ['Indexcijfer peilperiode', peilWaarde ?? null],
    ['Voorlopige cijfers gebruikt', voorlopig ? 'ja' : 'nee'],
    [],
    ['Uitkomst', 'Waarde'],
    ['Indexfactor', factor],
    ['Nieuw tarief (euro per ton)', tarief],
    ['Stijging (%)', (factor - 1) * 100],
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
    peildatum: indexbron.peildatum,
  }));

  return (
    <>
      <RapportKop titel="Indexcalculator" ondertitel={`CBS-indexcijfers, opgehaald op ${datum(indexbron.peildatum)}`} />
      <PaginaKop titel="Indexcalculator" badges={<ToegangBadge toegang="gratis+pro" />}>
        Reken uit hoe een tarief meebeweegt met indexcijfers van het CBS: cao-lonen, consumentenprijzen, energie en
        diesel. Kies jaar- of maandcijfers zoals in uw contract staat. Leden rekenen met een eigen weging en zien het
        tarief per contractjaar.
      </PaginaKop>

      <h2 className="sectie" style={{ marginBottom: 12 }}>
        Gratis: indexeren met één reeks
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <SoortKeuze soort={invoer.soort} onChange={(s) => zet('soort', s)} />
            <GetalVeld
              label="Basistarief"
              eenheid="€/ton"
              waarde={invoer.basistarief}
              onChange={(n) => zet('basistarief', n)}
              hint="Het tarief dat hoort bij het indexcijfer van de basisperiode. Voorbeeldwaarde: vul uw eigen tarief in."
            />
            <KeuzeVeld
              label="Indexreeks"
              waarde={reeks.id}
              opties={indexreeksen.map((r) => ({ waarde: r.id, label: `${r.kort} (CBS ${r.tabelId})` }))}
              onChange={(id) => zet('reeks', id)}
              hint={reeks.gebruik}
            />
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
              hint="De periode waarmee u het nieuwe tarief bepaalt."
            />
            {voorlopig && (
              <p className="notitie" role="status">
                Let op: CBS noemt een van deze cijfers voorlopig. Het kan nog wijzigen. Veel contracten rekenen daarom met
                het eerste gepubliceerde cijfer of wachten op het definitieve cijfer.
              </p>
            )}
          </div>
        </Kaart>
        <Uitkomst
          label={<Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>}
          formule={FORMULE}
          toelichting={
            <>
              Bron: CBS StatLine, tabel{' '}
              <a href={reeks.bronUrl} target="_blank" rel="noopener noreferrer">
                {reeks.tabelId}
              </a>
              , opgehaald op {datum(indexbron.peildatum)}. Het basisjaar van de reeks ({reeks.basisjaar}) maakt voor de uitkomst
              niet uit: alleen de verhouding telt.
            </>
          }
          invoer={invoerRegels}
        >
          <div className="stapel">
            <div className="tegels">
              <Tegel label={`Tarief ${periodeLabel(peil)}`} waarde={euro(tarief, 2)} toelichting="per ton" hero />
              <Tegel label="Indexfactor" waarde={getal(factor, 4)} toelichting={`${periodeLabel(peil)} t.o.v. ${periodeLabel(basis)}`} />
              <Tegel label="Stijging" waarde={procent((factor - 1) * 100)} toelichting={`${euro(tarief - invoer.basistarief, 2)} per ton`} />
            </div>
            <ExportKnoppen
              naam="Indexcalculator"
              csvRijen={csvGratis}
              params={deelParams}
              pad={PAD}
              toelichting="De CSV bevat invoer, indexcijfers, bron en uitkomst. De link bewaart al uw invoer, ook de Pro-instellingen."
            />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld
        titel="Indexcalculator Pro"
        ledenKrijgen={[
          'Eigen weging over meerdere CBS-reeksen, met een vast deel dat niet meebeweegt',
          'Tarief per contractjaar met peilmaand of jaargemiddelde, in tabel en grafiek',
          'Twee contractjaren vergelijken en alles exporteren als CSV',
          'Rapport maken met invoer, bronnen, formule en uitkomst',
        ]}
      >
        <IndexPro invoer={invoer} zet={zet} deelParams={deelParams} />
      </Vergrendeld>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Over de reeksen
      </h2>
      <div className="raster raster-2">
        <Kaart titel="Waarom deze reeksen" className="lees">
          <p>
            Indexeringsclausules in afvalcontracten volgen meestal de kostenopbouw van de dienst. Loon, energie en
            brandstof zijn de grootste posten, aangevuld met de algemene prijsontwikkeling.
          </p>
          <ul className="opsomming">
            <li>
              <strong>Cao-lonen per uur inclusief bijzondere beloningen</strong> voor de bedrijfstak waterbedrijven en
              afvalbeheer (SBI E). Voor inzamelcontracten ook vervoer en opslag (SBI H). Het totaal van alle bedrijfstakken
              is een alternatief als het contract geen bedrijfstak noemt.
            </li>
            <li>
              <strong>Consumentenprijsindex (CPI), alle bestedingen.</strong> De standaardreeks voor algemene
              prijsontwikkeling.
            </li>
            <li>
              <strong>Producentenprijsindex energie</strong> (elektriciteit, gas, stoom en warmte, afzet binnenland) voor
              de energiekosten van installaties.
            </li>
            <li>
              <strong>Pompprijs diesel</strong> voor brandstof van inzamelvoertuigen. Dit is een prijs in euro per liter,
              geen index. De berekening werkt hetzelfde, want alleen de verhouding telt.
            </li>
          </ul>
          <p className="klein muted">
            Niet opgenomen: de producentenprijsindex voor gasolie. CBS publiceert die reeks met veel lege maanden, waardoor een
            indexatie niet betrouwbaar na te rekenen is.
          </p>
        </Kaart>
        <Bronnenlijst
          regels={bronRegels}
          sub={
            <>
              Opgehaald op {datum(indexbron.peildatum)} via de CBS Open Data API. {indexbron.licentie}.
            </>
          }
        />
      </div>
      <RapportVoet tekst={`Indexcijfers: CBS StatLine (CC BY 4.0), opgehaald op ${datum(indexbron.peildatum)}`} />
    </>
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

interface ProProps {
  invoer: IndexInvoer;
  zet: <K extends keyof IndexInvoer>(k: K, v: IndexInvoer[K]) => void;
  deelParams: URLSearchParams;
}

function IndexPro({ invoer, zet, deelParams }: ProProps) {
  const { soort } = invoer;
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
  const factor = basis && peil ? factorTussen(gewogen, soort, basis, peil, vast) : undefined;

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
  };
  const rijen = useMemo(
    () => (basis && gewogen.length ? tariefPerContractjaar({ ...contract, reeksen: gewogen }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contract), JSON.stringify(invoer.wegingPct)],
  );
  const cpi = reeksMetId('cpi')!;
  const cpiBasis = kiesPeriode(periodenVan(cpi, soort), basis);
  const alleenCpi = cpiBasis
    ? tariefPerContractjaar({ ...contract, basisperiode: cpiBasis, vastDeel: 0, reeksen: [{ naam: 'CPI', weging: 1, reeks: cpi }] })
    : [];
  const cpiPerJaar = new Map(alleenCpi.map((r) => [r.jaar, r.tarief]));
  const grafiekRijen = rijen.filter((r) => cpiPerJaar.has(r.jaar));

  const [jaarA, setJaarA] = useState<number | null>(null);
  const [jaarB, setJaarB] = useState<number | null>(null);
  const a = jaarA !== null && rijen.some((r) => r.jaar === jaarA) ? jaarA : rijen[0]?.jaar;
  const b = jaarB !== null && rijen.some((r) => r.jaar === jaarB) ? jaarB : rijen[rijen.length - 1]?.jaar;
  const vergelijking = a !== undefined && b !== undefined ? vergelijkJaren(rijen, a, b) : undefined;
  const ontbrekend = laatsteJaar - eersteJaar + 1 - rijen.length;
  const voorlopigGebruikt = rijen.some((r) => gebruikt.some((g) => isVoorlopig(g, r.peilperiode))) || (peil !== undefined && gebruikt.some((g) => isVoorlopig(g, peil)));

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
    [],
    ['Bronnen'],
    ...gebruikt.map((g): CsvCel[] => [g.kort, `${g.tabelId} ${g.tabelTitel}`, g.bronUrl]),
    [],
    ['Contractjaar', 'Peilperiode', 'Indexfactor', 'Tarief (euro per ton)', 'Stijging t.o.v. vorig jaar (%)', 'Ter vergelijking: alleen CPI (euro per ton)'],
    ...rijen.map((r): CsvCel[] => [r.jaar, periodeLabel(r.peilperiode), r.factor, r.tarief, r.stijgingPct, cpiPerJaar.get(r.jaar) ?? null]),
    [],
    ['Formule', FORMULE_PRO],
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
          </div>
        </Kaart>
      </div>

      <Uitkomst
        titel="Tarief per contractjaar"
        label={<Badge soort="status-gegund">CBS-cijfers, peildatum {datum(indexbron.peildatum)}</Badge>}
        formule={`${FORMULE_PRO}\npeilperiode contractjaar J = ${soort === 'jaar' ? 'jaar' : `${MAANDNAMEN[invoer.peilmaand - 1]} van jaar`} J${invoer.verschuiving ? ' − 1' : ''}`}
        toelichting={
          ontbrekend > 0
            ? `${ontbrekend} contractja${ontbrekend === 1 ? 'ar ontbreekt' : 'ren ontbreken'}: CBS heeft voor de peilperiode nog geen cijfer voor alle gekozen reeksen.`
            : undefined
        }
        invoer={[
          { label: 'Basistarief', waarde: `${euro(invoer.basistarief, 2)} per ton` },
          { label: 'Basisperiode', waarde: basis ? periodeLabel(basis) : '–' },
          ...gewogen.map((g) => ({ label: `Weging ${g.naam}`, waarde: procent(g.weging * 100, 0) })),
          { label: 'Vast deel', waarde: procent(invoer.vastPct, 0) },
          { label: 'Contractjaren', waarde: `${eersteJaar} t/m ${laatsteJaar}` },
        ]}
      >
        <div className="stapel">
          <div className="tegels">
            <Tegel
              label={peil ? `Gewogen tarief ${periodeLabel(peil)}` : 'Gewogen tarief'}
              waarde={factor !== undefined ? euro(invoer.basistarief * factor, 2) : '–'}
              toelichting={factor !== undefined && basis ? `factor ${getal(factor, 4)} t.o.v. ${periodeLabel(basis)}` : 'geen gemeenschappelijke cijfers'}
              hero
            />
            {vergelijking && a !== undefined && b !== undefined && (
              <Tegel
                label={`Verschil ${a} → ${b}`}
                waarde={procent(vergelijking.verschilPct)}
                toelichting={`${euro(vergelijking.verschil, 2)} per ton`}
              />
            )}
          </div>
          {voorlopigGebruikt && (
            <p className="notitie" role="status">
              Een of meer peilperioden gebruiken voorlopige CBS-cijfers. Die kunnen nog wijzigen.
            </p>
          )}
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
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel tarief per contractjaar">
            <table>
              <caption>
                Tarief per ton per contractjaar. Bron indexcijfers: CBS, opgehaald op {datum(indexbron.peildatum)}.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Contractjaar</th>
                  <th scope="col">Peilperiode</th>
                  <th scope="col" className="num">
                    Indexfactor
                  </th>
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
                    <th scope="row" style={{ fontWeight: 500 }}>
                      {r.jaar}
                    </th>
                    <td>
                      {periodeLabel(r.peilperiode)}
                      {gebruikt.some((g) => isVoorlopig(g, r.peilperiode)) ? ' (voorlopig)' : ''}
                    </td>
                    <td className="num">{getal(r.factor, 4)}</td>
                    <td className="num">{euro(r.tarief, 2)}</td>
                    <td className="num">{r.stijgingPct === null ? '–' : procent(r.stijgingPct)}</td>
                    <td className="num">{cpiPerJaar.has(r.jaar) ? euro(cpiPerJaar.get(r.jaar)!, 2) : '–'}</td>
                  </tr>
                ))}
                {rijen.length === 0 && (
                  <tr>
                    <td colSpan={6}>Geen contractjaren met cijfers. Controleer de jaren en de weging.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {jaarOpties.length > 1 && (
            <div className="velden-2 invoerkaart">
              <KeuzeVeld label="Vergelijk contractjaar" waarde={a!} opties={jaarOpties} onChange={setJaarA} />
              <KeuzeVeld label="met contractjaar" waarde={b!} opties={jaarOpties} onChange={setJaarB} />
            </div>
          )}
          <ExportKnoppen naam="Indexcalculator Pro" csvRijen={csvPro} params={deelParams} pad={PAD} />
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
