import type { Dossier } from '../types';

/**
 * Quali attività del percorso la squadra ha DAVVERO svolto.
 *
 * Prima le spunte erano tutte manuali: un lavoro in più per l'host, e soprattutto
 * un dato che non diceva la verità (si poteva spuntare tutto senza fare nulla, o
 * fare tutto senza spuntare niente). Qui invece ogni attività dichiara la PROVA
 * che la dimostra: una voce nel dossier, un quiz superato, un esercizio risolto.
 *
 * Restano manuali soltanto le attività che avvengono fuori dallo schermo — la
 * presentazione alla giuria, le sfide fatte a voce — perché su quelle l'app non
 * ha, e non può avere, alcuna prova.
 */

export interface Prove {
  dossier: Dossier;
  progress: {
    quizPassed: string[];
    challengesDone: string[];
    unitsDone: string[];
    pagesVisited: string[];
    eserciziRisolti: string[];
    mutazioniOttenute: string[];
    dossierEsportato: boolean;
  };
}

type Test = (p: Prove) => boolean;

// ── piccoli aiuti per leggere le prove ────────────────────────────────────
const voce =
  (kind: string): Test =>
  ({ dossier }) =>
    dossier.entries.some((e) => e.kind === kind);

/** Una voce nata da un project work (la squadra ha scritto qualcosa di suo). */
const projectWork =
  (kind: string): Test =>
  ({ dossier }) =>
    dossier.entries.some((e) => e.kind === kind && /project work/i.test(e.title ?? ''));

const quiz =
  (id: string): Test =>
  ({ progress }) =>
    progress.quizPassed.includes(id);

const visitata =
  (page: string): Test =>
  ({ progress }) =>
    progress.pagesVisited.includes(page);

const esercizio =
  (id: string): Test =>
  ({ progress }) =>
    progress.eserciziRisolti.includes(id);

/** Quante indagini diverse la squadra ha aperto (escluso il Giorno 0). */
function casiDiversi({ dossier }: Prove): number {
  const ids = new Set(
    dossier.entries
      .map((e) => e.caseId)
      .filter((c): c is string => !!c && c !== 'giorno0'),
  );
  return ids.size;
}
const almenoCasi =
  (n: number): Test =>
  (p) =>
    casiDiversi(p) >= n;

const oppure =
  (...tests: Test[]): Test =>
  (p) =>
    tests.some((t) => t(p));

/**
 * La prova di ogni attività. Chi manca da questa tabella resta manuale:
 * è il caso di ciò che succede lontano dallo schermo.
 */
