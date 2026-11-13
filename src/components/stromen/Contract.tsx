import { Link } from 'react-router-dom';
import { Badge } from '../ui';
import type { Stroom } from '../../data/stromen';
import { criteriaVoorStroom, soortLabel, stromen as toolStromen, type StroomId as ToolStroomId } from '../../data/tools-b-aanbesteding';

/**
 * Aandachtspunten bij een verwerkingscontract, uit de Aanbestedingstool (src/data/tools-b-aanbesteding.ts).
 * Eigen onderdeel dat pas laadt als het blok opengaat, omdat het de tooldata meebrengt.
 */
export default function Contract({ stroom }: { stroom: Stroom }) {
  const toolId = stroom.toolStroom as ToolStroomId | undefined;
  const lijst = toolId ? criteriaVoorStroom(toolId) : [];
  const eigen = lijst.filter((c) => c.stromen !== 'alle');
  const algemeen = lijst.filter((c) => c.stromen === 'alle');
  const pad = toolId ? `/tools/aanbestedingstool?stroom=${toolId}` : '/tools/aanbestedingstool';
  const toon = toolId ? eigen : [];
  return (
    <>
      <p className="notitie info">
        Voorbeelden uit de Aanbestedingstool, geen juridisch advies. “MVI-criterium” verwijst naar de MVI-criteriatool van de Rijksoverheid; “voorbeeld KplusV” is een eigen
        voorstel zonder officiële status. Pas ze aan op uw situatie en laat ze toetsen door uw inkoopjurist.
      </p>
      {toolId && toolStromen[toolId]?.mvi && (
        <p className="klein muted">Voor deze stroom bestaat een MVI-productgroep: Verwerking huishoudelijk afval.</p>
      )}
      {toon.length === 0 ? (
        <p className="muted">
          Voor {stroom.naam.toLowerCase()} heeft de Aanbestedingstool geen eigen criteria. {algemeen.length > 0 ? `Er zijn ${algemeen.length} algemene contractbepalingen voor elke stroom, zoals indexering, volumebandbreedte en rapportage.` : ''}
        </p>
      ) : (
        <ul className="criteria">
          {toon.map((c) => (
            <li key={c.id}>
              <h3>{c.titel}</h3>
              <p className="klein">
                <Badge>{soortLabel[c.soort]}</Badge> {c.mvi ? <Badge soort="thema">{`MVI-criterium ${c.mvi.code}`}</Badge> : <Badge soort="voorbeeld">Voorbeeld KplusV</Badge>}
              </p>
              <p>{c.tekst}</p>
              {c.toetsing && <p className="klein muted">Toetsing: {c.toetsing}</p>}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link className="link-pijl" to={pad}>
          Eisen, criteria en weging samenstellen in de Aanbestedingstool
        </Link>
      </p>
    </>
  );
}
