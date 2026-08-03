import type { Dossier } from '../types';

/**
 * Cosa ha scritto la squadra, da dare al tutor insieme ai dati calcolati.
 *
 * Senza questo il tutor era cieco proprio dove conta di più: una squadra
 * scriveva il project work, poi chiedeva "che ne pensi di quello che abbiamo
 * scritto?" e il tutor rispondeva in astratto, perché nel contesto c'erano solo
 * i numeri dell'allineamento e i metadati della proteina.
 *
 * Include, in ordine di importanza per il tutor:
 *  - la domanda che si è data la squadra (se se n'è data una);
 *  - quello che stanno scrivendo PROPRIO ORA (bozza non ancora salvata);
 *  - quello che hanno già salvato nel dossier per questa indagine.
 */
export function teamWritingContext(
  dossier: Dossier,
  caseId?: string | null,
  draft?: string,
): string {
  const righe: string[] = [];

  const domanda = dossier.entries.find((e) => e.kind === 'domanda');
  if (domanda?.body?.trim()) {
    righe.push(`La domanda che si è data la squadra: "${domanda.body.trim()}"`);
  }

  if (draft?.trim()) {
    righe.push(
      `STANNO SCRIVENDO PROPRIO ORA (bozza, non ancora salvata): "${draft.trim().slice(0, 1200)}"`,
    );
  }

  // Solo le voci scritte da loro, di questa indagine: le righe generate
  // automaticamente dai pulsanti non aggiungono nulla che il tutor non sappia.
  const loro = dossier.entries
    .filter((e) => e.kind !== 'domanda')
    .filter((e) => !caseId || !e.caseId || e.caseId === caseId)
    .filter((e) => /project work|conclusione|scoperta/i.test(e.title))
    .slice(-4);
  for (const e of loro) {
    righe.push(`Hanno già scritto — ${e.title}: "${(e.body ?? '').slice(0, 800)}"`);
  }

  if (righe.length === 0) return '';
  return [
    'COSA HA SCRITTO LA SQUADRA (parti da qui: commenta le LORO parole, non',
    'ripartire da zero; se ti chiedono un parere è a questo che si riferiscono):',
    ...righe.map((r) => `- ${r}`),
  ].join('\n');
}
