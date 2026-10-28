import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Kaart, PaginaKop, ToegangBadge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { beschrijfLidmaatschap, organisatietypeLabel, organisatietypeUitleg, type StatusBeschrijving } from '../lib/authStatus';
import { alleOnderdelen, ledenOnderdelen } from '../lib/authAanbod';
import {
  LEGE_FILTERS,
  SNELKEUZES,
  STATUS_LABEL,
  STROMEN,
  filtersNaarUrl,
  statusBadge,
  tijdstempel,
  zoekAanbestedingen,
  type AanbestedingRegel,
  type Filters,
} from '../lib/aanbestedingen';
import { haalOpenbareStand, type OpenbareStand } from '../lib/authOpen';
import { nieuws } from '../data/nieuws';
import { MIN_WACHTWOORD, authFoutmelding, controleerNieuwWachtwoord } from '../lib/authFouten';
import { supabase } from '../lib/supabase';
import { datum, getal } from '../lib/format';
import { contact, platform } from '../data/site';
import '../components/betaalmuur/toegang.css';

function WachtwoordWijzigen() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [nieuw, setNieuw] = useState('');
  const [herhaal, setHerhaal] = useState('');
  const [toon, setToon] = useState(false);
  const [fout, setFout] = useState<{ veld: 'nieuw' | 'herhaal' | 'server'; melding: string } | null>(null);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const nieuwRef = useRef<HTMLInputElement>(null);
  const herhaalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) nieuwRef.current?.focus();
  }, [open]);

  async function opslaan(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    const f = controleerNieuwWachtwoord(nieuw, herhaal);
    if (f) {
      setFout(f);
      (f.veld === 'nieuw' ? nieuwRef : herhaalRef).current?.focus();
      return;
    }
    setBezig(true);
    const { error } = await supabase.auth.updateUser({ password: nieuw });
    setBezig(false);
    if (error) {
      setFout({ veld: 'server', melding: authFoutmelding(error) });
      return;
    }
    setNieuw('');
    setHerhaal('');
    setOpen(false);
    setKlaar(true);
  }

  if (!open) {
    return (
      <div className="stapel">
        {klaar && (
          <p className="notitie succes" role="status">
            <span aria-hidden="true">✓ </span>Uw nieuwe wachtwoord is opgeslagen.
          </p>
        )}
        <div className="knoppen">
          <button type="button" onClick={() => { setKlaar(false); setOpen(true); }}>
            Wachtwoord instellen of wijzigen
          </button>
        </div>
      </div>
    );
  }

  const fNieuw = fout?.veld === 'nieuw' ? fout.melding : undefined;
  const fHerhaal = fout?.veld === 'herhaal' ? fout.melding : undefined;
  return (
    <form className="toegang-formulier" onSubmit={opslaan} noValidate aria-labelledby={`${id}-kop`}>
      <h3 id={`${id}-kop`}>Nieuw wachtwoord</h3>
      {fout?.veld === 'server' && (
        <div className="melding-fout" role="alert">
          <strong>Dat lukte niet</strong>
          {fout.melding}
        </div>
      )}
      <div className="veld">
        <label htmlFor={`${id}-nieuw`}>Nieuw wachtwoord</label>
        <div className="invoer" data-fout={fNieuw ? 'true' : 'false'}>
          <input
            id={`${id}-nieuw`}
            ref={nieuwRef}
            type={toon ? 'text' : 'password'}
            autoComplete="new-password"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            aria-invalid={fNieuw ? true : undefined}
            aria-describedby={`${id}-nieuw-hint${fNieuw ? ` ${id}-nieuw-fout` : ''}`}
          />
        </div>
        <span className="hint" id={`${id}-nieuw-hint`}>
          Minimaal {MIN_WACHTWOORD} tekens. Een zin van een paar woorden is sterk en goed te onthouden.
        </span>
        {fNieuw && (
          <span className="foutmelding" id={`${id}-nieuw-fout`}>
            {fNieuw}
          </span>
        )}
      </div>
      <div className="veld">
        <label htmlFor={`${id}-herhaal`}>Herhaal nieuw wachtwoord</label>
        <div className="invoer" data-fout={fHerhaal ? 'true' : 'false'}>
          <input
            id={`${id}-herhaal`}
            ref={herhaalRef}
            type={toon ? 'text' : 'password'}
            autoComplete="new-password"
            value={herhaal}
            onChange={(e) => setHerhaal(e.target.value)}
            aria-invalid={fHerhaal ? true : undefined}
            aria-describedby={fHerhaal ? `${id}-herhaal-fout` : undefined}
          />
        </div>
        {fHerhaal && (
          <span className="foutmelding" id={`${id}-herhaal-fout`}>
            {fHerhaal}
          </span>
        )}
      </div>
      <label className="keuze">
        <input type="checkbox" checked={toon} onChange={(e) => setToon(e.target.checked)} />
        Toon wachtwoorden
      </label>
      <div className="knoppen">
        <button type="submit" className="primair" disabled={bezig}>
          {bezig ? 'Opslaan…' : 'Wachtwoord opslaan'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setFout(null); }}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

