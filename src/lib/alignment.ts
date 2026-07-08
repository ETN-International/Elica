import type { AlignmentResult } from '../types';
import { AA_NAMES, cleanDna, translateCodon } from './dna';

/**
 * Confronto tra due sequenze di DNA — il "motore dei dati veri" del Modulo 2.
 *
 * Strategia (per essere corretti E leggibili in aula):
 *  - sequenze di PARI lunghezza  → confronto posizionale, senza gap
 *    (evita "gap fantasma" e mantiene la cornice di lettura reale);
 *  - una è un'inserzione/delezione pulita dell'altra (prefisso comune + blocco
 *    + suffisso comune) → allineamento con il gap in UN unico blocco;
 *  - altrimenti → Needleman-Wunsch classico.
 *
 * L'effetto sull'amminoacido (in describeDifferences) è calcolato SOLO sul frame
 * di lettura reale delle sequenze senza gap: mai su coordinate allineate.
 */

interface ScoringScheme {
  match: number;
  mismatch: number;
  gap: number;
}

const DEFAULT_SCHEME: ScoringScheme = { match: 1, mismatch: -1, gap: -2 };

/** Lunghezza massima di sequenza gestita (oltre, l'allineamento è troppo pesante). */
export const MAX_SEQ_LENGTH = 3000;

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
function commonSuffix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/**
 * Se le due sequenze differiscono solo per un blocco inserito/deleto contiguo
 * (prefisso comune + blocco + suffisso comune), restituisce un allineamento
 * pulito con il gap in un unico blocco. Altrimenti null.
 */
function cleanIndelAlign(a: string, b: string): { A: string; B: string } | null {
  const shortIsA = a.length < b.length;
  const short = shortIsA ? a : b;
  const long = shortIsA ? b : a;
  const pre = commonPrefix(short, long);
  let suf = commonSuffix(short, long);
  if (pre + suf > short.length) suf = short.length - pre;
  if (pre + suf !== short.length) return null; // non è un indel pulito
  const insLen = long.length - short.length;
  const gapped = short.slice(0, pre) + '-'.repeat(insLen) + short.slice(pre);
  return shortIsA ? { A: gapped, B: long } : { A: long, B: gapped };
}

/** Needleman-Wunsch globale classico. */
function needlemanWunsch(
  a: string,
  b: string,
  scheme: ScoringScheme,
): { A: string; B: string } {
  const n = a.length;
  const m = b.length;
  const score: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  const trace: Uint8Array[] = Array.from(
    { length: n + 1 },
    () => new Uint8Array(m + 1), // 0 diag, 1 up, 2 left
  );
  for (let i = 1; i <= n; i++) {
    score[i][0] = i * scheme.gap;
    trace[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    score[0][j] = j * scheme.gap;
    trace[0][j] = 2;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = a[i - 1] === b[j - 1];
      const diag = score[i - 1][j - 1] + (isMatch ? scheme.match : scheme.mismatch);
      const up = score[i - 1][j] + scheme.gap;
      const left = score[i][j - 1] + scheme.gap;
      let best = diag;
      let dir = 0;
      if (up > best) {
        best = up;
        dir = 1;
      }
      if (left > best) {
        best = left;
        dir = 2;
      }
      score[i][j] = best;
      trace[i][j] = dir;
    }
  }
  let i = n;
  let j = m;
  let A = '';
  let B = '';
  while (i > 0 || j > 0) {
    const dir = trace[i][j];
    if (i > 0 && j > 0 && dir === 0) {
      A = a[i - 1] + A;
      B = b[j - 1] + B;
      i--;
      j--;
    } else if (i > 0 && (dir === 1 || j === 0)) {
      A = a[i - 1] + A;
      B = '-' + B;
      i--;
    } else {
      A = '-' + A;
      B = b[j - 1] + B;
      j--;
    }
  }
  return { A, B };
}

