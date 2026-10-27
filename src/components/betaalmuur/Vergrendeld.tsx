import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isToegangOnbekend, useAuth } from '../../lib/auth';
import { beschrijfLidmaatschap } from '../../lib/authStatus';
import './toegang.css';

interface Props {
  /** Kop van de slotkaart, bijvoorbeeld "Pro-functies indexcalculator". */
  titel: string;
  /** Korte uitleg wat leden krijgen. */
  ledenKrijgen: string[];
  /** De echte inhoud. Leden zien die gewoon; anderen zien een wazige preview. */
  children: ReactNode;
}

/**
 * Betaalmuur. Leden (ingelogd met een bevestigd adres op het domein van een actieve organisatie) zien de inhoud.
 * Bezoekers en ingelogde niet-leden zien een wazige, niet-bedienbare preview met een uitleg die bij hun situatie past.
 */
export function Vergrendeld({ titel, ledenKrijgen, children }: Props) {
  const auth = useAuth();
  const { isLid, status, lidStatus, email, domein, lidmaatschap, verversLidmaatschap, uitloggen } = auth;
  const previewRef = useRef<HTMLDivElement>(null);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [bezig, setBezig] = useState(false);
  const laden = isToegangOnbekend(auth);

  // inert maakt de preview onbereikbaar voor toetsenbord en schermlezer.
  useEffect(() => {
    previewRef.current?.setAttribute('inert', '');
  }, [isLid, laden]);

  if (isLid) return <>{children}</>;

  const terug = encodeURIComponent(pathname + search);
  const inlogPad = `/inloggen?terug=${terug}`;

  async function anderAdres() {
    setBezig(true);
    await uitloggen();
    setBezig(false);
    navigate(inlogPad);
  }

  let inhoud: ReactNode;
  if (laden) {
    inhoud = (
      <p role="status" aria-live="polite">
        Ledentoegang controleren…
      </p>
    );
  } else if (status === 'in' && lidStatus === 'fout') {
    inhoud = (
      <>
        <p role="alert">Uw lidmaatschap kon niet worden gecontroleerd. Controleer uw internetverbinding en probeer het opnieuw.</p>
        <div className="knoppen">
          <button type="button" className="primair" onClick={verversLidmaatschap}>
            Opnieuw controleren
          </button>
        </div>
      </>
    );
  } else if (status === 'in') {
    const beschrijving = beschrijfLidmaatschap(lidmaatschap, domein);
    inhoud = (
      <>
        <p className="wie">
          U bent ingelogd als <strong>{email}</strong>, maar heeft geen toegang tot ledenonderdelen. {beschrijving.uitleg}
        </p>
        <div className="knoppen">
          <Link className="knop primair" to="/lidmaatschap/aanmelden">
            Lid worden
          </Link>
          <button type="button" onClick={anderAdres} disabled={bezig}>
            {bezig ? 'Uitloggen…' : 'Inloggen met ander adres'}
          </button>
        </div>
        <p className="klein">
          <Link to="/account">Naar uw account</Link> · <Link to="/lidmaatschap">Wat kost het lidmaatschap?</Link>
        </p>
      </>
    );
  } else {
    inhoud = (
      <>
        <p>Dit onderdeel is voor leden. Leden krijgen:</p>
        <ul className="opsomming">
          {ledenKrijgen.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p>Werkt u bij een organisatie die lid is? Log dan in met uw werk-e-mailadres.</p>
        <div className="knoppen">
          <Link className="knop primair" to={inlogPad}>
            Inloggen
          </Link>
          <Link className="knop" to="/lidmaatschap/aanmelden">
            Lid worden
          </Link>
        </div>
        <p className="klein">
          <Link to="/lidmaatschap">Wat kost het lidmaatschap?</Link>
        </p>
      </>
    );
  }

  return (
    <div className="vergrendeld">
      <div className="vergrendeld-preview" ref={previewRef} aria-hidden="true">
        {children}
      </div>
      <div className="vergrendeld-slot">
        <section className="slotkaart" aria-label={`${titel} (alleen voor leden)`}>
          <h2>
            <span aria-hidden="true">🔒</span> {titel}
          </h2>
          {inhoud}
        </section>
      </div>
    </div>
  );
}
