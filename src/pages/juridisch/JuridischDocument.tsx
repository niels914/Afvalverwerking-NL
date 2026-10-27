import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { platform } from '../../data/site';
import { datum } from '../../lib/format';
import { aanbieder, bronnen, documenten, toetspuntenTonen, type BronSleutel, type DocumentId } from './gegevens';
import './juridisch.css';

// Gedeelde opmaak voor de juridische pagina's: conceptmarkering, versie en datum, de kern in het kort,
// inhoudsopgave met ankers, inklapbare secties met een eigen id, afdrukken als pdf, contact en "naar boven".
//
// Inklappen: op een breed scherm (vanaf BREED) staan alle secties open, op een smal scherm dicht. De kop van een
// sectie blijft altijd zichtbaar, zodat ankers als /privacy#rechten blijven werken; een anker of zoeken in de pagina
// (Ctrl+F, via hidden="until-found") klapt de sectie vanzelf open. Afdrukken klapt alles open.

/** Vanaf deze breedte staan de secties standaard open en is de inhoudsopgave zichtbaar. Gelijk aan juridisch.css. */
const BREED = '(min-width: 760px)';

export interface Sectie {
  /** Anker in de URL, bijvoorbeeld "looptijd" → /algemene-voorwaarden#looptijd. Uniek per pagina. */
  id: string;
  titel: string;
  inhoud: ReactNode;
}

interface Props {
  id: DocumentId;
  /** Eén zin onder de titel: wat staat hier en voor wie. */
  intro: ReactNode;
  /** De belangrijkste afspraken of feiten in een paar regels. Staat altijd open, boven de inhoudsopgave. */
  kern: ReactNode[];
  secties: Sectie[];
}

function isBreed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(BREED).matches;
}

