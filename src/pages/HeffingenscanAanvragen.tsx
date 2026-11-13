import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GemeenteZoeker } from '../components/heffingenscan/GemeenteZoeker';
import { Rapportaanvraag } from '../components/heffingenscan/Rapportaanvraag';
import { bewaarBronUitUrl } from '../components/heffingenscan/bron';
import { kerncijfersTekst } from '../components/heffingenscan/kerncijfers';
import { PaginaKop } from '../components/ui';
import { aanbodPrijzen } from '../data/heffingen-aanbod';
import { heffingGemeenten } from '../data/heffingen-gemeenten';
import { contact } from '../data/site';
import { standaardInvoer, vergelijkPaden, vindOpSlug } from '../lib/calc/heffingen';
import { euro } from '../lib/format';
import { HEFFINGENSCAN_PAD, heffingenscanPad } from '../lib/heffingenVoorbeeld';

/** /heffingenscan/aanvragen?gemeente=<slug>: alleen het aanvraagformulier voor het rapport. */
export function HeffingenscanAanvragen() {
  const [params, setParams] = useSearchParams();
  const g = vindOpSlug(params.get('gemeente') ?? '', heffingGemeenten);
  const standaard = useMemo(() => (g ? standaardInvoer(g) : null), [g]);

  useEffect(() => {
    document.title = g ? `Rapport aanvragen: ${g.naam} · Heffingenscan restafval` : 'Rapport aanvragen · Heffingenscan restafval';
    bewaarBronUitUrl(window.location.search);
  }, [g]);

  return (
    <div className="hs-pagina stapel">
      <PaginaKop titel={g ? `Rapport aanvragen: ${g.naam}` : 'Rapport aanvragen'}>
        KplusV maakt voor uw gemeente een rapport met uw eigen tonnage en uw verwerkingscontract. Het rapport kost {euro(aanbodPrijzen.rapport)}, een toelichting met sparringssessie {euro(aanbodPrijzen.toelichtingExtra)} extra, alles{' '}
        {aanbodPrijzen.btwTekst}.
      </PaginaKop>
      {g && standaard ? (
        <>
          <p>
            <Link to={heffingenscanPad(g.slug)}>Terug naar de scan voor {g.naam}</Link>
          </p>
          <Rapportaanvraag
            gemeente={{ code: g.code, naam: g.naam }}
            kerncijfers={kerncijfersTekst(g, standaard, standaard, vergelijkPaden(standaard), `${typeof window === 'undefined' ? '' : window.location.origin}${heffingenscanPad(g.slug)}`)}
          />
        </>
      ) : (
        <div className="stapel">
          {params.get('gemeente') && <p className="notitie" role="status">Gemeente “{params.get('gemeente')}” niet gevonden. Zoek uw gemeente hieronder.</p>}
          <p>Kies eerst uw gemeente. Daarna vult u uw gegevens in.</p>
          <GemeenteZoeker gemeenten={heffingGemeenten} onKies={(x) => setParams({ gemeente: x.slug })} />
          <p className="klein">
            Een rapport voor meerdere gemeenten? Mail {contact.naam} via <a href={`mailto:${contact.email}`}>{contact.email}</a> of bel {contact.telefoon}. <Link to={HEFFINGENSCAN_PAD}>Terug naar de Heffingenscan</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
