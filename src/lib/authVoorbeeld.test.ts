import { describe, expect, it } from 'vitest';
import { archiefVoorbeeld, vandaagInNederland, voorbeeldStand } from './authVoorbeeld';

describe('voorbeeld op de inlogpagina', () => {
  it('heeft een peildatum en een bron', () => {
    expect(archiefVoorbeeld.peildatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(archiefVoorbeeld.bron.url).toMatch(/^https:\/\/www\.tenderned\.nl\//);
  });

  it('elke regel linkt naar de eigen aankondiging op TenderNed en sloot na de peildatum', () => {
    expect(archiefVoorbeeld.regels.length).toBeGreaterThan(0);
    for (const r of archiefVoorbeeld.regels) {
      expect(r.tenderned_url).toMatch(/^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/);
      expect(r.sluitingsdatum).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(r.publicatiedatum <= archiefVoorbeeld.peildatum).toBe(true);
      expect(voorbeeldStand(r.sluitingsdatum, archiefVoorbeeld.peildatum)).toBe('open');
    }
  });

  it('telling is consistent', () => {
    expect(archiefVoorbeeld.telling.open).toBeLessThanOrEqual(archiefVoorbeeld.telling.totaal);
  });

  it('zegt na de sluitingsdatum niet meer open', () => {
    expect(voorbeeldStand('2026-12-07T11:00', '2026-12-07')).toBe('open');
    expect(voorbeeldStand('2026-12-07T11:00', '2026-12-08')).toBe('gesloten');
  });

  it('vandaag in Nederlandse tijd', () => {
    // 23:30 UTC op 31 december is in Nederland al 1 januari.
    expect(vandaagInNederland(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});