export function JuridischDocument({ id, intro, kern, secties }: Props) {
  const doc = documenten[id];
  const alleIds = useMemo(() => secties.map((s) => s.id), [secties]);
  const [open, setOpen] = useState<Set<string>>(() => {
    if (isBreed()) return new Set(alleIds);
    const anker = typeof window !== 'undefined' ? decodeURIComponent(window.location.hash.slice(1)) : '';
    return new Set(alleIds.includes(anker) ? [anker] : []);
  });
  const inhoudRefs = useRef(new Map<string, HTMLDivElement>());
  const allesOpen = open.size === secties.length;

  useEffect(() => {
    document.title = `${doc.titel} · ${platform.korteNaam}`;
  }, [doc.titel]);

  const openSectie = useCallback((sectieId: string) => {
    setOpen((o) => (o.has(sectieId) ? o : new Set(o).add(sectieId)));
  }, []);

  // Anker naar een sectie of naar iets binnen een sectie (bijv. #verwerking-account): sectie openen en erheen gaan.
  useLayoutEffect(() => {
    function volgAnker(bijLaden: boolean) {
      const anker = decodeURIComponent(window.location.hash.slice(1));
      if (!anker) return;
      const doel = document.getElementById(anker);
      const sectie = doel?.closest<HTMLElement>('.jd-sectie');
      if (!doel || !sectie) return;
      if (bijLaden) {
        // Binnen een layout-effect: de sectie gaat open vóór het tekenen; scrollen na die render.
        openSectie(sectie.id);
        requestAnimationFrame(() => doel.scrollIntoView());
      } else {
        flushSync(() => openSectie(sectie.id));
        doel.scrollIntoView();
      }
    }
    volgAnker(true);
    const bijWijziging = () => volgAnker(false);
    window.addEventListener('hashchange', bijWijziging);
    return () => window.removeEventListener('hashchange', bijWijziging);
  }, [openSectie]);

  // Afdrukken (ook via Ctrl+P): eerst alles open.
  useEffect(() => {
    const voorAfdrukken = () => flushSync(() => setOpen(new Set(alleIds)));
    window.addEventListener('beforeprint', voorAfdrukken);
    return () => window.removeEventListener('beforeprint', voorAfdrukken);
  }, [alleIds]);

  // Dichte secties krijgen hidden="until-found": niet zichtbaar, wel vindbaar met zoeken in de pagina.
  // React 18 kent die waarde van hidden niet, daarom via de DOM.
  useLayoutEffect(() => {
    for (const [sectieId, el] of inhoudRefs.current) {
      if (open.has(sectieId)) el.removeAttribute('hidden');
      else el.setAttribute('hidden', 'until-found');
    }
  }, [open]);

  useEffect(() => {
    const kaart = inhoudRefs.current;
    const luisteraars = [...kaart].map(([sectieId, el]) => {
      const bijVinden = () => openSectie(sectieId);
      el.addEventListener('beforematch', bijVinden);
      return () => el.removeEventListener('beforematch', bijVinden);
    });
    return () => luisteraars.forEach((stop) => stop());
  }, [openSectie]);

  function wissel(sectieId: string) {
    setOpen((o) => {
      const nieuw = new Set(o);
      if (nieuw.has(sectieId)) nieuw.delete(sectieId);
      else nieuw.add(sectieId);
      return nieuw;
    });
  }

  function afdrukken() {
    flushSync(() => setOpen(new Set(alleIds)));
    window.print();
  }

  return (
    <article className="jd" aria-labelledby="jd-titel">
      <header className="jd-kop">
        <h1 id="jd-titel">{doc.titel}</h1>
        {doc.concept && <Conceptmarkering versie={doc.versie} gewijzigd={doc.gewijzigd} />}
        <p className="jd-lead">{intro}</p>
        <p className="jd-meta">
          Versie {doc.versie} · laatst gewijzigd op <time dateTime={doc.gewijzigd}>{datum(doc.gewijzigd)}</time>
        </p>
      </header>

      <section className="jd-kern" id="in-het-kort" aria-labelledby="jd-kern-kop">
        <h2 id="jd-kern-kop">In het kort</h2>
        <ul>
          {kern.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </section>

      <nav className="jd-inhoud" aria-labelledby="jd-inhoud-kop">
        <h2 id="jd-inhoud-kop">Op deze pagina</h2>
        <ul>
          {secties.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} onClick={() => openSectie(s.id)}>
                {s.titel}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="jd-acties">
        <button type="button" onClick={() => setOpen(allesOpen ? new Set() : new Set(alleIds))}>
          {allesOpen ? 'Alles inklappen' : 'Alles uitklappen'}
        </button>
        <button type="button" onClick={afdrukken}>
          Afdrukken of opslaan als pdf
        </button>
      </div>

      {secties.map((s) => {
        const isOpen = open.has(s.id);
        return (
          <section key={s.id} id={s.id} className="jd-sectie" aria-labelledby={`${s.id}-kop`}>
            <h2 id={`${s.id}-kop`}>
              <button
                type="button"
                className="jd-sectie-knop"
                aria-expanded={isOpen}
                aria-controls={`${s.id}-inhoud`}
                onClick={() => wissel(s.id)}
              >
                <span>{s.titel}</span>
                <span className="jd-pijl" aria-hidden="true" />
              </button>
            </h2>
            <div
              id={`${s.id}-inhoud`}
              className="jd-sectie-inhoud"
              ref={(el) => {
                if (el) inhoudRefs.current.set(s.id, el);
                else inhoudRefs.current.delete(s.id);
              }}
            >
              {s.inhoud}
            </div>
          </section>
        );
      })}

      <p className="jd-naarboven">
        <a href="#jd-titel">↑ Naar boven</a>
      </p>
    </article>
  );
}

/** Duidelijke markering bovenaan: concept, versie en datum. Tekst plus icoon, niet alleen kleur. */
export function Conceptmarkering({ versie, gewijzigd }: { versie: string; gewijzigd: string }) {
  return (
    <div className="jd-concept" role="note" aria-label="Concept ter juridische toetsing">
      <span className="jd-concept-icoon" aria-hidden="true">
        ⚠
      </span>
      <div>
        <strong>Concept ter juridische toetsing</strong>
        <p>
          Versie {versie}, {datum(gewijzigd)}. Deze tekst is nog niet getoetst door een jurist. Na de toetsing kan hij
          veranderen; een nieuwe versie krijgt een nieuw versienummer en een nieuwe datum.
        </p>
      </div>
    </div>
  );
}

/** Bronvermelding bij een feit: titel met link en peildatum. */
export function BronRegel({ sleutel, voorvoegsel = 'Bron' }: { sleutel: BronSleutel; voorvoegsel?: string }) {
  const b = bronnen[sleutel];
  return (
    <p className="jd-bron">
      {voorvoegsel}: <a href={b.url}>{b.titel}</a>, geraadpleegd op {datum(b.peildatum)}.
      {'opmerking' in b && b.opmerking ? ` ${b.opmerking}` : ''}
    </p>
  );
}

/**
 * Inklapbaar kader met een punt dat de jurist moet beoordelen. Verdwijnt van alle pagina's zodra
 * `toetspuntenTonen` in gegevens.ts op false staat (na de toetsing). Niet in de afdruk.
 */
export function Toetspunt({ children }: { children: ReactNode }) {
  if (!toetspuntenTonen) return null;
  return (
    <details className="jd-toetspunt">
      <summary>Toetspunt voor de jurist</summary>
      <p>{children}</p>
    </details>
  );
}

/** Contactgegevens voor vragen over een juridische tekst. */
export function ContactBlok({ onderwerp }: { onderwerp: string }) {
  const c = aanbieder.contact;
  const mail = `mailto:${c.email}?subject=${encodeURIComponent(onderwerp)}`;
  return (
    <>
      <p>
        {c.naam}, {c.functie}
        <br />
        E-mail: <a href={mail}>{c.email}</a>
        <br />
        Telefoon: <a href={`tel:+31${c.telefoon.replace(/\s/g, '').slice(1)}`}>{c.telefoon}</a>
      </p>
      <p>
        {aanbieder.naam}, {aanbieder.straat}, {aanbieder.postcode} {aanbieder.plaats}. Algemeen: {aanbieder.telefoonAlgemeen},{' '}
        <a href={`mailto:${aanbieder.emailAlgemeen}`}>{aanbieder.emailAlgemeen}</a>.
      </p>
    </>
  );
}

/** Genummerde leden van een artikel, bijvoorbeeld 5.1, 5.2. */
export function Leden({ artikel, children }: { artikel: number; children: ReactNode[] }) {
  return (
    <ol className="jd-artikel">
      {children.map((lid, i) => (
        <li key={i} data-nr={`${artikel}.${i + 1}`}>
          <span>{lid}</span>
        </li>
      ))}
    </ol>
  );
}
