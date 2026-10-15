/** Korte inhoudsopgave met ankers bovenaan een rekentool. Verdwijnt in de printweergave. */
export function OpDezePagina({ links }: { links: { id: string; label: string }[] }) {
  return (
    <nav aria-label="Op deze pagina" className="geen-print" style={{ margin: '0 0 20px' }}>
      <p className="klein" style={{ margin: '0 0 6px', fontWeight: 600 }}>
        Op deze pagina
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
        {links.map((l) => (
          <li key={l.id}>
            <a href={`#${l.id}`} className="klein">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
