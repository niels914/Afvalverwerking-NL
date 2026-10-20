#!/usr/bin/env node
// Haalt actuele berichten over afval en circulaire economie op uit openbare RSS-feeds en schrijft
// titel, datum, bron, link en een korte inleiding (hooguit 220 tekens, zoals de feed die zelf geeft)
// naar src/data/nieuws.json. Volledige artikelen worden niet overgenomen.
//
// Draait vóór elke build (zie "build" in package.json) en kan ook los:  node scripts/nieuws.mjs
//
// Als een feed niet bereikbaar is, blijven de eerder opgeslagen berichten van die bron staan en
// krijgt de bron de status "mislukt". Het script stopt de build nooit: bij elke fout eindigt het met
// exitcode 0, zodat de site met de laatst opgeslagen versie wordt gebouwd.

import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const SCRIPT = fileURLToPath(import.meta.url);
const UIT = join(dirname(SCRIPT), '..', 'src', 'data', 'nieuws.json');
const MAX_BERICHTEN = 80;
const MAX_LEEFTIJD_JAREN = 3;
const MAX_INLEIDING = 220;

// Achter een proxy (zoals in de ontwikkelomgeving) gebruikt Node de proxy alleen met NODE_USE_ENV_PROXY=1.
// Dan start het script zichzelf opnieuw met die variabele. Op Netlify is er geen proxy en gebeurt dit niet.
const IS_SCRIPT = Boolean(process.argv[1]) && SCRIPT === process.argv[1];
if (IS_SCRIPT && (process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ['--no-warnings', SCRIPT, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  });
  process.exit(r.status ?? 0);
}

const rijksoverheid = (filters, zoekterm = '') =>
  `https://www.rijksoverheid.nl/api/rss?query=${encodeURIComponent(
    JSON.stringify({ filters, resultSearchTerm: zoekterm, pageTitle: 'Nieuws' }),
  )}`;
const alleenNieuws = { field: 'information_type', values: ['Nieuwsbericht'], type: 'all' };

/** Onderwerpfilter op titel en inleiding. "afvalwater" valt erbuiten. */
const RELEVANT =
  /(?<!rioolw)afval(?!water)|recycl|circulai|grondstof|verpakking|statiegeld|zwerfafval|textiel|kunststof|plastic|verbrand|gft|pmd|luier|hergebruik|storten|bodemas/i;

/**
 * Bronnen. `filter` bepaalt hoe streng het onderwerpfilter is:
 * - false: de feed gaat al alleen over afval (onderwerp "Afval" van Rijksoverheid);
 * - 'titel': een trefwoord moet in de titel staan (brede zoekfeeds en CBS);
 * - 'tekst': een trefwoord in titel of inleiding is genoeg (PIANOo).
 * Wijzig of voeg bronnen toe; de UI leest naam en site uit nieuws.json.
 */
const BRONNEN = [
  {
    id: 'rijksoverheid-afval',
    naam: 'Rijksoverheid',
    site: 'https://www.rijksoverheid.nl/themas/klimaat-milieu-en-natuur/afval',
    feed: rijksoverheid([{ field: 'topic', values: ['Afval'], type: 'all' }, alleenNieuws]),
    filter: false,
  },
  {
    id: 'rijksoverheid-circulair',
    naam: 'Rijksoverheid',
    site: 'https://www.rijksoverheid.nl/actueel/nieuws',
    feed: rijksoverheid([alleenNieuws], 'circulaire economie'),
    filter: 'titel',
  },
  {
    id: 'rijksoverheid-recycling',
    naam: 'Rijksoverheid',
    site: 'https://www.rijksoverheid.nl/actueel/nieuws',
    feed: rijksoverheid([alleenNieuws], 'recycling'),
    filter: 'titel',
  },
  { id: 'pianoo-nieuws', naam: 'PIANOo', site: 'https://www.pianoo.nl/nl/actueel/nieuws', feed: 'https://www.pianoo.nl/nl/rss/nieuws.rss', filter: 'tekst' },
  {
    id: 'pianoo-jurisprudentie',
    naam: 'PIANOo',
    site: 'https://www.pianoo.nl/nl/jurisprudentie',
    feed: 'https://www.pianoo.nl/nl/rss/jurisprudentie.rss',
    filter: 'tekst',
  },
  { id: 'cbs', naam: 'CBS', site: 'https://www.cbs.nl/nl-nl/nieuws', feed: 'https://www.cbs.nl/nl-nl/rss-feeds/alle-nieuwsberichten', filter: 'titel' },
];

/** Thema's voor het filter op de nieuwspagina; eerste treffer wint. */
const THEMAS = [
  ['Aanbesteden', /aanbested|inkoop|inkopen|uitspraak|jurisprudentie/i],
  ['Verbranding en heffingen', /verbrand|afvalstoffenbelasting|co2-heffing|heffing|storten|bodemas/i],
  ['Verpakkingen en statiegeld', /statiegeld|verpakking|plastic|kunststof|wegwerp|pmd|blik/i],
  ['Textiel', /textiel|kleding|schoenen/i],
  ['Circulaire economie', /circulai|grondstof|hergebruik|recycl/i],
];

