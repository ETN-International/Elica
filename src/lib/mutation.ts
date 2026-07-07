import { cleanDna, translate } from './dna';

/** Tipo di modifica che lo studente applica al DNA. */
export type MutationOp = 'sostituisci' | 'inserisci' | 'elimina';

/** Classificazione biologica dell'effetto di una mutazione. */
export type MutationCategory =
  | 'nessuna'
  | 'silente'
  | 'missenso'
  | 'nonsenso'
  | 'frameshift';

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

  // Stessa cornice di lettura: confronto amminoacido per amminoacido.
  if (mutatedProtein === originalProtein) {
    return {
      originalProtein,
      mutatedProtein,
      category: 'silente',
      note: 'Il DNA è cambiato ma la proteina è identica: il codice genetico è ridondante. È una mutazione silente.',
    };
  }

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

  let firstChangedCodon: number | undefined;
  const len = Math.min(originalProtein.length, mutatedProtein.length);
  for (let i = 0; i < len; i++) {
    if (originalProtein[i] !== mutatedProtein[i]) {
      firstChangedCodon = i + 1;
      break;
    }
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
};
