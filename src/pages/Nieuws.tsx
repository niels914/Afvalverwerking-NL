import { useMemo, useState } from 'react';
import { Badge, Chips, Kaart, KeuzeVeld, PaginaKop } from '../components/ui';
import { nieuws, nieuwsBijgewerkt, nieuwsBronnen, nieuwsBronNamen, nieuwsThemas } from '../data/nieuws';
import { datum } from '../lib/format';

const PER_PAGINA = 15;

export function Nieuws() {
  const [thema, setThema] = useState('alle');
  const [bron, setBron] = useState('alle');
  const [aantal, setAantal] = useState(PER_PAGINA);

  const lijst = useMemo(
    () => nieuws.filter((n) => (thema === 'alle' || n.thema === thema) && (bron === 'alle' || n.bron === bron)),
    [thema, bron],
  );
  const zichtbaar = lijst.slice(0, aantal);
  const mislukt = nieuwsBronnen.filter((b) => b.status === 'mislukt');
  const unieke = (naam: string) => nieuwsBronnen.find((b) => b.naam === naam)?.site;

  return (
    <>
      <PaginaKop titel="Nieuws">
        Berichten over afval, verwerking en circulaire economie van Rijksoverheid, PIANOo en CBS. Elk bericht linkt naar het
        origineel bij de bron; hier staan alleen de titel, de datum en de korte inleiding uit de nieuwsfeed.
      </PaginaKop>

      <p className="klein muted">
        {nieuwsBijgewerkt ? <>Bijgewerkt op {datum(nieuwsBijgewerkt)}. </> : null}
        De lijst wordt bij elke publicatie van het platform opnieuw opgehaald.
      </p>
      {mislukt.length > 0 && (
        <div className="notitie" role="note">
          Bij de laatste update was niet elke bron bereikbaar ({[...new Set(mislukt.map((b) => b.naam))].join(', ')}). U ziet van
          die bron de laatst opgehaalde berichten.
        </div>
      )}

      <div className="filterbalk sectie">
        <KeuzeVeld
          label="Bron"
          waarde={bron}
          onChange={(b) => {
            setBron(b);
            setAantal(PER_PAGINA);
          }}
          opties={[{ waarde: 'alle', label: 'Alle bronnen' }, ...nieuwsBronNamen.map((b) => ({ waarde: b, label: b }))]}
        />
      </div>
      <div className="sectie">
        <Chips<string>
          label="Filter op thema"
          waarde={thema}
          onChange={(t) => {
            setThema(t);
            setAantal(PER_PAGINA);
          }}
          opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...nieuwsThemas.map((t) => ({ waarde: t, label: t }))]}
        />
      </div>

      <p className="sectie klein muted" aria-live="polite">
        {lijst.length} {lijst.length === 1 ? 'bericht' : 'berichten'}
      </p>
      <ul className="berichten sectie">
        {zichtbaar.map((n) => (
          <li key={n.id}>
            <article className="kaart bericht">
              <div className="meta">
                <time dateTime={n.datum}>{datum(n.datum)}</time>
                <span>
                  Bron: <strong>{n.bron}</strong>
                </span>
                <Badge soort="thema">{n.thema}</Badge>
              </div>
              <h2>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {n.titel}
                  <span className="visueel-verborgen"> (opent website van {n.bron} in nieuw tabblad)</span>
                </a>
              </h2>
              {n.inleiding && <p>{n.inleiding}</p>}
            </article>
          </li>
        ))}
      </ul>
      {lijst.length > aantal && (
        <div className="knoppen sectie">
          <button type="button" onClick={() => setAantal((a) => a + PER_PAGINA)}>
            Meer berichten ({lijst.length - aantal} over)
          </button>
        </div>
      )}
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen berichten voor deze keuze. Kies een ander thema of een andere bron.</p>
        </Kaart>
      )}

      <Kaart titel="Bronnen van dit overzicht" kopNiveau={2} className="sectie">
        <p className="klein">
          Berichten komen uit de openbare RSS-feeds van deze organisaties en worden gefilterd op onderwerpen als afval,
          recycling, verpakkingen, textiel en circulaire economie. De rechten op de berichten liggen bij de bron.
        </p>
        <ul className="klein">
          {nieuwsBronNamen.map((naam) => (
            <li key={naam}>
              <a href={unieke(naam)} target="_blank" rel="noopener noreferrer">
                {naam}
              </a>
            </li>
          ))}
        </ul>
      </Kaart>
    </>
  );
}
