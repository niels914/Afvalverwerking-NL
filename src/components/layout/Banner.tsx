import { Link } from 'react-router-dom';
import '../../pages/juridisch/juridisch.css';

/**
 * Bètamelding onder de navbar, zolang prijzen en voorwaarden nog concept zijn.
 * Zet BETA op false zodra prijzen en voorwaarden zijn vastgesteld;
 * pas dan ook de sectie #voorbeelddata in src/pages/juridisch/Disclaimer.tsx aan.
 */
export const BETA = true;

export function Banner() {
  if (!BETA) return null;
  return (
    <aside className="banner" aria-label="Bètaversie">
      <div className="wrap banner-beta" role="note" aria-label="Bètaversie">
        <span className="banner-label">Bèta</span>
        <span>
          Prijzen en voorwaarden zijn nog concept en uitkomsten van rekentools zijn indicatief.{' '}
          <Link to="/disclaimer#voorbeelddata">Wat betekent dit?</Link>
        </span>
      </div>
    </aside>
  );
}
