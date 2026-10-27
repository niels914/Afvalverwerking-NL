import { useState, type ReactNode } from 'react';
import { bronnen, gemeentenInNederland, grensGrootSamenwerkingsverband, prijzenVastgesteld, voorwaarden } from '../../data/lidmaatschap';
import { datum, euro } from '../../lib/format';
import { controleerStartdatum, isIsoDatum, laatsteStartdatum, looptijdVan, startdatumOpties } from '../../lib/prijs';
import { prijsStand, type AanmeldGegevens } from './aanmelding';
import { Verplicht, veldId } from './Velden';

// Onderdelen van het aanmeldformulier die niet in Velden.tsx passen: de prijs direct onder de typekeuze,
// de keuze van de startdatum (tekstueel, onafhankelijk van de taal van de browser) en de voorwaarden in het kort.

const maanden = (n: number) => (n === 1 ? '1 maand' : `${n} maanden`);

/** Link die in een nieuw tabblad opent, zodat het ingevulde formulier blijft staan. */
export function NieuwTabblad({ naar, children }: { naar: string; children: ReactNode }) {
  return (
    <a href={naar} target="_blank" rel="noopener">
      {children}
      <span className="visueel-verborgen"> (opent in een nieuw tabblad)</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

/**
 * Prijs direct onder de keuze van het type organisatie (en het aantal gemeenten). Alleen op smalle schermen;
 * op brede schermen staat dezelfde prijs in het prijsblok naast het formulier.
 */
export function PrijsBijKeuze({ g }: { g: AanmeldGegevens }) {
  const p = prijsStand(g);
  if (p.soort === 'leeg') return null;
  return (
    <div className="lm-prijs-bij-keuze" data-prijs="keuze" aria-live="polite" aria-atomic="true">
      {p.soort === 'prijs' ? (
        <>
          <p className="lm-prijs-bij-keuze-kop">
            Uw prijs{!prijzenVastgesteld && <span className="lm-prijs-concept"> (concept)</span>}
          </p>
          <p className="lm-prijs-bij-keuze-bedrag">
            {euro(p.prijs.exclBtw)} <span>per jaar excl. btw</span>
          </p>
          <p className="klein">
            {euro(p.prijs.inclBtw, 2)} incl. {p.prijs.btwPercentage} % btw · {p.staffel.naam}
            {p.staffel.aanname && !prijzenVastgesteld && ' (aanname)'}. Eén prijs voor de hele organisatie.
          </p>
        </>
      ) : (
        <p className="klein">{p.melding}</p>
      )}
    </div>
  );
}

/** Hint bij het aantal gemeenten, met de bron van de bovengrens. */
export function HintAantalGemeenten() {
  const b = bronnen.gemeenten;
  return (
    <>
      2 of 3 gemeenten: staffel klein. {grensGrootSamenwerkingsverband} tot en met {gemeentenInNederland}: staffel groot.
      Nederland telt {gemeentenInNederland} gemeenten (<a href={b.url}>CBS, 1 januari 2026</a>, geraadpleegd op{' '}
      {datum(b.peildatum)}).
    </>
  );
}

/**
 * Startdatum als keuzelijst met uitgeschreven datums ("1 november 2026"), plus "Andere datum". Een datumveld van de
 * browser toont de datum in de taal van de browser (bijvoorbeeld 11/01/2026); de keuzelijst niet. Bij een andere
 * datum staat de gekozen datum ook uitgeschreven onder het veld.
 */
export function StartdatumKeuze({
  waarde,
  onChange,
  vandaag,
  fout,
}: {
  waarde: string;
  onChange: (iso: string) => void;
  vandaag: string;
  fout?: string;
}) {
  const opties = startdatumOpties(vandaag);
  const [anders, setAnders] = useState(() => waarde !== '' && !opties.includes(waarde));
  const laatste = laatsteStartdatum(vandaag);
  const id = veldId('startdatum');
  const geldig = controleerStartdatum(waarde, vandaag) === null;
  const looptijd = geldig ? looptijdVan(waarde) : null;
  const beschrijving = [`${id}-hint`, looptijd ? `${id}-looptijd` : '', fout ? `${id}-fout` : ''].filter(Boolean).join(' ');

  return (
    <div className="veld">
      <label htmlFor={id}>
        Gewenste startdatum
        <Verplicht />
      </label>
      <div className="invoer" data-fout={fout && !anders ? 'true' : 'false'} style={{ maxWidth: '16em' }}>
        <select
          id={id}
          name="startdatum_keuze"
          value={anders ? 'anders' : waarde}
          required
          aria-invalid={fout && !anders ? true : undefined}
          aria-describedby={beschrijving}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'anders') {
              setAnders(true);
              return;
            }
            setAnders(false);
            onChange(v);
          }}
        >
          {!anders && !opties.includes(waarde) && <option value={waarde}>Kies een datum</option>}
          {opties.map((d) => (
            <option key={d} value={d}>
              {datum(d)}
            </option>
          ))}
          <option value="anders">Andere datum…</option>
        </select>
      </div>
      <span className="hint" id={`${id}-hint`}>
        Het contractjaar loopt vanaf deze datum. Kan van vandaag tot uiterlijk {datum(laatste)}.
      </span>
      {anders && (
        <div className="veld lm-andere-datum">
          <label htmlFor={`${id}-anders`}>
            Andere startdatum
            <Verplicht />
          </label>
          <div className="invoer" data-fout={fout ? 'true' : 'false'} style={{ maxWidth: '14em' }}>
            <input
              id={`${id}-anders`}
              name="startdatum"
              type="date"
              value={waarde}
              min={vandaag}
              max={laatste}
              required
              aria-invalid={fout ? true : undefined}
              aria-describedby={beschrijving}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          <span className="hint" aria-live="polite">
            {isIsoDatum(waarde) ? (
              <>
                U kiest: <strong>{datum(waarde)}</strong>
              </>
            ) : (
              'Nog geen datum gekozen.'
            )}
          </span>
        </div>
      )}
      {looptijd && (
        <span className="hint" id={`${id}-looptijd`}>
          Eerste contractjaar: {datum(looptijd.startdatum)} tot en met {datum(looptijd.einddatum)}.
        </span>
      )}
      {fout && (
        <span className="foutmelding" id={`${id}-fout`}>
          <span aria-hidden="true">⚠ </span>
          {fout}
        </span>
      )}
    </div>
  );
}

