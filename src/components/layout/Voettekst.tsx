import { Link } from 'react-router-dom';
import { platform, voetLinks } from '../../data/site';

/** Voettekst met juridische links. */
export function Voettekst() {
  return (
    <footer className="voet">
      <div className="wrap">
        <nav aria-label="Juridisch" className="voet-links">
          {voetLinks.map((l) => (
            <Link key={l.pad} to={l.pad}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span>KplusV · Verschil zien, verschil maken</span>
        <span>Prototype · fictieve content · {platform.versie}</span>
      </div>
    </footer>
  );
}
