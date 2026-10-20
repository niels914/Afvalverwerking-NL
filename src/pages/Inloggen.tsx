import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Kaart, PaginaKop } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  MIN_WACHTWOORD,
  authFoutmelding,
  controleerNieuwWachtwoord,
  isEmailadres,
  leesUrlFout,
  veiligTerugpad,
} from '../lib/authFouten';
import { contact, platform } from '../data/site';
import '../components/betaalmuur/toegang.css';

type Stap = 'inloggen' | 'link-verstuurd' | 'vergeten' | 'herstel-verstuurd';
type Bezig = null | 'wachtwoord' | 'link' | 'herstel' | 'nieuw';

/** Wachttijd tussen twee e-mails; Supabase weigert standaard een nieuwe mail binnen 60 seconden. */
const WACHTTIJD_S = 60;

/* ---------- Velden ---------- */

interface VeldProps {
  id: string;
  label: string;
  fout?: string;
  hint?: ReactNode;
  children: (aria: { 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
  na?: ReactNode;
  labelRechts?: ReactNode;
}
function Veld({ id, label, fout, hint, children, na, labelRechts }: VeldProps) {
  const beschrijving = [hint ? `${id}-hint` : '', fout ? `${id}-fout` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="veld">
      <div className="wachtwoord-rij">
        <label htmlFor={id}>{label}</label>
        {labelRechts}
      </div>
      <div className="invoer" data-fout={fout ? 'true' : 'false'}>
        {children({ 'aria-invalid': fout ? true : undefined, 'aria-describedby': beschrijving })}
        {na}
      </div>
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {fout && (
        <span className="foutmelding" id={`${id}-fout`}>
          {fout}
        </span>
      )}
    </div>
  );
}

function WachtwoordVeld(props: {
  id: string;
  label: string;
  waarde: string;
  onChange: (w: string) => void;
  fout?: string;
  hint?: ReactNode;
  nieuw?: boolean;
  invoerRef?: React.Ref<HTMLInputElement>;
  labelRechts?: ReactNode;
}) {
  const [toon, setToon] = useState(false);
  return (
    <Veld
      id={props.id}
      label={props.label}
      fout={props.fout}
      hint={props.hint}
      labelRechts={props.labelRechts}
      na={
        <button
          type="button"
          className="toon-knop"
          aria-pressed={toon}
          aria-controls={props.id}
          onClick={() => setToon((t) => !t)}
        >
          {toon ? 'Verberg' : 'Toon'}
          <span className="visueel-verborgen"> wachtwoord</span>
        </button>
      }
    >
      {(aria) => (
        <input
          id={props.id}
          ref={props.invoerRef}
          type={toon ? 'text' : 'password'}
          autoComplete={props.nieuw ? 'new-password' : 'current-password'}
          value={props.waarde}
          onChange={(e) => props.onChange(e.target.value)}
          {...aria}
        />
      )}
    </Veld>
  );
}

function Foutblok({ melding, blokRef }: { melding: string | null; blokRef: React.Ref<HTMLDivElement> }) {
  if (!melding) return null;
  return (
    <div className="melding-fout" role="alert" tabIndex={-1} ref={blokRef}>
      <strong>Dat lukte niet</strong>
      {melding}
    </div>
  );
}

/** Seconden tot een nieuwe e-mail mag. */
function useAftellen(): [number, () => void] {
  const [tot, setTot] = useState(0);
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    if (tot <= nu) return;
    const t = window.setTimeout(() => setNu(Date.now()), 1000);
    return () => window.clearTimeout(t);
  }, [tot, nu]);
  return [Math.max(0, Math.ceil((tot - nu) / 1000)), () => {
    setNu(Date.now());
    setTot(Date.now() + WACHTTIJD_S * 1000);
  }];
}

/* ---------- Pagina ---------- */

