import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, KeuzeVeld, PaginaKop } from '../components/ui';
import { aanbestedingenBron, cpvFilterUitleg, gemeentenBron } from '../data/aanbestedingen';
import { isToegangOnbekend, useAuth } from '../lib/auth';
import {
  CSV_MAX,
  DIENSTEN,
  LEGE_FILTERS,
  PER_PAGINA,
  PROVINCIES,
  SNELKEUZES,
  SORTERINGEN,
  STATUS_LABEL,
  STATUS_UITLEG,
  STATUS_VOLGORDE,
  STROMEN,
  filtersNaarUrl,
  filtersUitUrl,
  haalAlleVoorCsv,
  haalKerncijfers,
  maakCsv,
  nogTekst,
  procedureAfbreekbaar,
  sluitingTijd,
  statusBadge,
  tijdstempel,
  vandaagNl,
  zoekAanbestedingen,
  zoekOpenAanbestedingen,
  type AanbestedingRegel,
  type Filters,
  type Kerncijfers,
  type OpenAanbesteding,
  type Sortering,
} from '../lib/aanbestedingen';
import { datum, datumKortNl, getal } from '../lib/format';
import './Aanbestedingsarchief.css';

export function Aanbestedingsarchief() {
  const auth = useAuth();
  const { isLid } = auth;

  return (
    <>
      <PaginaKop
        titel="Aanbestedingsarchief"
        badges={
          isLid ? (
            <Badge soort="leden">Volledig archief (u bent lid)</Badge>
          ) : (
            <>
              <Badge soort="gratis">Open aanbestedingen: voor iedereen</Badge>
              <Badge soort="leden">
                <span aria-hidden="true">🔒</span> Volledig archief: alleen leden
              </Badge>
            </>
          )
        }
      >
        Aanbestedingen voor inzameling, transport en verwerking van afval die opdrachtgevers op TenderNed publiceren.
        {isLid
          ? ' Zoek op opdrachtgever, onderwerp of CPV-code, filter op afvalstroom, status en provincie en ga door naar de aankondiging.'
          : ' Iedereen kan zoeken in de aanbestedingen die nu open zijn voor inschrijving. Leden zien ook gesloten en gegunde aanbestedingen, met filters, details en export.'}
      </PaginaKop>

      {/* Zolang de toegang nog wordt gecontroleerd, houden we een schermhoogte vrij: zo verspringt de betaalmuur niet als
          de open lijst erboven verschijnt (een ingelogde gebruiker is meestal lid en ziet die lijst niet). */}
      {isToegangOnbekend(auth) ? (
        <p className="sectie muted" style={{ minHeight: '100vh' }}>
          Toegang controleren…
        </p>
      ) : (
        <>
          {!isLid && <OpenAanbestedingen />}

          <Vergrendeld
            titel="Volledig aanbestedingsarchief"
            ledenKrijgen={[
              'Ook gesloten, gegunde en beëindigde aanbestedingen en marktconsultaties, terug tot 2013',
              'Filters op afvalstroom, status, provincie en soort dienst, en sorteren',
              'Per aanbesteding de omschrijving, CPV-codes, het documentenplatform en de tijdlijn van publicaties',
              'Download als CSV voor Excel',
            ]}
          >
            {isLid ? <Archief /> : <Voorbeeldweergave />}
          </Vergrendeld>
        </>
      )}
    </>
  );
}

/* ---------- Voor iedereen: open aanbestedingen (beperkte velden, afgedwongen in de database) ---------- */

