import { useEffect, type ReactNode } from 'react';
import { platform } from '../../data/site';
import { datum } from '../../lib/format';
import { aanbieder, bronnen, documenten, type BronSleutel, type DocumentId } from './gegevens';
import './juridisch.css';

// Gedeelde opmaak voor de juridische pagina's: conceptmarkering, versie en datum, inhoudsopgave met ankers,
// secties met een eigen id, contact en "naar boven".

export interface Sectie {
  /** Anker in de URL, bijvoorbeeld "looptijd" → /algemene-voorwaarden#looptijd. Uniek per pagina. */
  id: string;
  titel: string;
  inhoud: ReactNode;
}

interface Props {
  id: DocumentId;
  /** Korte samenvatting onder de titel: wat staat hier en voor wie. */
  intro: ReactNode;
  secties: Sectie[];
}

export function JuridischDocument({ id, intro, secties }: Props) {
  const doc = documenten[id];

  useEffect(() => {
    document.title = `${doc.titel} · ${platform.korteNaam}`;
  }, [doc.titel]);

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

      <nav className="jd-inhoud" aria-labelledby="jd-inhoud-kop">
        <h2 id="jd-inhoud-kop">Op deze pagina</h2>
        <ul>
          {secties.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.titel}</a>
            </li>
          ))}
        </ul>
      </nav>

      {secties.map((s) => (
        <section key={s.id} id={s.id} className="jd-sectie" aria-labelledby={`${s.id}-kop`}>
          <h2 id={`${s.id}-kop`}>{s.titel}</h2>
          {s.inhoud}
        </section>
      ))}

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

/** Kader met een punt dat de jurist moet beoordelen. */
export function Toetspunt({ children }: { children: ReactNode }) {
  return (
    <div className="jd-kader jd-toetspunt">
      <p>
        <strong>Toetspunt voor de jurist:</strong> {children}
      </p>
    </div>
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
