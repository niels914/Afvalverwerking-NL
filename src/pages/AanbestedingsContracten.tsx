import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, KeuzeVeld, PaginaKop } from '../components/ui';
import { isToegangOnbekend, useAuth } from '../lib/auth';
import { PROVINCIES, STROMEN, groepeerPerKwartaal, haalContractenKalender, vandaagNl, type KalenderContract } from '../lib/aanbestedingen';
import { datum, getal } from '../lib/format';
import './Aanbestedingsarchief.css';

/** Contractenkalender: welke contracten lopen af, volgens de aankondiging van de gegunde opdracht (alleen leden). */
export function AanbestedingsContracten() {
  const auth = useAuth();
  const { isLid } = auth;
  return (
    <>
      <PaginaKop
        titel="Contractenkalender"
        badges={isLid ? <Badge soort="leden">Voor leden</Badge> : <Badge soort="leden"><span aria-hidden="true">🔒</span> Alleen leden</Badge>}
      >
        Wanneer lopen inzamel- en verwerkingscontracten af? De kalender toont gegunde aanbestedingen waarvan de aankondiging een einddatum of looptijd noemt, met de
        aanbesteding als bron.
      </PaginaKop>
      <p className="archief-bibliotheek">
        <Link to="/aanbestedingsarchief">Terug naar het aanbestedingsarchief</Link>
      </p>
      {isToegangOnbekend(auth) ? (
        <p className="sectie muted" style={{ minHeight: '100vh' }}>
          Toegang controleren…
        </p>
      ) : (
        <Vergrendeld
          titel="Contractenkalender"
          ledenKrijgen={[
            'Per kwartaal de contracten die aflopen, met opdrachtgever, gegunde partij en afvalstroom',
            'Filteren op afvalstroom en provincie',
            'Per contract de link naar de aanbesteding en de aankondiging op TenderNed',
          ]}
        >
          {isLid ? <Kalender /> : <div className="archief-voorbeeld" aria-hidden="true"><span className="archief-balk breed" /><span className="archief-balk breed" /></div>}
        </Vergrendeld>
      )}
    </>
  );
}

function Kalender() {
  const [params, setParams] = useSearchParams();
  const stroom = STROMEN.includes(params.get('stroom') ?? '') ? (params.get('stroom') as string) : '';
  const provincie = params.get('provincie') === 'landelijk' || (PROVINCIES as readonly string[]).includes(params.get('provincie') ?? '') ? (params.get('provincie') as string) : '';
  const [rijen, setRijen] = useState<{ voor: string; lijst: KalenderContract[] } | null>(null);
  const [fout, setFout] = useState(false);
  const sleutel = `${stroom}|${provincie}`;

  useEffect(() => {
    let actief = true;
    setFout(false);
    haalContractenKalender(stroom, provincie, vandaagNl()).then(
      (lijst) => actief && setRijen({ voor: sleutel, lijst }),
      () => actief && setFout(true),
    );
    return () => {
      actief = false;
    };
  }, [stroom, provincie, sleutel]);

  const zet = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const klaar = rijen?.voor === sleutel;
  const groepen = klaar ? groepeerPerKwartaal(rijen!.lijst) : [];

  return (
    <div className="archief">
      <section className="kaart vlak archief-filterkaart" aria-labelledby="kal-filter-kop">
        <h2 id="kal-filter-kop" className="balk">Filteren</h2>
        <div className="archief-filters">
          <KeuzeVeld<string> label="Afvalstroom" waarde={stroom} onChange={(v) => zet('stroom', v)} opties={[{ waarde: '', label: 'Alle afvalstromen' }, ...STROMEN.map((s) => ({ waarde: s, label: s }))]} />
          <KeuzeVeld<string>
            label="Provincie"
            waarde={provincie}
            onChange={(v) => zet('provincie', v)}
            opties={[{ waarde: '', label: 'Alle provincies' }, ...PROVINCIES.map((p) => ({ waarde: p, label: p })), { waarde: 'landelijk', label: 'Provincie onbekend' }]}
          />
        </div>
      </section>

      <section className="kaart archief-resultaten" aria-labelledby="kal-kop">
        <h2 id="kal-kop" className="balk">Aflopende contracten</h2>
        <p className="archief-aantal" role="status" aria-live="polite">
          {fout ? '' : !klaar ? 'Contracten laden…' : rijen!.lijst.length === 0 ? 'Geen contracten gevonden.' : `${getal(rijen!.lijst.length)} contracten lopen af vanaf vandaag.`}
        </p>
        <p className="hint">
          Alleen gegunde aanbestedingen waarvan de aankondiging een einddatum, of een begindatum met looptijd, noemt. Dat is een deel van alle gegunde aanbestedingen. Verlengingen,
          wijzigingen en vroegtijdige beëindiging zijn niet doorgerekend: controleer bij de opdrachtgever of het contract nog loopt.
        </p>
        {fout && (
          <p role="alert" className="archief-fout">
            De contracten konden niet worden geladen. Probeer het later opnieuw.
          </p>
        )}
        {groepen.map((g) => (
          <div key={g.sleutel} className="kal-groep">
            <h3 className="kal-kop">{g.label}</h3>
            <ul className="bib-lijst">
              {g.rijen.map((c) => (
                <li key={c.kenmerk} className="bib-treffer">
                  <p className="bib-naam">
                    Einde {datum(c.contract_einde)}
                    <span className="bib-meta"> {c.einde_afgeleid ? '(afgeleid uit begindatum en looptijd)' : '(volgens de aankondiging)'}</span>
                  </p>
                  <p className="bib-aanbesteding">
                    <span className="archief-opdrachtgever">{c.opdrachtgever}</span>
                    <Link to={`/aanbestedingsarchief?zoek=${c.kenmerk}`}>{c.titel}</Link>
                  </p>
                  <p className="bib-meta">
                    Gegund aan {c.gegund_aan.join(', ')}
                    {c.stromen.length > 0 ? ` · ${c.stromen.join(', ')}` : ''}
                    {c.provincies.length > 0 ? ` · ${c.provincies.join(', ')}` : ''}
                    {c.verlengingen !== null ? ` · maximaal ${getal(c.verlengingen)} ${c.verlengingen === 1 ? 'verlenging' : 'verlengingen'}` : ''} ·{' '}
                    <a href={c.tenderned_url} target="_blank" rel="noopener noreferrer">
                      Aankondiging op TenderNed<span className="visueel-verborgen"> (opent in nieuw venster)</span>
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
