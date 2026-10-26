import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PercentageBalken } from '../../components/grafiek/Grafieken';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { RapportKop, RapportVoet } from '../../components/rekenen/Uitkomst';
import { BronVeld } from '../../components/rekenen/b/BronVeld';
import { PrintKnop, TekstDownloadKnop } from '../../components/rekenen/b/Knoppen';
import { Badge, Chips, GetalVeld, Kaart, KeuzeVeld, PaginaKop, ToegangBadge } from '../../components/ui';
import { aanbestedingStandaard } from '../../data/standaardwaarden';
import {
  aanbestedingBronnen,
  ambitieLabel,
  criteria,
  criteriaVoorStroom,
  drempelBron,
  drempels,
  PEILDATUM,
  soortLabel,
  soortMeervoud,
  soortUitleg,
  standaardSelectie,
  stromen,
  stroomLijst,
  themaLabel,
  type Criterium,
  type CriteriumSoort,
  type DrempelId,
  type StroomId,
  type Thema,
} from '../../data/tools-b-aanbesteding';
import {
  aanbestedingNaarParams,
  aanbestedingUitParams,
  checklist,
  drempelToets,
  geraamdeWaarde,
  normaliseerWeging,
  overzichtCsv,
  overzichtTekst,
  prijsSignaal,
  rondAfOp100,
  type AanbestedingInvoer,
  type Overzicht,
} from '../../lib/calc/aanbesteding';
import { datum, euro, getal, leesGetal, metEenheid, procent } from '../../lib/format';
import '../../components/rekenen/b/tools-b.css';

const PAD = '/tools/aanbestedingstool';
const stappen = ['Opdracht', 'Eisen en criteria', 'Weging', 'Overzicht'];
const soorten: CriteriumSoort[] = ['eis', 'gunning', 'contract', 'aandachtspunt'];
const criteriumPerId = Object.fromEntries(criteria.map((c) => [c.id, c])) as Record<string, Criterium>;

function standaardInvoer(): AanbestedingInvoer {
  const s = stromen[aanbestedingStandaard.stroom];
  return {
    stroom: aanbestedingStandaard.stroom,
    drempel: aanbestedingStandaard.drempel,
    volume: aanbestedingStandaard.volumeTon,
    tarief: s.tariefKental?.waarde ?? null,
    looptijd: aanbestedingStandaard.looptijdJaren,
    verlenging: aanbestedingStandaard.verlengingJaren,
    gekozen: aanbestedingStandaard.selectie,
    punten: { prijs: aanbestedingStandaard.prijsPunten },
  };
}

const opties = {
  stromen: stroomLijst.map((s) => s.id),
  drempels: Object.keys(drempels),
  geldig: (s: string) => (s in stromen ? criteriaVoorStroom(s as StroomId).map((c) => c.id) : []),
  selectie: (s: string) => (s in stromen ? standaardSelectie(s as StroomId) : []),
  tarief: (s: string) => (s in stromen ? (stromen[s as StroomId].tariefKental?.waarde ?? null) : null),
};

/** Zoekt op trefwoord in titel, omschrijving, toetsing en MVI-code. Alle woorden moeten voorkomen. */
function pastBijZoek(c: Criterium, zoek: string): boolean {
  const woorden = zoek.toLowerCase().split(/\s+/).filter(Boolean);
  if (woorden.length === 0) return true;
  const tekst = [c.titel, c.tekst, c.toetsing ?? '', c.mvi ? `mvi ${c.mvi.code}` : '', themaLabel[c.thema], soortLabel[c.soort]].join(' ').toLowerCase();
  return woorden.every((w) => tekst.includes(w));
}

function herkomst(c: Criterium): string {
  return c.mvi ? `MVI ${c.mvi.code} (${ambitieLabel[c.mvi.ambitie]})` : 'Voorbeeld KplusV, geen MVI-criterium';
}

