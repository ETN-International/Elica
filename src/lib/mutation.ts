import { cleanDna, translate } from './dna';

/** Tipo di modifica che lo studente applica al DNA. */
export type MutationOp = 'sostituisci' | 'inserisci' | 'elimina';

/** Classificazione biologica dell'effetto di una mutazione. */
export type MutationCategory =
  | 'nessuna'
  | 'silente'
  | 'missenso'
  | 'nonsenso'
  | 'frameshift'
  | 'inframe-indel'
  /** Più mutazioni sovrapposte: l'effetto non è riconducibile a un tipo solo. */
  | 'multipla';

export interface MutationEffect {
  /** Proteina originale (codice a una lettera). */
  originalProtein: string;
  /** Proteina dopo la mutazione. */
  mutatedProtein: string;
  category: MutationCategory;
  /** Primo codone/amminoacido che cambia (1-based), se applicabile. */
  firstChangedCodon?: number;
  note: string;
}

const CYCLE = ['A', 'T', 'G', 'C'];

/** Applica una modifica puntuale alla sequenza e restituisce la nuova sequenza. */
export function applyMutation(
  dna: string,
  index: number,
  op: MutationOp,
): string {
  const seq = cleanDna(dna).replace(/-/g, '').split('');
  if (index < 0 || index >= seq.length) return seq.join('');
  switch (op) {
    case 'sostituisci': {
      const cur = seq[index];
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length] || 'A';
      seq[index] = next;
      return seq.join('');
    }
    case 'inserisci':
      seq.splice(index, 0, 'A');
      return seq.join('');
    case 'elimina':
      seq.splice(index, 1);
      return seq.join('');
    default:
      return seq.join('');
  }
}

/**
 * Quanti amminoacidi combaciano all'inizio e alla fine delle due proteine.
 * Serve a distinguere un indel "pulito" (fianchi intatti, un blocco tolto o
 * aggiunto in mezzo) da più mutazioni sommate che stravolgono la sequenza.
 */
function commonFlanks(a: string, b: string): { pre: number; suf: number } {
  const max = Math.min(a.length, b.length);
  let pre = 0;
  while (pre < max && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < max - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  return { pre, suf };
}

/** Classifica l'effetto della mutazione confrontando le due proteine tradotte. */
export function classifyMutation(original: string, mutated: string): MutationEffect {
  const o = cleanDna(original).replace(/-/g, '');
  const m = cleanDna(mutated).replace(/-/g, '');
  const originalProtein = translate(o);
  const mutatedProtein = translate(m);

  if (o === m) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'nessuna',
      note: 'Nessuna modifica alla sequenza.',
    };
  }

  // Inserzioni/delezioni in numero non multiplo di 3 → slittamento della lettura.
  const lenDiff = m.length - o.length;
  if (lenDiff % 3 !== 0) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'frameshift',
      note: 'Aggiungere o togliere basi in numero non multiplo di 3 fa "slittare" la lettura: da quel punto in poi ogni codone cambia. È una mutazione frameshift, spesso molto dannosa.',
    };
  }

  // La proteina è identica: mutazione silente (vale anche a lunghezza uguale).
  if (mutatedProtein === originalProtein) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'silente',
      note: 'Il DNA è cambiato ma la proteina è identica: il codice genetico è ridondante. È una mutazione silente.',
    };
  }

  // Uno STOP che compare prima del dovuto ha SEMPRE la precedenza: la proteina
  // si tronca, e chiamarla "indel pulito" sarebbe falso.
  const mutStop = mutatedProtein.indexOf('*');
  const origStop = originalProtein.indexOf('*');
  const origEnd = origStop === -1 ? originalProtein.length : origStop;
  if (mutStop !== -1 && mutStop < origEnd) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'nonsenso',
      firstChangedCodon: mutStop + 1,
      note: 'Compare un segnale di STOP prima del dovuto: la proteina si tronca a metà. È una mutazione nonsenso.',
    };
  }

  // Indel multiplo di 3: è "in-frame" SOLO se la proteina risultante è davvero
  // quella di partenza con un blocco tolto o aggiunto. Non basta che il numero
  // di basi torni: più mutazioni sommate possono dare lenDiff multiplo di 3 pur
  // stravolgendo la proteina. Lo verifichiamo sulle proteine vere.
  if (lenDiff !== 0) {
    const nAA = Math.abs(lenDiff) / 3;
    const added = lenDiff > 0;
    const { pre, suf } = commonFlanks(originalProtein, mutatedProtein);
    const shorter = Math.min(originalProtein.length, mutatedProtein.length);
    const lenGap = Math.abs(originalProtein.length - mutatedProtein.length);
    const isCleanIndel = pre + suf >= shorter && lenGap === nAA;

    if (isCleanIndel) {
      return {
        originalProtein,
        mutatedProtein,
        category: 'inframe-indel',
        firstChangedCodon: pre + 1,
        note: added
          ? `Sono stati aggiunti ${nAA} amminoacidi senza spostare la lettura: la proteina si allunga (inserzione in-frame). Non è una sostituzione: è un pezzo in più.`
          : `Sono stati rimossi ${nAA} amminoacidi senza spostare la lettura: la proteina si accorcia (delezione in-frame, come la ΔF508 della fibrosi cistica). Non è una sostituzione: manca un pezzo.`,
      };
    }
    return {
      originalProtein,
      mutatedProtein,
      category: 'multipla',
      firstChangedCodon: pre + 1,
      note: 'Qui si sono sommate più mutazioni: il numero di basi torna multiplo di 3, ma la proteina non è semplicemente accorciata o allungata — diversi amminoacidi risultano cambiati. Per vedere un effetto "pulito", riparti dalla sequenza originale e fai una modifica sola.',
    };
  }

  // Stessa lunghezza: conto quanti amminoacidi cambiano davvero, così la nota
  // non parla di "un amminoacido" quando ne sono cambiati parecchi.
  let firstChangedCodon: number | undefined;
  let changed = 0;
  const len = Math.min(originalProtein.length, mutatedProtein.length);
  for (let i = 0; i < len; i++) {
    if (originalProtein[i] !== mutatedProtein[i]) {
      if (firstChangedCodon === undefined) firstChangedCodon = i + 1;
      changed++;
    }
  }
  if (changed > 1) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'multipla',
      firstChangedCodon,
      note: `Sono cambiati ${changed} amminoacidi: qui si sono sommate più mutazioni. Per vedere l'effetto di una sola, riparti dalla sequenza originale.`,
    };
  }
  return {
    originalProtein,
    mutatedProtein,
    category: 'missenso',
    firstChangedCodon,
    note: 'Un amminoacido viene sostituito da un altro: la proteina è leggermente diversa. È una mutazione missenso (come nell\'anemia falciforme).',
  };
}

export const CATEGORY_STYLE: Record<
  MutationCategory,
  { label: string; color: string }
> = {
  nessuna: { label: 'Nessuna mutazione', color: 'var(--color-ink-muted)' },
  silente: { label: 'Silente', color: 'var(--color-accent-2)' },
  missenso: { label: 'Missenso', color: 'var(--color-accent)' },
  nonsenso: { label: 'Nonsenso', color: 'var(--color-accent)' },
  frameshift: { label: 'Frameshift', color: 'var(--color-accent)' },
  'inframe-indel': { label: 'Indel in-frame', color: 'var(--color-accent-3)' },
  multipla: { label: 'Mutazioni multiple', color: 'var(--color-ink-light)' },
};