/** Opent in een nieuw venster; dat melden we ook aan schermlezers. */
function Extern({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="visueel-verborgen"> (opent in nieuw venster)</span>
    </a>
  );
}

/* ---------- Bovenaan: de stand van het lidmaatschap ---------- */

function StatusKaart({ beschrijving }: { beschrijving: StatusBeschrijving }) {
  const { lidStatus, lidmaatschap, isLid, verversLidmaatschap } = useAuth();

  let inhoud: ReactNode;
  if (lidStatus === 'laden') {
    inhoud = (
      <p role="status" className="muted">
        Lidmaatschap controleren…
      </p>
    );
  } else if (lidStatus === 'fout') {
    inhoud = (
      <>
        <div className="melding-fout" role="alert">
          <strong>Controle mislukt</strong>
          Het lidmaatschap kon niet worden opgehaald. Controleer uw internetverbinding en probeer het opnieuw.
        </div>
        <div className="knoppen">
          <button type="button" onClick={verversLidmaatschap}>
            Opnieuw controleren
          </button>
        </div>
      </>
    );
  } else {
    inhoud = (
      <>
        <dl className="account-kern">
          <div>
            <dt>Status</dt>
            <dd>
              <span className="statuslabel" data-soort={beschrijving.soort} data-testid="lidstatus">
                <span aria-hidden="true">{beschrijving.soort === 'actief' ? '✓' : beschrijving.soort === 'let-op' ? '!' : '–'}</span>
                {beschrijving.label}
              </span>
            </dd>
          </div>
          <div>
            <dt>Organisatie</dt>
            <dd data-testid="organisatie">{lidmaatschap?.organisatie ?? 'Geen organisatie gevonden'}</dd>
          </div>
          <div>
            <dt>Geldig tot</dt>
            <dd data-testid="geldig-tot">{beschrijving.geldigTot}</dd>
          </div>
        </dl>
        <p>{beschrijving.uitleg}</p>
        {isLid && beschrijving.soort === 'let-op' && (
          <div className="knoppen">
            <a
              className="knop primair"
              href={`mailto:${contact.email}?subject=${encodeURIComponent(`Verlenging lidmaatschap ${lidmaatschap?.organisatie ?? ''}`)}`}
            >
              Verlenging regelen
            </a>
          </div>
        )}
        {!isLid && (
          <div className="knoppen">
            <Link className="knop primair" to="/lidmaatschap/aanmelden">
              {lidmaatschap ? 'Lidmaatschap verlengen of opnieuw aanmelden' : 'Lid worden'}
            </Link>
            <Link className="knop" to="/lidmaatschap">
              Lidmaatschap en prijzen
            </Link>
          </div>
        )}
      </>
    );
  }

  return (
    <Kaart titel="Lidmaatschap" className="account-status" id="lidmaatschap">
      {inhoud}
    </Kaart>
  );
}

/* ---------- Snel naar ---------- */

/** Stand van het archief (totalen en laatste verversing), één keer per paginalading. */
function useOpenbareStand(): OpenbareStand | null {
  const [stand, setStand] = useState<OpenbareStand | null>(null);
  useEffect(() => {
    let actief = true;
    haalOpenbareStand().then(
      (s) => actief && setStand(s),
      () => undefined,
    );
    return () => {
      actief = false;
    };
  }, []);
  return stand;
}

/** Snelkeuzes in de brede archieftegel: open aanbestedingen voor iedereen, de rest voor leden. */
function ArchiefKeuzes({ isLid, stand }: { isLid: boolean; stand: OpenbareStand | null }) {
  const keuzes = SNELKEUZES.filter((k) => isLid || k.filters.status === 'open');
  return (
    <span className="snel-keuzes">
      {keuzes.map((k) => {
        const isOpen = k.filters.status === 'open';
        const label = isOpen ? 'Open voor inschrijving' : k.label;
        return (
          <Link key={k.label} to={archiefPad({ ...LEGE_FILTERS, ...k.filters })}>
            {label}
            {isOpen && stand ? ` (${getal(stand.open)})` : ''}
          </Link>
        );
      })}
    </span>
  );
}

