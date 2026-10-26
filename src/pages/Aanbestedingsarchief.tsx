import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, Kaart, KeuzeVeld, PaginaKop } from '../components/ui';
import { aanbestedingenBron, cpvFilterUitleg } from '../data/aanbestedingen';
import { useAuth } from '../lib/auth';
import {
  DIENSTEN,
  LEGE_FILTERS,
  PER_PAGINA,
  PROVINCIES,
  SORTERINGEN,
  STATUS_LABEL,
  STATUS_UITLEG,
  STATUS_VOLGORDE,
  STROMEN,
  dagenTot,
  filtersNaarUrl,
  filtersUitUrl,
  haalKerncijfers,
  sluitingTijd,
  statusBadge,
  tijdstempel,
  vandaagNl,
  zoekAanbestedingen,
  type AanbestedingRegel,
  type Filters,
  type Kerncijfers,
  type Sortering,
} from '../lib/aanbestedingen';
import { datum, datumKortNl, getal } from '../lib/format';
import './Aanbestedingsarchief.css';

export function Aanbestedingsarchief() {
  const { isLid } = useAuth();

  return (
    <>
      <PaginaKop titel="Aanbestedingsarchief" badges={<Badge soort="leden">🔒 Alleen leden</Badge>}>
        Aanbestedingen voor inzameling, transport en verwerking van afval, zoals opdrachtgevers die op TenderNed publiceren. Zoek op
        opdrachtgever of onderwerp, filter op afvalstroom, status en provincie en ga door naar de aankondiging.
      </PaginaKop>

      <Vergrendeld
        titel="Aanbestedingsarchief"
        ledenKrijgen={[
          'Alle aanbestedingen over afval van TenderNed op één plek, dagelijks bijgewerkt',
          'Zoeken en filteren op afvalstroom, status, provincie en soort dienst',
          'Per aanbesteding de tijdlijn van publicaties en de link naar de aankondiging',
        ]}
      >
        {isLid ? <Archief /> : <Voorbeeldweergave />}
      </Vergrendeld>
    </>
  );
}

/* ---------- Voor leden: het echte archief ---------- */

