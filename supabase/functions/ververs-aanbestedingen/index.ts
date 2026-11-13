// Edge Function "ververs-aanbestedingen": haalt aankondigingen over afval op uit TenderNed en zet ze in
// public.aanbestedingen. Draait dagelijks via pg_cron (zie supabase/migrations/*_aanbestedingen_cron.sql).
//
// Beveiliging: verify_jwt staat uit; de aanroeper moet de kop x-ververs-geheim meesturen. De functie
// controleert die tegen het Vault-geheim "ververs_aanbestedingen_geheim" via rpc ververs_geheim_klopt
// (alleen uitvoerbaar met de service-rol). Het geheim staat dus nergens in code of repository.
//
// Body (optioneel, JSON):
//   { "maxDetails": 300 }       maximaal aantal detailpagina's per run (CPV, NUTS, trefwoorden)
//   { "maxDocumenten": 150 }    maximaal aantal aanbestedingen waarvan de documentenlijst wordt opgehaald
//   { "maxGunningen": 60 }      maximaal aantal gunningsaankondigingen dat wordt uitgelezen
//   { "modus": "vul" }          alleen documenten en gunningen aanvullen (zonder de lijst van TenderNed te verversen)
// Documenten en gunningen zijn hervatbaar: wat al is opgehaald (en niet gewijzigd) wordt overgeslagen. Het platform
// bewaart alleen metadata van documenten (naam, soort, datum, grootte, link); nooit het document zelf.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import {
  CPV_FILTER,
  bouwAanbesteding,
  vatDetailSamen,
  type AanbestedingRij,
  type DetailSamenvatting,
  type TnsLijstPublicatie,
} from './afleiding.ts';
import { GEMEENTE_PROVINCIE } from './gemeenten.ts';
import { soortenIn, vatDocumentenSamen } from './documenten.ts';
import { planningUitDetail, vatGunningSamen } from './gunning.ts';

const TNS = 'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties';
const PAGINA = 100; // maximum dat de webservice toestaat
const MAX_PAGINAS = 80; // veiligheidsgrens (8.000 publicaties)
const PAUZE_MS = 250; // rustig aan richting TenderNed
const GELIJKTIJDIG = 4;
const GELIJKTIJDIG_VUL = 2; // documenten en gunningen: nog rustiger
const PAUZE_VUL_MS = 350;
const TIJDBUDGET_MS = 105_000; // daarna geen nieuwe batches meer starten; het volgende run gaat verder

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

interface VulRij {
  kenmerk: number;
  publicaties: { id: number; type: string; ingetrokken: boolean }[];
  documenten_publicatie_id: number | null;
  gunning_publicatie_id: number | null;
}

/**
 * Vult documenten en gunningen aan voor aanbestedingen die nog niet (of voor een nieuwere publicatie nog niet) zijn opgehaald.
 * Nieuwste eerst; begrensd door maximaal aantal en tijdbudget; één verzoek per aanbesteding (alle publicaties van een
 * aanbesteding delen dezelfde documenten, dus we vragen de laatste geldige publicatie).
 */