export function alignSequences(
  aRaw: string,
  bRaw: string,
  aLabel = 'A',
  bLabel = 'B',
  scheme: ScoringScheme = DEFAULT_SCHEME,
): AlignmentResult {
  const a = cleanDna(aRaw).replace(/-/g, '');
  const b = cleanDna(bRaw).replace(/-/g, '');

  let A: string;
  let B: string;
  if (a.length === b.length) {
    // Pari lunghezza: confronto posizionale, nessun gap.
    A = a;
    B = b;
  } else {
    A = '';
    B = '';
    const clean = cleanIndelAlign(a, b);
    if (clean) {
      A = clean.A;
      B = clean.B;
    } else {
      const nw = needlemanWunsch(a, b, scheme);
      A = nw.A;
      B = nw.B;
    }
  }

  const alignedLength = A.length;
  let matchLine = '';
  let identicalCount = 0;
  let mismatches = 0;
  let gaps = 0;
  for (let k = 0; k < alignedLength; k++) {
    const ca = A[k];
    const cb = B[k];
    if (ca === '-' || cb === '-') {
      gaps++;
      matchLine += ' ';
    } else if (ca === cb) {
      identicalCount++;
      matchLine += '|';
    } else {
      mismatches++;
      matchLine += ' ';
    }
  }
  const identityPct =
    alignedLength === 0 ? 0 : Math.round((identicalCount / alignedLength) * 1000) / 10;

  return {
    aLabel,
    bLabel,
    alignedA: A,
    alignedB: B,
    matchLine,
    identicalCount,
    alignedLength,
    identityPct,
    mismatches,
    gaps,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Le "scoperte": differenze descritte in modo scientificamente corretto.
// ─────────────────────────────────────────────────────────────────────────

export type DifferenceKind = 'sostituzione' | 'delezione' | 'inserzione';

export interface Difference {
  kind: DifferenceKind;
  /** Posizione (1-based) nella sequenza reale (A per sostituzione/delezione, B per inserzione). */
  position: number;

  // — sostituzione —
  fromBase?: string;
  toBase?: string;
  /** Numero del codone (1-based) nella cornice reale, se calcolabile. */
  codonNumber?: number;
  fromAA?: string;
  toAA?: string;
  fromAAName?: string;
  toAAName?: string;
  silent?: boolean;

  // — indel —
  /** Numero di basi inserite/delete. */
  length?: number;
  /** Amminoacidi persi/aggiunti (codice a una lettera), se in-frame e allineati al codone. */
  residues?: string;
  residueNames?: string[];
  /** true se l'indel NON è multiplo di 3 (sposta la lettura). */
  frameshift?: boolean;
}

/** Traduce un tratto di DNA (già in frame) in una stringa di amminoacidi. */
function translateRun(dna: string): string {
  let p = '';
  for (let i = 0; i + 3 <= dna.length; i += 3) p += translateCodon(dna.slice(i, i + 3));
  return p;
}

/**
 * Estrae le differenze da un allineamento, calcolando l'effetto sull'amminoacido
 * SOLO sul frame reale e SOLO quando è affidabile.
 * `seqA`/`seqB` sono le sequenze reali senza gap (per leggere i codoni giusti).
 */
export function describeDifferences(
  alignedA: string,
  alignedB: string,
): Difference[] {
  // Ricostruisci le sequenze reali (senza gap) per leggere i codoni nel frame giusto.
  const seqA = alignedA.replace(/-/g, '');
  const seqB = alignedB.replace(/-/g, '');

  const diffs: Difference[] = [];
  let ia = 0; // indice base corrente in A (senza gap)
  let ib = 0; // indice base corrente in B (senza gap)

  let col = 0;
  const L = alignedA.length;
  while (col < L) {
    const ca = alignedA[col];
    const cb = alignedB[col];

    if (ca === '-' || cb === '-') {
      // Inizio di un run di gap: raggruppa le colonne contigue dello stesso tipo.
      const isDeletion = cb === '-'; // A ha basi, B no → delezione (da A a B)
      const startIa = ia;
      const startIb = ib;
      let len = 0;
      while (
        col < L &&
        (isDeletion ? alignedB[col] === '-' && alignedA[col] !== '-' : alignedA[col] === '-' && alignedB[col] !== '-')
      ) {
        len++;
        if (isDeletion) ia++;
        else ib++;
        col++;
      }
      const inFrame = len % 3 === 0;
      const d: Difference = {
        kind: isDeletion ? 'delezione' : 'inserzione',
        position: (isDeletion ? startIa : startIb) + 1,
        length: len,
        frameshift: !inFrame,
      };
      // Amminoacidi persi/aggiunti calcolati a livello PROTEICO (indipendente da
      // dove cade il gap nell'allineamento): confronto prefisso/suffisso comune
      // delle due proteine tradotte nel loro frame reale.
      if (inFrame) {
        const proteinA = translateRun(seqA);
        const proteinB = translateRun(seqB);
        const shortP = isDeletion ? proteinB : proteinA;
        const longP = isDeletion ? proteinA : proteinB;
        let pre = 0;
        while (pre < shortP.length && shortP[pre] === longP[pre]) pre++;
        let suf = 0;
        while (
          suf < shortP.length - pre &&
          shortP[shortP.length - 1 - suf] === longP[longP.length - 1 - suf]
        )
          suf++;
        const added = longP.slice(pre, longP.length - suf);
        if (added.length === len / 3 && !added.includes('?') && !added.includes('*')) {
          d.residues = added;
          d.residueNames = added.split('').map((a) => AA_NAMES[a] ?? a);
        }
      }
      diffs.push(d);
      continue;
    }

    // Colonna con due basi.
    if (ca !== cb) {
      const d: Difference = {
        kind: 'sostituzione',
        position: ia + 1,
        fromBase: ca,
        toBase: cb,
      };
      // Effetto sull'amminoacido solo se le due sequenze sono nello STESSO frame
      // reale in questo punto (nessun indel a monte le ha sfasate): ia === ib.
      if (ia === ib) {
        const cs = Math.floor(ia / 3) * 3;
        const aCodon = seqA.slice(cs, cs + 3);
        const bCodon = seqB.slice(cs, cs + 3);
        if (aCodon.length === 3 && bCodon.length === 3) {
          const fromAA = translateCodon(aCodon);
          const toAA = translateCodon(bCodon);
          // Mai calcolare l'effetto su codoni ambigui (base N → '?').
          if (fromAA !== '?' && toAA !== '?') {
            d.codonNumber = cs / 3 + 1;
            d.fromAA = fromAA;
            d.toAA = toAA;
            d.fromAAName = AA_NAMES[fromAA];
            d.toAAName = AA_NAMES[toAA];
            d.silent = fromAA === toAA;
          }
        }
      }
      diffs.push(d);
    }
    ia++;
    ib++;
    col++;
  }

  return diffs;
}
