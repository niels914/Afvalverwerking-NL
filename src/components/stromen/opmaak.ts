import { getal } from '../../lib/format';

/** Kilo per inwoner: één decimaal onder 10 kg, anders hele kilo's (zoals CBS afrondt). */
export const kgTekst = (w: number) => getal(w, w < 10 && w !== Math.round(w) ? 1 : 0);
