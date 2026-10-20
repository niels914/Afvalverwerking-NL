import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Kaart, PaginaKop } from '../components/ui';
import { useAuth } from '../lib/auth';
import { beschrijfLidmaatschap, organisatietypeLabel } from '../lib/authStatus';
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

export function Account() {
  const auth = useAuth();
  const { status, email, domein, sessie, lidStatus, lidmaatschap, isLid, verversLidmaatschap, uitloggen } = auth;
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
    return (
      <>
        <PaginaKop titel="Mijn account" />
        <p className="sectie muted" role="status">
          Gegevens laden…
        </p>
      </>
    );
  }
  if (status === 'uit') {
    return <Navigate to={uitBezig ? '/inloggen?melding=uitgelogd' : '/inloggen?terug=%2Faccount'} replace />;
  }

  const beschrijving = beschrijfLidmaatschap(lidmaatschap, domein);
  const laatstIngelogd = sessie?.user.last_sign_in_at;

  return (
    <>
      <PaginaKop titel="Mijn account">Uw organisatie, de status van het lidmaatschap en uw inloggegevens.</PaginaKop>
      {params.get('melding') === 'wachtwoord-gewijzigd' && (
        <p className="notitie succes sectie" role="status">
          <span aria-hidden="true">✓ </span>Uw nieuwe wachtwoord is opgeslagen. U bent ingelogd.
        </p>
      )}

      <div className="toegang-raster sectie">
        <Kaart titel="Lidmaatschap" sub="Het lidmaatschap geldt voor iedereen met een e-mailadres op het domein van uw organisatie.">
          {lidStatus === 'laden' && <p role="status">Lidmaatschap controleren…</p>}
          {lidStatus === 'fout' && (
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
          )}
          {lidStatus === 'klaar' && (
            <>
              <dl className="gegevens">
                <dt>Status</dt>
                <dd>
                  <span className="statuslabel" data-soort={beschrijving.soort} data-testid="lidstatus">
                    <span aria-hidden="true">{beschrijving.soort === 'actief' ? '✓' : beschrijving.soort === 'let-op' ? '!' : '–'}</span>
                    {beschrijving.label}
                  </span>
                </dd>
                <dt>Organisatie</dt>
                <dd data-testid="organisatie">{lidmaatschap?.organisatie ?? 'Geen organisatie gevonden'}</dd>
                {lidmaatschap && (
                  <>
                    <dt>Soort organisatie</dt>
                    <dd>{organisatietypeLabel(lidmaatschap.organisatietype)}</dd>
                  </>
                )}
                <dt>Geldig tot</dt>
                <dd data-testid="geldig-tot">{beschrijving.geldigTot}</dd>
                <dt>E-maildomein</dt>
                <dd>{domein || 'Onbekend'}</dd>
              </dl>
              <p>{beschrijving.uitleg}</p>
              {isLid && beschrijving.soort === 'let-op' && (
                <div className="knoppen">
                  <a className="knop primair" href={`mailto:${contact.email}?subject=${encodeURIComponent(`Verlenging lidmaatschap ${lidmaatschap?.organisatie ?? ''}`)}`}>
                    Verlenging regelen
                  </a>
                </div>
              )}
              {isLid && beschrijving.soort === 'actief' && (
                <div className="knoppen">
                  <Link className="knop primair" to="/tools">
                    Naar de tools
                  </Link>
                  <Link className="knop" to="/aanbestedingsarchief">
                    Aanbestedingsarchief
                  </Link>
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
              <p className="klein muted">
                Klopt er iets niet, bijvoorbeeld de organisatie of de einddatum? Mail <a href={`mailto:${contact.email}`}>{contact.email}</a>.
              </p>
            </>
          )}
        </Kaart>

        <Kaart titel="Inloggegevens">
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
          <hr className="scheidingslijn" />
          {uitFout && (
            <div className="melding-fout" role="alert">
              {uitFout}
            </div>
          )}
          <div className="knoppen">
            <button type="button" onClick={doeUitloggen} disabled={uitBezig}>
              {uitBezig ? 'Uitloggen…' : 'Uitloggen'}
            </button>
          </div>
          <p className="klein muted">Uitloggen geldt voor deze browser. Op een gedeelde computer logt u altijd uit.</p>
          <p className="klein muted">
            Wilt u uw account laten verwijderen of uw gegevens inzien? Mail{' '}
            <a href={`mailto:${contact.email}?subject=${encodeURIComponent('Verzoek over mijn account')}`}>{contact.email}</a>. Zie ook de{' '}
            <Link to="/privacy">privacyverklaring</Link>.
          </p>
        </Kaart>
      </div>
    </>
  );
}
