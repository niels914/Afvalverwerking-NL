import { Link } from 'react-router-dom';
import '../../pages/juridisch/juridisch.css';

/**
 * Bètamelding onder de navbar, zolang delen van het platform nog voorbeelddata bevatten.
 * Zet BETA op false zodra alle voorbeelddata is vervangen door echte data met bron en peildatum;
 * pas dan ook de sectie #voorbeelddata in src/pages/juridisch/Disclaimer.tsx aan.
 */
export const BETA = true;

export function Banner() {
  if (!BETA) return null;
  return (
    <div className="banner" role="note" aria-label="Bètaversie">
      <div className="wrap banner-beta">
        <span className="banner-label">Bèta</span>
        <span>
          Het platform is in opbouw. Onderdelen met het label &lsquo;Voorbeeld&rsquo; bevatten verzonnen gegevens of
          voorbeeldwaarden; uitkomsten van rekentools zijn indicatief. <Link to="/disclaimer#voorbeelddata">Wat betekent dit?</Link>
        </span>
      </div>
    </div>
  );
}
