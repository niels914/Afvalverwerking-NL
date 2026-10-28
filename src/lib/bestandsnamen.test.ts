import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Windows en macOS zien geen verschil tussen hoofd- en kleine letters. Twee bestanden die alleen daarin verschillen
// (bijvoorbeeld Export.tsx en export.ts) laten imports daar naar het verkeerde bestand wijzen.
function botsingen(map: string): string[] {
  const gevonden: string[] = [];
  const perNaam = new Map<string, Set<string>>();
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      gevonden.push(...botsingen(pad));
      continue;
    }
    const stam = naam.split('.')[0];
    const sleutel = stam.toLowerCase();
    perNaam.set(sleutel, (perNaam.get(sleutel) ?? new Set()).add(stam));
  }
  for (const stammen of perNaam.values()) if (stammen.size > 1) gevonden.push(`${map}: ${[...stammen].join(', ')}`);
  return gevonden;
}

describe('bestandsnamen', () => {
  it('verschillen niet alleen in hoofdletters', () => {
    expect(botsingen('src')).toEqual([]);
  });
});