const MAANDEN = {
  jan: 1, feb: 2, mar: 3, mrt: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12,
};

/** "Fri, 04 Sep 2026 10:45:00 GMT" of "vr, 16 okt 2026 11:41:36 +0200" → "2026-09-04". */
export function leesDatum(tekst) {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(tekst ?? '');
  if (!m) {
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(tekst ?? '');
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  const maand = MAANDEN[m[2].toLowerCase()];
  if (!maand) return null;
  return `${m[3]}-${String(maand).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function decodeer(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, '’')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function veld(item, naam) {
  const m = new RegExp(`<${naam}[^>]*>([\\s\\S]*?)</${naam}>`, 'i').exec(item);
  return m ? decodeer(m[1]) : '';
}

function inkorten(tekst) {
  const zonderPuntjes = tekst.replace(/(\.\.\.|…)\s*$/, '').trim();
  if (zonderPuntjes.length <= MAX_INLEIDING) return zonderPuntjes + (zonderPuntjes === tekst ? '' : ' …');
  const kort = zonderPuntjes.slice(0, MAX_INLEIDING);
  return `${kort.slice(0, kort.lastIndexOf(' '))} …`;
}

export function leesFeed(xml, bron) {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const titel = veld(item, 'title');
      const link = veld(item, 'link');
      const inleiding = inkorten(veld(item, 'description'));
      const datum = leesDatum(veld(item, 'pubDate') || veld(item, 'dc:date'));
      return { titel, link, inleiding, datum };
    })
    .filter((b) => b.titel && b.link && b.datum && /^https?:\/\//.test(b.link))
    .filter((b) => !bron.filter || RELEVANT.test(bron.filter === 'titel' ? b.titel : `${b.titel} ${b.inleiding}`))
    .map((b) => ({
      id: createHash('sha1').update(b.link).digest('hex').slice(0, 12),
      ...b,
      bron: bron.naam,
      bronId: bron.id,
      thema: bron.id === 'cbs' ? 'Cijfers' : (THEMAS.find(([, re]) => re.test(`${b.titel} ${b.inleiding}`))?.[0] ?? 'Afval algemeen'),
    }));
}

async function haalFeed(bron) {
  const res = await fetch(bron.feed, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'Ledenplatform-Restafvalkaart nieuwsoverzicht (KplusV)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  if (!/<rss|<feed|<channel/i.test(xml)) throw new Error('geen RSS ontvangen');
  return leesFeed(xml, bron);
}

async function main() {
  let vorige = { bronnen: [], berichten: [] };
  try {
    vorige = JSON.parse(await readFile(UIT, 'utf8'));
  } catch {
    console.warn('Nog geen opgeslagen nieuws gevonden; begin met een lege lijst.');
  }
  const nu = new Date().toISOString().slice(0, 10);
  const resultaten = await Promise.allSettled(BRONNEN.map(haalFeed));

  const perLink = new Map(vorige.berichten.map((b) => [b.link, b]));
  const bronnen = BRONNEN.map((bron, i) => {
    const r = resultaten[i];
    const oud = vorige.bronnen.find((b) => b.id === bron.id);
    if (r.status === 'fulfilled') {
      for (const b of r.value) if (!perLink.has(b.link)) perLink.set(b.link, b);
      console.log(`${bron.id}: ${r.value.length} relevante berichten`);
      return { id: bron.id, naam: bron.naam, site: bron.site, feed: bron.feed, status: 'ok', laatstGelukt: nu, aantal: r.value.length };
    }
    console.warn(`${bron.id}: mislukt (${r.reason?.message ?? r.reason}); laatst opgeslagen berichten blijven staan.`);
    return {
      id: bron.id,
      naam: bron.naam,
      site: bron.site,
      feed: bron.feed,
      status: 'mislukt',
      laatstGelukt: oud?.laatstGelukt ?? null,
      aantal: oud?.aantal ?? 0,
    };
  });

  const grens = new Date();
  grens.setFullYear(grens.getFullYear() - MAX_LEEFTIJD_JAREN);
  const grensIso = grens.toISOString().slice(0, 10);
  const berichten = [...perLink.values()]
    .filter((b) => b.datum >= grensIso && b.datum <= nu)
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.titel.localeCompare(b.titel))
    .slice(0, MAX_BERICHTEN);

  const gelukt = bronnen.some((b) => b.status === 'ok');
  const uitvoer = {
    bijgewerkt: gelukt ? nu : (vorige.bijgewerkt ?? null),
    gecontroleerd: nu,
    filter: RELEVANT.source,
    bronnen,
    berichten,
  };
  await writeFile(UIT, `${JSON.stringify(uitvoer, null, 2)}\n`);
  console.log(`${berichten.length} berichten opgeslagen in ${UIT}${gelukt ? '' : ' (alle bronnen mislukt: vorige versie behouden)'}`);
}

// Alleen uitvoeren als script, niet bij importeren in een test.
if (IS_SCRIPT) {
  main().catch((fout) => {
    console.error(`Nieuws ophalen mislukt: ${fout.message}. De build gaat door met de opgeslagen versie.`);
    process.exit(0);
  });
}