export function Inloggen() {
  const auth = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = useId();

  const terug = veiligTerugpad(params.get('terug'));
  const nieuwWachtwoordModus = params.get('stap') === 'nieuw-wachtwoord' || auth.herstelSessie;

  // Fout uit een e-maillink (#error_code=otp_expired …). Eén keer lezen: Supabase haalt de hash daarna weg.
  const [urlFout] = useState(() => leesUrlFout(window.location.hash, window.location.search));

  const [stap, setStap] = useState<Stap>('inloggen');
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [nieuw, setNieuw] = useState('');
  const [herhaal, setHerhaal] = useState('');
  const [fouten, setFouten] = useState<{ email?: string; wachtwoord?: string; nieuw?: string; herhaal?: string }>({});
  const [serverFout, setServerFout] = useState<string | null>(urlFout);
  const [bezig, setBezig] = useState<Bezig>(null);
  const [wacht, startWachten] = useAftellen();

  const emailRef = useRef<HTMLInputElement>(null);
  const wachtwoordRef = useRef<HTMLInputElement>(null);
  const nieuwRef = useRef<HTMLInputElement>(null);
  const herhaalRef = useRef<HTMLInputElement>(null);
  const foutRef = useRef<HTMLDivElement>(null);
  const kopRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${nieuwWachtwoordModus ? 'Nieuw wachtwoord' : 'Inloggen'} · ${platform.korteNaam}`;
  }, [nieuwWachtwoordModus]);

  // Melding van de server in beeld en in focus, zodat ook schermlezers hem meteen krijgen.
  useEffect(() => {
    if (serverFout) foutRef.current?.focus();
  }, [serverFout]);

  // Bij een nieuwe stap de focus naar de kop van die stap.
  useEffect(() => {
    if (stap !== 'inloggen') kopRef.current?.focus();
  }, [stap]);

  function wisMeldingen() {
    setFouten({});
    setServerFout(null);
  }

  function controleerEmail(): string | undefined {
    if (!email.trim()) return 'Vul uw e-mailadres in.';
    if (!isEmailadres(email)) return 'Dit is geen geldig e-mailadres. Voorbeeld: naam@organisatie.nl';
    return undefined;
  }

  async function inloggenMetWachtwoord(e: FormEvent) {
    e.preventDefault();
    wisMeldingen();
    const f = { email: controleerEmail(), wachtwoord: wachtwoord ? undefined : 'Vul uw wachtwoord in.' };
    if (f.email || f.wachtwoord) {
      setFouten(f);
      (f.email ? emailRef : wachtwoordRef).current?.focus();
      return;
    }
    setBezig('wachtwoord');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: wachtwoord });
    setBezig(null);
    if (error) {
      setServerFout(authFoutmelding(error));
      return;
    }
    navigate(terug, { replace: true });
  }

  async function stuurInloglink() {
    wisMeldingen();
    const f = controleerEmail();
    if (f) {
      setFouten({ email: f });
      emailRef.current?.focus();
      return;
    }
    setBezig('link');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/inloggen?terug=${encodeURIComponent(terug)}`,
      },
    });
    setBezig(null);
    if (error) {
      setServerFout(authFoutmelding(error));
      return;
    }
    startWachten();
    setStap('link-verstuurd');
  }

  async function stuurHerstellink(e?: FormEvent) {
    e?.preventDefault();
    wisMeldingen();
    const f = controleerEmail();
    if (f) {
      setFouten({ email: f });
      emailRef.current?.focus();
      return;
    }
    setBezig('herstel');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/inloggen?stap=nieuw-wachtwoord`,
    });
    setBezig(null);
    if (error) {
      setServerFout(authFoutmelding(error));
      return;
    }
    startWachten();
    setStap('herstel-verstuurd');
  }

  async function slaNieuwWachtwoordOp(e: FormEvent) {
    e.preventDefault();
    wisMeldingen();
    const f = controleerNieuwWachtwoord(nieuw, herhaal);
    if (f) {
      setFouten({ [f.veld]: f.melding });
      (f.veld === 'nieuw' ? nieuwRef : herhaalRef).current?.focus();
      return;
    }
    setBezig('nieuw');
    const { error } = await supabase.auth.updateUser({ password: nieuw });
    setBezig(null);
    if (error) {
      setServerFout(authFoutmelding(error));
      return;
    }
    navigate('/account?melding=wachtwoord-gewijzigd', { replace: true });
  }

  const emailVeld = (
    <Veld id={`${id}-email`} label="E-mailadres" fout={fouten.email} hint="Gebruik het e-mailadres van uw werk.">
      {(aria) => (
        <input
          id={`${id}-email`}
          ref={emailRef}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...aria}
        />
      )}
    </Veld>
  );

  const uitleg = (
    <Kaart titel="Zo werkt de toegang" kopNiveau={2}>
      <ul className="opsomming">
        <li>Het lidmaatschap geldt voor de hele organisatie. Iedereen met een e-mailadres op het domein van een organisatie die lid is, heeft toegang.</li>
        <li>
          Eerste keer? Vraag een inloglink aan met uw werkadres. Daarmee maakt u meteen een account aan. Een wachtwoord kunt u daarna instellen op
          uw accountpagina.
        </li>
        <li>
          Is uw organisatie nog geen lid? <Link to="/lidmaatschap/aanmelden">Meld uw organisatie aan</Link> of{' '}
          <Link to="/lidmaatschap">bekijk de mogelijkheden</Link>.
        </li>
      </ul>
      <p className="klein muted">
        Na het inloggen bewaart uw browser een sessiesleutel, zodat u ingelogd blijft. Wat we vastleggen en waarom, staat in de{' '}
        <Link to="/privacy">privacyverklaring</Link>.
      </p>
      <p className="klein muted">
        Vragen over inloggen? Mail <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>
    </Kaart>
  );

  /* --- Nieuw wachtwoord na "wachtwoord vergeten" --- */
  if (nieuwWachtwoordModus) {
    let inhoud: ReactNode;
    if (auth.status === 'laden') {
      inhoud = <p role="status">Link controleren…</p>;
    } else if (auth.status === 'uit') {
      inhoud = (
        <>
          <div className="melding-fout" role="alert">
            <strong>Deze link werkt niet meer</strong>
            {urlFout ?? 'De link om uw wachtwoord te herstellen is verlopen of al gebruikt.'}
          </div>
          <div className="knoppen">
            <Link className="knop primair" to="/inloggen" onClick={() => setStap('vergeten')}>
              Nieuwe herstellink aanvragen
            </Link>
          </div>
        </>
      );
    } else {
      inhoud = (
        <form className="toegang-formulier" onSubmit={slaNieuwWachtwoordOp} noValidate>
          <p>
            U bent ingelogd als <strong>{auth.email}</strong>. Kies een nieuw wachtwoord.
          </p>
          <Foutblok melding={serverFout} blokRef={foutRef} />
          <WachtwoordVeld
            id={`${id}-nieuw`}
            label="Nieuw wachtwoord"
            waarde={nieuw}
            onChange={setNieuw}
            fout={fouten.nieuw}
            hint={`Minimaal ${MIN_WACHTWOORD} tekens. Een zin van een paar woorden is sterk en goed te onthouden.`}
            nieuw
            invoerRef={nieuwRef}
          />
          <WachtwoordVeld
            id={`${id}-herhaal`}
            label="Herhaal nieuw wachtwoord"
            waarde={herhaal}
            onChange={setHerhaal}
            fout={fouten.herhaal}
            nieuw
            invoerRef={herhaalRef}
          />
          <button type="submit" className="primair" disabled={bezig !== null}>
            {bezig === 'nieuw' ? 'Opslaan…' : 'Wachtwoord opslaan'}
          </button>
        </form>
      );
    }
    return (
      <>
        <PaginaKop titel="Nieuw wachtwoord instellen" />
        <div className="toegang-raster sectie">
          <Kaart>{inhoud}</Kaart>
          {uitleg}
        </div>
      </>
    );
  }

  /* --- Al ingelogd --- */
  if (auth.status === 'in') {
    // Net ingelogd via een inloglink, of doorgestuurd vanaf een vergrendelde pagina: meteen door.
    if (params.has('terug')) return <Navigate to={terug} replace />;
    return (
      <>
        <PaginaKop titel="Inloggen" />
        <div className="toegang-raster sectie">
          <Kaart>
            <p>
              U bent ingelogd als <strong>{auth.email}</strong>.
            </p>
            <div className="knoppen">
              <Link className="knop primair" to="/account">
                Naar mijn account
              </Link>
              <Link className="knop" to="/tools">
                Naar de tools
              </Link>
            </div>
          </Kaart>
          {uitleg}
        </div>
      </>
    );
  }

  /* --- Link of herstelmail verstuurd --- */
  if (stap === 'link-verstuurd' || stap === 'herstel-verstuurd') {
    const isLink = stap === 'link-verstuurd';
    return (
      <>
        <PaginaKop titel="Inloggen" />
        <div className="toegang-raster sectie">
          <Kaart>
            <h2 tabIndex={-1} ref={kopRef}>
              Kijk in uw mailbox
            </h2>
            <div className="notitie succes" role="status">
              <span aria-hidden="true">✓ </span>
              {isLink ? 'We hebben een inloglink gestuurd' : 'Als er een account bestaat voor dit adres, hebben we een herstellink gestuurd'} naar{' '}
              <strong>{email.trim()}</strong>.
            </div>
            <ol className="opsomming">
              {isLink ? (
                <>
                  <li>Open de e-mail met als afzender het ledenplatform en klik op de link.</li>
                  <li>U bent dan ingelogd en komt terug op deze site. De link werkt één keer en is één uur geldig.</li>
                </>
              ) : (
                <>
                  <li>Open de e-mail en klik op de link om een nieuw wachtwoord te kiezen.</li>
                  <li>De link werkt één keer en is één uur geldig.</li>
                </>
              )}
              <li>Geen e-mail binnen een paar minuten? Kijk in de map met ongewenste e-mail en controleer het adres.</li>
            </ol>
            <Foutblok melding={serverFout} blokRef={foutRef} />
            <div className="knoppen">
              <button type="button" onClick={() => (isLink ? stuurInloglink() : stuurHerstellink())} disabled={wacht > 0 || bezig !== null}>
                {wacht > 0 ? `Opnieuw versturen kan over ${wacht} s` : 'Opnieuw versturen'}
              </button>
              <button type="button" className="linkknop" onClick={() => { wisMeldingen(); setStap('inloggen'); }}>
                Ander e-mailadres gebruiken
              </button>
            </div>
          </Kaart>
          {uitleg}
        </div>
      </>
    );
  }

  /* --- Wachtwoord vergeten --- */
  if (stap === 'vergeten') {
    return (
      <>
        <PaginaKop titel="Wachtwoord vergeten" />
        <div className="toegang-raster sectie">
          <Kaart>
            <form className="toegang-formulier" onSubmit={stuurHerstellink} noValidate>
              <h2 tabIndex={-1} ref={kopRef}>
                Herstellink aanvragen
              </h2>
              <p>Vul het e-mailadres van uw account in. U krijgt een link waarmee u een nieuw wachtwoord kiest.</p>
              <Foutblok melding={serverFout} blokRef={foutRef} />
              {emailVeld}
              <div className="knoppen">
                <button type="submit" className="primair" disabled={bezig !== null}>
                  {bezig === 'herstel' ? 'Versturen…' : 'Stuur herstellink'}
                </button>
                <button type="button" className="linkknop" onClick={() => { wisMeldingen(); setStap('inloggen'); }}>
                  Terug naar inloggen
                </button>
              </div>
            </form>
          </Kaart>
          {uitleg}
        </div>
      </>
    );
  }

  /* --- Inloggen --- */
  return (
    <>
      <PaginaKop titel="Inloggen">Log in met uw werk-e-mailadres. Uw e-maildomein bepaalt bij welke organisatie u hoort.</PaginaKop>
      {params.get('melding') === 'uitgelogd' && (
        <p className="notitie succes sectie" role="status">
          <span aria-hidden="true">✓ </span>U bent uitgelogd.
        </p>
      )}
      <div className="toegang-raster sectie">
        <Kaart>
          <form className="toegang-formulier" onSubmit={inloggenMetWachtwoord} noValidate aria-describedby={`${id}-uitleg`}>
            <p id={`${id}-uitleg`} className="visueel-verborgen">
              Inloggen met e-mailadres en wachtwoord, of met een inloglink per e-mail.
            </p>
            <Foutblok melding={serverFout} blokRef={foutRef} />
            {emailVeld}
            <WachtwoordVeld
              id={`${id}-wachtwoord`}
              label="Wachtwoord"
              waarde={wachtwoord}
              onChange={setWachtwoord}
              fout={fouten.wachtwoord}
              invoerRef={wachtwoordRef}
              labelRechts={
                <button type="button" className="linkknop" onClick={() => { wisMeldingen(); setStap('vergeten'); }}>
                  Wachtwoord vergeten?
                </button>
              }
            />
            <button type="submit" className="primair" disabled={bezig !== null}>
              {bezig === 'wachtwoord' ? 'Inloggen…' : 'Inloggen'}
            </button>
            <div className="toegang-scheiding" aria-hidden="true">
              of
            </div>
            <div className="veld">
              <button type="button" onClick={stuurInloglink} disabled={bezig !== null} aria-describedby={`${id}-link-hint`}>
                {bezig === 'link' ? 'Versturen…' : 'Stuur mij een inloglink'}
              </button>
              <span className="hint" id={`${id}-link-hint`}>
                Geen wachtwoord nodig: u krijgt een link per e-mail op het adres hierboven. Ook voor de eerste keer.
              </span>
            </div>
          </form>
        </Kaart>
        {uitleg}
      </div>
    </>
  );
}
