import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bronnen, documenten, opslag, supabaseGebruik, supabaseProject } from './gegevens';

// Bewaakt dat de cookieverklaring en de privacyverklaring de code volgen.
// Faalt een test hieronder, werk dan `opslag` of `supabaseGebruik` in gegevens.ts bij,
// pas de verklaring aan en verhoog het versienummer van het document.

const projectmap = join(__dirname, '..', '..', '..');
const srcmap = join(projectmap, 'src');

function bestanden(map: string): string[] {
  return readdirSync(map).flatMap((naam) => {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) return bestanden(pad);
    return /\.(ts|tsx)$/.test(naam) && !/\.test\.tsx?$/.test(naam) ? [pad] : [];
  });
}

/** Haalt commentaar weg, zodat uitleg over localStorage in commentaar niet meetelt. */
function zonderCommentaar(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const code = bestanden(srcmap)
  .filter((p) => !p.includes(join('src', 'pages', 'juridisch')))
  .map((p) => ({ pad: relative(projectmap, p).split('\\').join('/'), tekst: zonderCommentaar(readFileSync(p, 'utf8')) }));

describe('browseropslag in de cookieverklaring', () => {
  it('elk bestand dat browseropslag of cookies gebruikt, staat bij een sleutel in de verklaring', () => {
    const gebruikers = code
      .filter((b) => /\b(localStorage|sessionStorage)\s*[.[]|document\.cookie|\bindexedDB\s*\./.test(b.tekst))
      .map((b) => b.pad);
    const bekend = new Set(opslag.flatMap((o) => o.codebestanden));
    const onbekend = gebruikers.filter((p) => !bekend.has(p));
    expect(onbekend, 'Nieuwe browseropslag gevonden: beschrijf die in opslag (gegevens.ts)').toEqual([]);
  });

  it('elke sleutel met voorvoegsel afvalplatform- in de code staat in de verklaring', () => {
    const inCode = new Set(code.flatMap((b) => [...b.tekst.matchAll(/['"`](afvalplatform-[a-z0-9-]+)['"`]/g)].map((m) => m[1])));
    const beschreven = new Set(opslag.map((o) => o.sleutel));
    expect([...inCode].filter((s) => !beschreven.has(s))).toEqual([]);
  });

  it('de verklaring noemt geen sleutels die de code niet meer gebruikt', () => {
    const alleCode = code.map((b) => b.tekst).join('\n');
    const verouderd = opslag
      .filter((o) => o.sleutel.startsWith('afvalplatform-'))
      .filter((o) => !alleCode.includes(`'${o.sleutel}'`) && !alleCode.includes(`"${o.sleutel}"`));
    expect(verouderd.map((o) => o.sleutel)).toEqual([]);
  });

  it('de sessiesleutel van Supabase klopt met de client-instellingen', () => {
    const client = code.find((b) => b.pad === 'src/lib/supabase.ts');
    expect(client, 'src/lib/supabase.ts niet gevonden').toBeDefined();
    const tekst = client!.tekst;
    const eigenSleutel = tekst.match(/storageKey\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
    const ref = tekst.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    expect(ref).toBe(supabaseProject.ref);
    const persist = !/persistSession\s*:\s*false/.test(tekst);
    const sleutel = eigenSleutel ?? `sb-${ref}-auth-token`;
    expect(opslag.some((o) => o.sleutel === sleutel)).toBe(persist);
    expect(tekst, 'PKCE-flow zet een extra sleutel (code-verifier): voeg die toe aan opslag').not.toMatch(/flowType\s*:\s*['"`]pkce/);
  });

  it('de codebestanden in de verklaring bestaan', () => {
    const paden = new Set(code.map((b) => b.pad));
    const ontbrekend = opslag.flatMap((o) => o.codebestanden).filter((p) => !paden.has(p));
    expect(ontbrekend).toEqual([]);
  });
});

describe('databasegebruik in de privacyverklaring', () => {
  it('elke tabel en functie die de site aanroept, staat in de verklaring en andersom', () => {
    const alleCode = code.map((b) => b.tekst).join('\n');
    const inCode = new Set([...alleCode.matchAll(/\.(?:rpc|from)\(\s*['"`]([a-z0-9_]+)['"`]/g)].map((m) => m[1]));
    const beschreven = new Set(supabaseGebruik.map((s) => s.naam));
    expect([...inCode].filter((n) => !beschreven.has(n)), 'Nieuw databasegebruik: beschrijf het in supabaseGebruik').toEqual([]);
    expect([...beschreven].filter((n) => !inCode.has(n)), 'Verouderd in supabaseGebruik').toEqual([]);
  });
});

describe('documenten en bronnen', () => {
  it('elk document heeft een versie en een geldige datum', () => {
    for (const d of Object.values(documenten)) {
      expect(d.versie).toMatch(/^\d+\.\d+$/);
      expect(Number.isNaN(Date.parse(d.gewijzigd))).toBe(false);
      expect(d.gewijzigd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('elke bron heeft een https-adres en een peildatum', () => {
    for (const [sleutel, b] of Object.entries(bronnen)) {
      expect(b.url, sleutel).toMatch(/^https:\/\//);
      expect(b.peildatum, sleutel).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
