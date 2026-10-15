import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import './toegang.css';

function PersoonIcoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Knop rechts in de navbar: "Inloggen" voor bezoekers, "Mijn account" (met status) voor ingelogde gebruikers. */
export function AccountKnop() {
  const { status, isLid, lidStatus, email, herstelSessie } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  // Binnengekomen via "wachtwoord vergeten" op een andere pagina (bijvoorbeeld de Site URL): naar het formulier.
  // Alleen op het moment dat de herstelsessie begint, zodat de gebruiker daarna vrij kan navigeren.
  useEffect(() => {
    if (herstelSessie && window.location.pathname !== '/inloggen') navigate('/inloggen?stap=nieuw-wachtwoord', { replace: true });
  }, [herstelSessie, navigate]);

  if (status === 'in') {
    const lidLabel = lidStatus === 'klaar' ? (isLid ? 'Lid' : 'Geen lid') : null;
    return (
      <Link
        className="accountknop"
        to="/account"
        title={email ? `Ingelogd als ${email}` : undefined}
        aria-current={pathname === '/account' ? 'page' : undefined}
      >
        <PersoonIcoon />
        <span>Mijn account</span>
        {lidLabel && (
          <span className="accountknop-status" data-lid={isLid}>
            <span className="visueel-verborgen">, status: </span>
            {lidLabel}
          </span>
        )}
      </Link>
    );
  }

  // Na het inloggen terug naar de pagina waar de bezoeker was.
  const terug = pathname.startsWith('/inloggen') || pathname.startsWith('/account') ? '' : `?terug=${encodeURIComponent(pathname + search)}`;
  return (
    <Link className="accountknop" to={`/inloggen${terug}`} aria-current={pathname === '/inloggen' ? 'page' : undefined}>
      <PersoonIcoon />
      <span>Inloggen</span>
    </Link>
  );
}
