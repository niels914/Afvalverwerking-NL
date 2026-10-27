import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AccountKnop } from '../betaalmuur/AccountKnop';
import { useRol } from '../betaalmuur/RolContext';
import { navigatie, platform } from '../../data/site';
import { Banner } from './Banner';
import { Voettekst } from './Voettekst';

/** Kleurstreep, navbar met accountknop, prototypebanner, inhoud en voettekst. */
export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const locatie = useLocation();
  const { isLid } = useRol();

  // Menu sluiten en naar boven (of naar het anker) bij een andere pagina.
  useEffect(() => {
    setMenuOpen(false);
    if (!locatie.hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Pagina's laden pas bij openen, dus het anker bestaat soms nog niet: wacht er maximaal 5 seconden op.
    const id = decodeURIComponent(locatie.hash.slice(1));
    const probeer = () => {
      const doel = document.getElementById(id);
      if (doel) doel.scrollIntoView();
      return Boolean(doel);
    };
    if (probeer()) return;
    const waarnemer = new MutationObserver(() => {
      if (probeer()) stop();
    });
    const klok = window.setTimeout(() => stop(), 5000);
    function stop() {
      waarnemer.disconnect();
      window.clearTimeout(klok);
    }
    waarnemer.observe(document.body, { childList: true, subtree: true });
    return stop;
  }, [locatie.pathname, locatie.hash]);

  return (
    <>
      <a className="overslaan" href="#inhoud">
        Naar de inhoud
      </a>
      <div className="kpv-streep" />
      <header className="nav">
        <div className="wrap nav-boven">
          <Link className="merk" to="/">
            <img src="/logo-kplusv.jpg" alt="" width={32} height={32} />
            <span className="k">KplusV</span>
            <span className="app">{platform.naam}</span>
          </Link>
          <div className="nav-rechts">
            <AccountKnop />
            <button
              type="button"
              className="menuknop"
              aria-expanded={menuOpen}
              aria-controls="hoofdmenu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? '✕ Sluit menu' : '☰ Menu'}
            </button>
          </div>
        </div>
        <nav id="hoofdmenu" className="hoofdmenu" aria-label="Hoofdmenu" data-open={menuOpen}>
          <div className="wrap">
            <ul>
              {navigatie.map((item) => (
                <li key={item.pad}>
                  <NavLink to={item.pad} end={item.pad === '/'}>
                    {item.label}
                    {item.alleenLeden && !isLid && (
                      <span className="slot" aria-label="(alleen leden)" title="Alleen leden">
                        🔒
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>
      <Banner />
      <main id="inhoud" className="wrap" tabIndex={-1}>
        {/* Houdt tijdens het laden een schermhoogte vrij, zodat de voettekst niet verspringt. */}
        <Suspense fallback={<p className="sectie muted" style={{ minHeight: '100vh', margin: '28px 0 0' }}>Pagina laden…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <Voettekst />
    </>
  );
}
