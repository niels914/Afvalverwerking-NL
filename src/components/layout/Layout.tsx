import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AccountKnop } from '../betaalmuur/AccountKnop';
import { useRol } from '../betaalmuur/RolContext';
import { navigatie, platform } from '../../data/site';
import { Banner } from './Banner';
import { Voettekst } from './Voettekst';

/** Witte kop met logo, huisstijlelement, bètapil, hoofdmenu en accountknop; daarna inhoud en voettekst. */
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
      {/* Witte kop (bewuste afwijking van 'geen navbar'): logo linksboven tegen de rand, het huisstijlelement rechts
          met de bètapil eronder, en het hoofdmenu als rustige tekstlinks. Geen gekleurde balk, kleurstreep of schaduw. */}
      <header className="nav">
        <div className="wrap kop">
          <Link className="kop-logo" to="/">
            {/* 128 px op desktop, 96 px op de telefoon. 256 px is het 512-pixelslogo verkleind (scherp op 2x); nooit opschalen. */}
            <img
              src="/logo-kplusv-512.png"
              srcSet="/logo-kplusv-256.png 256w, /logo-kplusv-512.png 512w"
              sizes="(max-width: 640px) 96px, 128px"
              alt={`KplusV, ${platform.korteNaam}: naar de homepage`}
              width={128}
              height={128}
            />
          </Link>
          <div className="kop-rechts">
            <Huisstijlelement />
            <Banner />
          </div>
          <div className="kop-menu">
            <nav id="hoofdmenu" className="hoofdmenu" aria-label="Hoofdmenu" data-open={menuOpen}>
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
            </nav>
            <div className="kop-acties">
              <AccountKnop />
              <button
                type="button"
                className="menuknop"
                aria-expanded={menuOpen}
                aria-controls="hoofdmenu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="menuknop-icoon" aria-hidden="true" />
                {menuOpen ? 'Sluit menu' : 'Menu'}
              </button>
            </div>
          </div>
        </div>
      </header>
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

/** Het KplusV-huisstijlelement: drie schuine delen van 45° met witte tussenruimte. Eén keer per pagina, in de kop. */
function Huisstijlelement() {
  return (
    <svg className="element" viewBox="0 0 288 96" width={288} height={96} aria-hidden="true" focusable="false">
      <polygon points="96,0 152,0 56,96 0,96" fill="#5760A6" />
      <polygon points="164,0 220,0 124,96 68,96" fill="#B8AED6" />
      <polygon points="232,0 288,0 192,96 136,96" fill="#9462A6" />
    </svg>
  );
}
