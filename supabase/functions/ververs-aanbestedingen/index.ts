// Edge Function "ververs-aanbestedingen": haalt aankondigingen over afval op uit TenderNed en zet ze in
// public.aanbestedingen. Draait dagelijks via pg_cron (zie supabase/migrations/*_aanbestedingen_cron.sql).
//
// Beveiliging: verify_jwt staat uit; de aanroeper moet de kop x-ververs-geheim meesturen. De functie
// controleert die tegen het Vault-geheim "ververs_aanbestedingen_geheim" via rpc ververs_geheim_klopt
// (alleen uitvoerbaar met de service-rol). Het geheim staat dus nergens in code of repository.
//
// Body (optioneel, JSON): { "maxDetails": 300 }  maximaal aantal detailpagina's per run.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import {
  CPV_FILTER,
  bouwAanbesteding,
  vatDetailSamen,
  type AanbestedingRij,
  type DetailSamenvatting,
  type TnsLijstPublicatie,
} from './afleiding.ts';

const TNS = 'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties';
const PAGINA = 100; // maximum dat de webservice toestaat
const MAX_PAGINAS = 80; // veiligheidsgrens (8.000 publicaties)
const PAUZE_MS = 250; // rustig aan richting TenderNed
const GELIJKTIJDIG = 4;

const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function haalJson(url: string, pogingen = 3): Promise<unknown> {
  let laatsteFout: unknown;
  for (let i = 0; i < pogingen; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25_000) });
      if (res.ok) return await res.json();
      laatsteFout = new Error(`${res.status} bij ${url}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (e) {
      laatsteFout = e;
    }
    await wacht(1000 * (i + 1));
  }
  throw laatsteFout;
}

async function haalLijst(): Promise<TnsLijstPublicatie[]> {
  const alle: TnsLijstPublicatie[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const data = (await haalJson(`${TNS}?page=${pagina}&size=${PAGINA}&cpvCodes=${encodeURIComponent(CPV_FILTER)}`)) as {
      content?: TnsLijstPublicatie[];
      last?: boolean;
    };
    alle.push(...(data.content ?? []));
    if (data.last !== false || !data.content?.length) break;
    await wacht(PAUZE_MS);
  }
  return alle;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ fout: 'Gebruik POST' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const geheim = req.headers.get('x-ververs-geheim') ?? '';
  const { data: klopt, error: geheimFout } = await db.rpc('ververs_geheim_klopt', { p_geheim: geheim });
  if (geheimFout || klopt !== true) return json({ fout: 'Niet toegestaan' }, 401);

  let maxDetails = 300;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.maxDetails)) maxDetails = Math.max(0, Math.min(1000, Number(body.maxDetails)));
  } catch {
    // lege body is prima
  }

  const { data: run } = await db.from('aanbestedingen_verversingen').insert({}).select('id').single();
  const runId = run?.id as number | undefined;
  const log = async (velden: Record<string, unknown>) => {
    if (runId) await db.from('aanbestedingen_verversingen').update(velden).eq('id', runId);
  };

  try {
    // 1. Alle publicaties met CPV 90500000 en onderliggende codes.
    const lijst = await haalLijst();
    if (lijst.length === 0) throw new Error('TenderNed gaf geen publicaties terug');
    const perKenmerk = new Map<number, TnsLijstPublicatie[]>();
    for (const p of lijst) {
      if (!p?.kenmerk) continue;
      const rij = perKenmerk.get(p.kenmerk) ?? [];
      rij.push(p);
      perKenmerk.set(p.kenmerk, rij);
    }

    // 2. Bestaande details (CPV, NUTS, trefwoorden) uit de database.
    const bestaand = new Map<number, DetailSamenvatting>();
    for (let van = 0; ; van += 1000) {
      const { data, error } = await db
        .from('aanbestedingen')
        .select('kenmerk, detail_publicatie_id, cpv_codes, cpv_hoofd, cpv_hoofd_omschrijving, nuts_codes, trefwoorden, cpv_details')
        .range(van, van + 999);
      if (error) throw error;
      for (const r of data ?? []) {
        if (!r.detail_publicatie_id) continue;
        bestaand.set(r.kenmerk, {
          publicatieId: r.detail_publicatie_id,
          cpv: (r.cpv_details ?? []) as DetailSamenvatting['cpv'],
          nuts: r.nuts_codes ?? [],
          trefwoorden: r.trefwoorden ?? [],
        });
      }
      if (!data || data.length < 1000) break;
    }

    // 3. Details ophalen voor nieuwe aanbestedingen en voor aanbestedingen met een nieuwere publicatie. Nieuwste eerst.
    const nieuwste = (ps: TnsLijstPublicatie[]) =>
      ps.reduce((a, b) => (Number(b.publicatieId) > Number(a.publicatieId) ? b : a));
    const teDoen = [...perKenmerk.entries()]
      .map(([kenmerk, ps]) => ({ kenmerk, laatste: nieuwste(ps.filter((p) => p.publicatiestatus?.code !== 'INT').length ? ps.filter((p) => p.publicatiestatus?.code !== 'INT') : ps) }))
      .filter(({ kenmerk, laatste }) => {
        // Van ingetrokken publicaties geeft TenderNed geen detailpagina.
        if (laatste.publicatiestatus?.code === 'INT') return false;
        const d = bestaand.get(kenmerk);
        return !d || Number(laatste.publicatieId) > d.publicatieId;
      })
      .sort((a, b) => Number(b.laatste.publicatieId) - Number(a.laatste.publicatieId));
    const nuOphalen = teDoen.slice(0, maxDetails);
    let detailFouten = 0;
    for (let i = 0; i < nuOphalen.length; i += GELIJKTIJDIG) {
      await Promise.all(
        nuOphalen.slice(i, i + GELIJKTIJDIG).map(async ({ kenmerk, laatste }) => {
          try {
            const detail = (await haalJson(`${TNS}/${laatste.publicatieId}`, 2)) as Record<string, unknown>;
            bestaand.set(kenmerk, vatDetailSamen(detail));
          } catch {
            detailFouten++;
          }
        }),
      );
      await wacht(PAUZE_MS);
    }

    // 4. Rijen opbouwen en wegschrijven.
    const rijen: (AanbestedingRij & { cpv_details: unknown; bron_opgehaald: string })[] = [];
    const nu = new Date().toISOString();
    for (const [kenmerk, ps] of perKenmerk) {
      const detail = bestaand.get(kenmerk) ?? null;
      rijen.push({ ...bouwAanbesteding(ps, detail), cpv_details: detail?.cpv ?? [], bron_opgehaald: nu });
    }
    for (let i = 0; i < rijen.length; i += 250) {
      const { error } = await db.from('aanbestedingen').upsert(rijen.slice(i, i + 250), { onConflict: 'kenmerk' });
      if (error) throw error;
    }

    const resultaat = {
      klaar: new Date().toISOString(),
      gelukt: true,
      publicaties: lijst.length,
      aanbestedingen: rijen.length,
      details_opgehaald: nuOphalen.length - detailFouten,
      details_open: teDoen.length - nuOphalen.length + detailFouten,
      melding: detailFouten ? `${detailFouten} detailpagina's niet opgehaald; volgende run opnieuw` : null,
    };
    await log(resultaat);
    return json(resultaat);
  } catch (e) {
    const melding = e instanceof Error ? e.message : String(e);
    await log({ klaar: new Date().toISOString(), gelukt: false, melding: melding.slice(0, 500) });
    return json({ gelukt: false, melding }, 500);
  }
});
