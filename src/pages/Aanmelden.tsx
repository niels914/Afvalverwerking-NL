import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Kaart } from '../components/ui';
import { Bron, ConceptBadge, PrijsRegels } from '../components/lidmaatschap/onderdelen';
import { Akkoord, KeuzeRondjes, TekstVak, TekstVeld, veldId } from '../components/lidmaatschap/Velden';
import {
  aantalGemeenten,
  berekening,
  codeer,
  controleerAkkoord,
  controleerGegevens,
  domeinVan,
  formulierVelden,
  isEmail,
  isOverheid,
  leesDomeinen,
  legeAanmelding,
  schoon,
  veldenStap1,
  veldenStap2,
  type AanmeldGegevens,
  type Factuurvorm,
  type Fouten,
  type Veld,
} from '../components/lidmaatschap/aanmelding';
import {
  AANMELD_FORMULIER,
  AANMELD_LOKALE_OPSLAG,
  grensGrootSamenwerkingsverband,
  organisatietypen,
  prijzenVastgesteld,
  publiekeMaildomeinen,
  staffels,
  voorwaarden,
  type Aanvraagsoort,
  type Organisatietype,
  type StaffelId,
} from '../data/lidmaatschap';
import { contact, platform } from '../data/site';
import { datum, euro } from '../lib/format';
import {
  eersteVanVolgendeMaand,
  laatsteStartdatum,
  maakOrdernummer,
  offerteGeldigTot,
  vandaagIso,
  type Berekening,
} from '../lib/prijs';

// Aanmelden voor een lidmaatschap op factuur, in drie stappen: gegevens → controleren en verzenden → bevestiging.
// Hetzelfde formulier dient voor een offerteaanvraag (veld `soort`, of ?soort=offerte in de URL): voor gemeenten die
// eerst een offerte in hun inkoopsysteem moeten zetten voordat ze een inkoopordernummer krijgen.
// Verzenden gaat naar Netlify Forms (formulier "aanmelding", verborgen kopie in index.html). Lukt dat niet,
// dan bewaren we de aanmelding in deze browser en bieden we een e-mail met dezelfde gegevens aan.

type Stap = 'gegevens' | 'controle' | 'verzonden' | 'niet-verzonden';

const CONCEPT_SLEUTEL = 'afvalplatform-aanmelding-concept';

const veldLabels: Record<Veld, string> = {
  soort: 'Wat wilt u doen',
  organisatie: 'Naam organisatie',
  type: 'Type organisatie',
  aantal_gemeenten: 'Aantal deelnemende gemeenten',
  kvk: 'KVK-nummer',
  btw_nummer: 'Btw-identificatienummer',
  oin: 'OIN',
  factuur_adres: 'Factuuradres',
  factuur_postcode: 'Postcode',
  factuur_plaats: 'Plaats',
  factuur_ter_attentie: 'Ter attentie van',
  crediteuren_email: 'E-mailadres crediteurenadministratie',
  factuurvorm: 'Vorm van de factuur',
  peppol_id: 'Peppol-ID',
  inkoopordernummer: 'Inkoopordernummer',
  contact_naam: 'Naam contactpersoon',
  contact_functie: 'Functie',
  contact_email: 'E-mailadres contactpersoon',
  contact_telefoon: 'Telefoonnummer',
  toegang: 'E-maildomeinen voor toegang',
  startdatum: 'Gewenste startdatum',
  opmerkingen: 'Opmerkingen',
  akkoord_voorwaarden: 'Algemene voorwaarden',
  akkoord_privacy: 'Privacyverklaring',
};

const typeLabel = (t: Organisatietype | '') => organisatietypen.find((o) => o.waarde === t)?.label ?? '';
const factuurvormLabel: Record<Factuurvorm, string> = {
  pdf: 'Pdf per e-mail',
  peppol: 'E-factuur via Peppol',
};

function typeVanStaffel(id: string | null): Partial<AanmeldGegevens> {
  const s = staffels.find((x) => x.id === (id as StaffelId));
  if (!s) return {};
  if (s.id === 'gemeente') return { type: 'gemeente' };
  if (s.id === 'verwerker') return { type: 'verwerker' };
  return { type: 'samenwerkingsverband' };
}

function soortUitUrl(waarde: string | null): Partial<AanmeldGegevens> {
  return waarde === 'offerte' || waarde === 'aanmelding' ? { soort: waarde as Aanvraagsoort } : {};
}

