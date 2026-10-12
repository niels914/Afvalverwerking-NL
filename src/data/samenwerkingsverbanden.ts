import type { Samenwerkingsverband } from './types';

// FICTIEF: twaalf verzonnen samenwerkingsverbanden. Namen en ligging zijn bedacht
// en verwijzen niet naar bestaande organisaties.

export const samenwerkingsverbanden: Samenwerkingsverband[] = [
  { id: 'regio-noord', naam: 'Afvalsamenwerking Regio Noord', regio: 'Noord', centrum: [53.2, 6.62] },
  { id: 'veenstreek', naam: 'Afvalsamenwerking Veenstreek', regio: 'Noord', centrum: [52.86, 6.86] },
  { id: 'merengebied', naam: 'Reinigingsbedrijf Merengebied', regio: 'Noord', centrum: [53.02, 5.76] },
  { id: 'oostgrens', naam: 'Milieusamenwerking Oostgrens', regio: 'Oost', centrum: [52.27, 6.82] },
  { id: 'polderland', naam: 'Grondstoffendienst Polderland', regio: 'Midden', centrum: [52.52, 5.55] },
  { id: 'rivierenland', naam: 'Reinigingsdienst Rivierenland', regio: 'Midden', centrum: [51.88, 5.36] },
  { id: 'kustzone', naam: 'Grondstoffenbedrijf Kustzone', regio: 'West', centrum: [52.4, 4.66] },
  { id: 'groene-hart-west', naam: 'Milieudienst Groene Hart-West', regio: 'West', centrum: [52.05, 4.74] },
  { id: 'deltagemeenten', naam: 'Inzamelcoöperatie Deltagemeenten', regio: 'Zuid', centrum: [51.5, 3.86] },
  { id: 'zandgronden', naam: 'Afvalregio Zandgronden', regio: 'Zuid', centrum: [51.52, 5.2] },
  { id: 'maasvallei', naam: 'Afvalsamenwerking Maasvallei', regio: 'Zuid', centrum: [51.36, 6.1] },
  { id: 'heuvelland-zuid', naam: 'Afvalschap Heuvelland-Zuid', regio: 'Zuid', centrum: [50.88, 5.86] },
];