function SnelNaar({ stand }: { stand: OpenbareStand | null }) {
  const { isLid, lidStatus } = useAuth();
  // Slotjes pas tonen als vaststaat dat iemand geen lid is, anders knipperen ze bij leden.
  const toonToegang = lidStatus === 'klaar' && !isLid;
  const open = alleOnderdelen.filter((o) => !o.ledenDeel);
  // Archief eerst (breed); daarnaast de tegel met de kortste beschrijving, zodat de eerste rij niet leeg oogt.
  const [archief, ...rest] = ledenOnderdelen;
  const kortste = rest.reduce((k, o) => (o.omschrijving.length < k.omschrijving.length ? o : k), rest[0]);
  const tegels = [archief, kortste, ...rest.filter((o) => o !== kortste)];
  return (
    <section className="sectie" aria-labelledby="snel-naar">
      <h2 id="snel-naar">Snel naar</h2>
      <ul className="snelkoppelingen">
        {tegels.map((o, i) => (
          // De eerste tegel (het archief) is breed: zo vullen vijf tegels op desktop twee rijen van drie kolommen.
          <li key={o.pad} className={i === 0 ? 'breed' : undefined}>
            <Link to={o.pad}>
              <span className="snel-titel">{o.titel}</span>
              <span className="snel-tekst">
                {o.omschrijving}
                {o.pad === '/aanbestedingsarchief' && stand && ` Nu ${getal(stand.totaal)} aanbestedingen, waarvan ${getal(stand.open)} open.`}
              </span>
            </Link>
            {o.pad === '/aanbestedingsarchief' && <ArchiefKeuzes isLid={isLid} stand={stand} />}
            {toonToegang && <ToegangBadge toegang={o.toegang} />}
          </li>
        ))}
      </ul>
      <p className="snel-open">
        <span>Open voor iedereen:</span>
        {open.map((o) => (
          <Link key={o.pad} to={o.pad}>
            {o.titel}
          </Link>
        ))}
      </p>
    </section>
  );
}

/* ---------- Recent: aanbestedingen (alleen leden) en nieuws ---------- */

type Laadstand<T> = { stand: 'laden' } | { stand: 'fout' } | { stand: 'klaar'; data: T };
type Keuze = 'nieuw' | 'sluit';

const KEUZES: { waarde: Keuze; label: string; filters: Partial<Filters> }[] = [
  { waarde: 'nieuw', label: 'Nieuwst gepubliceerd', filters: { sortering: 'publicatie-nieuw' } },
  { waarde: 'sluit', label: 'Open, sluit het eerst', filters: { status: 'open', sortering: 'sluiting-op' } },
];

/** Adres van het archief met dezelfde filters als de lijst op de accountpagina. */
function archiefPad(f: Filters): string {
  const q = filtersNaarUrl(f).toString();
  return q ? `/aanbestedingsarchief?${q}` : '/aanbestedingsarchief';
}

