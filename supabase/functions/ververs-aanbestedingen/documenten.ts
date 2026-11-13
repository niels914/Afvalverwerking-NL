// Documentenlijst van een TenderNed-publicatie: alleen metadata (naam, soort, datum, grootte, link).
//
// Dit bestand heeft geen imports en draait in de Edge Function (Deno), de frontend en Vitest
// (src/lib/aanbestedingen.test.ts). Het platform kopieert geen documenten en geen documentinhoud van TenderNed:
// leden worden voor het document zelf doorgestuurd naar TenderNed.
//
// Bron: https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/{publicatieId}/documenten (zie docs/stukken/aanbestedingen.md).

export const TENDERNED_ORIGIN = 'https://www.tenderned.nl';

/** Eén document zoals de documentenlijst van TenderNed dat geeft (alleen de velden die we gebruiken). */
export interface TnsDocument {
  documentId?: string;
  documentNaam?: string;
  typeDocument?: { code?: string; omschrijving?: string };
  datumPublicatie?: string; // jjjj-mm-dd
  publicatieCategorie?: { code?: string; omschrijving?: string }; // ANK, DOC, NVI, MAC
  grootte?: number;
  links?: { download?: { href?: string } };
}

export const DOCUMENTSOORTEN = [
  { code: 'leidraad', label: 'Aanbestedingsleidraad of beschrijvend document' },
  { code: 'programma-van-eisen', label: 'Programma van eisen of bestek' },
  { code: 'overeenkomst', label: 'Conceptovereenkomst of contract' },
  { code: 'voorwaarden', label: 'Algemene (inkoop)voorwaarden' },
  { code: 'gunningscriteria', label: 'Gunningscriteria of beoordelingsmethodiek' },
  { code: 'nota-van-inlichtingen', label: 'Nota van inlichtingen' },
  { code: 'prijzenblad', label: 'Prijzenblad of inschrijfbiljet' },
  { code: 'uea', label: 'UEA of eigen verklaring' },
  { code: 'aankondiging', label: 'Aankondiging' },
  { code: 'marktconsultatie', label: 'Marktconsultatie' },
  { code: 'overig', label: 'Overige bijlage' },
] as const;

export type DocumentSoort = (typeof DOCUMENTSOORTEN)[number]['code'];

export const SOORT_LABEL: Record<string, string> = Object.fromEntries(DOCUMENTSOORTEN.map((s) => [s.code, s.label]));
export const SOORT_CODES: string[] = DOCUMENTSOORTEN.map((s) => s.code);

/**
 * Soort document, afgeleid van de bestandsnaam en de categorie die TenderNed meegeeft. Dit is een indeling van dit
 * platform, geen oordeel van TenderNed of de opdrachtgever; wat niet herkend wordt heet "overig".
 * De volgorde van de regels telt: de eerste die past wint.
 */
