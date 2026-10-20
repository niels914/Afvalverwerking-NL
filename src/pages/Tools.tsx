import { Link } from 'react-router-dom';
import { Kaart, PaginaKop, ToegangBadge } from '../components/ui';
import { toolBronnen, tools } from '../data/tools';

export function Tools() {
  return (
    <>
      <PaginaKop titel="Rekentools">
        Rekenhulpen voor contractmanagers en beleidsmedewerkers van gemeenten, samenwerkingsverbanden en afvalverwerkers.
        Elke tool laat zien met welke cijfers hij rekent, waar die vandaan komen en welke waarden u zelf invult.
      </PaginaKop>
      <div className="raster raster-3">
        {tools.map((t) => (
          <Kaart key={t.id} titel={t.titel} className="toolkaart">
            <div className="badges">
              <ToegangBadge toegang={t.toegang} />
            </div>
            {t.extraLabel && <p className="klein" style={{ color: 'var(--donkerviolet)', fontWeight: 600 }}>{t.extraLabel}</p>}
            <p>{t.omschrijving}</p>
            <dl className="invoerlijst" style={{ gridTemplateColumns: 'auto minmax(0,1fr)' }}>
              {t.gratisDeel && (
                <>
                  <dt>Gratis</dt>
                  <dd style={{ textAlign: 'left' }}>{t.gratisDeel}</dd>
                </>
              )}
              {t.proDeel && (
                <>
                  <dt>Pro</dt>
                  <dd style={{ textAlign: 'left' }}>{t.proDeel}</dd>
                </>
              )}
              {toolBronnen[t.id] && (
                <>
                  <dt>Bronnen</dt>
                  <dd style={{ textAlign: 'left' }}>{toolBronnen[t.id]}</dd>
                </>
              )}
            </dl>
            <div className="knoppen">
              <Link className="knop primair" to={t.pad}>
                Open {t.titel.toLowerCase().startsWith('rekenmodel') ? 'rekenmodel' : 'tool'}
                <span className="visueel-verborgen">: {t.titel}</span>
              </Link>
            </div>
          </Kaart>
        ))}
      </div>
    </>
  );
}