function OpenAanbestedingen() {
  const [params, setParams] = useSearchParams();
  const zoek = (params.get('zoek') ?? '').slice(0, 200);
  const [invoer, setInvoer] = useState(zoek);
  const [r, setR] = useState<{ voor: string; regels: OpenAanbesteding[] } | null>(null);
  const [fout, setFout] = useState(false);
  const [poging, setPoging] = useState(0);
  const zoekId = useId();
  const vandaag = vandaagNl();

  useEffect(() => setInvoer(zoek), [zoek]);

  useEffect(() => {
    let actief = true;
    setFout(false);
    zoekOpenAanbestedingen(zoek).then(
      (regels) => actief && setR({ voor: zoek, regels }),
      () => actief && setFout(true),
    );
    return () => {
      actief = false;
    };
  }, [zoek, poging]);

  const zetZoek = useCallback(
    (waarde: string) => {
      const p = new URLSearchParams(params);
      if (waarde.trim()) p.set('zoek', waarde.trim());
      else p.delete('zoek');
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    if (invoer.trim() === zoek.trim()) return;
    const t = window.setTimeout(() => zetZoek(invoer), 450);
    return () => window.clearTimeout(t);
  }, [invoer, zoek, zetZoek]);

  function verstuur(e: FormEvent) {
    e.preventDefault();
    zetZoek(invoer);
  }

  const laden = !fout && r?.voor !== zoek;
  const aantal = r?.regels.length ?? 0;
  const [alles, setAlles] = useState(false);
  const EERST = 10;
  const zichtbaar = alles ? (r?.regels ?? []) : (r?.regels ?? []).slice(0, EERST);

  return (
    <section className="kaart open-lijst" aria-labelledby="open-kop">
      <h2 id="open-kop">Open voor inschrijving</h2>
      <form className="archief-zoek" role="search" onSubmit={verstuur}>
        <div className="veld">
          <label htmlFor={zoekId}>Zoeken in titel en opdrachtgever</label>
          <div className="invoer">
            <input id={zoekId} type="search" value={invoer} maxLength={200} placeholder="Bijvoorbeeld: textiel of Groningen" onChange={(e) => setInvoer(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="primair">
          Zoeken
        </button>
      </form>

      <p className="archief-aantal" role="status" aria-live="polite">
        {fout
          ? ''
          : !r
            ? 'Open aanbestedingen laden…'
            : aantal === 0
              ? zoek
                ? `Geen open aanbestedingen gevonden voor “${zoek}”.`
                : 'Op dit moment staan er geen open aanbestedingen in het archief.'
              : `${getal(aantal)} open ${aantal === 1 ? 'aanbesteding' : 'aanbestedingen'}${zoek ? ` voor “${zoek}”` : ''}, vroegste sluiting eerst.`}
      </p>

      {!fout && !r && (
        <ol className="open-regels open-laden" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i}>
              <span className="archief-balk dun" style={{ width: '40%' }} />
              <span className="archief-balk" style={{ width: `${60 + ((i * 13) % 30)}%` }} />
              <span className="archief-balk dun" style={{ width: '50%' }} />
            </li>
          ))}
        </ol>
      )}

      {fout && (
        <div role="alert" className="archief-fout">
          <p>De open aanbestedingen konden niet worden geladen. Controleer uw internetverbinding en probeer het opnieuw.</p>
          <button type="button" onClick={() => setPoging((p) => p + 1)}>
            Opnieuw proberen
          </button>
        </div>
      )}

      {!fout && r && aantal > 0 && (
        <ol className={`open-regels${laden ? ' is-laden' : ''}`} aria-busy={laden}>
          {zichtbaar.map((a) => {
            const nog = nogTekst(a.sluitingsdatum, vandaag);
            return (
              <li key={a.tenderned_url}>
                <span className="archief-opdrachtgever">{a.opdrachtgever}</span>
                <a className="archief-titel" href={a.tenderned_url} target="_blank" rel="noopener noreferrer">
                  {a.titel}
                  <span className="visueel-verborgen"> (aankondiging op TenderNed, opent in nieuw venster)</span>
                </a>
                <span className="open-sluit">
                  Sluit <time dateTime={a.sluitingsdatum}>{datumKortNl(a.sluitingsdatum.slice(0, 10))}</time>
                  {a.sluiting_tijd_bekend && ` om ${sluitingTijd(a.sluitingsdatum)}`}
                  {nog && <strong> · {nog}</strong>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!fout && r && aantal > EERST && (
        <button type="button" className="open-meer" aria-expanded={alles} onClick={() => setAlles((a) => !a)}>
          {alles ? `Alleen de eerste ${getal(EERST)} tonen` : `Alle ${getal(aantal)} open aanbestedingen tonen`}
        </button>
      )}

      <p className="klein muted open-bron">
        Bron:{' '}
        <a href={aanbestedingenBron.url} target="_blank" rel="noopener noreferrer">
          TenderNed
          <span className="visueel-verborgen"> (opent in nieuw venster)</span>
        </a>{' '}
        ({aanbestedingenBron.licentie}), elke ochtend bijgewerkt. Alleen aankondigingen met een afval-CPV-code (90500000 en
        onderliggend) waarvan de inschrijftermijn nog loopt; marktconsultaties staan er niet bij. Juridisch geldt de aankondiging op
        TenderNed.
      </p>
    </section>
  );
}

/* ---------- Voor leden: het volledige archief ---------- */

function Archief() {
  const [params, setParams] = useSearchParams();
  const filters = filtersUitUrl(params);
  const sleutel = filtersNaarUrl(filters).toString();

  // Resultaat met de filters waarvoor het geldt: zo is "laden" altijd eenduidig (andere filters = nog niet binnen).
  const [resultaat, setResultaat] = useState<{ voor: string; regels: AanbestedingRegel[]; totaal: number } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [poging, setPoging] = useState(0);
  const [kern, setKern] = useState<Kerncijfers | null>(null);
  const [zoekInvoer, setZoekInvoer] = useState(filters.zoek);
  const resultatenKop = useRef<HTMLHeadingElement>(null);
  const focusNaLaden = useRef(false);

  useEffect(() => {
    setZoekInvoer(filters.zoek);
  }, [filters.zoek]);

  useEffect(() => {
    haalKerncijfers().then(setKern, () => setKern(null));
  }, []);

  useEffect(() => {
    let actief = true;
    setFout(null);
    zoekAanbestedingen(filtersUitUrl(new URLSearchParams(sleutel))).then(
      (r) => {
        if (!actief) return;
        setResultaat({ voor: sleutel, ...r });
        if (focusNaLaden.current) {
          focusNaLaden.current = false;
          resultatenKop.current?.focus();
        }
      },
      () => {
        if (!actief) return;
        setFout(sleutel);
      },
    );
    return () => {
      actief = false;
    };
  }, [sleutel, poging]);

  const zetFilters = useCallback(
    (nieuw: Partial<Filters>, opties: { focus?: boolean } = {}) => {
      const volgend = { ...filtersUitUrl(params), ...nieuw };
      if (!('pagina' in nieuw)) volgend.pagina = 1;
      if (opties.focus) focusNaLaden.current = true;
      setParams(filtersNaarUrl(volgend), { replace: !('pagina' in nieuw) });
    },
    [params, setParams],
  );

  // Zoeken terwijl u typt, met korte vertraging.
  useEffect(() => {
    if (zoekInvoer.trim() === filters.zoek.trim()) return;
    const t = window.setTimeout(() => zetFilters({ zoek: zoekInvoer }), 450);
    return () => window.clearTimeout(t);
  }, [zoekInvoer, filters.zoek, zetFilters]);

  const laden = !fout && resultaat?.voor !== sleutel;
  const totaal = resultaat?.totaal ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));

  // Een paginanummer voorbij het einde (bijvoorbeeld een oude link met ?pagina=999): naar de laatste pagina.
  const voorbijEinde = !laden && !fout && resultaat !== null && totaal > 0 && filters.pagina > paginas;
  useEffect(() => {
    if (voorbijEinde) setParams(filtersNaarUrl({ ...filters, pagina: paginas }), { replace: true });
  }, [voorbijEinde, filters, paginas, setParams]);

  function zoek(e: FormEvent) {
    e.preventDefault();
    zetFilters({ zoek: zoekInvoer }, { focus: true });
  }

  const actieveFilters = filtersNaarUrl({ ...filters, sortering: 'publicatie-nieuw', pagina: 1 }).toString() !== '';
  const aantalActief = [filters.stroom, filters.status, filters.provincie, filters.dienst, filters.hoofd ? '1' : ''].filter(Boolean).length;
  const zoekId = useId();
  const hoofdId = useId();
  const vandaag = vandaagNl();

  const stroomOpties = STROMEN.filter((s) => !kern || (kern.perStroom[s] ?? 0) > 0 || s === filters.stroom).map((s) => ({
    waarde: s,
    label: kern?.perStroom[s] !== undefined ? `${s} (${getal(kern.perStroom[s])})` : s,
  }));

  return (
    <div className="archief">
      <Bronvermelding kern={kern} />

      <nav className="archief-snel" aria-label="Snelkeuzes">
        <span className="archief-snel-label">Snel naar:</span>
        <ul>
          {SNELKEUZES.map((s) => {
            const doel = filtersNaarUrl({ ...LEGE_FILTERS, ...s.filters }).toString();
            const actief = doel === filtersNaarUrl({ ...filters, pagina: 1 }).toString();
            return (
              <li key={s.label}>
                <button
                  type="button"
                  aria-pressed={actief}
                  onClick={() => {
                    setZoekInvoer('');
                    focusNaLaden.current = true;
                    setParams(new URLSearchParams(doel), { replace: false });
                  }}
                >
                  {s.label}
                  {s.filters.status && kern?.perStatus[s.filters.status as keyof Kerncijfers['perStatus']] !== undefined
                    ? ` (${getal(kern.perStatus[s.filters.status as keyof Kerncijfers['perStatus']] ?? 0)})`
                    : ''}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="kaart archief-filterkaart" aria-labelledby="archief-filter-kop">
        <h2 id="archief-filter-kop">Zoeken en filteren</h2>
        <form className="archief-zoek" role="search" onSubmit={zoek}>
          <div className="veld">
            <label htmlFor={zoekId}>Zoeken in titel, opdrachtgever, omschrijving en CPV-code</label>
            <div className="invoer">
              <input
                id={zoekId}
                type="search"
                value={zoekInvoer}
                maxLength={200}
                placeholder='Bijvoorbeeld: GFT Utrecht of "oud papier"'
                aria-describedby={`${zoekId}-hint`}
                onChange={(e) => setZoekInvoer(e.target.value)}
              />
            </div>
            <p className="hint" id={`${zoekId}-hint`}>
              Alle woorden moeten voorkomen. Zet woorden tussen aanhalingstekens om op een woordgroep te zoeken.
            </p>
          </div>
          <button type="submit" className="primair">
            Zoeken
          </button>
        </form>

        <FilterInklap aantalActief={aantalActief}>
        <div className="archief-filters">
          <KeuzeVeld<string>
            label="Afvalstroom"
            waarde={filters.stroom}
            onChange={(v) => zetFilters({ stroom: v })}
            opties={[{ waarde: '', label: 'Alle afvalstromen' }, ...stroomOpties]}
          />
          <KeuzeVeld<string>
            label="Status"
            waarde={filters.status}
            onChange={(v) => zetFilters({ status: v })}
            opties={[
              { waarde: '', label: 'Alle statussen' },
              ...STATUS_VOLGORDE.filter((s) => !kern || (kern.perStatus[s] ?? 0) > 0 || s === filters.status).map((s) => ({
                waarde: s,
                label: kern?.perStatus[s] !== undefined ? `${STATUS_LABEL[s]} (${getal(kern.perStatus[s] ?? 0)})` : STATUS_LABEL[s],
              })),
            ]}
          />
          <KeuzeVeld<string>
            label="Provincie"
            waarde={filters.provincie}
            onChange={(v) => zetFilters({ provincie: v })}
            opties={[
              { waarde: '', label: 'Alle provincies' },
              ...PROVINCIES.map((p) => ({ waarde: p, label: p })),
              { waarde: 'landelijk', label: 'Provincie onbekend' },
            ]}
          />
          <KeuzeVeld<string>
            label="Soort dienst"
            waarde={filters.dienst}
            onChange={(v) => zetFilters({ dienst: v })}
            opties={[{ waarde: '', label: 'Alle diensten' }, ...DIENSTEN.map((d) => ({ waarde: d, label: d }))]}
          />
          <KeuzeVeld<Sortering>
            label="Sorteren op"
            waarde={filters.sortering}
            onChange={(v) => zetFilters({ sortering: v })}
            opties={SORTERINGEN.map((s) => ({ waarde: s.waarde, label: s.label }))}
          />
        </div>
        <div className="archief-vink">
          <input id={hoofdId} type="checkbox" checked={filters.hoofd} onChange={(e) => zetFilters({ hoofd: e.target.checked })} />
          <label htmlFor={hoofdId}>
            Alleen aanbestedingen met afval als hoofdopdracht
            <span className="hint"> (hoofd-CPV 905… of 90000000; zonder vinkje ook bijvoorbeeld maaiwerk of ICT met afvoer als onderdeel)</span>
          </label>
        </div>
        {actieveFilters && (
          <button
            type="button"
            className="archief-wissen"
            onClick={() => {
              setZoekInvoer('');
              setParams(filtersNaarUrl({ ...LEGE_FILTERS, sortering: filters.sortering }), { replace: true });
            }}
          >
            Alle filters wissen
          </button>
        )}
        </FilterInklap>
      </section>

      <section className="kaart archief-resultaten" aria-labelledby="archief-resultaten-kop">
        <div className="archief-resultaten-kop">
          <h2 id="archief-resultaten-kop" ref={resultatenKop} tabIndex={-1}>
            Resultaten
          </h2>
          <Acties filters={filters} totaal={totaal} />
        </div>
        <p className="archief-aantal" role="status" aria-live="polite">
          {laden && !resultaat
            ? 'Aanbestedingen laden…'
            : fout
              ? ''
              : totaal === 0
                ? 'Geen aanbestedingen gevonden.'
                : `${getal(totaal)} ${totaal === 1 ? 'aanbesteding' : 'aanbestedingen'} gevonden${
                    paginas > 1 ? `, pagina ${getal(Math.min(filters.pagina, paginas))} van ${getal(paginas)}` : ''
                  }.`}
        </p>

        <Legenda />

        {fout === sleutel && (
          <div role="alert" className="archief-fout">
            <p>De aanbestedingen konden niet worden geladen. Controleer uw internetverbinding en probeer het opnieuw.</p>
            <button type="button" onClick={() => setPoging((p) => p + 1)}>
              Opnieuw proberen
            </button>
          </div>
        )}

        {!fout && resultaat && resultaat.regels.length > 0 && (
          <div className={`archief-tabel${laden ? ' is-laden' : ''}`} aria-busy={laden}>
            <table>
              <caption className="visueel-verborgen">
                Aanbestedingen uit TenderNed. Afvalstroom en soort dienst zijn afgeleid uit CPV-codes en trefwoorden.
              </caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={filters.sortering === 'opdrachtgever' ? 'ascending' : undefined}>
                    Opdrachtgever en opdracht
                  </th>
                  <th scope="col">Afvalstroom</th>
                  <th scope="col">Procedure</th>
                  <th
                    scope="col"
                    aria-sort={
                      filters.sortering === 'publicatie-nieuw' ? 'descending' : filters.sortering === 'publicatie-oud' ? 'ascending' : undefined
                    }
                  >
                    Publicatie
                  </th>
                  <th
                    scope="col"
                    aria-sort={filters.sortering === 'sluiting-op' ? 'ascending' : filters.sortering === 'sluiting-af' ? 'descending' : undefined}
                  >
                    Sluiting
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {resultaat.regels.map((a) => (
                  <Regel key={a.kenmerk} a={a} vandaag={vandaag} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!fout && totaal === 0 && !laden && actieveFilters && (
          <p>
            Probeer minder filters of een ander zoekwoord. Zoekt u een bepaalde opdrachtgever? Typ dan een deel van de naam, bijvoorbeeld
            alleen de plaatsnaam.
          </p>
        )}

        {paginas > 1 && !fout && (
          <Paginering
            pagina={Math.min(filters.pagina, paginas)}
            paginas={paginas}
            naar={(p) => zetFilters({ pagina: p }, { focus: true })}
          />
        )}
      </section>

      <Toelichting oudste={kern?.oudste ?? null} />
    </div>
  );
}

const SMAL = '(max-width: 760px)';

/** Op de telefoon staan filters en sortering achter een knop, zodat de resultaten bovenaan het scherm beginnen. */
function FilterInklap({ aantalActief, children }: { aantalActief: number; children: ReactNode }) {
  const [smal, setSmal] = useState(() => typeof window !== 'undefined' && window.matchMedia(SMAL).matches);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(SMAL);
    const bij = () => setSmal(mq.matches);
    mq.addEventListener('change', bij);
    return () => mq.removeEventListener('change', bij);
  }, []);
  if (!smal) return <>{children}</>;
  return (
    <details className="archief-filterinklap" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Filters en sorteren{aantalActief > 0 ? ` (${getal(aantalActief)} actief)` : ''}
      </summary>
      {children}
    </details>
  );
}

/** Link delen en CSV downloaden. */
function Acties({ filters, totaal }: { filters: Filters; totaal: number }) {
  const [melding, setMelding] = useState('');
  const [bezig, setBezig] = useState(false);
  const [toonLink, setToonLink] = useState(false);
  const linkId = useId();

  async function kopieer() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setToonLink(false);
      setMelding('Link naar deze zoekopdracht gekopieerd.');
    } catch {
      setToonLink(true);
      setMelding('Kopiëren lukte niet. Selecteer de link hieronder en kopieer die zelf.');
    }
  }

  async function download() {
    setBezig(true);
    setMelding('CSV wordt gemaakt…');
    try {
      const regels = await haalAlleVoorCsv({ ...filters, pagina: 1 });
      const blob = new Blob([maakCsv(regels)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aanbestedingen-afval-${vandaagNl()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMelding(
        `CSV met ${getal(regels.length)} ${regels.length === 1 ? 'aanbesteding' : 'aanbestedingen'} gedownload${
          totaal > CSV_MAX ? ` (de eerste ${getal(CSV_MAX)}; verfijn de filters voor de rest)` : ''
        }.`,
      );
    } catch {
      setMelding('De CSV kon niet worden gemaakt. Probeer het opnieuw.');
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="archief-acties">
      <div className="archief-acties-knoppen">
        <button type="button" onClick={kopieer}>
          Link kopiëren
        </button>
        <button type="button" onClick={download} disabled={bezig || totaal === 0}>
          {bezig ? 'Bezig…' : 'Download CSV'}
        </button>
      </div>
      <p className="klein archief-acties-melding" role="status" aria-live="polite">
        {melding}
      </p>
      {toonLink && (
        <div className="veld">
          <label htmlFor={linkId}>Link naar deze zoekopdracht</label>
          <div className="invoer">
            <input id={linkId} type="text" readOnly value={window.location.href} onFocus={(e) => e.currentTarget.select()} />
          </div>
        </div>
      )}
    </div>
  );
}

function Legenda() {
  return (
    <details className="archief-legenda">
      <summary>Wat betekenen de statussen en lege velden?</summary>
      <dl>
        {STATUS_VOLGORDE.map((s) => (
          <div key={s}>
            <dt>{STATUS_LABEL[s]}</dt>
            <dd>{STATUS_UITLEG[s]}</dd>
          </div>
        ))}
        <div>
          <dt>Geen datum</dt>
          <dd>De publicatie noemt geen sluitingsdatum. Bij gunningen, vooraankondigingen en sommige marktconsultaties is dat gebruikelijk.</dd>
        </div>
        <div>
          <dt>Afval is nevenonderdeel</dt>
          <dd>De hoofdopdracht heeft een andere CPV-code (bijvoorbeeld maaiwerk of ICT); afvalverwerking is een onderdeel.</dd>
        </div>
      </dl>
    </details>
  );
}

/** Korte regel over de sluiting voor de compacte weergave op de telefoon. */
function sluitingKort(a: AanbestedingRegel, vandaag: string): string {
  if (a.sluitingsdatum && (a.status === 'open' || a.status === 'marktconsultatie')) {
    const nog = nogTekst(a.sluitingsdatum, vandaag);
    if (nog) {
      const tijd = a.sluiting_tijd_bekend ? ` ${sluitingTijd(a.sluitingsdatum)}` : '';
      return `${a.status === 'open' ? 'Sluit' : 'Reageren tot'} ${datumKortNl(a.sluitingsdatum.slice(0, 10))}${tijd} · ${nog}`;
    }
  }
  return `Gepubliceerd ${datumKortNl(a.laatste_publicatie)}`;
}

function Regel({ a, vandaag }: { a: AanbestedingRegel; vandaag: string }) {
  const nog = a.sluitingsdatum && (a.status === 'open' || a.status === 'marktconsultatie') ? nogTekst(a.sluitingsdatum, vandaag) : null;
  const meta = [a.provincies.join(', '), a.afval_hoofd ? '' : 'Afval is nevenonderdeel'].filter(Boolean);
  return (
    <tr>
      <td data-label="Opdracht" className="archief-opdracht">
        <span className="archief-opdrachtgever">{a.opdrachtgever}</span>
        <a className="archief-titel" href={a.tenderned_url} target="_blank" rel="noopener noreferrer">
          {a.titel}
          <span className="visueel-verborgen"> (aankondiging op TenderNed, opent in nieuw venster)</span>
        </a>
        <p className="archief-mobiel-kern">
          <Badge soort={statusBadge(a.status)}>{STATUS_LABEL[a.status]}</Badge> <span>{sluitingKort(a, vandaag)}</span>
        </p>
        {(meta.length > 0 || a.stromen.length > 0) && (
          <p className="archief-meta">
            <span className="alleen-mobiel">
              {a.stromen.join(', ')}
              {meta.length > 0 ? ' · ' : ''}
            </span>
            {meta.length > 0 && <span>{meta.join(' · ')}</span>}
          </p>
        )}
        <details className="archief-meer">
          <summary>
            Details<span className="visueel-verborgen"> van {a.titel}</span>
          </summary>
          {a.omschrijving && <p className="archief-omschrijving">{a.omschrijving}</p>}
          <dl className="archief-dl">
            <dt className="alleen-mobiel">Procedure</dt>
            <dd className="alleen-mobiel">{a.procedure}</dd>
            <dt className="alleen-mobiel">Eerste publicatie</dt>
            <dd className="alleen-mobiel">{datum(a.publicatiedatum)}</dd>
            {a.type_opdracht && (
              <>
                <dt>Soort opdracht</dt>
                <dd>
                  {a.type_opdracht}
                  {a.europees !== null && (a.europees ? ', Europees' : ', nationaal')}
                </dd>
              </>
            )}
            {a.diensten.length > 0 && (
              <>
                <dt>Soort dienst</dt>
                <dd>{a.diensten.join(', ')}</dd>
              </>
            )}
            {a.cpv_hoofd && (
              <>
                <dt>Hoofd-CPV</dt>
                <dd>
                  {a.cpv_hoofd} {a.cpv_hoofd_omschrijving}
                </dd>
              </>
            )}
            {a.provincies.length > 0 && (
              <>
                <dt>Provincie</dt>
                <dd>
                  {a.provincies.join(', ')}
                  {a.provincie_bron === 'opdrachtgever' ? ' (afgeleid uit de naam van de opdrachtgever)' : ' (plaats van uitvoering)'}
                </dd>
              </>
            )}
            {a.tsender_url && (
              <>
                <dt>Documenten</dt>
                <dd>
                  <a href={a.tsender_url} target="_blank" rel="noopener noreferrer">
                    {a.tsender_naam ?? 'Extern platform'}
                    <span className="visueel-verborgen"> (opent in nieuw venster)</span>
                  </a>
                </dd>
              </>
            )}
          </dl>
          <p className="archief-tijdlijn-kop">Publicaties op TenderNed</p>
          <ol className="archief-tijdlijn">
            {a.publicaties.map((p) => (
              <li key={p.id}>
                <time dateTime={p.datum}>{datumKortNl(p.datum)}</time>{' '}
                <a href={`https://www.tenderned.nl/aankondigingen/overzicht/${p.id}`} target="_blank" rel="noopener noreferrer">
                  {p.omschrijving}
                  <span className="visueel-verborgen"> (opent in nieuw venster)</span>
                </a>
                {p.ingetrokken && ' (ingetrokken)'}
              </li>
            ))}
          </ol>
        </details>
      </td>
      <td data-label="Afvalstroom">
        <ul className="archief-stromen">
          {a.stromen.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </td>
      <td data-label="Procedure" className="archief-procedure">
        {procedureAfbreekbaar(a.procedure)}
      </td>
      <td data-label="Publicatie">
        <time dateTime={a.publicatiedatum}>{datumKortNl(a.publicatiedatum)}</time>
      </td>
      <td data-label="Sluiting">
        {a.sluitingsdatum ? (
          <div>
            {a.status === 'marktconsultatie' && <span className="archief-nog">reageren tot</span>}
            <time dateTime={a.sluitingsdatum}>{datumKortNl(a.sluitingsdatum.slice(0, 10))}</time>
            {a.sluiting_tijd_bekend && <span className="archief-tijd"> {sluitingTijd(a.sluitingsdatum)}</span>}
            {nog && <span className="archief-nog">{nog}</span>}
          </div>
        ) : (
          <span className="muted">Geen datum</span>
        )}
      </td>
      <td data-label="Status">
        <Badge soort={statusBadge(a.status)}>{STATUS_LABEL[a.status]}</Badge>
      </td>
    </tr>
  );
}

function Paginering({ pagina, paginas, naar }: { pagina: number; paginas: number; naar: (p: number) => void }) {
  const nummers = new Set<number>([1, paginas, pagina - 1, pagina, pagina + 1]);
  const lijst = [...nummers].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b);
  return (
    <nav className="archief-paginering" aria-label="Paginering">
      <button type="button" onClick={() => naar(pagina - 1)} disabled={pagina <= 1}>
        Vorige<span className="visueel-verborgen"> pagina</span>
      </button>
      <ul>
        {lijst.map((n, i) => (
          <li key={n}>
            {i > 0 && n - lijst[i - 1] > 1 && <span aria-hidden="true">…</span>}
            <button type="button" aria-current={n === pagina ? 'page' : undefined} onClick={() => naar(n)}>
              <span className="visueel-verborgen">Pagina </span>
              {getal(n)}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => naar(pagina + 1)} disabled={pagina >= paginas}>
        Volgende<span className="visueel-verborgen"> pagina</span>
      </button>
    </nav>
  );
}

function Bronvermelding({ kern }: { kern: Kerncijfers | null }) {
  return (
    <aside className="archief-bron" aria-label="Bron en actualiteit">
      <p>
        <strong>
          {kern ? `${getal(kern.totaal)} aanbestedingen` : 'Aanbestedingen'}
          {kern?.perStatus.open !== undefined ? `, waarvan ${getal(kern.perStatus.open)} open` : ''}.
        </strong>{' '}
        {kern?.laatsteVerversing ? <>Laatst bijgewerkt op {tijdstempel(kern.laatsteVerversing)}. </> : 'Elke ochtend bijgewerkt. '}
        Bron:{' '}
        <a href={aanbestedingenBron.url} target="_blank" rel="noopener noreferrer">
          {aanbestedingenBron.naam}
          <span className="visueel-verborgen"> (opent in nieuw venster)</span>
        </a>
        ,{' '}
        <a href={aanbestedingenBron.licentieUrl} target="_blank" rel="noopener noreferrer">
          {aanbestedingenBron.licentie}
          <span className="visueel-verborgen"> (opent in nieuw venster)</span>
        </a>
        . Juridisch geldt alleen de aankondiging op TenderNed.
      </p>
    </aside>
  );
}

function Toelichting({ oudste }: { oudste: string | null }) {
  return (
    <details className="kaart archief-toelichting">
      <summary>
        <h2>Zo komt dit overzicht tot stand</h2>
      </summary>
      <ul className="opsomming">
        <li>
          <strong>Welke aanbestedingen.</strong> {cpvFilterUitleg}
          {oudste ? <> De oudste is van {datum(oudste)}.</> : null} Publicaties met hetzelfde TenderNed-kenmerk (aankondiging,
          rectificatie, gunning) vormen samen één aanbesteding.
        </li>
        <li>
          <strong>Afvalstroom.</strong> Afgeleid uit de CPV-codes (bijvoorbeeld papier, medisch of gevaarlijk afval) en, omdat CPV-codes
          meestal geen materiaal noemen, uit trefwoorden in titel en omschrijving. Een aanbesteding kan meerdere stromen hebben. Lukt
          het niet, dan staat er “{STROMEN[STROMEN.length - 1]}”.
        </li>
        <li>
          <strong>Provincie.</strong> Uit de NUTS-code die de opdrachtgever als plaats van uitvoering opgeeft. Staat daar alleen
          “Nederland”, dan uit de naam van de opdrachtgever als die een gemeente of provincie noemt (
          <a href={gemeentenBron.url} target="_blank" rel="noopener noreferrer">
            {gemeentenBron.naam}
            <span className="visueel-verborgen"> (opent in nieuw venster)</span>
          </a>
          , peildatum {datum(gemeentenBron.peildatum)}). Lukt beide niet, dan blijft de provincie leeg.
        </li>
        <li>
          <strong>Status.</strong> De laatste beslissende publicatie telt: een gunning of wijziging geeft “Gegund”, een vroegtijdige
          beëindiging “Vroegtijdig beëindigd”. Een publicatie die zichzelf marktconsultatie of marktverkenning noemt, telt als
          marktconsultatie, ook als de opdrachtgever het formulier voor een aankondiging gebruikte. Anders bepaalt de sluitingsdatum of
          een aanbesteding open of gesloten is.
        </li>
      </ul>
      <p className="klein muted">
        TenderNed controleert de juistheid van aankondigingen niet; daarvoor is de opdrachtgever verantwoordelijk. Ziet u een fout in
        de indeling? Meld het via het feedbackformulier.
      </p>
    </details>
  );
}

/* ---------- Voorbeeldweergave achter de betaalmuur: grijze balken, geen echte data ---------- */

function Voorbeeldweergave() {
  const rijen = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div className="archief archief-voorbeeld">
      <div className="kaart">
        <h2>Zoeken en filteren</h2>
        <div className="filterbalk">
          {['Afvalstroom', 'Status', 'Provincie', 'Soort dienst'].map((l) => (
            <div className="veld" key={l}>
              <span className="veld-label">{l}</span>
              <span className="archief-balk breed" />
            </div>
          ))}
        </div>
      </div>
      <div className="kaart">
        <h2>Gesloten en gegunde aanbestedingen</h2>
        <table>
          <thead>
            <tr>
              <th>Opdrachtgever en opdracht</th>
              <th>Afvalstroom</th>
              <th>Publicatie</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((i) => (
              <tr key={i}>
                <td>
                  <span className="archief-balk" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
                  <span className="archief-balk dun" style={{ width: `${70 + ((i * 11) % 25)}%` }} />
                </td>
                <td>
                  <span className="archief-balk kort" />
                </td>
                <td>
                  <span className="archief-balk kort" />
                </td>
                <td>
                  <span className="archief-balk pil" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
