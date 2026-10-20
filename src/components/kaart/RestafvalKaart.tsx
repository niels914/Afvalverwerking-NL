import 'leaflet/dist/leaflet.css';
import './kaart.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, useMap } from 'react-leaflet';
import { gemeenten as alleGemeenten, grenzenBron, type GemeenteAfval } from '../../data/gemeenten';
import { indicatoren, kleurVan, waardeVan, type IndicatorId } from '../../lib/kaartdata';
import { getal } from '../../lib/format';

type MultiPolygon = GeoJSON.MultiPolygon;
type Grenzen = GeoJSON.FeatureCollection<MultiPolygon, { code: string; naam: string }>;

// Eén keer ophalen per bezoek; kaart op home en kaartpagina delen het resultaat.
let grenzenBelofte: Promise<Grenzen> | null = null;
function laadGrenzen(): Promise<Grenzen> {
  if (!grenzenBelofte) {
    grenzenBelofte = fetch(grenzenBron.bestand).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Grenzen>;
    });
    grenzenBelofte.catch(() => {
      grenzenBelofte = null;
    });
  }
  return grenzenBelofte;
}

const codeVan = (l: L.Layer) => ((l as L.Polygon).feature as GeoJSON.Feature<MultiPolygon, { code: string }>).properties.code;

const NEDERLAND: L.LatLngBoundsExpression = [
  [50.75, 3.36],
  [53.56, 7.23],
];

interface Props {
  /** Standaard alle gemeenten. */
  gemeenten?: GemeenteAfval[];
  indicator: IndicatorId;
  geselecteerd?: string | null;
  onSelecteer?: (code: string) => void;
  /** Verandert dit getal, dan zoomt de kaart naar de geselecteerde gemeente. */
  zoomVerzoek?: number;
  /** Kleine, stilstaande versie voor de homepage. */
  mini?: boolean;
}

/** Choropleetkaart per gemeente. Tegels van derden zijn niet nodig: de vlakken zijn de kaart. */
export function RestafvalKaart({ gemeenten = alleGemeenten, indicator, geselecteerd = null, onSelecteer, zoomVerzoek = 0, mini = false }: Props) {
  const [grenzen, setGrenzen] = useState<Grenzen | null>(null);
  const [fout, setFout] = useState(false);

  useEffect(() => {
    let actief = true;
    laadGrenzen()
      .then((g) => actief && setGrenzen(g))
      .catch(() => actief && setFout(true));
    return () => {
      actief = false;
    };
  }, []);

  if (fout) {
    return (
      <div className="kaart-melding" role="alert">
        De kaartgrenzen konden niet worden geladen. De cijfers staan wel in de tabel{mini ? ' op de kaartpagina' : ' hieronder'}.
      </div>
    );
  }

  return (
    <div className="kaart-wrap">
    <MapContainer
      bounds={NEDERLAND}
      boundsOptions={{ padding: [4, 4] }}
      zoomSnap={0.25}
      minZoom={6}
      maxZoom={11}
      maxBounds={[
        [49.8, 1.5],
        [54.6, 9.0],
      ]}
      scrollWheelZoom={false}
      dragging={!mini}
      zoomControl={!mini}
      doubleClickZoom={!mini}
      touchZoom={!mini}
      boxZoom={!mini}
      keyboard={!mini}
      attributionControl
      className={mini ? 'kaart-mini' : undefined}
      style={{ height: '100%', width: '100%' }}
    >
      {grenzen && (
        <Laag
          grenzen={grenzen}
          gemeenten={gemeenten}
          indicator={indicator}
          geselecteerd={geselecteerd}
          onSelecteer={onSelecteer}
          zoomVerzoek={zoomVerzoek}
          mini={mini}
        />
      )}
    </MapContainer>
      {!grenzen && (
        <div className="kaart-laden" role="status">
          Kaart laden…
        </div>
      )}
    </div>
  );
}

function Laag({
  grenzen,
  gemeenten,
  indicator,
  geselecteerd,
  onSelecteer,
  zoomVerzoek,
  mini,
}: Required<Pick<Props, 'indicator' | 'zoomVerzoek' | 'mini'>> & {
  gemeenten: GemeenteAfval[];
  grenzen: Grenzen;
  geselecteerd: string | null;
  onSelecteer?: (code: string) => void;
}) {
  const map = useMap();
  const laagRef = useRef<L.GeoJSON | null>(null);
  const perCode = useRef(new Map<string, GemeenteAfval>());
  perCode.current = new Map(gemeenten.map((g) => [g.code, g]));
  const stand = useRef({ indicator, geselecteerd, onSelecteer });
  stand.current = { indicator, geselecteerd, onSelecteer };

  const stijl = (code: string): L.PathOptions => {
    const actief = code === stand.current.geselecteerd;
    const kleur = kleurVan(perCode.current.get(code), stand.current.indicator);
    return {
      fillColor: kleur,
      fillOpacity: 1,
      color: actief ? '#111827' : kleur === '#ffffff' ? '#9ca3af' : '#ffffff',
      weight: actief ? 3 : 0.6,
      dashArray: kleur === '#ffffff' && !actief ? '2 2' : undefined,
    };
  };

  // Laag één keer opbouwen.
  useEffect(() => {
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution(`Grenzen: CBS/Kadaster via PDOK (${grenzenBron.jaar}) · Cijfers: CBS`);
    const laag = L.geoJSON(grenzen, {
      style: (f) => stijl(f?.properties.code),
      interactive: !mini,
      onEachFeature: (f, l) => {
        if (mini) return;
        const code = f.properties.code as string;
        l.bindTooltip(
          () => {
            const g = perCode.current.get(code);
            const ind = indicatoren[stand.current.indicator];
            const w = g ? waardeVan(g, ind.id) : null;
            const tekst = w === null ? 'geen cijfer' : `${getal(w, ind.decimalen)} ${ind.eenheid}`;
            const div = document.createElement('div');
            const b = document.createElement('strong');
            b.textContent = g?.naam ?? (f.properties.naam as string);
            div.append(b, document.createElement('br'), `${ind.kort}: ${tekst}`);
            return div;
          },
          { sticky: true, direction: 'top', offset: [0, -8] },
        );
        l.on('click', () => stand.current.onSelecteer?.(code));
        l.on('mouseover', () => (l as L.Path).setStyle({ weight: 2.5, color: '#111827' }));
        l.on('mouseout', () => (l as L.Path).setStyle(stijl(code)));
      },
    }).addTo(map);
    laagRef.current = laag;
    return () => {
      laag.remove();
      laagRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grenzen, map, mini]);

  // Kleuren en selectie bijwerken zonder de laag opnieuw te bouwen.
  useEffect(() => {
    const laag = laagRef.current;
    if (!laag) return;
    laag.eachLayer((l) => {
      const code = codeVan(l);
      (l as L.Path).setStyle(stijl(code));
      if (code === geselecteerd) (l as L.Path).bringToFront();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicator, geselecteerd, gemeenten]);

  // Zoomen op verzoek (zoeken of kiezen in de tabel).
  useEffect(() => {
    if (!zoomVerzoek || !geselecteerd || !laagRef.current) return;
    laagRef.current.eachLayer((l) => {
      const code = codeVan(l);
      if (code === geselecteerd) map.fitBounds((l as L.Polygon).getBounds(), { maxZoom: 10, padding: [30, 30] });
    });
  }, [zoomVerzoek, geselecteerd, map]);

  return null;
}
