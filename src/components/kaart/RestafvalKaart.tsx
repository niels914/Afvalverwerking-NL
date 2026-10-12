import 'leaflet/dist/leaflet.css';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { VerbandMetCijfers } from '../../lib/kaartdata';
import { getal } from '../../lib/format';

interface Props {
  verbanden: VerbandMetCijfers[];
  geselecteerdId?: string | null;
  onSelecteer?: (id: string) => void;
  /** Kleine versie voor de homepage: geen zoomen met scrollwiel. */
  mini?: boolean;
}

const NEDERLAND: [number, number] = [52.2, 5.35];

/** Straal van de cirkel groeit met de wortel van het aantal inwoners. */
function straal(inwoners: number, mini: boolean) {
  const r = Math.sqrt(inwoners) / 22;
  return Math.max(mini ? 5 : 8, Math.min(mini ? 12 : 22, mini ? r * 0.6 : r));
}

/**
 * Leaflet-kaart van Nederland met OpenStreetMap-tegels en één cirkel per samenwerkingsverband.
 * Heeft een verband een `grens` (GeoJSON), dan tekent de kaart dat vlak.
 */
export function RestafvalKaart({ verbanden, geselecteerdId, onSelecteer, mini = false }: Props) {
  return (
    <MapContainer
      center={NEDERLAND}
      zoom={mini ? 6 : 7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom={!mini}
      style={{ height: '100%', width: '100%' }}
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
      />
      {verbanden.map((v) => {
        const actief = v.id === geselecteerdId;
        const stijl = {
          color: actief ? '#9462A6' : '#5760A6',
          weight: actief ? 3 : 1.5,
          fillColor: actief ? '#9462A6' : '#5760A6',
          fillOpacity: actief ? 0.75 : 0.45,
        };
        const tooltip = (
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{v.naam}</strong>
            <br />
            {getal(v.cijfers.restafvalKgPerInw)} kg restafval/inw (voorbeeld)
          </Tooltip>
        );
        const handlers = onSelecteer ? { click: () => onSelecteer(v.id) } : undefined;
        if (v.grens) {
          return (
            <GeoJSON key={`${v.id}-${actief}`} data={v.grens} style={() => stijl} eventHandlers={handlers}>
              {tooltip}
            </GeoJSON>
          );
        }
        return (
          <CircleMarker key={v.id} center={v.centrum} radius={straal(v.cijfers.inwoners, mini)} pathOptions={stijl} eventHandlers={handlers}>
            {tooltip}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