export function Aanbestedingstool() {
  const [params, setParams] = useSearchParams();
  const [stap, setStap] = useState(() => {
    const n = Number(params.get('stap'));
    return Number.isInteger(n) && n >= 1 && n <= stappen.length ? n - 1 : 0;
  });
  const [i, setI] = useState<AanbestedingInvoer>(() => aanbestedingUitParams(params, standaardInvoer(), opties));
  const kopRef = useRef<HTMLHeadingElement>(null);
  const eersteRender = useRef(true);

  const stroom = stromen[i.stroom as StroomId];
  const drempel = drempels[i.drempel as DrempelId];
  const lijst = criteriaVoorStroom(stroom.id);
  const gekozen = lijst.filter((c) => i.gekozen.includes(c.id));
  const gunning = gekozen.filter((c) => c.soort === 'gunning');
  const puntenVan = (id: string) => i.punten[id] ?? criteriumPerId[id]?.punten ?? 10;
  const puntenRij = Object.fromEntries([['prijs', puntenVan('prijs')], ...gunning.map((c) => [c.id, puntenVan(c.id)])]) as Record<string, number>;
  const weging = normaliseerWeging(puntenRij);
  const wegingAfgerond = rondAfOp100(weging);
  const waarde = geraamdeWaarde({ volumePerJaar: i.volume, tarief: i.tarief, looptijdJaren: i.looptijd, verlengingJaren: i.verlenging });
  const toets = drempelToets(waarde, drempel.bedrag);
  const signaal = prijsSignaal(weging.prijs, gunning.length);
  const punten = checklist({
    stroomNaam: stroom.naam,
    looptijdJaren: i.looptijd,
    verlengingJaren: i.verlenging,
    europees: toets ? toets.europees : null,
    gekozen: i.gekozen,
    prijsPct: weging.prijs,
    aantalKwaliteit: gunning.length,
    dubbeleCo2Methode:
      (i.gekozen.includes('rest-co2-basis') && i.gekozen.includes('rest-co2-detail')) || (i.gekozen.includes('gft-co2-basis') && i.gekozen.includes('gft-co2-detail')),
  });

  // Alleen punten van gekozen gunningscriteria in de link.
  const deelInvoer: AanbestedingInvoer = { ...i, punten: puntenRij };
  const deelParams = aanbestedingNaarParams(deelInvoer);
  deelParams.set('stap', String(stap + 1));
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    kopRef.current?.focus();
  }, [stap]);

  function kiesStroom(id: StroomId) {
    setI((x) => ({
      ...x,
      stroom: id,
      tarief: stromen[id].tariefKental?.waarde ?? null,
      gekozen: standaardSelectie(id),
      punten: { prijs: x.punten.prijs ?? aanbestedingStandaard.prijsPunten },
    }));
  }
  function wissel(id: string) {
    setI((x) => ({ ...x, gekozen: x.gekozen.includes(id) ? x.gekozen.filter((g) => g !== id) : [...x.gekozen, id] }));
  }
  function zetPunten(id: string, n: number) {
    setI((x) => ({ ...x, punten: { ...x.punten, [id]: n } }));
  }

  const opdrachtRegels: [string, string][] = [
    ['Afvalstroom', stroom.naam],
    ['Aanbestedende dienst', drempel.kort],
    ['Volume', metEenheid(i.volume, stroom.volumeEenheid)],
    ['Geraamd tarief', i.tarief === null ? 'niet ingevuld' : `${euro(i.tarief, 2)} per ${stroom.tariefEenheid.replace('€/', '')}`],
    ['Looptijd', `${getal(i.looptijd)} jaar + ${getal(i.verlenging)} jaar verlengingsoptie`],
    ['Geraamde opdrachtwaarde', waarde === null ? 'niet te bepalen zonder tarief' : `${euro(waarde)} excl. btw`],
    ['Drempelbedrag', `${euro(drempel.bedrag)} excl. btw (${drempelBron.datum})`],
    ['Uitkomst drempeltoets', toets === null ? 'onbekend' : toets.europees ? 'Europees aanbesteden' : 'onder de Europese drempel'],
  ];

  const overzicht = (): Overzicht => ({
    titel: `Aanbesteding ${stroom.naam}: eisen, criteria en weging`,
    datum: new Date().toISOString().slice(0, 10),
    peildatum: PEILDATUM,
    opdracht: opdrachtRegels,
    weging: [
      { label: 'Prijs', pct: wegingAfgerond.prijs },
      ...gunning.map((c) => ({ label: c.titel, pct: wegingAfgerond[c.id] })),
    ],
    regels: soorten.flatMap((s) =>
      gekozen
        .filter((c) => c.soort === s)
        .map((c) => ({
          id: c.id,
          soort: soortLabel[c.soort],
          thema: themaLabel[c.thema],
          titel: c.titel,
          tekst: c.tekst,
          toetsing: c.toetsing,
          herkomst: herkomst(c),
          link: c.mvi?.bron.url,
          wegingPct: c.soort === 'gunning' ? wegingAfgerond[c.id] : undefined,
        })),
    ),
    checklist: punten,
    bronnen: [
      { titel: `${aanbestedingBronnen.mviAfval.uitgever}, ${aanbestedingBronnen.mviAfval.titel}`, url: aanbestedingBronnen.mviAfval.url },
      ...(stroom.id === 'inzameling' ? [{ titel: aanbestedingBronnen.mviVoertuigen.titel, url: aanbestedingBronnen.mviVoertuigen.url }] : []),
      { titel: `PIANOo, ${drempelBron.titel}`, url: drempelBron.url },
      { titel: `PIANOo, ${aanbestedingBronnen.gunning.titel}`, url: aanbestedingBronnen.gunning.url },
      { titel: `PIANOo, ${aanbestedingBronnen.bpkv.titel}`, url: aanbestedingBronnen.bpkv.url },
      ...(stroom.tariefKental ? stroom.tariefKental.bron.map((b) => ({ titel: `${b.uitgever}, ${b.titel}`, url: b.url })) : []),
    ],
  });

  const kop = (tekst: string) => (
    <h2 ref={kopRef} tabIndex={-1} className="kaart-kop" style={{ borderLeft: '4px solid var(--paars)', paddingLeft: 12 }}>
      {tekst}
    </h2>
  );

  const navigatie = (vorige?: string, volgende?: string) => (
    <div className="knoppen geen-print">
      {vorige && (
        <button type="button" onClick={() => setStap((s) => s - 1)}>
          Vorige: {vorige.toLowerCase()}
        </button>
      )}
      {volgende && (
        <button type="button" className="primair" onClick={() => setStap((s) => s + 1)}>
          Volgende: {volgende.toLowerCase()}
        </button>
      )}
    </div>
  );

  return (
    <>
      <RapportKop titel={`Aanbesteding ${stroom.naam}`} ondertitel={`Eisen, gunningscriteria en weging · bronnen MVI-criteriatool en PIANOo, peildatum ${datum(PEILDATUM)}`} />
      <PaginaKop
        titel="Aanbestedingstool"
        badges={
          <>
            <ToegangBadge toegang="gratis" />
            <span className="badge">In ontwikkeling met CE Delft, publiek beschikbaar</span>
          </>
        }
      >
        Stel per afvalstroom de eisen, gunningscriteria en contractbepalingen samen, verdeel de weging en download het
        overzicht voor uw bestek. Waar een officieel MVI-criterium bestaat, verwijst de tool ernaar. De tool vervangt
        geen juridisch advies.
      </PaginaKop>

      <div className="knoppen geen-print" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <ol className="stappen" aria-label="Stappen" style={{ margin: 0 }}>
          {stappen.map((s, n) => (
            <li key={s} aria-current={n === stap ? 'step' : undefined} data-klaar={n < stap}>
              <button type="button" className="ab-stapknop" onClick={() => setStap(n)} aria-label={`Stap ${n + 1}: ${s}${n === stap ? ' (huidige stap)' : ''}`}>
                {s}
              </button>
            </li>
          ))}
        </ol>
        <span className="ab-teller" role="status" aria-live="polite">
          {gekozen.length} {gekozen.length === 1 ? 'eis of criterium' : 'eisen en criteria'} gekozen
        </span>
      </div>

      {stap === 0 && (
        <div className="stapel">
          <Kaart className="invoerkaart">
            {kop('Stap 1 · Opdracht')}
            <div className="velden">
              <fieldset>
                <legend>Afvalstroom of productgroep</legend>
                <div className="ab-stromen">
                  {stroomLijst.map((s) => (
                    <label key={s.id} className="ab-stroom">
                      <input type="radio" name="ab-stroom" value={s.id} checked={i.stroom === s.id} onChange={() => kiesStroom(s.id)} />
                      <strong>{s.naam}</strong>
                      <span className="klein muted">
                        {s.omschrijving} {s.mvi ? 'Met MVI-criteria.' : 'Geen MVI-productgroep; voorbeelden van KplusV.'}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <KeuzeVeld
                label="Soort aanbestedende dienst"
                waarde={i.drempel}
                opties={(Object.keys(drempels) as DrempelId[]).map((d) => ({ waarde: d, label: drempels[d].label }))}
                onChange={(d) => setI((x) => ({ ...x, drempel: d }))}
                hint="Bepaalt het drempelbedrag voor Europees aanbesteden."
              />
              <div className="velden-2 ab-velden">
                <GetalVeld label="Volume" eenheid={stroom.volumeEenheid} waarde={i.volume} onChange={(n) => setI((x) => ({ ...x, volume: n }))} hint="Raming per jaar." />
                <BronVeld
                  label="Geraamd tarief"
                  eenheid={stroom.tariefEenheid}
                  waarde={i.tarief}
                  onChange={(n) => setI((x) => ({ ...x, tarief: n }))}
                  status={stroom.tariefKental ? 'kental' : 'aanname'}
                  bronwaarde={stroom.tariefKental?.waarde}
                  bronwaardeTekst={stroom.tariefKental ? euro(stroom.tariefKental.waarde, 2) : undefined}
                  bron={stroom.tariefKental ? { titel: 'Strategy& 2025 en Belastingdienst', url: stroom.tariefKental.bron[0].url } : undefined}
                  peildatum={stroom.tariefKental ? PEILDATUM : undefined}
                  toelichting={stroom.tariefKental ? stroom.tariefKental.toelichting : 'Geen openbare bron. Gebruik uw huidige contracttarief of een marktverkenning.'}
                />
                <GetalVeld label="Looptijd" eenheid="jaar" min={1} max={20} waarde={i.looptijd} onChange={(n) => setI((x) => ({ ...x, looptijd: n }))} />
                <GetalVeld
                  label="Verlengingsopties"
                  eenheid="jaar"
                  max={10}
                  waarde={i.verlenging}
                  onChange={(n) => setI((x) => ({ ...x, verlenging: n }))}
                  hint="Totaal aantal jaren dat u kunt verlengen. Telt mee in de geraamde waarde."
                />
              </div>
            </div>
            {navigatie(undefined, stappen[1])}
          </Kaart>
          <DrempelKaart waarde={waarde} drempelBedrag={drempel.bedrag} drempelLabel={drempel.kort} />
        </div>
      )}

      {stap === 1 && (
        <Kaart>
          {kop('Stap 2 · Eisen en criteria')}
          <CriteriaKiezen lijst={lijst} gekozen={i.gekozen} wissel={wissel} stroom={stroom.id} zetSelectie={(sel) => setI((x) => ({ ...x, gekozen: sel }))} />
          {navigatie(stappen[0], stappen[2])}
        </Kaart>
      )}

      {stap === 2 && (
        <div className="raster raster-tool">
          <Kaart className="invoerkaart">
            {kop('Stap 3 · Weging')}
            <p className="klein muted">
              Geef prijs en elk gekozen gunningscriterium punten (0–100). De tool rekent dat om naar een weging van samen 100 %.
              Maak de weging vooraf bekend in de aanbestedingsstukken.
            </p>
            <div className="ab-weging">
              <WegingRij label="Prijs" punten={puntenVan('prijs')} pct={wegingAfgerond.prijs} onChange={(n) => zetPunten('prijs', n)} />
              {gunning.map((c) => (
                <WegingRij key={c.id} label={c.titel} punten={puntenVan(c.id)} pct={wegingAfgerond[c.id]} onChange={(n) => zetPunten(c.id, n)} />
              ))}
            </div>
            {gunning.length === 0 && (
              <p className="notitie" role="status">
                U hebt geen gunningscriteria gekozen naast prijs. Ga terug naar stap 2 om kwaliteitscriteria toe te voegen, of
                gun op laagste prijs en motiveer die keuze.
              </p>
            )}
            {navigatie(stappen[1], stappen[3])}
          </Kaart>
          <Kaart titel="Verdeling" kopNiveau={3}>
            <div className="ab-balken">
              <PercentageBalken items={[{ label: 'Prijs', pct: wegingAfgerond.prijs }, ...gunning.map((c) => ({ label: c.titel, pct: wegingAfgerond[c.id] }))]} />
            </div>
            <PrijsSignaal signaal={signaal} />
            <p className="klein muted">
              Meer over het kiezen en wegen van gunningscriteria:{' '}
              <a href={aanbestedingBronnen.gunning.url} target="_blank" rel="noopener noreferrer">
                PIANOo, keuze gunningscriterium
              </a>{' '}
              en de{' '}
              <a href={aanbestedingBronnen.bpkv.url} target="_blank" rel="noopener noreferrer">
                handreiking beste prijs-kwaliteitverhouding
              </a>
              .
            </p>
          </Kaart>
        </div>
      )}

      {stap === 3 && (
        <div className="stapel">
          <Kaart className="ab-overzicht">
            {kop('Stap 4 · Overzicht')}
            <div className="raster raster-2">
              <section>
                <h3>Opdracht</h3>
                <dl className="ab-opdracht">
                  {opdrachtRegels.map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section>
                <h3>Weging</h3>
                <div className="ab-balken">
                  <PercentageBalken items={[{ label: 'Prijs', pct: wegingAfgerond.prijs }, ...gunning.map((c) => ({ label: c.titel, pct: wegingAfgerond[c.id] }))]} />
                </div>
                <PrijsSignaal signaal={signaal} />
              </section>
            </div>
            {soorten.map((s) => {
              const deze = gekozen.filter((c) => c.soort === s);
              if (deze.length === 0) return null;
              return (
                <section key={s}>
                  <h3>
                    {soortMeervoud[s]} ({deze.length})
                  </h3>
                  <ol>
                    {deze.map((c) => (
                      <li key={c.id}>
                        <strong>{c.titel}</strong>
                        {c.soort === 'gunning' && <> · weging {procent(wegingAfgerond[c.id], 0)}</>}
                        <p>{c.tekst}</p>
                        {c.toetsing && <p className="muted">Toetsing: {c.toetsing}</p>}
                        <p className="klein muted">
                          {c.mvi ? (
                            <>
                              Officieel MVI-criterium {c.mvi.code}, ambitieniveau {ambitieLabel[c.mvi.ambitie].toLowerCase()}.{' '}
                              <a href={c.mvi.bron.url} target="_blank" rel="noopener noreferrer">
                                Volledige tekst in de MVI-criteriatool
                              </a>
                            </>
                          ) : (
                            'Voorbeeld van KplusV, geen officieel MVI-criterium.'
                          )}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
            {gekozen.length === 0 && <p className="notitie">U hebt nog niets gekozen. Ga naar stap 2.</p>}
            <section>
              <h3>Checklist voor de voorbereiding</h3>
              <ul className="vinklijst">
                {punten.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          </Kaart>
          <Kaart titel="Downloaden en delen" className="geen-print">
            <div className="stapel" style={{ gap: 12 }}>
              <div className="knoppen">
                <TekstDownloadKnop naam={`Aanbesteding ${stroom.naam}`} inhoud={() => overzichtTekst(overzicht())}>
                  Tekstbestand downloaden
                </TekstDownloadKnop>
              </div>
              <ExportKnoppen
                naam={`Aanbesteding ${stroom.naam}`}
                csvRijen={() => overzichtCsv(overzicht())}
                params={deelParams}
                pad={PAD}
                toelichting="Het tekstbestand en de CSV bevatten opdracht, weging, alle gekozen eisen en criteria met herkomst, de checklist en de bronnen. De link opent dit overzicht met uw keuzes."
              />
              <PrintKnop />
            </div>
          </Kaart>
          <div className="knoppen geen-print">
            <button type="button" onClick={() => setStap(2)}>
              Vorige: {stappen[2].toLowerCase()}
            </button>
            <button
              type="button"
              onClick={() => {
                setI(standaardInvoer());
                setStap(0);
              }}
            >
              Opnieuw beginnen
            </button>
          </div>
        </div>
      )}

      <Kaart titel="Over deze tool" className="geen-print" sub={`Peildatum bronnen ${datum(PEILDATUM)}`}>
        <ul className="opsomming klein">
          <li>
            De opzet volgt de{' '}
            <a href={aanbestedingBronnen.mviAfval.url} target="_blank" rel="noopener noreferrer">
              MVI-criteriatool
            </a>{' '}
            van de Rijksoverheid: productgroep kiezen, eisen en gunningscriteria selecteren, downloaden. Voor huishoudelijk afval
            bestaan daar vijftien criteria (versie 24 juli 2026); die staan hier met code en ambitieniveau en een korte
            samenvatting in eigen woorden. De officiële tekst staat alleen in de MVI-criteriatool.
          </li>
          <li>Criteria zonder MVI-code zijn voorbeelden van KplusV uit de praktijk van afvalaanbestedingen, geen officiële criteria.</li>
          <li>
            Drempelbedragen 2026–2027 volgens{' '}
            <a href={drempelBron.url} target="_blank" rel="noopener noreferrer">
              PIANOo
            </a>
            . Meer over maatschappelijk verantwoord inkopen:{' '}
            <a href={aanbestedingBronnen.mvi.url} target="_blank" rel="noopener noreferrer">
              PIANOo-dossier MVI
            </a>
            .
          </li>
          <li>
            Rekenhulp bij criteria: <Link to="/tools/indexcalculator">Indexcalculator</Link>, <Link to="/tools/co2-heffingenscan">CO2-heffingenscan</Link>,{' '}
            <Link to="/tools/bodemassencalculator">Bodemassencalculator</Link> en <Link to="/tools/pmd-rekenmodel">Rekenmodel PMD</Link>.
          </li>
        </ul>
      </Kaart>
      <RapportVoet tekst={`Hulpmiddel, geen juridisch advies · peildatum bronnen ${datum(PEILDATUM)}`} />
    </>
  );
}

function DrempelKaart({ waarde, drempelBedrag, drempelLabel }: { waarde: number | null; drempelBedrag: number; drempelLabel: string }) {
  const toets = drempelToets(waarde, drempelBedrag);
  return (
    <Kaart titel="Geraamde opdrachtwaarde" kopNiveau={3} sub="Volume × tarief × (looptijd + verlengingsopties), excl. btw">
      <div className="stapel" style={{ gap: 10 }} aria-live="polite">
        <p style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--donkerviolet)' }}>{waarde === null ? 'Vul een geraamd tarief in' : euro(waarde)}</p>
        {toets && (
          <p className={`notitie ${toets.europees ? 'info' : 'succes'}`} style={{ margin: 0 }}>
            <strong>{toets.europees ? 'Europees aanbesteden.' : 'Onder de Europese drempel.'}</strong> Het drempelbedrag voor {drempelLabel.toLowerCase()} is{' '}
            {euro(drempelBedrag)} voor diensten en leveringen. De raming is {getal(toets.factor, 1)} keer de drempel.
          </p>
        )}
        <p className="klein muted" style={{ margin: 0 }}>
          Tel soortgelijke opdrachten bij elkaar op. Bron:{' '}
          <a href={drempelBron.url} target="_blank" rel="noopener noreferrer">
            PIANOo, drempelbedragen 2026 en 2027
          </a>
          , peildatum {datum(PEILDATUM)}.
        </p>
      </div>
    </Kaart>
  );
}

function PrijsSignaal({ signaal }: { signaal: ReturnType<typeof prijsSignaal> }) {
  if (!signaal) return null;
  const tekst = {
    'alleen-prijs': 'Alleen prijs: u gunt op laagste prijs. Bij een Europese aanbesteding moet u die keuze motiveren.',
    'zeer-zwaar': 'Prijs weegt 90 % of meer. Dan beslist in de praktijk alleen de prijs; PIANOo waarschuwt dat een rechter zo’n weging kan afkeuren.',
    'geen-prijs': 'Prijs weegt 0 %. Dat kan bij een vaste prijs of budget waarop inschrijvers alleen op kwaliteit concurreren. Leg die prijs dan vast in de stukken.',
  }[signaal];
  return (
    <p className="notitie" role="note" style={{ marginTop: 12 }}>
      {tekst}
    </p>
  );
}

function WegingRij({ label, punten, pct, onChange }: { label: string; punten: number; pct: number; onChange: (n: number) => void }) {
  const id = useId();
  const [tekst, setTekst] = useState(String(punten));
  const [fout, setFout] = useState<string | null>(null);
  useEffect(() => {
    if (leesGetal(tekst) !== punten) setTekst(String(punten));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punten]);
  return (
    <div className="ab-weging-rij">
      <label htmlFor={id}>{label}</label>
      <div className="invoer" data-fout={fout ? 'true' : 'false'}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={tekst}
          aria-invalid={fout ? true : undefined}
          aria-describedby={fout ? `${id}-fout` : `${id}-uit`}
          onChange={(e) => {
            setTekst(e.target.value);
            const n = leesGetal(e.target.value);
            if (!Number.isFinite(n) || n < 0 || n > 100) return setFout('Vul 0 tot en met 100 in.');
            setFout(null);
            onChange(n);
          }}
        />
        <span className="eenheid" aria-hidden="true">
          punten
        </span>
      </div>
      <output id={`${id}-uit`} htmlFor={id}>
        {procent(pct, 0)}
      </output>
      {fout && (
        <span className="foutmelding" id={`${id}-fout`} role="alert" style={{ gridColumn: '1 / -1' }}>
          {fout}
        </span>
      )}
    </div>
  );
}

function CriteriaKiezen({
  lijst,
  gekozen,
  wissel,
  stroom,
  zetSelectie,
}: {
  lijst: Criterium[];
  gekozen: string[];
  wissel: (id: string) => void;
  stroom: StroomId;
  zetSelectie: (sel: string[]) => void;
}) {
  const [soortFilter, setSoortFilter] = useState<'alle' | CriteriumSoort>('alle');
  const [themaFilter, setThemaFilter] = useState<'alle' | Thema>('alle');
  const [alleenMvi, setAlleenMvi] = useState(false);
  const [zoek, setZoek] = useState('');
  const zoekId = useId();
  const themas = [...new Set(lijst.map((c) => c.thema))];
  const zichtbaar = lijst.filter(
    (c) => (soortFilter === 'alle' || c.soort === soortFilter) && (themaFilter === 'alle' || c.thema === themaFilter) && (!alleenMvi || c.mvi) && pastBijZoek(c, zoek),
  );

  return (
    <div className="stapel">
      <p className="klein muted" style={{ margin: 0 }}>
        Kies wat u in de aanbesteding wilt opnemen. Bij een officieel MVI-criterium staan code en ambitieniveau; de volledige
        tekst met invultabellen staat in de MVI-criteriatool. De selectie begint met de eisen en gunningscriteria op
        basisniveau en significant niveau.
      </p>
      <div className="veld ab-zoek">
        <label htmlFor={zoekId}>Zoeken in eisen en criteria</label>
        <div className="invoer">
          <input
            id={zoekId}
            type="search"
            autoComplete="off"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            aria-describedby={`${zoekId}-uitkomst`}
          />
        </div>
        <span className="hint" id={`${zoekId}-uitkomst`} role="status" aria-live="polite">
          {zichtbaar.length} van {lijst.length} getoond. Zoek op trefwoord, bijvoorbeeld CO2, social return of 049.003.
        </span>
      </div>
      <div className="ab-filters">
        <Chips
          label="Soort"
          waarde={soortFilter}
          opties={[{ waarde: 'alle', label: 'Alles' }, ...soorten.map((s) => ({ waarde: s, label: soortMeervoud[s] }))]}
          onChange={setSoortFilter}
        />
        <KeuzeVeld
          label="Thema"
          waarde={themaFilter}
          opties={[{ waarde: 'alle' as const, label: 'Alle thema’s' }, ...themas.map((t) => ({ waarde: t, label: themaLabel[t] }))]}
          onChange={setThemaFilter}
        />
        <label className="keuze">
          <input type="checkbox" checked={alleenMvi} onChange={(e) => setAlleenMvi(e.target.checked)} />
          Alleen officiële MVI-criteria
        </label>
      </div>
      <div className="knoppen">
        <button type="button" onClick={() => zetSelectie(standaardSelectie(stroom))}>
          Standaardselectie
        </button>
        <button type="button" onClick={() => zetSelectie([...new Set([...gekozen, ...zichtbaar.map((c) => c.id)])])}>
          Alle zichtbare kiezen
        </button>
        <button type="button" onClick={() => zetSelectie(gekozen.filter((id) => !zichtbaar.some((c) => c.id === id)))}>
          Zichtbare weghalen
        </button>
      </div>
      {soorten.map((s) => {
        const deze = zichtbaar.filter((c) => c.soort === s);
        if (deze.length === 0) return null;
        return (
          <section key={s} className="ab-groep" aria-labelledby={`ab-kop-${s}`}>
            <h3 id={`ab-kop-${s}`}>
              {soortMeervoud[s]} <span className="klein muted">({deze.filter((c) => gekozen.includes(c.id)).length} van {deze.length} gekozen)</span>
            </h3>
            <p className="klein muted" style={{ margin: 0 }}>
              {soortUitleg[s]}
            </p>
            <ul className="ab-criteria">
              {deze.map((c) => (
                <CriteriumKaart key={c.id} c={c} gekozen={gekozen.includes(c.id)} wissel={() => wissel(c.id)} />
              ))}
            </ul>
          </section>
        );
      })}
      {zichtbaar.length === 0 && <p className="notitie">Geen criteria bij deze filters.</p>}
    </div>
  );
}

function CriteriumKaart({ c, gekozen, wissel }: { c: Criterium; gekozen: boolean; wissel: () => void }) {
  const id = useId();
  return (
    <li className="ab-criterium" data-gekozen={gekozen ? 'true' : 'false'}>
      <div className="ab-criterium-kop">
        <input id={id} type="checkbox" checked={gekozen} onChange={wissel} aria-describedby={`${id}-tekst`} />
        <label htmlFor={id}>{c.titel}</label>
      </div>
      <div className="badges">
        <Badge>{soortLabel[c.soort]}</Badge>
        <Badge soort="thema">{themaLabel[c.thema]}</Badge>
        {c.mvi ? (
          <Badge soort="status-gegund">
            MVI {c.mvi.code} · {ambitieLabel[c.mvi.ambitie]}
          </Badge>
        ) : (
          <Badge soort="voorbeeld">Voorbeeld KplusV</Badge>
        )}
        {c.soort === 'gunning' && c.punten !== undefined && <Badge>Voorstel {c.punten} punten</Badge>}
      </div>
      <div className="ab-meer">
        <p id={`${id}-tekst`}>{c.tekst}</p>
        {c.toetsing && <p className="klein muted">Toetsing: {c.toetsing}</p>}
        <p className="klein">
          {c.mvi && (
            <a href={c.mvi.bron.url} target="_blank" rel="noopener noreferrer">
              MVI-criterium {c.mvi.code} in de MVI-criteriatool<span className="visueel-verborgen"> (opent in nieuw venster)</span>
            </a>
          )}
          {c.mvi && c.tool && ' · '}
          {c.tool && <Link to={c.tool.pad}>Rekenen met de {c.tool.naam}</Link>}
        </p>
      </div>
    </li>
  );
}
