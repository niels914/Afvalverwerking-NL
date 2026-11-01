import type { ReactNode } from 'react';
import { contact } from '../../data/site';

/**
 * Transparante portretfoto voor het fotoblok. Zet het bestand hier neer:
 *   public/foto-niels-transparant.png  (uitgesneden, zonder achtergrond; vierkant, circa 800 × 800 px)
 * vite.config.ts kijkt bij het bouwen of dat bestand bestaat en vult dan __FOTO_NIELS__ met '/foto-niels-transparant.png'.
 * Zolang het er niet is, toont het fotoblok de initialen. Gebruik nooit de oude ronde foto (public/foto-niels.jpg,
 * rond uitgesneden op lavendel): die is afgekeurd door marketing (16 oktober 2026).
 */
const FOTO: string = __FOTO_NIELS__;

/** Initialen voor het fotoblok zolang de transparante foto ontbreekt: "Niels Ahsmann" → "NA". */
function initialen(naam: string) {
  return naam
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join('');
}

/**
 * 'Meer weten?'-blok (huisstijl 2.2): Mist-blok met links kop en tekst, rechts een Violet vierkant fotoblok dat boven
 * het blok uitsteekt, met naam, functie, telefoon en e-mail eronder.
 */
export function MeerWeten({ id, kop, children }: { id: string; kop: ReactNode; children: ReactNode }) {
  return (
    <section className="meer" aria-labelledby={id}>
      <div className="meer-tekst">
        <h2 id={id}>{kop}</h2>
        {children}
      </div>
      <div className="persoon">
        <div className="fotoblok">
          {FOTO ? (
            <img src={FOTO} alt={`Portret van ${contact.naam}`} width={200} height={200} loading="lazy" />
          ) : (
            <span className="fotoblok-initialen" aria-hidden="true">
              {initialen(contact.naam)}
            </span>
          )}
        </div>
        <div className="naam">{contact.naam}</div>
        <div className="rol">{contact.functie}</div>
        <div className="contact">
          <span>{contact.telefoon}</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
      </div>
    </section>
  );
}
