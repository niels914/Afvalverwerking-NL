import '../components/stromen/stromen.css';
import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, PaginaKop } from '../components/ui';
import { Kern, useInklapBijPrintEnAnker } from '../components/rekenen/Inklap';
import { Blok } from '../components/stromen/Blok';
import { Kerncijfers, landelijkeFeiten } from '../components/stromen/Kerncijfers';
import { Ontwikkeling } from '../components/stromen/Ontwikkeling';
import { PerGemeente, useGemeenten } from '../components/stromen/PerGemeente';
import { Aanbestedingen, Publicaties, Regels, ToolsLijst, Verwerking } from '../components/stromen/Secties';
import { kgTekst } from '../components/stromen/opmaak';
import { isStroomId, stroomPerId, stromen } from '../data/stromen';
import { publicatiesVoorStroom } from '../data/kennisbank';
import { PEILDATUM } from '../data/stromen-inhoud';
import { datum } from '../lib/format';
import { NietGevonden } from './NietGevonden';

// De tooldata voor de aandachtspunten laadt pas als dat blok opengaat.
const Contract = lazy(() => import('../components/stromen/Contract'));

export function StroomPagina() {
  const { id } = useParams();
  if (!isStroomId(id)) return <NietGevonden />;
  return <Pagina key={id} id={id} />;
}

function Pagina({ id }: { id: (typeof stromen)[number]['id'] }) {
  const stroom = stroomPerId[id];
  const gemeenten = useGemeenten();
  const f = landelijkeFeiten(id);
  const pub = publicatiesVoorStroom(id);
  useInklapBijPrintEnAnker();
  useEffect(() => {
    document.title = `${stroom.naam} · Afvalstromen · Afvalverwerking.nl`;
  }, [stroom.naam]);

  const v = f.verandering;
  return (
    <>
      <PaginaKop
        titel={stroom.naam}
        badges={
          <>
            <Badge soort="thema">CBS-cijfers {f.laatste?.jaar ?? ''}</Badge>
            {f.status && f.status !== 'definitief' && <Badge>{`Cijfers ${f.status}`}</Badge>}
          </>
        }
      >
        {stroom.omschrijving}
      </PaginaKop>
      <nav aria-label="Op deze pagina" className="sectie">
        <ul className="op-deze-pagina">
          {[
            ['ontwikkeling', 'Ontwikkeling'],
            ['per-gemeente', 'Per gemeente'],
            ['verwerking', 'Verwerking en geldstromen'],
            ['regels', 'Regels en beleid'],
            ['tools', 'Tools'],
            ['aanbestedingen', 'Aanbestedingen en documenten'],
            ['contract', 'Aandachtspunten contract'],
            ['publicaties', 'Publicaties'],
          ].map(([anker, label]) => (
            <li key={anker}>
              <a href={`#${anker}`}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sectie">
        <Kern>
          <p className="ta-kern-zin">
            {f.laatste ? (
              <>
                Landelijk is er in {f.laatste.jaar} gemiddeld <strong>{kgTekst(f.laatste.waarde)} kg</strong> {stroom.naam.toLowerCase()} per inwoner ingezameld
                {v && v.pct !== null ? `, ongeveer ${Math.abs(Math.round(v.pct))} procent ${v.pct > 0 ? 'meer' : 'minder'} dan in ${v.van.jaar}` : ''}.
              </>
            ) : (
              'Voor deze stroom heeft CBS geen landelijk cijfer.'
            )}
          </p>
          <Kerncijfers stroom={stroom} gemeenten={gemeenten} />
        </Kern>
      </div>

      <div className="stromen-blokken sectie">
        <Blok id="ontwikkeling" titel="Ontwikkeling" sub="landelijk, per jaar" open="breed">
          <Ontwikkeling stroom={stroom} />
        </Blok>
        <Blok id="per-gemeente" titel="Per gemeente" sub="kaart en tabel" open="breed" uitgesteld>
          <PerGemeente stroom={stroom} gemeenten={gemeenten} />
        </Blok>
        <Blok id="verwerking" titel="Verwerking en geldstromen" sub="met bron en peildatum">
          <Verwerking stroom={stroom} />
        </Blok>
        <Blok id="regels" titel="Regels en beleid" sub={`gelezen op ${datum(PEILDATUM)}`}>
          <Regels stroom={stroom} />
        </Blok>
        <Blok id="tools" titel="Tools voor deze stroom" sub={`${stroom.tools.length}`}>
          <ToolsLijst stroom={stroom} />
        </Blok>
        <Blok id="aanbestedingen" titel="Aanbestedingen en documenten" sub="archief, voor leden">
          <Aanbestedingen stroom={stroom} />
        </Blok>
        <Blok id="contract" titel="Aandachtspunten bij een verwerkingscontract" sub="voorbeelden, geen juridisch advies" uitgesteld>
          <Suspense fallback={<p role="status">Aandachtspunten laden…</p>}>
            <Contract stroom={stroom} />
          </Suspense>
        </Blok>
        <Blok id="publicaties" titel="Publicaties" sub={`${pub.specifiek.length} bij deze stroom`}>
          <Publicaties stroom={stroom} />
        </Blok>
      </div>
    </>
  );
}
