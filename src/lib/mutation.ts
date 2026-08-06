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
  | 'multipla'
  /**
   * Il codone d'inizio ATG è stato distrutto.
   *
   * Ha precedenza assoluta su ogni altra classificazione. Prima veniva
   * classificata come una qualunque sostituzione — "missenso, la proteina è
   * leggermente diversa" — che è biologicamente falso: senza ATG la cellula non
   * sa da dove cominciare a leggere e quella proteina non viene prodotta.
   * Peggio: il Giorno 4 il lab insegna che «ATG è il segnale di partenza», e il
   * giorno dopo lasciava distruggerlo senza dire nulla.
   */
  | 'perdita-inizio';

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

/** Il codone d'inizio: senza questo la traduzione non parte. */
const START = 'ATG';

/**
 * Applica una modifica puntuale alla sequenza e restituisce la nuova sequenza.
 *
 * `base` sceglie in che cosa trasformare (o che cosa inserire). Senza, la
 * sostituzione cicla A→T→G→C come prima: era l'unico modo disponibile, e
 * rendeva quasi impossibile cercare di proposito una mutazione silente.
 */
export function applyMutation(
  dna: string,
  index: number,
  op: MutationOp,
  base?: string,
): string {
  const seq = cleanDna(dna).replace(/-/g, '').split('');
  if (index < 0 || index >= seq.length) return seq.join('');
  const scelta = base && CYCLE.includes(base) ? base : undefined;
  switch (op) {
    case 'sostituisci': {
      const cur = seq[index];
      seq[index] = scelta ?? CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length] ?? 'A';
      return seq.join('');
    }
    case 'inserisci':
      seq.splice(index, 0, scelta ?? 'A');
      return seq.join('');
    case 'elimina':
      seq.splice(index, 1);
      return seq.join('');
    default:
      return seq.join('');
  }
}

/**
 * Un segno visibile per ogni modifica che la squadra ha davvero applicato.
 *
 * Prima le basi si coloravano confrontando posizione per posizione
 * (`original[i] !== base`). Funziona per le sostituzioni; dopo un'inserzione o
 * una delezione è FALSO, perché tutto ciò che sta a valle slitta di posizione e
 * risulta "diverso" pur essendo la stessa base di prima. Misurato: inserendo una
 * sola base in posizione 4 di una sequenza di 25, se ne accendevano 19.
 *
 * Le posizioni sono espresse nella sequenza CORRENTE e si aggiornano a ogni
 * modifica, così un segno resta attaccato alla base che la squadra ha toccato.
 */
export interface SegnoModifica {
  pos: number;
  tipo: MutationOp;
}

export function aggiornaSegni(
  segni: SegnoModifica[],
  index: number,
  op: MutationOp,
  lunghezzaDopo: number,
): SegnoModifica[] {
  switch (op) {
    case 'sostituisci':
      return [...segni.filter((s) => s.pos !== index), { pos: index, tipo: op }];
    case 'inserisci':
      return [
        ...segni.map((s) => (s.pos >= index ? { ...s, pos: s.pos + 1 } : s)),
        { pos: index, tipo: op },
      ];
    case 'elimina': {
      // La base cancellata non esiste più: il segno resta sul punto del taglio,
      // cioè sulla base che adesso occupa quella posizione. Se si è cancellata
      // l'ultima, il segno scivola su quella che la precedeva.
      const punto = Math.max(0, Math.min(index, lunghezzaDopo - 1));
      return [
        ...segni
          .filter((s) => s.pos !== index)
          .map((s) => (s.pos > index ? { ...s, pos: s.pos - 1 } : s))
          .filter((s) => s.pos !== punto),
        { pos: punto, tipo: op },
      ];
    }
    default:
      return segni;
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

/**
 * Classifica l'effetto della mutazione.
 *
 * Fa da guscio a `classificaBase`, che contiene la logica verificata e non si
 * tocca. Qui stanno soltanto le due cose che quella logica non poteva vedere:
 * la perdita del codone d'inizio (che ha precedenza su tutto) e la perdita del
 * codone di STOP (che non merita una categoria propria, ma va detta).
 */
export function classifyMutation(original: string, mutated: string): MutationEffect {
  const o = cleanDna(original).replace(/-/g, '');
  const m = cleanDna(mutated).replace(/-/g, '');

  // ── Precedenza assoluta: senza ATG non parte niente ────────────────────
  // Va controllata PRIMA di ogni altra cosa, come già accade per lo STOP
  // prematuro. Mostriamo comunque l'esito della traduzione, ma dichiarandolo
  // per quello che è: un'ipotesi di laboratorio, non ciò che farebbe la cellula.
  if (o !== m && o.startsWith(START) && !m.startsWith(START)) {
    return {
      originalProtein: translate(o),
      mutatedProtein: translate(m),
      category: 'perdita-inizio',
      firstChangedCodon: 1,
      note:
        'Avete cambiato il segnale di partenza. Le prime tre lettere erano ATG: è il «via» che dice alla cellula da dove cominciare a leggere. Senza, questa proteina non verrebbe prodotta affatto — oppure la lettura partirebbe da un ATG più avanti, dando qualcosa di completamente diverso e più corto. Qui sotto vi mostriamo lo stesso che cosa uscirebbe leggendo dal punto di prima, ma è un\'ipotesi di laboratorio: nella cellula non accadrebbe.',
    };
  }

  const effetto = classificaBase(o, m);

  // ── In tono minore: il segnale di fine ─────────────────────────────────
  // Se la squadra distrugge lo STOP la traduzione tira dritto fino in fondo
  // all'estratto e l'effetto mostrato è vicino al vero — ma va detto che nella
  // cellula la lettura proseguirebbe oltre, dentro ciò che viene dopo il gene.
  if (
    effetto.category !== 'nessuna' &&
    effetto.originalProtein.includes('*') &&
    !effetto.mutatedProtein.includes('*')
  ) {
    return {
      ...effetto,
      note: `${effetto.note} In più è sparito il segnale di STOP, cioè il «fine corsa»: nella cellula la lettura non si fermerebbe qui, andrebbe avanti oltre il gene.`,
    };
  }

  return effetto;
}

/** La logica verificata: non si tocca. */
function classificaBase(o: string, m: string): MutationEffect {
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
  'perdita-inizio': { label: 'Partenza distrutta', color: 'var(--color-accent)' },
};
