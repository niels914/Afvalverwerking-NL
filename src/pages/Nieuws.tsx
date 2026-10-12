import { useState } from 'react';
import { Badge, Chips, Kaart, PaginaKop, VoorbeeldBadge } from '../components/ui';
import { nieuws, nieuwsBron, nieuwsThemas } from '../data/nieuws';
import type { NieuwsThema } from '../data/types';
import { datum } from '../lib/format';

type Filter = NieuwsThema | 'alle';

export function Nieuws() {
  const [thema, setThema] = useState<Filter>('alle');
  const lijst = nieuws
    .filter((n) => thema === 'alle' || n.thema === thema)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  return (
    <>
      <PaginaKop titel="Nieuws">
        Een overzicht van nieuws over afvalverwerking: capaciteit, heffingen, PMD, GFT, bodemas, textiel en contracten.
      </PaginaKop>

      <div className="notitie" role="note">
        Alle berichten op deze pagina zijn verzonnen voor het prototype. Ze komen niet van {nieuwsBron.naam} of een andere
        nieuwsbron. In het echte platform linkt elk bericht naar de oorspronkelijke bron, zoals{' '}
        <a href={nieuwsBron.url} target="_blank" rel="noopener noreferrer">
          {nieuwsBron.naam}
        </a>
        .
      </div>

      <div className="sectie">
        <Chips<Filter>
          label="Filter op thema"
          waarde={thema}
          onChange={setThema}
          opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...nieuwsThemas.map((t) => ({ waarde: t, label: t }))]}
        />
      </div>

      <p className="sectie klein muted" aria-live="polite">
        {lijst.length} {lijst.length === 1 ? 'bericht' : 'berichten'}
      </p>
      <ul className="berichten sectie">
        {lijst.map((n) => (
          <li key={n.id}>
            <article className="kaart bericht">
              <div className="meta">
                <time dateTime={n.datum}>{datum(n.datum)}</time>
                <Badge soort="thema">{n.thema}</Badge>
                <VoorbeeldBadge tekst="Voorbeeldbericht" />
              </div>
              <h2>{n.titel}</h2>
              <p>{n.samenvatting}</p>
              <p className="bron">
                Bronvermelding in het echte platform:{' '}
                <a href={nieuwsBron.url} target="_blank" rel="noopener noreferrer">
                  {nieuwsBron.naam}
                </a>{' '}
                (homepage). Dit voorbeeldbericht is verzonnen.
              </p>
            </article>
          </li>
        ))}
      </ul>
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen berichten voor dit thema.</p>
        </Kaart>
      )}
    </>
  );
}
