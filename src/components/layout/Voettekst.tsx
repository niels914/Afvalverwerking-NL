import { Link } from 'react-router-dom';
import { platform, voetLinks } from '../../data/site';
import { aanbieder } from '../../pages/juridisch/gegevens';
import { BETA } from './Banner';
import '../../pages/juridisch/juridisch.css';

/** Voettekst: aanbieder met KVK-nummer, contact voor het platform, juridische pagina's en colofon. */
export function Voettekst() {
  const c = aanbieder.contact;
  return (
    <footer className="voet">
      <div className="wrap voet-raster">
        <section aria-labelledby="voet-aanbieder">
          <h2 id="voet-aanbieder">{platform.korteNaam}</h2>
          <address>
            Een platform van {aanbieder.naam}
            <br />
            {aanbieder.straat}, {aanbieder.postcode} {aanbieder.plaats}
            <br />
            KVK {aanbieder.kvk}
          </address>
        </section>
        <section aria-labelledby="voet-contact">
          <h2 id="voet-contact">Contact</h2>
          <address>
            {c.naam}
            <br />
            <a href={`mailto:${c.email}`}>{c.email}</a>
            <br />
            <a href={`tel:+31${c.telefoon.replace(/\s/g, '').slice(1)}`}>{c.telefoon}</a>
          </address>
        </section>
        <nav aria-labelledby="voet-over">
          <h2 id="voet-over">Over deze site</h2>
          <ul>
            {voetLinks.map((l) => (
              <li key={l.pad}>
                <Link to={l.pad}>{l.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/disclaimer#colofon">Colofon</Link>
            </li>
          </ul>
        </nav>
        <div className="voet-onder">
          <span>KplusV · Verschil zien, verschil maken</span>
          <span>
            {BETA ? 'Bèta · ' : ''}
            {platform.versie}
          </span>
        </div>
      </div>
    </footer>
  );
}
