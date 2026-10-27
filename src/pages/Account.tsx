import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Kaart, PaginaKop, ToegangBadge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { beschrijfLidmaatschap, organisatietypeLabel, organisatietypeUitleg, type StatusBeschrijving } from '../lib/authStatus';
import { alleOnderdelen } from '../lib/authAanbod';
import { LEGE_FILTERS, STATUS_LABEL, zoekAanbestedingen, type AanbestedingRegel } from '../lib/aanbestedingen';
import { nieuws } from '../data/nieuws';
import { MIN_WACHTWOORD, authFoutmelding, controleerNieuwWachtwoord } from '../lib/authFouten';
import { supabase } from '../lib/supabase';
import { datum } from '../lib/format';
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
function Extern({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
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

function SnelNaar() {
  const { isLid, lidStatus } = useAuth();
  // Slotjes pas tonen als vaststaat dat iemand geen lid is, anders knipperen ze bij leden.
  const toonToegang = lidStatus === 'klaar' && !isLid;
  return (
    <section className="sectie" aria-labelledby="snel-naar">
      <h2 id="snel-naar">Snel naar</h2>
      <ul className="snelkoppelingen">
        {alleOnderdelen.map((o) => (
          <li key={o.pad}>
            <Link to={o.pad}>
              <span className="snel-titel">{o.titel}</span>
              <span className="snel-tekst">{o.omschrijving}</span>
            </Link>
            {toonToegang && o.toegang !== 'gratis' && <ToegangBadge toegang={o.toegang} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Recent: aanbestedingen (alleen leden) en nieuws ---------- */

type Laadstand<T> = { stand: 'laden' } | { stand: 'fout' } | { stand: 'klaar'; data: T };

function NieuwsteAanbestedingen() {
  const [r, setR] = useState<Laadstand<AanbestedingRegel[]>>({ stand: 'laden' });
  useEffect(() => {
    let actief = true;
    zoekAanbestedingen({ ...LEGE_FILTERS, sortering: 'publicatie-nieuw' })
      .then((res) => actief && setR({ stand: 'klaar', data: res.regels.slice(0, 3) }))
      .catch(() => actief && setR({ stand: 'fout' }));
    return () => {
      actief = false;
    };
  }, []);

  return (
    <Kaart
      titel="Nieuwste aanbestedingen"
      sub="Laatst gepubliceerd op TenderNed, uit het aanbestedingsarchief."
      className="recent"
      actie={
        <Link className="knop" to="/aanbestedingsarchief">
          Alle aanbestedingen
        </Link>
      }
    >
      {r.stand === 'laden' && (
        <p role="status" className="muted recent-laden">
          Aanbestedingen laden…
        </p>
      )}
      {r.stand === 'fout' && (
        <p role="alert">
          De aanbestedingen konden niet worden geladen. Probeer het later opnieuw in het <Link to="/aanbestedingsarchief">archief</Link>.
        </p>
      )}
      {r.stand === 'klaar' && r.data.length === 0 && <p>Er staan nog geen aanbestedingen in het archief.</p>}
      {r.stand === 'klaar' && r.data.length > 0 && (
        <ul className="recent-lijst" data-testid="recente-aanbestedingen">
          {r.data.map((a) => (
            <li key={a.kenmerk}>
              <Extern href={a.tenderned_url}>{a.titel}</Extern>
              <span className="klein muted">
                {a.opdrachtgever} · gepubliceerd {datum(a.publicatiedatum.slice(0, 10))} · {STATUS_LABEL[a.status]}
                {a.status === 'open' && a.sluitingsdatum ? `, sluit ${datum(a.sluitingsdatum.slice(0, 10))}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
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
    return <Navigate to={uitBezig ? '/inloggen?melding=uitgelogd' : '/inloggen?terug=%2Faccount'} replace />;
  }

  const beschrijving = beschrijfLidmaatschap(lidmaatschap, domein);
  const laatstIngelogd = sessie?.user.last_sign_in_at;
  const typeUitleg = lidmaatschap ? organisatietypeUitleg(lidmaatschap.organisatietype) : '';

  return (
    <>
      <PaginaKop titel="Mijn account">
        Ingelogd als <strong className="account-wie">{email}</strong>
      </PaginaKop>
      {params.get('melding') === 'wachtwoord-gewijzigd' && (
        <p className="notitie succes sectie" role="status">
          <span aria-hidden="true">✓ </span>Uw nieuwe wachtwoord is opgeslagen. U bent ingelogd.
        </p>
      )}

      <StatusKaart beschrijving={beschrijving} />

      <SnelNaar />

      <div className="raster-recent sectie">
        {isLid && <NieuwsteAanbestedingen />}
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
    </>
  );
}
