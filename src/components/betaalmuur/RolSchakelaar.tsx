import { useRol, type Rol } from './RolContext';

const opties: { rol: Rol; label: string }[] = [
  { rol: 'bezoeker', label: 'Bezoeker' },
  { rol: 'lid', label: 'Lid' },
];

/** Schakelaar rechts in de navbar. Alleen voor de demo: er is geen echte login. */
export function RolSchakelaar() {
  const { rol, zetRol } = useRol();
  return (
    <div className="rol" role="group" aria-labelledby="rol-label">
      <span id="rol-label">Bekijk als:</span>
      <span className="rol-groep">
        {opties.map((o) => (
          <button key={o.rol} type="button" aria-pressed={rol === o.rol} onClick={() => zetRol(o.rol)}>
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}