async function vulDocumentenEnGunningen(
  db: ReturnType<typeof createClient>,
  start: number,
  maxDocumenten: number,
  maxGunningen: number,
) {
  const rijen: VulRij[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await db
      .from('aanbestedingen')
      .select('kenmerk, publicaties, documenten_publicatie_id, gunning_publicatie_id')
      .range(van, van + 999);
    if (error) throw error;
    rijen.push(...((data ?? []) as VulRij[]));
    if (!data || data.length < 1000) break;
  }
  const geldig = (r: VulRij) => (r.publicaties ?? []).filter((p) => !p.ingetrokken);
  const laatsteId = (ps: { id: number }[]) => ps.reduce((m, p) => Math.max(m, Number(p.id)), 0);
  const binnenBudget = () => Date.now() - start < TIJDBUDGET_MS;

  // Documenten.
  const docTodo = rijen
    .map((r) => ({ kenmerk: r.kenmerk, id: laatsteId(geldig(r)), gedaan: r.documenten_publicatie_id }))
    .filter((r) => r.id > 0 && (r.gedaan === null || r.id > Number(r.gedaan)))
    .sort((a, b) => b.id - a.id);
  const docNu = docTodo.slice(0, maxDocumenten);
  let docOpgehaald = 0;
  let docDocumenten = 0;
  let fouten = 0;
  for (let i = 0; i < docNu.length && binnenBudget(); i += GELIJKTIJDIG_VUL) {
    await Promise.all(
      docNu.slice(i, i + GELIJKTIJDIG_VUL).map(async ({ kenmerk, id }) => {
        try {
          const antwoord = await haalJson(`${TNS}/${id}/documenten`, 2);
          const docs = vatDocumentenSamen(kenmerk, id, antwoord);
          if (docs.length) {
            const { error } = await db.from('aanbesteding_documenten').upsert(docs, { onConflict: 'kenmerk,document_id' });
            if (error) throw error;
          }
          // Documenten die in de nieuwste lijst ontbreken (vervangen of ingetrokken) horen er niet meer bij.
          await db.from('aanbesteding_documenten').delete().eq('kenmerk', kenmerk).neq('publicatie_id', id);
          const { error: e2 } = await db
            .from('aanbestedingen')
            .update({
              documenten_publicatie_id: id,
              documenten_opgehaald: new Date().toISOString(),
              documenten_aantal: docs.length,
              documenten_soorten: soortenIn(docs),
            })
            .eq('kenmerk', kenmerk);
          if (e2) throw e2;
          docOpgehaald++;
          docDocumenten += docs.length;
        } catch {
          fouten++;
        }
      }),
    );
    await wacht(PAUZE_VUL_MS);
  }

  // Gunningen: alleen aanbestedingen met een gunningsaankondiging (AGO).
  const gunTodo = rijen
    .map((r) => ({ kenmerk: r.kenmerk, id: laatsteId(geldig(r).filter((p) => p.type === 'AGO')), gedaan: r.gunning_publicatie_id }))
    .filter((r) => r.id > 0 && (r.gedaan === null || r.id > Number(r.gedaan)))
    .sort((a, b) => b.id - a.id);
  const gunNu = gunTodo.slice(0, maxGunningen);
  let gunOpgehaald = 0;
  let gunMetPartij = 0;
  for (let i = 0; i < gunNu.length && binnenBudget(); i += GELIJKTIJDIG_VUL) {
    await Promise.all(
      gunNu.slice(i, i + GELIJKTIJDIG_VUL).map(async ({ kenmerk, id }) => {
        try {
          const gunning = vatGunningSamen(await haalJson(`${TNS}/${id}/html`, 2));
          if (gunning) {
            let { looptijd_start: begin, looptijd_einde: einde } = gunning;
            let eindeBron: 'aankondiging' | 'detail' | null = einde ? 'aankondiging' : null;
            if (!einde) {
              // Oudere aankondigingen noemen de looptijd niet gestructureerd; de detailpagina geeft soms aanvang en voltooiing.
              try {
                const plan = planningUitDetail(await haalJson(`${TNS}/${id}`, 2));
                if (plan.einde) {
                  einde = plan.einde;
                  begin = begin ?? plan.start;
                  eindeBron = 'detail';
                }
              } catch {
                // geen planning is prima
              }
            }
            const { error } = await db.from('aanbesteding_gunningen').upsert(
              {
                kenmerk,
                publicatie_id: id,
                formaat: gunning.formaat,
                gegund_aan: gunning.gegund_aan,
                gunningsdatum: gunning.gunningsdatum,
                waarde_totaal: gunning.waarde_totaal,
                aantal_inschrijvingen: gunning.aantal_inschrijvingen,
                percelen: gunning.percelen,
                looptijd_start: begin,
                looptijd_einde: einde,
                einde_afgeleid: eindeBron === 'aankondiging' ? gunning.einde_afgeleid : false,
                einde_bron: eindeBron,
                verlengingen_max: gunning.verlengingen_max,
                verlenging_tekst: gunning.verlenging_tekst,
                bijgewerkt: new Date().toISOString(),
              },
              { onConflict: 'kenmerk' },
            );
            if (error) throw error;
            gunMetPartij++;
          }
          const { error: e2 } = await db
            .from('aanbestedingen')
            .update({ gunning_publicatie_id: id, gunning_opgehaald: new Date().toISOString() })
            .eq('kenmerk', kenmerk);
          if (e2) throw e2;
          gunOpgehaald++;
        } catch {
          fouten++;
        }
      }),
    );
    await wacht(PAUZE_VUL_MS);
  }

  return {
    documenten_opgehaald: docOpgehaald,
    documenten_open: docTodo.length - docOpgehaald,
    gunningen_opgehaald: gunOpgehaald,
    gunningen_open: gunTodo.length - gunOpgehaald,
    vul_documentregels: docDocumenten,
    vul_gunningen_met_partij: gunMetPartij,
    vul_fouten: fouten,
  };
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

  const start = Date.now();
  let maxDetails = 300;
  let maxDocumenten = 150;
  let maxGunningen = 60;
  let vulModus = false;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.maxDetails)) maxDetails = Math.max(0, Math.min(1000, Number(body.maxDetails)));
    if (Number.isFinite(body?.maxDocumenten)) maxDocumenten = Math.max(0, Math.min(400, Number(body.maxDocumenten)));
    if (Number.isFinite(body?.maxGunningen)) maxGunningen = Math.max(0, Math.min(200, Number(body.maxGunningen)));
    vulModus = body?.modus === 'vul';
  } catch {
    // lege body is prima
  }

  const { data: run } = await db.from('aanbestedingen_verversingen').insert({}).select('id').single();
  const runId = run?.id as number | undefined;
  const log = async (velden: Record<string, unknown>) => {
    if (runId) await db.from('aanbestedingen_verversingen').update(velden).eq('id', runId);
  };

  try {
    if (vulModus) {
      const vul = await vulDocumentenEnGunningen(db, start, maxDocumenten, maxGunningen);
      const resultaat = {
        klaar: new Date().toISOString(),
        gelukt: true,
        documenten_opgehaald: vul.documenten_opgehaald,
        documenten_open: vul.documenten_open,
        gunningen_opgehaald: vul.gunningen_opgehaald,
        gunningen_open: vul.gunningen_open,
        melding: `Vulrun: ${vul.vul_documentregels} documentregels, ${vul.vul_gunningen_met_partij} gunningen met partij${vul.vul_fouten ? `, ${vul.vul_fouten} fouten (volgende run opnieuw)` : ''}`,
      };
      await log(resultaat);
      return json({ ...resultaat, ...vul });
    }

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
      rijen.push({ ...bouwAanbesteding(ps, detail, GEMEENTE_PROVINCIE), cpv_details: detail?.cpv ?? [], bron_opgehaald: nu });
    }
    for (let i = 0; i < rijen.length; i += 250) {
      const { error } = await db.from('aanbestedingen').upsert(rijen.slice(i, i + 250), { onConflict: 'kenmerk' });
      if (error) throw error;
    }

    // 5. Documenten en gunningen aanvullen (begrensd en hervatbaar). Een fout hier laat de verversing zelf niet mislukken.
    let vul: Awaited<ReturnType<typeof vulDocumentenEnGunningen>> | null = null;
    let vulMelding: string | null = null;
    try {
      vul = await vulDocumentenEnGunningen(db, start, maxDocumenten, maxGunningen);
    } catch (e) {
      vulMelding = `Documenten en gunningen: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200);
    }

    const meldingen = [
      detailFouten ? `${detailFouten} detailpagina's niet opgehaald; volgende run opnieuw` : null,
      vul && vul.vul_fouten ? `${vul.vul_fouten} documenten of gunningen niet opgehaald; volgende run opnieuw` : null,
      vulMelding,
    ].filter(Boolean);
    const resultaat = {
      klaar: new Date().toISOString(),
      gelukt: true,
      publicaties: lijst.length,
      aanbestedingen: rijen.length,
      details_opgehaald: nuOphalen.length - detailFouten,
      details_open: teDoen.length - nuOphalen.length + detailFouten,
      documenten_opgehaald: vul?.documenten_opgehaald ?? null,
      documenten_open: vul?.documenten_open ?? null,
      gunningen_opgehaald: vul?.gunningen_opgehaald ?? null,
      gunningen_open: vul?.gunningen_open ?? null,
      melding: meldingen.length ? meldingen.join('; ') : null,
    };
    await log(resultaat);
    return json(resultaat);
  } catch (e) {
    const melding = e instanceof Error ? e.message : String(e);
    await log({ klaar: new Date().toISOString(), gelukt: false, melding: melding.slice(0, 500) });
    return json({ gelukt: false, melding }, 500);
  }
});