function NieuwsteAanbestedingen({ stand }: { stand: OpenbareStand | null }) {
  const id = useId();
  const [keuze, setKeuze] = useState<Keuze>('nieuw');
  const [stroom, setStroom] = useState('');
  const [r, setR] = useState<Laadstand<{ regels: AanbestedingRegel[]; totaal: number }>>({ stand: 'laden' });
  const bijgewerkt = stand?.laatsteVerversing ?? null;
  const huidig = KEUZES.find((k) => k.waarde === keuze)!;
  const filters: Filters = { ...LEGE_FILTERS, ...huidig.filters, stroom };

  useEffect(() => {
    let actief = true;
    setR({ stand: 'laden' });
    zoekAanbestedingen({ ...LEGE_FILTERS, ...huidig.filters, stroom })
      .then((res) => actief && setR({ stand: 'klaar', data: { regels: res.regels.slice(0, 3), totaal: res.totaal } }))
      .catch(() => actief && setR({ stand: 'fout' }));
    return () => {
      actief = false;
    };
  }, [huidig, stroom]);

  const open = keuze === 'sluit';
  return (
    <Kaart
      titel="Aanbestedingen"
      sub={
        <>
          Uit het aanbestedingsarchief, bron TenderNed. Elke ochtend bijgewerkt
          {bijgewerkt ? <>, laatst op {tijdstempel(bijgewerkt)}</> : null}.
        </>
      }
      className="recent"
    >
      <div className="recent-filters">
        <div className="keuzeknoppen" role="group" aria-label="Welke aanbestedingen">
          {KEUZES.map((k) => (
            <button key={k.waarde} type="button" aria-pressed={keuze === k.waarde} onClick={() => setKeuze(k.waarde)}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="veld recent-stroom">
          <label htmlFor={`${id}-stroom`}>Afvalstroom</label>
          <div className="invoer">
            <select id={`${id}-stroom`} value={stroom} onChange={(e) => setStroom(e.target.value)}>
              <option value="">Alle afvalstromen</option>
              {STROMEN.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="recent-inhoud" aria-live="polite">
        {r.stand === 'laden' && (
          <p role="status" className="muted">
            Aanbestedingen laden…
          </p>
        )}
        {r.stand === 'fout' && (
          <p role="alert">
            De aanbestedingen konden niet worden geladen. Probeer het later opnieuw in het <Link to="/aanbestedingsarchief">archief</Link>.
          </p>
        )}
        {r.stand === 'klaar' && r.data.regels.length === 0 && (
          <p>
            Geen {open ? 'open ' : ''}aanbestedingen gevonden{stroom ? ` voor de afvalstroom “${stroom}”` : ''}.
          </p>
        )}
        {r.stand === 'klaar' && r.data.regels.length > 0 && (
          <ul className="recent-lijst aanbesteding-lijst" data-testid="recente-aanbestedingen">
            {r.data.regels.map((a) => (
              <li key={a.kenmerk}>
                <span className="recent-titel">{a.titel}</span>
                <span className="klein">{a.opdrachtgever}</span>
                <span className="recent-meta">
                  <span className={`badge ${statusBadge(a.status)}`} data-testid="aanbesteding-status">
                    {STATUS_LABEL[a.status]}
                    {a.status === 'open' && a.sluitingsdatum ? `, sluit ${datum(a.sluitingsdatum.slice(0, 10))}` : ''}
                  </span>
                  {/* Maximaal drie afvalstromen; een gekozen afvalstroom staat altijd vooraan. */}
                  {[...a.stromen].sort((x, y) => Number(y === stroom) - Number(x === stroom)).slice(0, 3).map((s) => (
                    <span key={s} className="badge thema">
                      {s}
                    </span>
                  ))}
                </span>
                <span className="klein muted">
                  {a.procedure} · gepubliceerd {datum(a.publicatiedatum.slice(0, 10))}
                </span>
                <Extern href={a.tenderned_url} className="tenderned-link">
                  Bekijk op TenderNed<span className="visueel-verborgen">: {a.titel}</span>
                </Extern>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="recent-voet">
        <Link to={archiefPad(filters)}>
          {open ? 'Alle open aanbestedingen in het archief' : 'Alle aanbestedingen in het archief'}
          {r.stand === 'klaar' ? ` (${getal(r.data.totaal)})` : ''}
        </Link>
      </p>
    </Kaart>
  );
}

function LaatsteNieuws() {
  const berichten = [...nieuws].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 3);
  if (berichten.length === 0) return null;
  return (
    <Kaart
      titel="Laatste nieuws"
      sub="Titels uit de nieuwsfeeds van de bronnen; het bericht staat bij de bron."
      className="recent"
      actie={
        <Link className="knop" to="/nieuws">
          Al het nieuws
        </Link>
      }
    >
      <ul className="recent-lijst">
        {berichten.map((b) => (
          <li key={b.id}>
            <Extern href={b.link}>{b.titel}</Extern>
            <span className="klein muted">
              {b.bron} · {datum(b.datum)}
            </span>
          </li>
        ))}
      </ul>
    </Kaart>
  );
}

/* ---------- Pagina ---------- */

export function Account() {
  const auth = useAuth();
  const { status, email, domein, sessie, lidStatus, lidmaatschap, isLid, uitloggen } = auth;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [uitBezig, setUitBezig] = useState(false);
  const [uitFout, setUitFout] = useState<string | null>(null);
  const stand = useOpenbareStand();

  useEffect(() => {
    document.title = `Mijn account · ${platform.korteNaam}`;
  }, []);

  async function doeUitloggen() {
    setUitBezig(true);
    setUitFout(null);
    const fout = await uitloggen();
    if (fout) {
      setUitBezig(false);
      setUitFout(authFoutmelding(fout));
      return;
    }
    navigate('/inloggen?melding=uitgelogd', { replace: true });
  }

  if (status === 'laden') {
    // Een schermhoogte vrijhouden, zodat de voettekst niet verspringt als de pagina verschijnt of doorstuurt.
    return (
      <div className="account-laden">
        <PaginaKop titel="Mijn account" />
        <p className="muted" role="status">
          Gegevens laden…
        </p>
      </div>
    );
  }
  if (status === 'uit') {
    // Ook tijdens het doorsturen een schermhoogte vrijhouden: anders schiet de voettekst even omhoog.
    return (
      <div className="account-laden">
        <PaginaKop titel="Mijn account" />
        <p className="muted" role="status">
          Doorsturen naar inloggen…
        </p>
        <Navigate to={uitBezig ? '/inloggen?melding=uitgelogd' : '/inloggen?terug=%2Faccount'} replace />
      </div>
    );
  }

  const beschrijving = beschrijfLidmaatschap(lidmaatschap, domein);
  const laatstIngelogd = sessie?.user.last_sign_in_at;
  const typeUitleg = lidmaatschap ? organisatietypeUitleg(lidmaatschap.organisatietype) : '';

  return (
    <div className="account-pagina">
      <PaginaKop titel="Mijn account">
        Ingelogd als <strong className="account-wie">{email}</strong>
      </PaginaKop>
      {params.get('melding') === 'wachtwoord-gewijzigd' && (
        <p className="notitie succes sectie" role="status">
          <span aria-hidden="true">✓ </span>Uw nieuwe wachtwoord is opgeslagen. U bent ingelogd.
        </p>
      )}

      <StatusKaart beschrijving={beschrijving} />

      <SnelNaar stand={stand} />

      <div className="raster-recent sectie">
        {isLid && <NieuwsteAanbestedingen stand={stand} />}
        <LaatsteNieuws />
      </div>

      <section className="sectie" aria-labelledby="instellingen">
        <h2 id="instellingen">Gegevens en instellingen</h2>
        <div className="kaart instellingen">
          <details className="inklap">
            <summary>Lidmaatschap in detail</summary>
            {lidStatus === 'klaar' ? (
              <>
                <dl className="gegevens">
                  <dt>Organisatie</dt>
                  <dd>{lidmaatschap?.organisatie ?? 'Geen organisatie gevonden'}</dd>
                  {lidmaatschap && (
                    <>
                      <dt>Soort organisatie</dt>
                      <dd>
                        {organisatietypeLabel(lidmaatschap.organisatietype)}
                        {typeUitleg && <span className="klein muted blok">{typeUitleg}</span>}
                      </dd>
                    </>
                  )}
                  <dt>Status</dt>
                  <dd>{beschrijving.label}</dd>
                  <dt>Geldig tot</dt>
                  <dd>{beschrijving.geldigTot}</dd>
                  <dt>E-maildomein</dt>
                  <dd>{domein || 'Onbekend'}</dd>
                </dl>
                <p className="klein muted">
                  Het lidmaatschap geldt voor iedereen met een bevestigd e-mailadres op het domein van uw organisatie. Collega's vragen zelf een
                  inloglink aan; u hoeft niemand toe te voegen. Klopt er iets niet, bijvoorbeeld de organisatie of de einddatum? Mail{' '}
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>.
                </p>
              </>
            ) : (
              <p className="muted">Nog niet beschikbaar: het lidmaatschap wordt gecontroleerd.</p>
            )}
          </details>
          <details className="inklap">
            <summary>Inloggegevens en wachtwoord</summary>
            <dl className="gegevens">
              <dt>E-mailadres</dt>
              <dd data-testid="account-email">{email}</dd>
              {laatstIngelogd && (
                <>
                  <dt>Laatst ingelogd</dt>
                  <dd>{datum(laatstIngelogd.slice(0, 10))}</dd>
                </>
              )}
            </dl>
            <WachtwoordWijzigen />
            <p className="klein muted">
              Wilt u uw account laten verwijderen of uw gegevens inzien? Mail{' '}
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent('Verzoek over mijn account')}`}>{contact.email}</a>. Zie ook de{' '}
              <Link to="/privacy">privacyverklaring</Link>.
            </p>
          </details>
          <div className="uitloggen">
            {uitFout && (
              <div className="melding-fout" role="alert">
                {uitFout}
              </div>
            )}
            <button type="button" onClick={doeUitloggen} disabled={uitBezig}>
              {uitBezig ? 'Uitloggen…' : 'Uitloggen'}
            </button>
            <p className="klein muted">Uitloggen geldt voor deze browser. Op een gedeelde computer logt u altijd uit.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
