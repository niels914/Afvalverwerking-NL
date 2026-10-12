import { Link } from 'react-router-dom';
import { Kaart, PaginaKop, ToegangBadge } from '../components/ui';
import { tools } from '../data/tools';

export function Tools() {
  return (
    <>
      <PaginaKop titel="Rekentools">
        Rekenhulpen voor contractmanagers en beleidsmedewerkers. Alle tools in dit prototype zijn dummyberekeningen met
        fictieve waarden: ze laten zien hoe de tool werkt, niet wat de uitkomst voor uw organisatie is.
      </PaginaKop>
      <div className="raster raster-3">
        {tools.map((t) => (
          <Kaart key={t.id} titel={t.titel} className="toolkaart">
            <div className="badges">
              <ToegangBadge toegang={t.toegang} />
            </div>
            {t.extraLabel && <p className="klein" style={{ color: 'var(--donkerviolet)', fontWeight: 600 }}>{t.extraLabel}</p>}
            <p>{t.omschrijving}</p>
            {(t.gratisDeel || t.proDeel) && (
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
              </dl>
            )}
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
