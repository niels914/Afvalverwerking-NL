import { useId, useState, type FormEvent, type ReactNode } from 'react';
import {
  FORMULIERNAAM,
  LOKALE_OPSLAG,
  jaNeeOpties,
  legeAntwoorden,
  onderdeelOpties,
  rolOpties,
  type FeedbackAntwoorden,
} from '../data/feedback';

// Feedbackformulier via Netlify Forms. Versturen gaat met fetch (application/x-www-form-urlencoded),
// zodat de gebruiker op de pagina blijft. Lukt dat niet (lokaal of bij een fout), dan bewaren we de
// inzending in localStorage van deze browser en tonen we een melding.

type Status = { soort: 'invullen' } | { soort: 'bezig' } | { soort: 'verzonden' } | { soort: 'lokaal'; opgeslagen: boolean };

function codeer(antwoorden: FeedbackAntwoorden): string {
  const data = new URLSearchParams();
  data.append('form-name', FORMULIERNAAM);
  data.append('bot-field', '');
  for (const [sleutel, waarde] of Object.entries(antwoorden)) {
    data.append(sleutel, Array.isArray(waarde) ? waarde.join('; ') : waarde);
  }
  return data.toString();
}

function bewaarLokaal(antwoorden: FeedbackAntwoorden): boolean {
  try {
    const bestaand = JSON.parse(localStorage.getItem(LOKALE_OPSLAG) ?? '[]');
    const lijst = Array.isArray(bestaand) ? bestaand : [];
    lijst.push({ ...antwoorden, opgeslagenOp: new Date().toISOString() });
    localStorage.setItem(LOKALE_OPSLAG, JSON.stringify(lijst));
    return true;
  } catch {
    return false;
  }
}

const isBedrag = (s: string) => s.trim() === '' || /^\d{1,3}(\.?\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s.trim());

