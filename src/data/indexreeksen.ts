import type { Indexreeks } from './types';

// FICTIEF: drie verzonnen indexreeksen (2019 = 100). Geen CBS-cijfers.
// Vervang door echte reeksen met dezelfde vorm: { id, naam, waarden: { jaar: waarde } }.

export const indexreeksen: Indexreeks[] = [
  { id: 'loon', naam: 'Loonkosten', waarden: { 2019: 100, 2020: 102.5, 2021: 104.8, 2022: 107.9, 2023: 114.2, 2024: 120.1, 2025: 124.6, 2026: 128.3 } },
  { id: 'energie', naam: 'Energie', waarden: { 2019: 100, 2020: 92.4, 2021: 118.7, 2022: 171.3, 2023: 142.6, 2024: 131.2, 2025: 127.9, 2026: 125.4 } },
  { id: 'cpi', naam: 'Consumentenprijzen', waarden: { 2019: 100, 2020: 101.3, 2021: 104.0, 2022: 114.3, 2023: 118.6, 2024: 122.4, 2025: 126.0, 2026: 129.1 } },
];

/** Vaste weging in de gratis versie (fractie, samen 1). */
export const standaardWeging: Record<string, number> = { loon: 0.5, energie: 0.3, cpi: 0.2 };

export const indexJaren = Object.keys(indexreeksen[0].waarden).map(Number).sort((a, b) => a - b);
export const laatsteIndexjaar = indexJaren[indexJaren.length - 1];
