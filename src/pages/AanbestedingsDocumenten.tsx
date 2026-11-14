import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, KeuzeVeld, PaginaKop } from '../components/ui';
import { isToegangOnbekend, useAuth } from '../lib/auth';
import {
  DOCUMENTSOORTEN,
  DOC_PER_PAGINA,
  DOC_SORTERINGEN,
  LEGE_DOC_FILTERS,
  SOORT_LABEL,
  STATUS_LABEL,
  bestandsgrootte,
  docFiltersNaarUrl,
  docFiltersUitUrl,
  haalDocOpties,
  haalOpenbareDocumentTotalen,
  statusBadge,
  typeLabel,
  zoekDocumenten,
  type DocFilters,
  type DocOpties,
  type DocumentTreffer,
} from '../lib/aanbestedingen';
import { datumKortNl, getal } from '../lib/format';
import { Paginering } from './Aanbestedingsarchief';
import './Aanbestedingsarchief.css';

/** Documentenbibliotheek: documenten van andere aanbestedingen vinden (alleen leden). Bezoekers zien alleen totalen. */
export function AanbestedingsDocumenten() {
  const auth = useAuth();
  const { isLid } = auth;
  return (
    <>
      <PaginaKop
        titel="Documentenbibliotheek"
        badges={isLid ? <Badge soort="leden">Voor leden</Badge> : <Badge soort="leden"><span aria-hidden="true">🔒</span> Alleen leden</Badge>}
      >
        Hoe hebben andere opdrachtgevers hun aanbesteding opgezet? Zoek de leidraden, programma&rsquo;s van eisen, gunningscriteria en
        conceptovereenkomsten van aanbestedingen over afval en open ze bij TenderNed.
      </PaginaKop>
      <p className="archief-bibliotheek">
        <Link to="/aanbestedingsarchief">Terug naar het aanbestedingsarchief</Link>
      </p>
      {isToegangOnbekend(auth) ? (
        <p className="sectie muted" style={{ minHeight: '100vh' }}>
          Toegang controleren…
        </p>
      ) : (
        <>
          <Vergrendeld
            titel="Documentenbibliotheek"
            ledenKrijgen={[
              'Zoeken en filteren op afvalstroom, soort document, jaar, opdrachtgever en procedure',
              'Per document de aanbesteding erbij (opdrachtgever, titel, status, jaar) en de link naar het document op TenderNed',
              'Direct naar bijvoorbeeld alle conceptovereenkomsten voor gft',
            ]}
          >
            {isLid ? <Bibliotheek /> : <Voorbeeld />}
          </Vergrendeld>
          {!isLid && <Totalen />}
        </>
      )}
    </>
  );
}

