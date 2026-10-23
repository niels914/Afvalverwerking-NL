import { Link } from 'react-router-dom';
import { Badge } from '../ui';
import {
  bronnen,
  btwPercentage,
  inbegrepen,
  prijzenVastgesteld,
  staffels,
  veelgesteldeVragen,
  vergelijking,
  voorwaarden,
  type BronSleutel,
} from '../../data/lidmaatschap';
import { datum, euro } from '../../lib/format';
import { prijsVoorStaffel, type Berekening } from '../../lib/prijs';
import './lidmaatschap.css';

const maanden = (n: number) => (n === 1 ? '1 maand' : `${n} maanden`);

/** Label "Concept" zolang Niels de prijzen niet heeft vastgesteld. */
export function ConceptBadge() {
  if (prijzenVastgesteld) return null;
  return <Badge soort="voorbeeld">Concept: prijzen nog niet vastgesteld</Badge>;
}

/** Bronregel onder een gegeven: titel als link en peildatum. */
export function Bron({ sleutel }: { sleutel: BronSleutel }) {
  const b = bronnen[sleutel];
  return (
    <p className="lm-bron">
      Bron: <a href={b.url}>{b.titel}</a>, geraadpleegd op {datum(b.peildatum)}.
    </p>
  );
}

/** Eén kaart per staffel met prijs excl. en incl. btw en een link naar het aanmeldformulier. */
export function Staffelkaarten() {
  return (
    <div className="lm-staffels">
      {staffels.map((s) => {
        const p = prijsVoorStaffel(s.id);
        return (
          <section key={s.id} className="kaart lm-staffel" aria-labelledby={`staffel-${s.id}`}>
            <h3 id={`staffel-${s.id}`}>{s.naam}</h3>
            <p className="voor-wie">{s.voorWie}</p>
            <p className="bedrag">{euro(p.exclBtw)}</p>
            <p className="klein muted">
              per jaar, excl. btw
              <br />
              {euro(p.inclBtw, 2)} incl. {btwPercentage} % btw
            </p>
            <Link className="knop primair" to={`/lidmaatschap/aanmelden?staffel=${s.id}`} aria-label={`Aanmelden: ${s.naam}`}>
              Aanmelden
            </Link>
          </section>
        );
      })}
    </div>
  );
}