export function soortDocument(naam: string | undefined | null, categorie?: string | null): DocumentSoort {
  const n = (naam ?? '')
    .toLowerCase()
    .replace(/[_\u2010-\u2015]+/g, ' ')
    .replace(/\.(pdf|docx?|xlsx?|zip|odt|ods|pptx?)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cat = (categorie ?? '').toUpperCase();
  if (cat === 'NVI' || /nota van inlichtingen|\bnvi\b|vragen en antwoorden|vraag en antwoord|\bq ?& ?a\b/.test(n)) return 'nota-van-inlichtingen';
  if (/\buea\b|uniform europees aanbestedingsdocument|\bespd\b|eigen verklaring/.test(n)) return 'uea';
  if (/prijzenblad|prijsblad|inschrijfbiljet|inschrijfstaat|prijsformulier|prijslijst|tarievenblad|inschrijfformulier|prijsopgave|kostenblad|prijzenbijlage|prijsinvul|inschrijfsjabloon/.test(n)) return 'prijzenblad';
  if (/gunningscriteri|beoordelingsmethodiek|beoordelingskader|beoordelingscriteri|wegingsmodel|scoringsmethodiek|scoringsmodel|\bemvi\b|subgunningscriteri|scorekaart/.test(n)) return 'gunningscriteria';
  if (/algemene (inkoop|leverings)?voorwaarden|inkoopvoorwaarden|\bais\b|\bavv\b|\barvodi\b|\bawvodi\b|\buav\b/.test(n)) return 'voorwaarden';
  if (/overeenkomst|\bovk\b|contract|\bsla\b|raamop?vereenkomst|dienstverleningsovereenkomst|koopovereenkomst|verwerkersovereenkomst/.test(n)) return 'overeenkomst';
  if (/programma van eisen|\bpve\b|\bpvb\b|bestek|eisenspecificatie|eisendocument|eisenpakket|functioneel(e)? (eisen|specificati)|technische (specificati|eisen)|specificatie van de opdracht|beschrijving van de opdracht/.test(n)) return 'programma-van-eisen';
  if (/leidraad|beschrijvend document|aanbestedingsdocument|aanbestedingsdocumentatie|inschrijvingsleidraad|selectieleidraad|aanbestedingsvoorwaarden|aanbestedingsreglement|offerteaanvraag|opdrachtomschrijving|inschrijfinstructie/.test(n)) return 'leidraad';
  if (cat === 'MAC' || /marktconsultatie|marktverkenning/.test(n)) return 'marktconsultatie';
  if (cat === 'ANK' || /^tn ?\d+ - |aankondiging|vooraankondiging|rectificatie/.test(n)) return 'aankondiging';
  return 'overig';
}

/** Een rij voor public.aanbesteding_documenten. */
export interface DocumentRij {
  kenmerk: number;
  publicatie_id: number;
  document_id: string;
  naam: string;
  soort: DocumentSoort;
  bestandstype: string | null;
  categorie: string | null;
  datum: string | null;
  grootte: number | null;
  url: string;
}

const datumAlleen = /^\d{4}-\d{2}-\d{2}/;

/**
 * Zet de documentenlijst van een publicatie om naar rijen. Alleen documenten met een naam en een downloadlink op
 * TenderNed zelf; de link verwijst naar TenderNed, het bestand wordt niet gekopieerd.
 */
export function vatDocumentenSamen(kenmerk: number, publicatieId: number, antwoord: unknown): DocumentRij[] {
  const lijst = (antwoord as { documenten?: TnsDocument[] } | null)?.documenten;
  if (!Array.isArray(lijst)) return [];
  const uit: DocumentRij[] = [];
  const gezien = new Set<string>();
  for (const d of lijst) {
    const href = d?.links?.download?.href;
    const naam = (d?.documentNaam ?? '').replace(/\s+/g, ' ').trim();
    if (!d?.documentId || !naam || !href || !href.startsWith('/papi/tenderned-rs-tns/')) continue;
    if (gezien.has(d.documentId)) continue;
    gezien.add(d.documentId);
    uit.push({
      kenmerk,
      publicatie_id: publicatieId,
      document_id: d.documentId,
      naam: naam.slice(0, 300),
      soort: soortDocument(naam, d.publicatieCategorie?.code),
      bestandstype: d.typeDocument?.code ? d.typeDocument.code.toLowerCase().slice(0, 12) : null,
      categorie: d.publicatieCategorie?.code ?? null,
      datum: d.datumPublicatie && datumAlleen.test(d.datumPublicatie) ? d.datumPublicatie.slice(0, 10) : null,
      grootte: typeof d.grootte === 'number' && d.grootte >= 0 ? Math.round(d.grootte) : null,
      url: `${TENDERNED_ORIGIN}${href}`,
    });
  }
  return uit;
}

/** Soorten die in een lijst voorkomen, in vaste volgorde (voor het filter en de samenvatting). */
export function soortenIn(rijen: { soort: string }[]): DocumentSoort[] {
  const aanwezig = new Set(rijen.map((r) => r.soort));
  return DOCUMENTSOORTEN.map((s) => s.code).filter((c) => aanwezig.has(c));
}
