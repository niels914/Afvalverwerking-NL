import { Link } from 'react-router-dom';
import '../../pages/juridisch/juridisch.css';

/**
 * Bètamelding in de kop, rechts onder het huisstijlelement: een Violet statuspil 'Bèta' met één korte regel.
 * Geen gekleurde balk over de hele breedte (huisstijl 2.2).
 * Zet BETA op false zodra prijzen en voorwaarden zijn vastgesteld;
 * pas dan ook de sectie #voorbeelddata in src/pages/juridisch/Disclaimer.tsx aan.
 */
export const BETA = true;

export function Banner() {
  if (!BETA) return null;
  return (
    <div className="banner banner-beta" role="note" aria-label="Bètaversie">
      <span className="status banner-label">Bèta</span>
      <span className="banner-tekst">
        Prijzen en voorwaarden zijn nog concept en uitkomsten van rekentools zijn indicatief.{' '}
        <Link to="/disclaimer#voorbeelddata">Wat betekent dit?</Link>
      </span>
    </div>
  );
}