/** Dezelfde prijzen als tabel, met btw-bedrag apart. */
export function PrijzenTabel() {
  return (
    <div className="tabel-container">
      <table className="lm-tabel lm-tabel-stapel">
        <caption>
          Jaarprijs per organisatie, ongeacht het aantal gebruikers.{!prijzenVastgesteld && ' Concept: nog niet vastgesteld.'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Staffel</th>
            <th scope="col" className="num">Excl. btw</th>
            <th scope="col" className="num">Btw {btwPercentage} %</th>
            <th scope="col" className="num">Incl. btw</th>
          </tr>
        </thead>
        <tbody>
          {staffels.map((s) => {
            const p = prijsVoorStaffel(s.id);
            return (
              <tr key={s.id}>
                <th scope="row">
                  {s.korteNaam}
                  <br />
                  <span className="klein muted">{s.voorWie}</span>
                </th>
                <td className="num" data-label="Excl. btw">{euro(p.exclBtw, 2)}</td>
                <td className="num" data-label={`Btw ${btwPercentage} %`}>{euro(p.btw, 2)}</td>
                <td className="num" data-label="Incl. btw">{euro(p.inclBtw, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Inbegrepen() {
  return (
    <ul className="vinklijst">
      {inbegrepen.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** Looptijd, verlenging, opzegging en betaling in het kort. */
export function VoorwaardenKort() {
  return (
    <dl className="lm-gegevens">
      <dt>Looptijd</dt>
      <dd>{maanden(voorwaarden.looptijdMaanden)} vanaf de startdatum die u kiest (jaarabonnement)</dd>
      <dt>Verlenging</dt>
      <dd>Stilzwijgend, steeds met {maanden(voorwaarden.verlengingMaanden)}</dd>
      <dt>Opzeggen</dt>
      <dd>Per e-mail, uiterlijk {maanden(voorwaarden.opzegtermijnMaanden)} voor de einddatum. U krijgt een bevestiging.</dd>
      <dt>Betaling</dt>
      <dd>
        Op factuur, vooraf per contractjaar. Betaaltermijn {voorwaarden.betaaltermijnDagen} dagen. Geen automatische incasso
        of creditcard.
      </dd>
      <dt>Prijswijziging</dt>
      <dd>
        Niet binnen een contractjaar. Een nieuwe prijs melden we uiterlijk {maanden(voorwaarden.prijswijzigingAankondigingMaanden)} voor
        de verlenging; u kunt dan opzeggen per de einddatum.
      </dd>
      <dt>Proeftoegang</dt>
      <dd>{voorwaarden.proefDagen} dagen kosteloos op aanvraag. Stopt vanzelf, zonder factuur.</dd>
    </dl>
  );
}

/** Vergelijkingstabel gratis versus lid. Betekenis staat in tekst, het vinkje is alleen versiering. */
export function Vergelijkingstabel() {
  const cel = (t: string) => <span className={t === 'Nee' ? 'lm-nee' : t === 'Ja' ? 'lm-ja' : undefined}>{t}</span>;
  return (
    <div className="tabel-container">
      <table className="lm-tabel lm-tabel-stapel">
        <caption>Wat u gratis kunt gebruiken en wat leden extra krijgen.</caption>
        <thead>
          <tr>
            <th scope="col">Onderdeel</th>
            <th scope="col">Gratis</th>
            <th scope="col">Lid</th>
          </tr>
        </thead>
        <tbody>
          {vergelijking.map((o) => (
            <tr key={o.onderdeel}>
              <th scope="row">{o.onderdeel}</th>
              <td data-label="Gratis">{cel(o.gratis)}</td>
              <td data-label="Lid">{cel(o.lid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stappenplan() {
  return (
    <ol className="lm-stappenplan">
      <li>
        <b>Aanmelden</b>
        <span>Vul het formulier in. U ziet de prijs en de looptijd voordat u verzendt.</span>
      </li>
      <li>
        <b>Orderbevestiging</b>
        <span>Binnen {voorwaarden.bevestigingWerkdagen} werkdagen bevestigt KplusV de aanmelding per e-mail.</span>
      </li>
      <li>
        <b>Toegang</b>
        <span>Vanaf de startdatum maken uw collega’s een account met hun e-mailadres van uw organisatie.</span>
      </li>
      <li>
        <b>Factuur</b>
        <span>
          Op de startdatum, met uw inkoopordernummer. Betalen binnen {voorwaarden.betaaltermijnDagen} dagen.
        </span>
      </li>
    </ol>
  );
}

export function VeelgesteldeVragen() {
  return (
    <div className="lm-vragen">
      {veelgesteldeVragen.map((v) => (
        <details key={v.vraag}>
          <summary>{v.vraag}</summary>
          <div className="antwoord">
            {v.antwoord.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function Bronnenlijst() {
  return (
    <ul className="lm-bronnen">
      {(Object.keys(bronnen) as BronSleutel[]).map((k) => {
        const b = bronnen[k];
        return (
          <li key={k}>
            {b.feit}. <a href={b.url}>{b.titel}</a>, geraadpleegd op {datum(b.peildatum)}.
          </li>
        );
      })}
    </ul>
  );
}

/** Prijs en looptijd van een concrete aanmelding. */
export function PrijsRegels({ b }: { b: Berekening }) {
  return (
    <dl className="lm-gegevens">
      <dt>Staffel</dt>
      <dd>{b.staffel.naam}</dd>
      <dt>Jaarprijs excl. btw</dt>
      <dd className="num">{euro(b.exclBtw, 2)}</dd>
      <dt>Btw {b.btwPercentage} %</dt>
      <dd className="num">{euro(b.btw, 2)}</dd>
      <dt className="lm-totaal">Totaal per jaar incl. btw</dt>
      <dd className="lm-totaal num">{euro(b.inclBtw, 2)}</dd>
      <dt>Eerste contractjaar</dt>
      <dd>
        {datum(b.startdatum)} tot en met {datum(b.einddatum)}
      </dd>
      <dt>Factuur</dt>
      <dd>
        Gedateerd {datum(b.factuurdatum)}, uiterlijk te betalen op {datum(b.vervaldatum)}
      </dd>
      <dt>Opzeggen</dt>
      <dd>Uiterlijk {datum(b.opzeggenUiterlijk)}. Anders verlengt het lidmaatschap tot {datum(b.verlengdTot)}.</dd>
    </dl>
  );
}