/** Bezoekers: wat de bibliotheek bevat, in aantallen. Geen documentregels. */
function Totalen() {
  const [t, setT] = useState<Awaited<ReturnType<typeof haalOpenbareDocumentTotalen>> | null>(null);
  useEffect(() => {
    haalOpenbareDocumentTotalen().then(setT, () => setT(null));
  }, []);
  if (!t || t.totaal === 0) return null;
  const volgorde = DOCUMENTSOORTEN.map((s) => s.code as string);
  const rijen = [...t.perSoort].sort((a, b) => volgorde.indexOf(a.soort) - volgorde.indexOf(b.soort));
  return (
    <section className="kaart vlak" aria-labelledby="bib-totalen-kop">
      <h2 id="bib-totalen-kop" className="balk">Wat de bibliotheek bevat</h2>
      <p>
        {getal(t.totaal)} documenten bij {getal(t.aanbestedingen)} aanbestedingen. Leden zoeken erin en openen de documenten bij TenderNed.
      </p>
      <table className="bib-totalen">
        <caption className="visueel-verborgen">Aantal documenten per soort</caption>
        <thead>
          <tr>
            <th scope="col">Soort document</th>
            <th scope="col" className="getal">Aantal</th>
          </tr>
        </thead>
        <tbody>
          {rijen.map((r) => (
            <tr key={r.soort}>
              <th scope="row">{SOORT_LABEL[r.soort] ?? r.soort}</th>
              <td className="getal">{getal(r.documenten)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">De soort is een indeling van dit platform, afgeleid van de bestandsnaam.</p>
    </section>
  );
}

function Voorbeeld() {
  return (
    <div className="archief-voorbeeld" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <p key={i}>
          <span className="archief-balk breed" />
          <span className="archief-balk dun" />
        </p>
      ))}
    </div>
  );
}

function Bibliotheek() {
  const [params, setParams] = useSearchParams();
  const filters = docFiltersUitUrl(params);
  const sleutel = docFiltersNaarUrl(filters).toString();
  const [resultaat, setResultaat] = useState<{ voor: string; regels: DocumentTreffer[]; totaal: number } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [poging, setPoging] = useState(0);
  const [opties, setOpties] = useState<DocOpties | null>(null);
  const [zoekInvoer, setZoekInvoer] = useState(filters.zoek);
  const kop = useRef<HTMLHeadingElement>(null);
  const focusNaLaden = useRef(false);
  const zoekId = useId();

  useEffect(() => setZoekInvoer(filters.zoek), [filters.zoek]);
  useEffect(() => {
    haalDocOpties().then(setOpties, () => setOpties(null));
  }, []);

  useEffect(() => {
    let actief = true;
    setFout(null);
    zoekDocumenten(docFiltersUitUrl(new URLSearchParams(sleutel))).then(
      (r) => {
        if (!actief) return;
        setResultaat({ voor: sleutel, ...r });
        if (focusNaLaden.current) {
          focusNaLaden.current = false;
          kop.current?.focus();
        }
      },
      () => actief && setFout(sleutel),
    );
    return () => {
      actief = false;
    };
  }, [sleutel, poging]);

  const zetFilters = useCallback(
    (nieuw: Partial<DocFilters>, o: { focus?: boolean } = {}) => {
      const volgend = { ...docFiltersUitUrl(params), ...nieuw };
      if (!('pagina' in nieuw)) volgend.pagina = 1;
      if (o.focus) focusNaLaden.current = true;
      setParams(docFiltersNaarUrl(volgend), { replace: !('pagina' in nieuw) });
    },
    [params, setParams],
  );

  useEffect(() => {
    if (zoekInvoer.trim() === filters.zoek.trim()) return;
    const t = window.setTimeout(() => zetFilters({ zoek: zoekInvoer }), 450);
    return () => window.clearTimeout(t);
  }, [zoekInvoer, filters.zoek, zetFilters]);

  const laden = !fout && resultaat?.voor !== sleutel;
  const totaal = resultaat?.totaal ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / DOC_PER_PAGINA));
  const voorbijEinde = !laden && !fout && resultaat !== null && totaal > 0 && filters.pagina > paginas;
  useEffect(() => {
    if (voorbijEinde) setParams(docFiltersNaarUrl({ ...filters, pagina: paginas }), { replace: true });
  }, [voorbijEinde, filters, paginas, setParams]);

  const actief = docFiltersNaarUrl({ ...filters, sortering: 'nieuw', pagina: 1 }).toString() !== '';
  const metAantal = (n: string, a: number | undefined) => (a !== undefined ? `${n} (${getal(a)})` : n);
  const soortAantal = (c: string) => opties?.soorten.find((s) => s.naam === c)?.aantal;

  return (
    <div className="archief">
      <section className="kaart vlak archief-filterkaart" aria-labelledby="bib-filter-kop">
        <h2 id="bib-filter-kop" className="balk">Zoeken en filteren</h2>
        <form
          className="archief-zoek"
          role="search"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            zetFilters({ zoek: zoekInvoer }, { focus: true });
          }}
        >
          <div className="veld">
            <label htmlFor={zoekId}>Zoeken in documentnaam, titel en opdrachtgever</label>
            <div className="invoer">
              <input
                id={zoekId}
                type="search"
                value={zoekInvoer}
                maxLength={200}
                placeholder="Bijvoorbeeld: overeenkomst GFT"
                onChange={(e) => setZoekInvoer(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="primair">
            Zoeken
          </button>
        </form>
        <div className="archief-filters">
          <KeuzeVeld<string>
            label="Afvalstroom"
            waarde={filters.stroom}
            onChange={(v) => zetFilters({ stroom: v })}
            opties={[
              { waarde: '', label: 'Alle afvalstromen' },
              ...(opties?.stromen ?? []).map((s) => ({ waarde: s.naam, label: metAantal(s.naam, s.aantal) })),
              ...(filters.stroom && !opties?.stromen.some((s) => s.naam === filters.stroom) ? [{ waarde: filters.stroom, label: filters.stroom }] : []),
            ]}
          />
          <KeuzeVeld<string>
            label="Soort document"
            waarde={filters.soort}
            onChange={(v) => zetFilters({ soort: v })}
            opties={[
              { waarde: '', label: 'Alle soorten' },
              ...DOCUMENTSOORTEN.map((s) => ({ waarde: s.code as string, label: metAantal(s.label, soortAantal(s.code)) })),
            ]}
          />
          <KeuzeVeld<string>
            label="Jaar van publicatie"
            waarde={filters.jaar}
            onChange={(v) => zetFilters({ jaar: v })}
            opties={[
              { waarde: '', label: 'Alle jaren' },
              ...(opties?.jaren ?? []).map((j) => ({ waarde: String(j.naam), label: metAantal(String(j.naam), j.aantal) })),
              ...(filters.jaar && !opties?.jaren.some((j) => String(j.naam) === filters.jaar) ? [{ waarde: filters.jaar, label: filters.jaar }] : []),
            ]}
          />
          <KeuzeVeld<string>
            label="Opdrachtgever"
            waarde={filters.opdrachtgever}
            onChange={(v) => zetFilters({ opdrachtgever: v })}
            opties={[
              { waarde: '', label: 'Alle opdrachtgevers' },
              ...(opties?.opdrachtgevers ?? []).map((o) => ({ waarde: o.naam, label: metAantal(o.naam, o.aantal) })),
              ...(filters.opdrachtgever && !opties?.opdrachtgevers.some((o) => o.naam === filters.opdrachtgever)
                ? [{ waarde: filters.opdrachtgever, label: filters.opdrachtgever }]
                : []),
            ]}
          />
          <KeuzeVeld<string>
            label="Procedure"
            waarde={filters.procedure}
            onChange={(v) => zetFilters({ procedure: v })}
            opties={[
              { waarde: '', label: 'Alle procedures' },
              ...(opties?.procedures ?? []).map((p) => ({ waarde: p.naam, label: metAantal(p.naam, p.aantal) })),
              ...(filters.procedure && !opties?.procedures.some((p) => p.naam === filters.procedure) ? [{ waarde: filters.procedure, label: filters.procedure }] : []),
            ]}
          />
          <KeuzeVeld<DocFilters['sortering']>
            label="Sorteren op"
            waarde={filters.sortering}
            onChange={(v) => zetFilters({ sortering: v })}
            opties={DOC_SORTERINGEN.map((s) => ({ waarde: s.waarde, label: s.label }))}
          />
        </div>
        {actief && (
          <button
            type="button"
            className="archief-wissen"
            onClick={() => {
              setZoekInvoer('');
              setParams(docFiltersNaarUrl({ ...LEGE_DOC_FILTERS, sortering: filters.sortering }), { replace: true });
            }}
          >
            Alle filters wissen
          </button>
        )}
      </section>

      <section className="kaart archief-resultaten" aria-labelledby="bib-resultaten-kop">
        <h2 id="bib-resultaten-kop" className="balk" ref={kop} tabIndex={-1}>
          Documenten
        </h2>
        <p className="archief-aantal" role="status" aria-live="polite">
          {laden && !resultaat
            ? 'Documenten laden…'
            : fout
              ? ''
              : totaal === 0
                ? 'Geen documenten gevonden.'
                : `${getal(totaal)} ${totaal === 1 ? 'document' : 'documenten'} gevonden${paginas > 1 ? `, pagina ${getal(Math.min(filters.pagina, paginas))} van ${getal(paginas)}` : ''}.`}
        </p>
        <p className="hint">
          De documenten staan op TenderNed; dit platform bewaart ze niet. De soort is een indeling van dit platform, afgeleid van de
          bestandsnaam.
        </p>

        {fout === sleutel && (
          <div role="alert" className="archief-fout">
            <p>De documenten konden niet worden geladen. Controleer uw internetverbinding en probeer het opnieuw.</p>
            <button type="button" onClick={() => setPoging((p) => p + 1)}>
              Opnieuw proberen
            </button>
          </div>
        )}

        {!fout && resultaat && resultaat.regels.length > 0 && (
          <ul className={`bib-lijst${laden ? ' is-laden' : ''}`} aria-busy={laden}>
            {resultaat.regels.map((d) => (
              <li key={`${d.kenmerk}-${d.document_id}`} className="bib-treffer">
                <a className="bib-naam" href={d.url} target="_blank" rel="noopener noreferrer">
                  {d.naam}
                  <span className="visueel-verborgen"> (opent op TenderNed in nieuw venster)</span>
                </a>
                <p className="bib-meta">
                  <Badge soort="thema">{SOORT_LABEL[d.soort] ?? d.soort}</Badge>{' '}
                  {[typeLabel(d.bestandstype), bestandsgrootte(d.grootte)].filter(Boolean).join(' · ')}
                </p>
                <p className="bib-aanbesteding">
                  <span className="archief-opdrachtgever">{d.opdrachtgever}</span>
                  <Link to={`/aanbestedingsarchief?zoek=${d.kenmerk}`}>{d.titel}</Link>
                </p>
                <p className="bib-meta">
                  <Badge soort={statusBadge(d.status)}>{STATUS_LABEL[d.status]}</Badge> Gepubliceerd {datumKortNl(d.publicatiedatum)} · {d.procedure}
                  {d.stromen.length > 0 ? ` · ${d.stromen.join(', ')}` : ''} ·{' '}
                  <a href={d.tenderned_url} target="_blank" rel="noopener noreferrer">
                    Aankondiging op TenderNed<span className="visueel-verborgen"> (opent in nieuw venster)</span>
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
        {!fout && totaal === 0 && !laden && actief && <p>Probeer minder filters of een ander zoekwoord.</p>}
        {paginas > 1 && !fout && (
          <Paginering pagina={Math.min(filters.pagina, paginas)} paginas={paginas} naar={(p) => zetFilters({ pagina: p }, { focus: true })} />
        )}
      </section>
    </div>
  );
}
