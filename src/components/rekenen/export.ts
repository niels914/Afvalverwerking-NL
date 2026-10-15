// Hulpfuncties voor export en delen van rekentools (puur, zonder DOM, behalve downloadBestand).

export type CsvCel = string | number | null | undefined;

/** Getal voor CSV in Nederlandse notatie: decimale komma, geen duizendtallen-punt, max. 6 decimalen. */
export function csvGetal(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 1e6) / 1e6).replace('.', ',');
}

function csvCel(c: CsvCel): string {
  if (c === null || c === undefined) return '';
  const tekst = typeof c === 'number' ? csvGetal(c) : c;
  return /[";\n\r]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

/**
 * CSV met puntkomma als scheidingsteken, zoals Excel in het Nederlands verwacht.
 * Regels worden gescheiden door CRLF.
 */
export function naarCsv(rijen: CsvCel[][]): string {
  return rijen.map((r) => r.map(csvCel).join(';')).join('\r\n');
}

/** Bestandsnaam zonder rare tekens: "Indexcalculator 2026" → "indexcalculator-2026". */
export function veiligeBestandsnaam(naam: string): string {
  return (
    naam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export'
  );
}

/** Downloadt tekst als bestand. CSV krijgt een BOM, zodat Excel de tekens goed leest. */
export function downloadBestand(naam: string, inhoud: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' : '', inhoud], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Volledige deellink: huidige origin + pad + parameters. */
export function deelUrl(origin: string, pad: string, params: URLSearchParams): string {
  const q = params.toString();
  return `${origin}${pad}${q ? `?${q}` : ''}`;
}