function leesConcept(): Partial<AanmeldGegevens> {
  try {
    const ruw = sessionStorage.getItem(CONCEPT_SLEUTEL);
    const data = ruw ? JSON.parse(ruw) : null;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}
function bewaarConcept(g: AanmeldGegevens | null) {
  try {
    if (g) sessionStorage.setItem(CONCEPT_SLEUTEL, JSON.stringify({ ...g, akkoord_voorwaarden: false, akkoord_privacy: false }));
    else sessionStorage.removeItem(CONCEPT_SLEUTEL);
  } catch {
    /* geen opslag beschikbaar: het formulier werkt ook zonder */
  }
}
function bewaarLokaal(velden: Record<string, string>): boolean {
  try {
    const bestaand = JSON.parse(localStorage.getItem(AANMELD_LOKALE_OPSLAG) ?? '[]');
    const lijst = Array.isArray(bestaand) ? bestaand : [];
    lijst.push({ ...velden, opgeslagenOp: new Date().toISOString() });
    localStorage.setItem(AANMELD_LOKALE_OPSLAG, JSON.stringify(lijst));
    return true;
  } catch {
    return false;
  }
}

function willekeurigeCode(): string {
  const tekens = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const getallen = new Uint8Array(5);
  try {
    crypto.getRandomValues(getallen);
  } catch {
    for (let i = 0; i < getallen.length; i++) getallen[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(getallen, (n) => tekens[n % tekens.length]).join('');
}

function mailtekst(velden: Record<string, string>): string {
  const regels = Object.entries(velden)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return ['Aanmelding lidmaatschap (via het formulier, verzenden lukte niet)', '', ...regels].join('\n');
}

export function Aanmelden() {
  const [params] = useSearchParams();
  const vandaag = useMemo(() => vandaagIso(), []);
  const [g, setG] = useState<AanmeldGegevens>(() => ({
    ...legeAanmelding(eersteVanVolgendeMaand(vandaag)),
    ...leesConcept(),
    ...typeVanStaffel(params.get('staffel')),
    ...soortUitUrl(params.get('soort')),
  }));
  const [stap, setStap] = useState<Stap>('gegevens');
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [verzonden, setVerzonden] = useState<{ velden: Record<string, string>; b: Berekening; lokaalBewaard?: boolean } | null>(null);
  const kopRef = useRef<HTMLHeadingElement>(null);
  const foutRef = useRef<HTMLDivElement>(null);
  const eersteRender = useRef(true);

  const b = berekening(g);
  const zet = <K extends Veld>(k: K, v: AanmeldGegevens[K]) => {
    setG((x) => ({ ...x, [k]: v }));
    if (fouten[k]) setFouten((f) => ({ ...f, [k]: undefined }));
  };

  useEffect(() => {
    document.title = `Aanmelden voor lidmaatschap · ${platform.korteNaam}`;
  }, []);

  useEffect(() => {
    if (stap === 'gegevens' || stap === 'controle') bewaarConcept(g);
  }, [g, stap]);

  // Bij een nieuwe stap: naar boven en focus op de kop, zodat schermlezers de nieuwe stap horen.
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    kopRef.current?.focus();
  }, [stap]);

  function toonFouten(f: Fouten) {
    setFouten(f);
    requestAnimationFrame(() => foutRef.current?.focus());
  }

  function naarControle(e: FormEvent) {
    e.preventDefault();
    const f = controleerGegevens(g, vandaag);
    if (Object.keys(f).length > 0) return toonFouten(f);
    setFouten({});
    setG(schoon(g));
    setStap('controle');
  }

  async function verzend(e: FormEvent) {
    e.preventDefault();
    const f = { ...controleerGegevens(g, vandaag), ...controleerAkkoord(g) };
    if (Object.keys(f).length > 0) {
      // Fout in stap 1 (bijv. startdatum intussen verstreken): terug naar de gegevens.
      if (Object.keys(f).some((k) => veldenStap1.includes(k as Veld))) setStap('gegevens');
      return toonFouten(f);
    }
    const berekend = berekening(g);
    if (!berekend) return;
    const velden = formulierVelden(g, berekend, maakOrdernummer(vandaag, willekeurigeCode(), g.soort));
    setBezig(true);
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: codeer(velden),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setVerzonden({ velden, b: berekend });
      // Na een offerteaanvraag blijven de gegevens klaarstaan om later aan te melden; na een aanmelding niet.
      bewaarConcept(g.soort === 'offerte' ? { ...g, soort: 'aanmelding' } : null);
      setStap('verzonden');
    } catch {
      setVerzonden({ velden, b: berekend, lokaalBewaard: bewaarLokaal(velden) });
      setStap('niet-verzonden');
    } finally {
      setBezig(false);
    }
  }

  const stappen: { id: Stap; label: string }[] = [
    { id: 'gegevens', label: 'Gegevens' },
    { id: 'controle', label: 'Controleren en verzenden' },
    { id: 'verzonden', label: 'Bevestiging' },
  ];
  const stapIndex = stap === 'gegevens' ? 0 : stap === 'controle' ? 1 : 2;

  const offerte = g.soort === 'offerte';
  const titel =
    stap === 'gegevens'
      ? offerte
        ? 'Offerte aanvragen'
        : 'Aanmelden voor een lidmaatschap'
      : stap === 'controle'
        ? offerte
          ? 'Controleer uw offerteaanvraag'
          : 'Controleer uw aanmelding'
        : stap === 'verzonden'
          ? offerte
            ? 'Offerteaanvraag ontvangen'
            : 'Aanmelding ontvangen'
          : offerte
            ? 'Offerteaanvraag nog niet verzonden'
            : 'Aanmelding nog niet verzonden';
  const woord = offerte ? 'offerteaanvraag' : 'aanmelding';

  return (
    <>
      <nav aria-label="Kruimelpad" className="lm-kruimelpad lm-geen-print">
        <ol>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/lidmaatschap">Lidmaatschap en prijzen</Link>
          </li>
          <li aria-current="page">{offerte ? 'Offerte aanvragen' : 'Aanmelden'}</li>
        </ol>
      </nav>
      <section className="intro">
        <h1 ref={kopRef} tabIndex={-1} style={{ outline: 'none' }}>
          {titel}
        </h1>
        <div className="badges">
          <ConceptBadge />
        </div>
        {stap === 'gegevens' && !offerte && (
          <p>
            Meld uw organisatie aan. U betaalt op factuur; er is geen betaling via de website. Voordat u verzendt, ziet u de
            prijs, de looptijd en al uw gegevens nog een keer. Velden zonder “optioneel” zijn verplicht.
          </p>
        )}
        {stap === 'gegevens' && offerte && (
          <p>
            Vraag een offerte aan voor uw inkoopproces. U ontvangt binnen {voorwaarden.bevestigingWerkdagen} werkdagen een
            offerte als pdf, {voorwaarden.offerteGeldigDagen} dagen geldig. Een offerteaanvraag verplicht u tot niets. Velden
            zonder “optioneel” zijn verplicht.
          </p>
        )}
      </section>

      <ol className="stappen lm-geen-print" aria-label={`Stappen van de ${woord}`}>
        {stappen.map((s, i) => (
          <li key={s.id} aria-current={i === stapIndex ? 'step' : undefined} data-klaar={i < stapIndex ? 'true' : undefined}>
            {s.label}
            {i < stapIndex && <span className="visueel-verborgen"> (afgerond)</span>}
          </li>
        ))}
      </ol>

      {Object.values(fouten).some(Boolean) && (stap === 'gegevens' || stap === 'controle') && (
        <div className="lm-foutsamenvatting sectie" ref={foutRef} tabIndex={-1} role="alert" aria-labelledby="am-fouten-kop">
          <h2 id="am-fouten-kop">Controleer {Object.values(fouten).filter(Boolean).length === 1 ? 'dit veld' : 'deze velden'}</h2>
          <ul>
            {[...veldenStap1, ...veldenStap2]
              .filter((v) => fouten[v])
              .map((v) => (
                <li key={v}>
                  <a
                    href={`#${veldId(v)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(veldId(v))?.focus();
                    }}
                  >
                    {veldLabels[v]}: {fouten[v]}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {stap === 'gegevens' && (
        <div className="lm-aanmelden sectie">
          <Gegevensformulier g={g} zet={zet} fouten={fouten} vandaag={vandaag} onSubmit={naarControle} />
          <aside className="lm-prijsblok" aria-label="Uw prijs">
            <Prijsblok b={b} g={g} />
          </aside>
        </div>
      )}

      {stap === 'controle' && b && (
        <form
          name={AANMELD_FORMULIER}
          method="POST"
          data-netlify="true"
          netlify-honeypot="bot-field"
          onSubmit={verzend}
          noValidate
          className="stapel sectie"
        >
          <input type="hidden" name="form-name" value={AANMELD_FORMULIER} />
          <p hidden>
            <label>
              Niet invullen: <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </label>
          </p>
          <Kaart titel="Prijs en looptijd" actie={<ConceptBadge />}>
            <PrijsRegels b={b} />
            {!prijzenVastgesteld && (
              <p className="notitie">
                De prijzen zijn nog niet vastgesteld. KplusV bevestigt de definitieve prijs in de orderbevestiging. Pas daarna
                komt er een factuur.
              </p>
            )}
            <Bron sleutel="btw" />
          </Kaart>
          <Samenvatting g={g} onWijzig={() => setStap('gegevens')} />
          <Kaart titel="Akkoord">
            <div className="velden">
              {offerte ? (
                <p className="klein">
                  Met een offerteaanvraag gaat u nog niets aan. De offerte verwijst naar de{' '}
                  <NieuwTabblad naar="/algemene-voorwaarden">algemene voorwaarden</NieuwTabblad>; daarmee gaat u pas akkoord als u
                  de offerte aanvaardt.
                </p>
              ) : (
                <Akkoord naam="akkoord_voorwaarden" waarde={g.akkoord_voorwaarden} onChange={(v) => zet('akkoord_voorwaarden', v)} fout={fouten.akkoord_voorwaarden}>
                  Ik ben bevoegd om namens {g.organisatie || 'mijn organisatie'} een lidmaatschap af te sluiten en ga akkoord met de{' '}
                  <NieuwTabblad naar="/algemene-voorwaarden">algemene voorwaarden</NieuwTabblad>.
                </Akkoord>
              )}
              <Akkoord naam="akkoord_privacy" waarde={g.akkoord_privacy} onChange={(v) => zet('akkoord_privacy', v)} fout={fouten.akkoord_privacy}>
                Ik heb de <NieuwTabblad naar="/privacy">privacyverklaring</NieuwTabblad> gelezen.
              </Akkoord>
            </div>
          </Kaart>
          <div className="knoppen">
            <button type="button" onClick={() => setStap('gegevens')}>
              Terug naar gegevens
            </button>
            <button type="submit" className="primair" disabled={bezig}>
              {bezig ? 'Bezig met verzenden…' : offerte ? 'Offerteaanvraag verzenden' : 'Aanmelding verzenden'}
            </button>
          </div>
          <p className="klein muted">
            {offerte
              ? `Na verzenden ontvangt u binnen ${voorwaarden.bevestigingWerkdagen} werkdagen een offerte per e-mail. U krijgt geen factuur.`
              : `Na verzenden ontvangt u binnen ${voorwaarden.bevestigingWerkdagen} werkdagen een orderbevestiging per e-mail. De factuur volgt pas op de startdatum.`}
          </p>
        </form>
      )}

      {(stap === 'verzonden' || stap === 'niet-verzonden') && verzonden && (
        <Bevestiging
          velden={verzonden.velden}
          b={verzonden.b}
          g={g}
          nietVerzonden={stap === 'niet-verzonden'}
          lokaalBewaard={verzonden.lokaalBewaard}
          vandaag={vandaag}
          onOpnieuw={() => setStap('controle')}
        />
      )}
    </>
  );
}

function NieuwTabblad({ naar, children }: { naar: string; children: ReactNode }) {
  return (
    <a href={naar} target="_blank" rel="noopener">
      {children}
      <span className="visueel-verborgen"> (opent in een nieuw tabblad)</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

/* ---------- Stap 1 ---------- */

function Gegevensformulier({
  g,
  zet,
  fouten,
  vandaag,
  onSubmit,
}: {
  g: AanmeldGegevens;
  zet: <K extends Veld>(k: K, v: AanmeldGegevens[K]) => void;
  fouten: Fouten;
  vandaag: string;
  onSubmit: (e: FormEvent) => void;
}) {
  const overheid = isOverheid(g.type);
  const contactDomein = isEmail(g.contact_email) ? domeinVan(g.contact_email) : '';
  const domeinen = leesDomeinen(g.toegang);
  const kanContactDomeinToevoegen =
    contactDomein !== '' && !publiekeMaildomeinen.includes(contactDomein) && !domeinen.domeinen.includes(contactDomein);

  const offerte = g.soort === 'offerte';
  const b = berekening(g);

  return (
    <form onSubmit={onSubmit} noValidate className="kaart" aria-label={offerte ? 'Gegevens voor de offerteaanvraag' : 'Gegevens voor de aanmelding'}>
      <KeuzeRondjes<Aanvraagsoort>
        naam="soort"
        legend="Wat wilt u doen?"
        waarde={g.soort}
        opties={[
          { waarde: 'aanmelding', label: 'Lid worden: aanmelden op factuur' },
          { waarde: 'offerte', label: 'Eerst een offerte ontvangen voor ons inkoopproces (verplicht tot niets)' },
        ]}
        onChange={(v) => zet('soort', v)}
        fout={fouten.soort}
        kolom
      />

      <fieldset className="lm-formdeel">
        <legend>1. Organisatie</legend>
        <TekstVeld naam="organisatie" label="Naam organisatie" waarde={g.organisatie} onChange={(v) => zet('organisatie', v)} autoComplete="organization" fout={fouten.organisatie} hint="Zoals die op de factuur moet staan." />
        <KeuzeRondjes<Organisatietype>
          naam="type"
          legend="Type organisatie"
          waarde={g.type}
          opties={organisatietypen.map((o) => ({ waarde: o.waarde, label: o.label }))}
          onChange={(v) => zet('type', v)}
          fout={fouten.type}
          kolom
        />
        {g.type === 'samenwerkingsverband' && (
          <TekstVeld
            naam="aantal_gemeenten"
            label="Aantal deelnemende gemeenten"
            waarde={g.aantal_gemeenten}
            onChange={(v) => zet('aantal_gemeenten', v)}
            inputMode="numeric"
            breedte="10em"
            fout={fouten.aantal_gemeenten}
            hint={`2 of 3 gemeenten: staffel klein. ${grensGrootSamenwerkingsverband} of meer: staffel groot.`}
          />
        )}
        {b && (
          <p className="lm-prijs-inline klein" aria-live="polite">
            Uw prijs: <strong>{euro(b.exclBtw)} per jaar excl. btw</strong> ({euro(b.inclBtw, 2)} incl. {b.btwPercentage} % btw),
            staffel {b.staffel.korteNaam.toLowerCase()}.{!prijzenVastgesteld && ' Concept.'}
          </p>
        )}
        <div className="velden-2">
          <TekstVeld naam="kvk" label="KVK-nummer" waarde={g.kvk} onChange={(v) => zet('kvk', v)} inputMode="numeric" fout={fouten.kvk} hint="8 cijfers. Ook gemeenten en gemeenschappelijke regelingen hebben er een." />
          <TekstVeld
            naam="btw_nummer"
            label="Btw-identificatienummer"
            optioneel={overheid || !g.type}
            waarde={g.btw_nummer}
            onChange={(v) => zet('btw_nummer', v)}
            fout={fouten.btw_nummer}
            hint={overheid || !g.type ? 'Mag leeg blijven voor overheden. Vorm: NL123456789B01.' : 'Vorm: NL123456789B01.'}
          />
        </div>
        <TekstVeld
          naam="oin"
          label="OIN (Organisatie-identificatienummer)"
          optioneel
          waarde={g.oin}
          onChange={(v) => zet('oin', v)}
          inputMode="numeric"
          fout={fouten.oin}
          hint="20 cijfers. Alleen nodig als u een e-factuur via Peppol wilt of uw organisatie dit nummer standaard gebruikt."
        />
      </fieldset>

      <fieldset className="lm-formdeel">
        <legend>2. Facturering</legend>
        <TekstVeld naam="factuur_adres" label="Factuuradres" waarde={g.factuur_adres} onChange={(v) => zet('factuur_adres', v)} autoComplete="street-address" fout={fouten.factuur_adres} hint="Straat en huisnummer, of postbus." />
        <div className="velden-2">
          <TekstVeld naam="factuur_postcode" label="Postcode" waarde={g.factuur_postcode} onChange={(v) => zet('factuur_postcode', v)} autoComplete="postal-code" fout={fouten.factuur_postcode} />
          <TekstVeld naam="factuur_plaats" label="Plaats" waarde={g.factuur_plaats} onChange={(v) => zet('factuur_plaats', v)} autoComplete="address-level2" fout={fouten.factuur_plaats} />
        </div>
        <TekstVeld naam="factuur_ter_attentie" label="Ter attentie van" optioneel waarde={g.factuur_ter_attentie} onChange={(v) => zet('factuur_ter_attentie', v)} hint="Bijvoorbeeld een afdeling of budgethouder." />
        <TekstVeld
          naam="crediteuren_email"
          label="E-mailadres crediteurenadministratie"
          type="email"
          inputMode="email"
          waarde={g.crediteuren_email}
          onChange={(v) => zet('crediteuren_email', v)}
          fout={fouten.crediteuren_email}
          hint="Hier sturen we de factuur naartoe."
        />
        <KeuzeRondjes<Factuurvorm>
          naam="factuurvorm"
          legend="Vorm van de factuur"
          waarde={g.factuurvorm}
          opties={[
            { waarde: 'pdf', label: 'Pdf per e-mail' },
            { waarde: 'peppol', label: 'E-factuur via Peppol (KplusV bevestigt of dit kan)' },
          ]}
          onChange={(v) => zet('factuurvorm', v)}
          kolom
        />
        {g.factuurvorm === 'peppol' && (
          <TekstVeld
            naam="peppol_id"
            label="Peppol-ID"
            optioneel={g.oin.trim() !== ''}
            waarde={g.peppol_id}
            onChange={(v) => zet('peppol_id', v)}
            fout={fouten.peppol_id}
            hint="Vorm schema:nummer. Laat leeg als uw OIN hierboven uw Peppol-adres is."
          />
        )}
        <TekstVeld
          naam="inkoopordernummer"
          label="Inkoopordernummer"
          optioneel
          maxLength={50}
          waarde={g.inkoopordernummer}
          onChange={(v) => zet('inkoopordernummer', v)}
          fout={fouten.inkoopordernummer}
          hint="Komt op de factuur. Nog geen nummer? Mail het vóór de startdatum; we wachten dan met factureren."
        />
      </fieldset>

      <fieldset className="lm-formdeel">
        <legend>3. Contactpersoon</legend>
        <div className="velden-2">
          <TekstVeld naam="contact_naam" label="Naam contactpersoon" waarde={g.contact_naam} onChange={(v) => zet('contact_naam', v)} autoComplete="name" fout={fouten.contact_naam} />
          <TekstVeld naam="contact_functie" label="Functie" optioneel waarde={g.contact_functie} onChange={(v) => zet('contact_functie', v)} autoComplete="organization-title" />
        </div>
        <div className="velden-2">
          <TekstVeld naam="contact_email" label="E-mailadres contactpersoon" type="email" inputMode="email" waarde={g.contact_email} onChange={(v) => zet('contact_email', v)} autoComplete="email" fout={fouten.contact_email} hint="Hier sturen we de orderbevestiging naartoe." />
          <TekstVeld naam="contact_telefoon" label="Telefoonnummer" optioneel type="tel" inputMode="tel" waarde={g.contact_telefoon} onChange={(v) => zet('contact_telefoon', v)} autoComplete="tel" fout={fouten.contact_telefoon} />
        </div>
      </fieldset>

      <fieldset className="lm-formdeel">
        <legend>4. Toegang en startdatum</legend>
        <TekstVak
          naam="toegang"
          label="E-maildomeinen die toegang krijgen"
          optioneel={offerte}
          waarde={g.toegang}
          onChange={(v) => zet('toegang', v)}
          rijen={2}
          fout={fouten.toegang}
          hint="Iedereen met een e-mailadres op deze domeinen kan inloggen, zonder extra kosten. Scheid meerdere domeinen met een komma, bijvoorbeeld: gemeente-voorbeeld.nl, afvalverband.nl. Openbare domeinen zoals gmail.com zijn niet toegestaan."
        />
        {(kanContactDomeinToevoegen || domeinen.domeinen.length > 0) && (
          <div className="knoppen klein" style={{ marginTop: -4 }}>
            {domeinen.domeinen.length > 0 && (
              <span className="muted" aria-live="polite">
                Toegang voor: {domeinen.domeinen.map((d) => `@${d}`).join(', ')}
              </span>
            )}
            {kanContactDomeinToevoegen && (
              <button type="button" onClick={() => zet('toegang', [...domeinen.domeinen, contactDomein].join(', '))}>
                @{contactDomein} toevoegen
              </button>
            )}
          </div>
        )}
        <TekstVeld
          naam="startdatum"
          label="Gewenste startdatum"
          type="date"
          waarde={g.startdatum}
          onChange={(v) => zet('startdatum', v)}
          min={vandaag}
          max={laatsteStartdatum(vandaag)}
          breedte="14em"
          fout={fouten.startdatum}
          hint={`Vanaf vandaag tot uiterlijk ${datum(laatsteStartdatum(vandaag))}. Het contractjaar loopt vanaf deze datum.`}
        />
        <TekstVak naam="opmerkingen" label="Opmerkingen" optioneel waarde={g.opmerkingen} onChange={(v) => zet('opmerkingen', v)} fout={fouten.opmerkingen} hint="Bijvoorbeeld afspraken uit uw inkoopproces of een verzoek om proeftoegang eerst." />
      </fieldset>

      <div className="knoppen" style={{ marginTop: 18 }}>
        <button type="submit" className="primair">
          Verder naar controleren
        </button>
        <Link to="/lidmaatschap">Terug naar lidmaatschap en prijzen</Link>
      </div>
    </form>
  );
}

function Prijsblok({ b, g }: { b: Berekening | null; g: AanmeldGegevens }) {
  const n = aantalGemeenten(g);
  return (
    <Kaart titel="Uw prijs" kopNiveau={2} actie={<ConceptBadge />}>
      <div aria-live="polite">
        {b ? (
          <>
            <p className="bedrag" style={{ fontSize: 26, fontWeight: 700, color: 'var(--donkerviolet)' }}>
              {euro(b.exclBtw)} <span className="klein muted" style={{ fontWeight: 400 }}>per jaar excl. btw</span>
            </p>
            <p className="klein">
              {euro(b.inclBtw, 2)} incl. {b.btwPercentage} % btw ({euro(b.btw, 2)} btw)
            </p>
            <dl className="lm-gegevens" style={{ marginTop: 12, gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
              <dt>Staffel</dt>
              <dd>{b.staffel.naam}</dd>
              <dt>Eerste contractjaar</dt>
              <dd>
                {datum(b.startdatum)} t/m {datum(b.einddatum)}
              </dd>
              <dt>Opzeggen uiterlijk</dt>
              <dd>{datum(b.opzeggenUiterlijk)}</dd>
            </dl>
          </>
        ) : (
          <p className="muted klein">
            {!g.type
              ? 'Kies het type organisatie, dan ziet u hier de prijs.'
              : g.type === 'samenwerkingsverband' && (n === undefined || Number.isNaN(n) || n < 2)
                ? 'Vul het aantal deelnemende gemeenten in, dan ziet u hier de prijs.'
                : 'Kies een geldige startdatum, dan ziet u hier de looptijd.'}
          </p>
        )}
      </div>
      <p className="klein muted">
        Eén prijs voor de hele organisatie, ongeacht het aantal gebruikers. Betaling op factuur binnen{' '}
        {voorwaarden.betaaltermijnDagen} dagen.
      </p>
      <p className="klein">
        <Link to="/lidmaatschap#prijzen">Alle prijzen bekijken</Link>
      </p>
    </Kaart>
  );
}

/* ---------- Stap 2 en 3 ---------- */

function Rij({ label, children }: { label: string; children: ReactNode }) {
  if (children === '' || children === null || children === undefined) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Samenvatting({ g, onWijzig }: { g: AanmeldGegevens; onWijzig?: () => void }) {
  const wijzig = onWijzig && (
    <button type="button" onClick={onWijzig} className="lm-geen-print">
      Gegevens wijzigen
    </button>
  );
  const leeg = <span className="muted">niet ingevuld</span>;
  return (
    <Kaart titel="Uw gegevens" actie={wijzig}>
      <h3 className="lm-subkop">Organisatie</h3>
      <dl className="lm-gegevens">
        <Rij label="Aanvraag">{g.soort === 'offerte' ? 'Offerte, nog geen aanmelding' : 'Aanmelding als lid'}</Rij>
        <Rij label="Naam">{g.organisatie}</Rij>
        <Rij label="Type">{typeLabel(g.type)}</Rij>
        <Rij label="Aantal gemeenten">{g.type === 'samenwerkingsverband' ? g.aantal_gemeenten : ''}</Rij>
        <Rij label="KVK-nummer">{g.kvk}</Rij>
        <Rij label="Btw-id">{g.btw_nummer || leeg}</Rij>
        <Rij label="OIN">{g.oin || leeg}</Rij>
      </dl>
      <h3 className="lm-subkop">Facturering</h3>
      <dl className="lm-gegevens">
        <Rij label="Factuuradres">
          {g.factuur_ter_attentie && (
            <>
              t.a.v. {g.factuur_ter_attentie}
              <br />
            </>
          )}
          {g.factuur_adres}
          <br />
          {g.factuur_postcode} {g.factuur_plaats}
        </Rij>
        <Rij label="Factuur naar">{g.crediteuren_email}</Rij>
        <Rij label="Vorm">{factuurvormLabel[g.factuurvorm]}</Rij>
        <Rij label="Peppol-ID">{g.factuurvorm === 'peppol' ? g.peppol_id || 'via OIN' : ''}</Rij>
        <Rij label="Inkoopordernummer">{g.inkoopordernummer || leeg}</Rij>
      </dl>
      <h3 className="lm-subkop">Contact en toegang</h3>
      <dl className="lm-gegevens">
        <Rij label="Contactpersoon">
          {g.contact_naam}
          {g.contact_functie && `, ${g.contact_functie}`}
        </Rij>
        <Rij label="E-mailadres">{g.contact_email}</Rij>
        <Rij label="Telefoon">{g.contact_telefoon}</Rij>
        <Rij label="Toegang voor">
          {leesDomeinen(g.toegang)
            .domeinen.map((d) => `@${d}`)
            .join(', ')}
        </Rij>
        <Rij label="Opmerkingen">{g.opmerkingen}</Rij>
      </dl>
    </Kaart>
  );
}

function Bevestiging({
  velden,
  b,
  g,
  nietVerzonden,
  lokaalBewaard,
  vandaag,
  onOpnieuw,
}: {
  velden: Record<string, string>;
  b: Berekening;
  g: AanmeldGegevens;
  nietVerzonden: boolean;
  lokaalBewaard?: boolean;
  vandaag: string;
  onOpnieuw: () => void;
}) {
  const offerte = velden.soort === 'offerte';
  const woord = offerte ? 'Offerteaanvraag' : 'Aanmelding';
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(`${woord} lidmaatschap ${velden.organisatie} (${velden.ordernummer})`)}&body=${encodeURIComponent(mailtekst(velden))}`;
  const domeinen = velden.toegang
    ? velden.toegang
        .split(', ')
        .map((d) => `@${d}`)
        .join(', ')
    : '';

  if (nietVerzonden) {
    return (
      <div className="stapel sectie">
        <div className="notitie" role="alert">
          <strong>Uw {woord.toLowerCase()} is niet verzonden.</strong> De verbinding met de server lukte niet (dat gebeurt ook
          als het platform lokaal draait).{' '}
          {lokaalBewaard ? 'Uw gegevens zijn bewaard in deze browser. ' : ''}
          Probeer het opnieuw, of stuur dezelfde gegevens per e-mail.
        </div>
        <div className="knoppen">
          <button type="button" className="primair" onClick={onOpnieuw}>
            Opnieuw proberen
          </button>
          <a className="knop" href={mailto}>
            {woord} per e-mail sturen
          </a>
        </div>
        <Kaart titel="Prijs en looptijd">
          <PrijsRegels b={b} />
        </Kaart>
        <Samenvatting g={g} />
      </div>
    );
  }

  return (
    <div className="stapel sectie">
      <div className="notitie succes" role="status">
        <span aria-hidden="true">✓ </span>
        Bedankt. We hebben de {woord.toLowerCase()} van <strong>{velden.organisatie}</strong> ontvangen.
      </div>
      <Kaart titel={offerte ? 'Uw offerteaanvraag' : 'Uw order'} actie={<ConceptBadge />}>
        <p>
          {offerte ? 'Uw referentienummer:' : 'Uw ordernummer:'}
          <br />
          <span className="lm-ordernummer">{velden.ordernummer}</span>
        </p>
        <p className="klein muted">
          {offerte
            ? 'Noem dit nummer als u contact opneemt. Dit is nog geen offerte en geen factuur.'
            : `Noem dit nummer als u contact opneemt. Dit is geen factuur. Het lidmaatschap is rond zodra KplusV de orderbevestiging per e-mail stuurt (artikel 3 van de algemene voorwaarden).`}
        </p>
        {offerte && <p className="klein">Zo ziet het eruit als u de offerte aanvaardt met de gekozen startdatum:</p>}
        <PrijsRegels b={b} />
      </Kaart>
      <Kaart titel="Wat er nu gebeurt">
        {offerte ? (
          <ol className="lm-vervolg">
            <li>
              <strong>Binnen {voorwaarden.bevestigingWerkdagen} werkdagen</strong> mailt KplusV een offerte als pdf naar{' '}
              {velden.contact_email}
              {!prijzenVastgesteld && ', met de definitieve prijs'}. De offerte is {voorwaarden.offerteGeldigDagen} dagen
              geldig (bij een offerte van vandaag tot en met {datum(offerteGeldigTot(vandaag))}).
            </li>
            <li>
              <strong>Akkoord?</strong> Reageer op de offerte met uw inkoopordernummer, of meld u aan via het{' '}
              <Link to="/lidmaatschap/aanmelden?soort=aanmelding" reloadDocument>
                aanmeldformulier
              </Link>. Uw gegevens staan daar nog klaar
              zolang dit tabblad open is.
            </li>
            <li>
              <strong>Geen factuur</strong> zonder akkoord. Een offerteaanvraag verplicht u tot niets.
            </li>
          </ol>
        ) : (
          <ol className="lm-vervolg">
            <li>
              <strong>Binnen {voorwaarden.bevestigingWerkdagen} werkdagen</strong> mailt KplusV de orderbevestiging naar{' '}
              {velden.contact_email}
              {!prijzenVastgesteld && ', met de definitieve prijs'}. Klopt er iets niet, reageer dan op die e-mail.
            </li>
            <li>
              <strong>Vanaf {datum(b.startdatum)}</strong> kunnen collega’s met een e-mailadres op {domeinen} een account maken
              via <Link to="/inloggen">Inloggen</Link>.
            </li>
            <li>
              <strong>Op {datum(b.factuurdatum)}</strong> sturen we de factuur van {euro(b.inclBtw, 2)} incl. btw naar{' '}
              {velden.crediteuren_email}
              {velden.inkoopordernummer ? `, met inkoopordernummer ${velden.inkoopordernummer}` : ''}. Uiterlijk betalen op{' '}
              {datum(b.vervaldatum)}.
              {!velden.inkoopordernummer && ' Heeft u nog een inkoopordernummer nodig op de factuur? Mail het ons vóór de startdatum.'}
            </li>
            <li>
              <strong>Opzeggen</strong> kan per e-mail tot en met {datum(b.opzeggenUiterlijk)}. Anders loopt het lidmaatschap
              door tot {datum(b.verlengdTot)}.
            </li>
          </ol>
        )}
      </Kaart>
      <Samenvatting g={g} />
      <div className="knoppen lm-geen-print">
        <button type="button" onClick={() => window.print()}>
          Bevestiging afdrukken of als pdf bewaren
        </button>
        <Link className="knop" to="/lidmaatschap">
          Terug naar lidmaatschap
        </Link>
      </div>
      <p className="klein muted">
        Vragen? Mail <a href={`mailto:${contact.email}`}>{contact.email}</a> of bel {contact.telefoon}.
      </p>
    </div>
  );
}