function Archief() {
  const [params, setParams] = useSearchParams();
  const filters = filtersUitUrl(params);
  const sleutel = filtersNaarUrl(filters).toString();

  const [resultaat, setResultaat] = useState<{ regels: AanbestedingRegel[]; totaal: number } | null>(null);
  const [fout, setFout] = useState(false);
  const [laden, setLaden] = useState(true);
  const [poging, setPoging] = useState(0);
  const [kern, setKern] = useState<Kerncijfers | null>(null);
  const [zoekInvoer, setZoekInvoer] = useState(filters.zoek);
  const resultatenKop = useRef<HTMLHeadingElement>(null);
  const focusNaLaden = useRef(false);

  // Zoekveld volgt de URL (bijvoorbeeld bij terug in de browser of een link met ?zoek=).
  useEffect(() => {
    setZoekInvoer(filters.zoek);
  }, [filters.zoek]);

  useEffect(() => {
    haalKerncijfers().then(setKern, () => setKern(null));
  }, []);

  useEffect(() => {
    let actief = true;
    setLaden(true);
    setFout(false);
    zoekAanbestedingen(filtersUitUrl(new URLSearchParams(sleutel))).then(
      (r) => {
        if (!actief) return;
        setResultaat(r);
        setLaden(false);
        if (focusNaLaden.current) {
          focusNaLaden.current = false;
          resultatenKop.current?.focus();
        }
      },
      () => {
        if (!actief) return;
        setFout(true);
        setLaden(false);
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

  function zoek(e: FormEvent) {
    e.preventDefault();
    zetFilters({ zoek: zoekInvoer }, { focus: true });
  }

  const actieveFilters = filtersNaarUrl({ ...filters, sortering: 'publicatie-nieuw', pagina: 1 }).toString() !== '';
  const totaal = resultaat?.totaal ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  const zoekId = useId();
  const vandaag = vandaagNl();

  return (
    <div className="archief">
      <Bronvermelding kern={kern} />

      <Kaart titel="Zoeken en filteren" kopNiveau={2}>
        <form className="archief-zoek" role="search" onSubmit={zoek}>
          <div className="veld">
            <label htmlFor={zoekId}>Zoeken in titel, opdrachtgever en omschrijving</label>
            <div className="invoer">
              <input
                id={zoekId}
                type="search"
                value={zoekInvoer}
                maxLength={200}
                placeholder="Bijvoorbeeld: GFT Utrecht"
                onChange={(e) => setZoekInvoer(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="primair">
            Zoeken
          </button>
        </form>

        <div className="filterbalk archief-filters">
          <KeuzeVeld<string>
            label="Afvalstroom"
            waarde={filters.stroom}
            onChange={(v) => zetFilters({ stroom: v })}
            opties={[{ waarde: '', label: 'Alle afvalstromen' }, ...STROMEN.map((s) => ({ waarde: s, label: s }))]}
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
              { waarde: 'landelijk', label: 'Landelijk of niet vermeld' },
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
      </Kaart>

      <section className="kaart archief-resultaten" aria-labelledby="archief-resultaten-kop">
        <h2 id="archief-resultaten-kop" ref={resultatenKop} tabIndex={-1}>
          Resultaten
        </h2>
        <p className="archief-aantal" role="status" aria-live="polite">
          {laden && !resultaat
            ? 'Aanbestedingen laden…'
            : fout
              ? ''
              : totaal === 0
                ? 'Geen aanbestedingen gevonden.'
                : `${getal(totaal)} ${totaal === 1 ? 'aanbesteding' : 'aanbestedingen'} gevonden${
                    paginas > 1 ? `, pagina ${getal(filters.pagina)} van ${getal(paginas)}` : ''
                  }.`}
        </p>

        {fout && (
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
              <caption>
                Bron: TenderNed. Afvalstroom en soort dienst zijn afgeleid uit CPV-codes en trefwoorden; controleer de aankondiging.
              </caption>
              <thead>
                <tr>
                  <th scope="col" aria-sort={filters.sortering === 'opdrachtgever' ? 'ascending' : undefined}>
                    Opdrachtgever en opdracht
                  </th>
                  <th scope="col">Afvalstroom</th>
                  <th scope="col">Procedure</th>
                  <th scope="col">Provincie</th>
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
                  <th scope="col">Aankondiging</th>
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

function Regel({ a, vandaag }: { a: AanbestedingRegel; vandaag: string }) {
  const dagen = a.sluitingsdatum ? dagenTot(a.sluitingsdatum, vandaag) : null;
  return (
    <tr>
      <td data-label="Opdracht" className="archief-opdracht">
        <span className="archief-opdrachtgever">{a.opdrachtgever}</span>
        <span className="archief-titel">{a.titel}</span>
        <details className="archief-meer">
          <summary>
            Details<span className="visueel-verborgen"> van {a.titel}</span>
          </summary>
          {a.omschrijving && <p className="archief-omschrijving">{a.omschrijving}</p>}
          <dl className="archief-dl">
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
      <td data-label="Procedure">{a.procedure}</td>
      <td data-label="Provincie">{a.provincies.length ? a.provincies.join(', ') : <span className="muted">Landelijk of niet vermeld</span>}</td>
      <td data-label="Publicatie">
        <time dateTime={a.publicatiedatum}>{datumKortNl(a.publicatiedatum)}</time>
      </td>
      <td data-label="Sluiting">
        {a.sluitingsdatum ? (
          <>
            <time dateTime={a.sluitingsdatum}>{datumKortNl(a.sluitingsdatum.slice(0, 10))}</time>
            {a.sluiting_tijd_bekend && <span className="archief-tijd"> {sluitingTijd(a.sluitingsdatum)}</span>}
            {a.status === 'open' && dagen !== null && dagen >= 0 && (
              <span className="archief-nog">{dagen === 0 ? 'vandaag' : `nog ${getal(dagen)} ${dagen === 1 ? 'dag' : 'dagen'}`}</span>
            )}
          </>
        ) : (
          <span className="muted">Niet vermeld</span>
        )}
      </td>
      <td data-label="Status">
        <span title={STATUS_UITLEG[a.status]}>
          <Badge soort={statusBadge(a.status)}>{STATUS_LABEL[a.status]}</Badge>
        </span>
      </td>
      <td data-label="Aankondiging">
        <a href={a.tenderned_url} target="_blank" rel="noopener noreferrer">
          TenderNed<span className="visueel-verborgen">: {a.titel} (opent in nieuw venster)</span>
        </a>
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
        <strong>Bron:</strong>{' '}
        <a href={aanbestedingenBron.url} target="_blank" rel="noopener noreferrer">
          {aanbestedingenBron.naam}
          <span className="visueel-verborgen"> (opent in nieuw venster)</span>
        </a>
        ,{' '}
        <a href={aanbestedingenBron.licentieUrl} target="_blank" rel="noopener noreferrer">
          {aanbestedingenBron.licentie}
          <span className="visueel-verborgen"> (opent in nieuw venster)</span>
        </a>
        . {cpvFilterUitleg}
      </p>
      <p>
        {kern ? (
          <>
            {getal(kern.totaal)} aanbestedingen
            {kern.laatsteVerversing ? <>, laatst bijgewerkt op {tijdstempel(kern.laatsteVerversing)}</> : null}. Elke ochtend bijgewerkt.
          </>
        ) : (
          'Elke ochtend bijgewerkt.'
        )}{' '}
        Juridisch geldt alleen de aankondiging op TenderNed.
      </p>
    </aside>
  );
}

function Toelichting({ oudste }: { oudste: string | null }) {
  return (
    <Kaart titel="Zo komt dit overzicht tot stand" kopNiveau={2}>
      <ul className="opsomming">
        <li>
          <strong>Welke aanbestedingen.</strong> Alle publicaties op TenderNed met CPV-code 90500000 (diensten op het gebied van
          vuilnis en afval) of een code daaronder{oudste ? <>, de oudste van {datum(oudste)}</> : null}. Publicaties met hetzelfde TenderNed-kenmerk vormen samen één aanbesteding.
        </li>
        <li>
          <strong>Afvalstroom.</strong> Afgeleid uit de CPV-codes (bijvoorbeeld papier, medisch of gevaarlijk afval) en, omdat CPV-codes
          meestal geen materiaal noemen, uit trefwoorden in titel en omschrijving. Een aanbesteding kan meerdere stromen hebben. Lukt
          het niet, dan staat er “{STROMEN[STROMEN.length - 1]}”.
        </li>
        <li>
          <strong>Provincie.</strong> Uit de NUTS-code die de opdrachtgever als plaats van uitvoering opgeeft. Staat daar alleen
          “Nederland”, dan ziet u “Landelijk of niet vermeld”.
        </li>
        <li>
          <strong>Status.</strong>{' '}
          {STATUS_VOLGORDE.slice(0, 6).map((s, i) => (
            <span key={s}>
              {i > 0 && ' '}
              <em>{STATUS_LABEL[s]}</em>: {STATUS_UITLEG[s].replace(/\.$/, '')}.
            </span>
          ))}
        </li>
      </ul>
      <p className="klein muted">
        TenderNed controleert de juistheid van aankondigingen niet; daarvoor is de opdrachtgever verantwoordelijk. Ziet u een fout in
        de indeling? Meld het via het feedbackformulier.
      </p>
    </Kaart>
  );
}

/* ---------- Voor bezoekers: wazige voorbeeldweergave zonder echte data ---------- */

function Voorbeeldweergave() {
  const rijen = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div className="archief archief-voorbeeld">
      <div className="kaart">
        <h2>Zoeken en filteren</h2>
        <div className="filterbalk">
          {['Zoeken', 'Afvalstroom', 'Status', 'Provincie'].map((l) => (
            <div className="veld" key={l}>
              <span className="veld-label">{l}</span>
              <span className="archief-balk breed" />
            </div>
          ))}
        </div>
      </div>
      <div className="kaart">
        <h2>Resultaten</h2>
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