const PROVE: Record<string, Test> = {
  // ── Giorno 1 · fondamenti ──
  'd1-m1': ({ dossier }) => !!dossier.team?.trim(),
  'd1-m0': ({ dossier }) => dossier.entries.some((e) => e.caseId === 'giorno0'),
  'd1-m2': visitata('programma'),
  'd1-p1': almenoCasi(1),
  'd1-p2': voce('proteina'),
  'd1-p3': visitata('teoria'),
  'd1-p4': quiz('basi'),
  'd1-out': ({ dossier }) => dossier.entries.length > 0,

  // ── Giorno 2 · proteina 3D ──
  'd2-m1': almenoCasi(2),
  'd2-m2': voce('proteina'),
  'd2-p1': esercizio('proteina-percentuale'),
  'd2-p2': projectWork('proteina'),
  'd2-out': voce('proteina'),

  // ── Giorno 3 · confronto ──
  'd3-m1': voce('confronto'),
  'd3-m2': voce('confronto'),
  'd3-p1': almenoCasi(2),
  'd3-p2': projectWork('confronto'),
  'd3-out': projectWork('confronto'),

  // ── Giorno 4 · leggere il DNA ──
  'd4-m1': voce('dna'),
  'd4-m2': voce('dna'),
  'd4-p1': esercizio('dna-regola-del-tre'),
  'd4-p2': projectWork('dna'),
  'd4-out': voce('dna'),

  // ── Giorno 5 · mutazioni ──
  'd5-m1': ({ progress }) =>
    progress.mutazioniOttenute.some((m) => ['silente', 'missenso', 'nonsenso'].includes(m)),
  'd5-m2': ({ progress }) =>
    progress.mutazioniOttenute.some((m) => ['frameshift', 'inframe-indel'].includes(m)),
  'd5-p1': ({ progress }) => progress.challengesDone.length > 0,
  'd5-p2': quiz('mutazioni'),
  'd5-out': ({ dossier }) =>
    dossier.entries.some((e) => /mutazione/i.test(e.title ?? '')),

  // ── Giorno 6 · indagine completa I ──
  'd6-m1': almenoCasi(3),
  'd6-m2': ({ dossier }) => {
    // I tre gesti sullo STESSO caso: 3D, confronto e lettura.
    const perCaso = new Map<string, Set<string>>();
    for (const e of dossier.entries) {
      if (!e.caseId || e.caseId === 'giorno0') continue;
      if (!perCaso.has(e.caseId)) perCaso.set(e.caseId, new Set());
      perCaso.get(e.caseId)!.add(e.kind);
    }
    return [...perCaso.values()].some(
      (k) => k.has('proteina') && k.has('confronto') && k.has('dna'),
    );
  },
  'd6-p1': ({ dossier }) => dossier.entries.length >= 4,
  'd6-p2': voce('conclusione'),
  'd6-out': ({ dossier }) => dossier.entries.length >= 5,

  // ── Giorno 7 · indagine completa II ──
  'd7-m1': almenoCasi(4),
  'd7-m2': almenoCasi(4),
  'd7-p1': voce('conclusione'),
  'd7-p2': quiz('metodo'),
  'd7-out': ({ dossier }) =>
    voce('conclusione')({ dossier } as Prove) && dossier.entries.length >= 6,

  // ── Giorno 8-9 · modalità libera ──
  'd8-m1': ({ dossier }) => !!dossier.caseId?.startsWith('custom_'),
  'd8-m2': ({ dossier }) => !!dossier.caseId?.startsWith('custom_'),
  'd8-p1': ({ dossier }) =>
    dossier.entries.some((e) => e.kind === 'proteina' && e.caseId?.startsWith('custom_')),
  'd8-p2': ({ dossier }) => dossier.entries.some((e) => e.caseId?.startsWith('custom_')),
  'd8-out': ({ dossier }) =>
    dossier.entries.filter((e) => e.caseId?.startsWith('custom_')).length >= 2,
  'd9-m1': ({ dossier }) =>
    dossier.entries.some((e) => e.kind === 'proteina' && e.caseId?.startsWith('custom_')),
  'd9-m2': ({ dossier }) =>
    dossier.entries.some((e) => e.caseId?.startsWith('custom_') && /project work/i.test(e.title ?? '')),
  'd9-p1': ({ dossier }) =>
    dossier.entries.filter((e) => e.caseId?.startsWith('custom_')).length >= 3,
  'd9-p2': ({ dossier }) =>
    dossier.entries.some((e) => e.kind === 'conclusione' && e.caseId?.startsWith('custom_')),
  'd9-out': ({ dossier }) =>
    dossier.entries.some((e) => e.kind === 'conclusione' && e.caseId?.startsWith('custom_')),

  // ── Giorno 10 · giuria ──
  'd10-m1': ({ progress }) => progress.dossierEsportato,
  'd10-m2': oppure(visitata('valutazione'), quiz('metodo')),
  'd10-p1': visitata('valutazione'),
  // d10-p2 (presentazione) e d10-out restano manuali: avvengono in sala.
};

/** Le attività che l'app non può dimostrare: restano da spuntare a mano. */
export const SOLO_MANUALI = new Set(['d10-p2', 'd10-out']);

/** L'app può dimostrare da sola questa attività? */
export function automatica(id: string): boolean {
  return id in PROVE;
}

/** L'attività risulta svolta: per prova, oppure spuntata a mano. */
export function completata(id: string, prove: Prove): boolean {
  if (prove.progress.unitsDone.includes(id)) return true;
  const test = PROVE[id];
  return test ? test(prove) : false;
}

/** Tutte le attività risultanti svolte, fra un elenco dato. */
export function completate(ids: string[], prove: Prove): Set<string> {
  return new Set(ids.filter((id) => completata(id, prove)));
}
