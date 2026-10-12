import { Kaart } from './ui';
import { gratisOnderdelen, ledenOnderdelen } from '../data/lidmaatschap';

/** Twee kolommen: wat gratis is en wat leden krijgen. Gebruikt op Lidmaatschap en Over het platform. */
export function GratisBetaald({ kopNiveau = 2 }: { kopNiveau?: 2 | 3 }) {
  return (
    <div className="raster raster-2">
      <Kaart titel="Gratis voor iedereen" kopNiveau={kopNiveau} sub="Open laag voor kennis en bereik">
        <ul className="vinklijst">
          {gratisOnderdelen.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Kaart>
      <Kaart titel="Extra voor leden" kopNiveau={kopNiveau} sub="Betaalde laag voor rekenmodellen en aanbestedingsinformatie">
        <ul className="vinklijst slotlijst">
          {ledenOnderdelen.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Kaart>
    </div>
  );
}
