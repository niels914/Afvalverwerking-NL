import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Kaart } from '../ui';
import { Akkoord, KeuzeRondjes, TekstVak, TekstVeld, veldId } from '../lidmaatschap/Velden';
import '../lidmaatschap/lidmaatschap.css';
import './heffingenscan.css';
import { supabase } from '../../lib/supabase';
import { contact } from '../../data/site';
import {
  AANVRAAG_FORMULIER,
  aanbodBijDeHand,
  aanbodPrijzen,
  aanbodTermijnen,
  aanvraagLengtes,
  aanvraagOpties,
  type AanvraagKeuze,
} from '../../data/heffingen-aanbod';
import { euro } from '../../lib/format';
import { bewaarBronUitUrl } from './bron';

export interface AanvraagGemeente {
  code: string;
  naam: string;
}

interface Velden {
  naam: string;
  organisatie: string;
  functie: string;
  email: string;
  telefoon: string;
  keuze: AanvraagKeuze | '';
  opmerking: string;
  akkoord: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function controleer(v: Velden): Partial<Record<keyof Velden, string>> {
  const f: Partial<Record<keyof Velden, string>> = {};
  if (!v.naam.trim()) f.naam = 'Vul uw naam in.';
  if (!v.organisatie.trim()) f.organisatie = 'Vul uw organisatie in.';
  if (!v.functie.trim()) f.functie = 'Vul uw functie in.';
  if (!v.email.trim()) f.email = 'Vul uw e-mailadres in.';
  else if (!EMAIL.test(v.email.trim()) || v.email.trim().length > aanvraagLengtes.email) f.email = 'Vul een geldig e-mailadres in, bijvoorbeeld naam@gemeente.nl.';
  if (v.telefoon.length > aanvraagLengtes.telefoon) f.telefoon = `Maximaal ${aanvraagLengtes.telefoon} tekens.`;
  if (!v.keuze) f.keuze = 'Kies wat u wilt aanvragen.';
  if (v.opmerking.length > aanvraagLengtes.opmerking) f.opmerking = `Maximaal ${aanvraagLengtes.opmerking} tekens.`;
  if (!v.akkoord) f.akkoord = 'Ga akkoord met de privacyverklaring om de aanvraag te versturen.';
  return f;
}

type Verzonden = { soort: 'invullen' } | { soort: 'bezig' } | { soort: 'binnen'; via: string } | { soort: 'mislukt' };

const keuzeLabel = (id: string) => aanvraagOpties.find((o) => o.id === id)?.label ?? id;

function mailLink(g: AanvraagGemeente, v: Velden, kerncijfers: string, bron: string): string {
  const maak = (opmerking: string) => {
    const regels = [
      `Aanvraag rapport Heffingenscan restafval: ${g.naam} (${g.code})`,
      '(verzenden via het formulier lukte niet)',
      '',
      `Naam: ${v.naam}`,
      `Organisatie: ${v.organisatie}`,
      `Functie: ${v.functie}`,
      `E-mailadres: ${v.email}`,
      v.telefoon ? `Telefoon: ${v.telefoon}` : '',
      `Keuze: ${keuzeLabel(v.keuze)}`,
      opmerking ? `Opmerking: ${opmerking}` : '',
      bron ? `Bron: ${bron}` : '',
      '',
      `Kerncijfers: ${kerncijfers}`,
    ].filter((r, i, a) => r !== '' || (a[i - 1] ?? '') !== '');
    return `mailto:${contact.email}?subject=${encodeURIComponent(`Rapportaanvraag Heffingenscan ${g.naam}`)}&body=${encodeURIComponent(regels.join('\n'))}`;
  };
  let opm = v.opmerking;
  let href = maak(opm);
  // Sommige mailprogramma's kappen links rond 2.000 tekens af; kort de opmerking in als dat nodig is.
  while (href.length > 1900 && opm.length > 0) {
    opm = opm.slice(0, Math.max(0, opm.length - 100));
    href = maak(opm ? `${opm} … [ingekort]` : '');
  }
  return href;
}

/** Netlify Forms: dezelfde velden als de verborgen kopie in index.html. */
async function naarNetlify(rij: Record<string, string>): Promise<void> {
  const data = new URLSearchParams();
  data.append('form-name', AANVRAAG_FORMULIER);
  data.append('bot-field', '');
  for (const [k, w] of Object.entries(rij)) data.append(k, w);
  const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() });
  if (!res.ok) throw new Error(`Netlify ${res.status}`);
}

/** Supabase: public.rapportaanvragen (alleen invoegen). */
async function naarSupabase(rij: Record<string, string | boolean | null>): Promise<void> {
  const { error } = await supabase.from('rapportaanvragen').insert(rij);
  if (error) throw new Error(error.message);
}

interface Props {
  gemeente: AanvraagGemeente;
  /** Tekst met de kerncijfers van de scan op dit moment; gaat mee als verborgen veld. */
  kerncijfers: string;
}

