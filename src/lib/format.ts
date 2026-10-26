// Nederlandse getalnotatie via Intl.NumberFormat('nl-NL').
// Voorbeelden: euro(1234.56, 2) → "€ 1.234,56", procent(12.5) → "12,5 %".

const cache = new Map<string, Intl.NumberFormat>();

function nf(opties: Intl.NumberFormatOptions): Intl.NumberFormat {
  const sleutel = JSON.stringify(opties);
  let f = cache.get(sleutel);
  if (!f) {
    f = new Intl.NumberFormat('nl-NL', opties);
    cache.set(sleutel, f);
  }
  return f;
}

/** Bedrag in euro's, standaard zonder decimalen. */
export function euro(waarde: number, decimalen = 0): string {
  if (!Number.isFinite(waarde)) return '–';
  return nf({ style: 'currency', currency: 'EUR', minimumFractionDigits: decimalen, maximumFractionDigits: decimalen }).format(waarde);
}

/** Getal met duizendtallen-punt en decimale komma. */
export function getal(waarde: number, decimalen = 0): string {
  if (!Number.isFinite(waarde)) return '–';
  return nf({ minimumFractionDigits: decimalen, maximumFractionDigits: decimalen }).format(waarde);
}

/** Percentage; verwacht een waarde van 0 tot 100. Met spatie voor het %-teken. */
export function procent(waarde: number, decimalen = 1): string {
  if (!Number.isFinite(waarde)) return '–';
  return `${getal(waarde, decimalen)} %`;
}

/** Getal met eenheid, bijvoorbeeld "12.500 ton". */
export function metEenheid(waarde: number, eenheid: string, decimalen = 0): string {
  return `${getal(waarde, decimalen)} ${eenheid}`;
}

const datumFormaat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
const datumKort = new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** ISO-datum (jjjj-mm-dd) als "12 oktober 2026". */
export function datum(iso: string): string {
  return datumFormaat.format(new Date(`${iso}T12:00:00`));
}

/** ISO-datum als "12-10-2026" (voor tabellen). */
export function datumKortNl(iso: string): string {
  return datumKort.format(new Date(`${iso}T12:00:00`));
}

/** Leest een getal dat de gebruiker met komma of punt heeft getypt. Geeft NaN als het geen getal is. */
export function leesGetal(tekst: string): number {
  const schoon = tekst.trim().replace(/\s/g, '');
  if (schoon === '') return NaN;
  // "1.234,5" → 1234.5 ; "1234,5" → 1234.5 ; "40.000" → 40000 (punt als duizendtal, zoals in het Nederlands) ;
  // "12.5" en "0.125" → decimaal, want dat zijn geen groepen van drie cijfers na een eerste groep van 1 tot 3 cijfers.
  const duizendtallen = /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(schoon);
  const genormaliseerd = schoon.includes(',') || duizendtallen ? schoon.replace(/\./g, '').replace(',', '.') : schoon;
  return /^-?\d*\.?\d+$/.test(genormaliseerd) ? Number(genormaliseerd) : NaN;
}

/** Toont een getal in een invoerveld met decimale komma, zonder duizendtallen-punt. */
export function toonInInvoer(waarde: number): string {
  return Number.isFinite(waarde) ? String(Math.round(waarde * 1e6) / 1e6).replace('.', ',') : '';
}