export function FeedbackFormulier() {
  const id = useId();
  const [a, setA] = useState<FeedbackAntwoorden>(legeAntwoorden);
  const [status, setStatus] = useState<Status>({ soort: 'invullen' });
  const [fouten, setFouten] = useState<Record<string, string>>({});
  const zet = <K extends keyof FeedbackAntwoorden>(k: K, v: FeedbackAntwoorden[K]) => setA((x) => ({ ...x, [k]: v }));
  const isCollega = a.rol === 'collega';

  function controleer(): Record<string, string> {
    const f: Record<string, string> = {};
    if (!a.rol) f.rol = 'Kies uw rol.';
    if (!isBedrag(a.bedrag_redelijk)) f.bedrag_redelijk = 'Vul een bedrag in hele euro’s in, bijvoorbeeld 4000.';
    if (!isBedrag(a.bedrag_te_duur)) f.bedrag_te_duur = 'Vul een bedrag in hele euro’s in, bijvoorbeeld 8000.';
    if (a.contact_toestemming === 'ja' && a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) f.email = 'Vul een geldig e-mailadres in.';
    return f;
  }

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    const f = controleer();
    setFouten(f);
    if (Object.keys(f).length > 0) {
      document.getElementById(`${id}-${Object.keys(f)[0]}`)?.focus();
      return;
    }
    const antwoorden: FeedbackAntwoorden = {
      ...a,
      collega_bijdrage: isCollega ? a.collega_bijdrage : '',
      email: a.contact_toestemming === 'ja' ? a.email : '',
    };
    setStatus({ soort: 'bezig' });
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: codeer(antwoorden),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setStatus({ soort: 'verzonden' });
      setA(legeAntwoorden);
    } catch {
      setStatus({ soort: 'lokaal', opgeslagen: bewaarLokaal(antwoorden) });
    }
  }

  if (status.soort === 'verzonden') {
    return (
      <div className="stapel">
        <p className="notitie succes" role="status">
          ✓ Bedankt, uw feedback is ontvangen.
        </p>
        <div className="knoppen">
          <button type="button" onClick={() => setStatus({ soort: 'invullen' })}>
            Nog een reactie geven
          </button>
        </div>
      </div>
    );
  }

  return (
    <form name={FORMULIERNAAM} method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={verstuur} noValidate className="velden">
      <input type="hidden" name="form-name" value={FORMULIERNAAM} />
      <p hidden>
        <label>
          Niet invullen: <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      {status.soort === 'lokaal' && (
        <p className="notitie" role="alert">
          {status.opgeslagen
            ? 'Versturen lukte niet (bijvoorbeeld omdat het prototype lokaal draait). Uw antwoorden zijn bewaard in deze browser. U kunt het later opnieuw proberen.'
            : 'Versturen lukte niet en bewaren in deze browser ook niet. Probeer het later opnieuw of mail uw reactie.'}
        </p>
      )}

      <Vraag nr={1} label="Uw rol" id={`${id}-rol`} fout={fouten.rol} verplicht>
        <div className="invoer">
          <select id={`${id}-rol`} name="rol" value={a.rol} onChange={(e) => zet('rol', e.target.value)} aria-invalid={!!fouten.rol} aria-describedby={fouten.rol ? `${id}-rol-fout` : undefined}>
            <option value="">Kies…</option>
            {rolOpties.map((o) => (
              <option key={o.waarde} value={o.waarde}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Vraag>

      <Vraag nr={2} label="Organisatie (optioneel)" id={`${id}-organisatie`}>
        <div className="invoer">
          <input id={`${id}-organisatie`} name="organisatie" type="text" autoComplete="organization" value={a.organisatie} onChange={(e) => zet('organisatie', e.target.value)} />
        </div>
      </Vraag>

      <KeuzeRondjes nr={3} vraag="Zou u dit platform in uw werk gebruiken?" naam="gebruiken" waarde={a.gebruiken} onChange={(v) => zet('gebruiken', v)} />

      <fieldset>
        <legend>4. Welke onderdelen zijn voor u het meest waardevol?</legend>
        <div className="keuzes kolom">
          {onderdeelOpties.map((o) => (
            <label key={o} className="keuze">
              <input
                type="checkbox"
                name="onderdelen"
                value={o}
                checked={a.onderdelen.includes(o)}
                onChange={(e) => zet('onderdelen', e.target.checked ? [...a.onderdelen, o] : a.onderdelen.filter((x) => x !== o))}
              />
              {o}
            </label>
          ))}
        </div>
      </fieldset>

      <Vraag nr={5} label="Wat mist er nog?" id={`${id}-mist`}>
        <div className="invoer">
          <textarea id={`${id}-mist`} name="mist" value={a.mist} onChange={(e) => zet('mist', e.target.value)} />
        </div>
      </Vraag>

      <KeuzeRondjes nr={6} vraag="Zou uw organisatie lid worden?" naam="lid_worden" waarde={a.lid_worden} onChange={(v) => zet('lid_worden', v)} />

      <div className="velden-2">
        <Vraag nr={7} label="Welk bedrag per jaar vindt u redelijk voor uw organisatie?" id={`${id}-bedrag_redelijk`} fout={fouten.bedrag_redelijk}>
          <BedragInvoer id={`${id}-bedrag_redelijk`} naam="bedrag_redelijk" waarde={a.bedrag_redelijk} fout={fouten.bedrag_redelijk} onChange={(v) => zet('bedrag_redelijk', v)} />
        </Vraag>
        <Vraag nr={8} label="Vanaf welk bedrag per jaar wordt het te duur?" id={`${id}-bedrag_te_duur`} fout={fouten.bedrag_te_duur}>
          <BedragInvoer id={`${id}-bedrag_te_duur`} naam="bedrag_te_duur" waarde={a.bedrag_te_duur} fout={fouten.bedrag_te_duur} onChange={(v) => zet('bedrag_te_duur', v)} />
        </Vraag>
      </div>

      <Vraag nr={9} label="Wat zou u ervan weerhouden om lid te worden?" id={`${id}-weerhoudt`}>
        <div className="invoer">
          <textarea id={`${id}-weerhoudt`} name="weerhoudt" value={a.weerhoudt} onChange={(e) => zet('weerhoudt', e.target.value)} />
        </div>
      </Vraag>

      {isCollega && (
        <Vraag nr={10} label="Alleen voor collega’s: past dit bij KplusV, en zou u willen bijdragen?" id={`${id}-collega_bijdrage`}>
          <div className="invoer">
            <textarea id={`${id}-collega_bijdrage`} name="collega_bijdrage" value={a.collega_bijdrage} onChange={(e) => zet('collega_bijdrage', e.target.value)} />
          </div>
        </Vraag>
      )}

      <KeuzeRondjes
        nr={isCollega ? 11 : 10}
        vraag="Mogen we contact met u opnemen?"
        naam="contact_toestemming"
        waarde={a.contact_toestemming}
        onChange={(v) => zet('contact_toestemming', v)}
        opties={[
          { waarde: 'ja', label: 'Ja' },
          { waarde: 'nee', label: 'Nee' },
        ]}
      />
      {a.contact_toestemming === 'ja' && (
        <Vraag label="E-mailadres (optioneel)" id={`${id}-email`} fout={fouten.email}>
          <div className="invoer" data-fout={fouten.email ? 'true' : 'false'}>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={a.email}
              onChange={(e) => zet('email', e.target.value)}
              aria-invalid={!!fouten.email}
              aria-describedby={fouten.email ? `${id}-email-fout` : undefined}
            />
          </div>
        </Vraag>
      )}

      <div className="knoppen">
        <button type="submit" className="primair" disabled={status.soort === 'bezig'}>
          {status.soort === 'bezig' ? 'Bezig met versturen…' : 'Verstuur feedback'}
        </button>
      </div>
      <p className="klein muted">
        Privacy: we gebruiken uw antwoorden alleen om dit idee verder te ontwikkelen en, als u daarvoor toestemming geeft,
        om contact met u op te nemen; we delen ze met niemand buiten KplusV.
      </p>
    </form>
  );
}

function Vraag({ nr, label, id, fout, verplicht, children }: { nr?: number; label: string; id: string; fout?: string; verplicht?: boolean; children: ReactNode }) {
  return (
    <div className="veld">
      <label htmlFor={id}>
        {nr ? `${nr}. ` : ''}
        {label}
        {verplicht && <span aria-hidden="true"> *</span>}
        {verplicht && <span className="visueel-verborgen"> (verplicht)</span>}
      </label>
      {children}
      {fout && (
        <span className="foutmelding" id={`${id}-fout`}>
          {fout}
        </span>
      )}
    </div>
  );
}

function BedragInvoer({ id, naam, waarde, fout, onChange }: { id: string; naam: string; waarde: string; fout?: string; onChange: (v: string) => void }) {
  return (
    <div className="invoer" data-fout={fout ? 'true' : 'false'}>
      <span className="eenheid" style={{ borderLeft: 0, borderRight: '1px solid var(--rand)' }} aria-hidden="true">
        €
      </span>
      <input
        id={id}
        name={naam}
        type="text"
        inputMode="numeric"
        value={waarde}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!fout}
        aria-describedby={fout ? `${id}-fout` : undefined}
      />
      <span className="eenheid" aria-hidden="true">
        per jaar
      </span>
    </div>
  );
}

function KeuzeRondjes({
  nr,
  vraag,
  naam,
  waarde,
  onChange,
  opties = jaNeeOpties,
}: {
  nr: number;
  vraag: string;
  naam: string;
  waarde: string;
  onChange: (v: string) => void;
  opties?: { waarde: string; label: string }[];
}) {
  return (
    <fieldset>
      <legend>
        {nr}. {vraag}
      </legend>
      <div className="keuzes">
        {opties.map((o) => (
          <label key={o.waarde} className="keuze">
            <input type="radio" name={naam} value={o.waarde} checked={waarde === o.waarde} onChange={() => onChange(o.waarde)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