/** Aanvraagformulier voor het rapport. Netlify Forms én Supabase; lukt één van de twee, dan is de aanvraag binnen. */
export function Rapportaanvraag({ gemeente, kerncijfers }: Props) {
  const [v, setV] = useState<Velden>({ naam: '', organisatie: `Gemeente ${gemeente.naam}`, functie: '', email: '', telefoon: '', keuze: '', opmerking: '', akkoord: false });
  const [fouten, setFouten] = useState<Partial<Record<keyof Velden, string>>>({});
  const [status, setStatus] = useState<Verzonden>({ soort: 'invullen' });
  const [valstrik, setValstrik] = useState('');
  const [bron, setBron] = useState('');
  const kop = useRef<HTMLHeadingElement>(null);
  const zet = <K extends keyof Velden>(k: K, w: Velden[K]) => setV((x) => ({ ...x, [k]: w }));

  useEffect(() => setBron(bewaarBronUitUrl(window.location.search)), []);
  // De organisatie volgt de gemeente zolang de bezoeker er niets aan veranderde.
  useEffect(() => setV((x) => (x.organisatie === '' || /^Gemeente /.test(x.organisatie) ? { ...x, organisatie: `Gemeente ${gemeente.naam}` } : x)), [gemeente.naam]);
  useEffect(() => {
    if (status.soort === 'binnen' || status.soort === 'mislukt') kop.current?.focus();
  }, [status.soort]);

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    const f = controleer(v);
    setFouten(f);
    const eerste = Object.keys(f)[0];
    if (eerste) {
      document.getElementById(veldId(eerste === 'akkoord' ? 'akkoord_privacy' : eerste === 'keuze' ? 'keuze' : eerste))?.focus();
      return;
    }
    // Honeypot: een mens laat dit veld leeg. Een bot krijgt een bevestiging zonder dat er iets wordt opgeslagen.
    if (valstrik) return setStatus({ soort: 'binnen', via: 'formulier' });
    const kern = kerncijfers.slice(0, aanvraagLengtes.kerncijfers);
    const rij = {
      gemeente: gemeente.naam,
      gemeentecode: gemeente.code,
      naam: v.naam.trim(),
      organisatie: v.organisatie.trim(),
      functie: v.functie.trim(),
      email: v.email.trim(),
      telefoon: v.telefoon.trim(),
      keuze: v.keuze,
      opmerking: v.opmerking.trim(),
      akkoord_privacy: 'ja',
      kerncijfers: kern,
      bron,
    };
    setStatus({ soort: 'bezig' });
    const [netlify, db] = await Promise.allSettled([
      naarNetlify(rij),
      naarSupabase({ ...rij, telefoon: rij.telefoon || null, opmerking: rij.opmerking || null, bron: rij.bron || null, akkoord_privacy: true }),
    ]);
    if (netlify.status === 'fulfilled' || db.status === 'fulfilled') {
      setStatus({ soort: 'binnen', via: [netlify.status === 'fulfilled' ? 'Netlify' : '', db.status === 'fulfilled' ? 'Supabase' : ''].filter(Boolean).join(' en ') });
    } else {
      setStatus({ soort: 'mislukt' });
    }
  }

  if (status.soort === 'binnen') {
    return (
      <Kaart titel="Aanvraag ontvangen" vlak id="aanvragen" className="hs-aanvraag">
        <div className="stapel" role="status">
          <h3 ref={kop} tabIndex={-1} style={{ outline: 'none' }}>
            Bedankt, uw aanvraag voor {gemeente.naam} is binnen.
          </h3>
          <p>Wat er nu gebeurt:</p>
          <ol className="hs-stappen">
            <li>
              U krijgt {aanbodTermijnen.reactie} een reactie van {contact.naam}, op het e-mailadres dat u hebt ingevuld.
            </li>
            <li>Wij bevestigen de invoer van de scan met u. Het rapport volgt {aanbodTermijnen.rapport}.</li>
          </ol>
          <p>
            Houd voor dat gesprek bij de hand: {aanbodBijDeHand.join(' en ')}. Daarmee wordt de berekening scherper dan met de CBS-cijfers alleen.
          </p>
          <p className="klein muted">Vragen? Mail {contact.email} of bel {contact.telefoon}.</p>
        </div>
      </Kaart>
    );
  }

  const mislukt = status.soort === 'mislukt';
  const bezig = status.soort === 'bezig';
  const fout = Object.entries(fouten).filter(([, m]) => m);

  return (
    <Kaart titel="Rapport aanvragen" vlak id="aanvragen" className="hs-aanvraag" sub={`Voor ${gemeente.naam}. Uw aanvraag gaat naar ${contact.naam} van KplusV.`}>
      <form name={AANVRAAG_FORMULIER} method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={verstuur} noValidate className="stapel">
        <input type="hidden" name="form-name" value={AANVRAAG_FORMULIER} />
        <input type="hidden" name="gemeente" value={gemeente.naam} />
        <input type="hidden" name="gemeentecode" value={gemeente.code} />
        <input type="hidden" name="kerncijfers" value={kerncijfers} />
        <input type="hidden" name="bron" value={bron} />
        <p hidden>
          <label>
            Niet invullen: <input name="bot-field" tabIndex={-1} autoComplete="off" value={valstrik} onChange={(e) => setValstrik(e.target.value)} />
          </label>
        </p>

        <p className="klein">Velden met * zijn verplicht.</p>

        {fout.length > 0 && (
          <div className="notitie lm-foutsamenvatting" role="alert">
            <strong>Controleer de aanvraag:</strong>
            <ul className="opsomming">
              {fout.map(([k, m]) => (
                <li key={k}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {mislukt && (
          <div className="notitie" role="alert">
            <h3 ref={kop} tabIndex={-1} style={{ outline: 'none' }}>
              Versturen is niet gelukt
            </h3>
            <p>
              <strong>Mogelijk door uw verbinding of een storing.</strong> Uw invoer staat nog in het formulier. U kunt de aanvraag per e-mail sturen: de knop hieronder opent uw mailprogramma met alles al ingevuld.
            </p>
            <div className="knoppen">
              <a className="knop primair" href={mailLink(gemeente, v, kerncijfers, bron)}>
                Aanvraag per e-mail sturen
              </a>
              <button type="submit">Opnieuw proberen</button>
            </div>
          </div>
        )}

        <TekstVeld naam="naam" label="Naam" waarde={v.naam} onChange={(w) => zet('naam', w)} autoComplete="name" fout={fouten.naam} maxLength={aanvraagLengtes.naam} />
        <TekstVeld naam="organisatie" label="Organisatie" waarde={v.organisatie} onChange={(w) => zet('organisatie', w)} autoComplete="organization" fout={fouten.organisatie} maxLength={aanvraagLengtes.organisatie} />
        <TekstVeld naam="functie" label="Functie" waarde={v.functie} onChange={(w) => zet('functie', w)} autoComplete="organization-title" fout={fouten.functie} maxLength={aanvraagLengtes.functie} />
        <TekstVeld naam="email" label="E-mailadres" type="email" inputMode="email" waarde={v.email} onChange={(w) => zet('email', w)} autoComplete="email" fout={fouten.email} maxLength={aanvraagLengtes.email} />
        <TekstVeld naam="telefoon" label="Telefoon" type="tel" inputMode="tel" optioneel waarde={v.telefoon} onChange={(w) => zet('telefoon', w)} autoComplete="tel" fout={fouten.telefoon} maxLength={aanvraagLengtes.telefoon} hint="Alleen als u liever gebeld wordt." />

        <KeuzeRondjes<AanvraagKeuze>
          naam="keuze"
          legend="Wat wilt u aanvragen?"
          waarde={v.keuze}
          onChange={(w) => zet('keuze', w)}
          fout={fouten.keuze}
          kolom
          opties={aanvraagOpties.map((o) => ({
            waarde: o.id,
            label: o.prijs === null ? o.label : `${o.label}: ${euro(o.prijs)} ${aanbodPrijzen.btwTekst}`,
            toelichting: o.toelichting,
          }))}
        />

        <TekstVak naam="opmerking" label="Opmerking" optioneel waarde={v.opmerking} onChange={(w) => zet('opmerking', w)} fout={fouten.opmerking} rijen={3} hint="Bijvoorbeeld de regio, de AVI waar uw afval heen gaat of een vraag." />

        <Akkoord naam="akkoord_privacy" waarde={v.akkoord} onChange={(w) => zet('akkoord', w)} fout={fouten.akkoord}>
          Ik ga akkoord met de{' '}
          <Link to="/privacy" target="_blank" rel="noopener">
            privacyverklaring
          </Link>{' '}
          <span className="visueel-verborgen">(opent in een nieuw tabblad)</span>
        </Akkoord>

        <p className="klein muted">
          De scan zelf is gratis en vraagt geen account. Het rapport kost {euro(aanbodPrijzen.rapport)} per gemeente, een toelichting met sparringssessie {euro(aanbodPrijzen.toelichtingExtra)} extra, alles {aanbodPrijzen.btwTekst}.
          Meerdere gemeenten: op aanvraag. Met uw aanvraag gaan de kerncijfers van de scan mee{bron ? ' en de code van de uiting waarmee u kwam' : ''}, zodat wij weten waarover het gaat.
        </p>

        <div className="knoppen">
          <button type="submit" className="primair" disabled={bezig}>
            {bezig ? 'Bezig met versturen…' : 'Aanvraag versturen'}
          </button>
        </div>
      </form>
    </Kaart>
  );
}