/**
 * De belangrijkste voorwaarden in vijf regels, direct bij de knop. De volledige tekst staat in de algemene
 * voorwaarden; alle termijnen komen uit `voorwaarden` in src/data/lidmaatschap.ts.
 */
export function VoorwaardenInHetKort({ offerte, kop = 'Voorwaarden in het kort' }: { offerte?: boolean; kop?: string }) {
  const v = voorwaarden;
  return (
    <section className="lm-voorwaarden-kort" aria-labelledby="lm-vk-kop">
      <h2 id="lm-vk-kop">{kop}</h2>
      <ul>
        <li>
          <strong>Jaarabonnement</strong> van {maanden(v.looptijdMaanden)} vanaf de startdatum, daarna steeds{' '}
          {maanden(v.verlengingMaanden)} verlengd.
        </li>
        <li>
          <strong>Opzeggen</strong> per e-mail, uiterlijk {maanden(v.opzegtermijnMaanden)} voor de einddatum.
        </li>
        <li>
          <strong>Factuur</strong> op de startdatum, betalen binnen {v.betaaltermijnDagen} dagen. Geen kosten per gebruiker.
        </li>
        <li>
          <strong>Vaste prijs</strong> per contractjaar; alleen een wettelijke wijziging van het btw-tarief telt door.
          {!prijzenVastgesteld &&
            ` De prijs is nog concept: wijkt de prijs in de orderbevestiging af, dan kunt u binnen ${v.afzienBijPrijsafwijkingDagen} dagen kosteloos afzien.`}
        </li>
        <li>
          <strong>Uw gegevens</strong> gebruiken we om de aanmelding te beoordelen, het lidmaatschap vast te leggen en te
          factureren.
        </li>
      </ul>
      {offerte && <p className="klein">Een offerteaanvraag verplicht u tot niets. Deze voorwaarden gelden pas als u de offerte aanvaardt.</p>}
      <p className="klein lm-voorwaarden-links">
        <NieuwTabblad naar="/algemene-voorwaarden">Algemene voorwaarden</NieuwTabblad>
        {!prijzenVastgesteld && ' (concept)'}
        <span aria-hidden="true"> · </span>
        <NieuwTabblad naar="/privacy">Privacyverklaring</NieuwTabblad>
      </p>
    </section>
  );
}
