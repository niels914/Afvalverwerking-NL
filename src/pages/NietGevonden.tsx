import { Link } from 'react-router-dom';
import { PaginaKop } from '../components/ui';

export function NietGevonden() {
  return (
    <>
      <PaginaKop titel="Pagina niet gevonden">Deze pagina bestaat niet (meer).</PaginaKop>
      <Link className="knop primair" to="/">
        Naar de homepage
      </Link>
    </>
  );
}
