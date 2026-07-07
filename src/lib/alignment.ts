import type { AlignmentResult } from '../types';
import { AA_NAMES, cleanDna, translateCodon } from './dna';

/**
 * Allineamento globale di due sequenze con l'algoritmo di Needleman-Wunsch.
 *
 * Questo è il "motore dei dati veri" per il confronto: il risultato — posizione
 * per posizione — è calcolato da un algoritmo standard di bioinformatica, NON
 * chiesto all'AI. L'AI riceverà questo risultato già pronto e lo commenterà.
 */

interface ScoringScheme {
  match: number;
  mismatch: number;
  gap: number;
}

const DEFAULT_SCHEME: ScoringScheme = { match: 1, mismatch: -1, gap: -2 };

export function alignSequences(
  aRaw: string,
  bRaw: string,
  aLabel = 'A',
  bLabel = 'B',
  scheme: ScoringScheme = DEFAULT_SCHEME,
): AlignmentResult {
  const a = cleanDna(aRaw).replace(/-/g, '');
  const b = cleanDna(bRaw).replace(/-/g, '');
  const n = a.length;
  const m = b.length;

  // Matrice dei punteggi (n+1) x (m+1).
  const score: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  // Direzione del cammino: 'diag' | 'up' | 'left'.
  const trace: string[][] = Array.from({ length: n + 1 }, () =>
    new Array<string>(m + 1).fill(''),
  );

  for (let i = 1; i <= n; i++) {
    score[i][0] = i * scheme.gap;
    trace[i][0] = 'up';
  }
  for (let j = 1; j <= m; j++) {
    score[0][j] = j * scheme.gap;
    trace[0][j] = 'left';
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const isMatch = a[i - 1] === b[j - 1];
      const diag = score[i - 1][j - 1] + (isMatch ? scheme.match : scheme.mismatch);
      const up = score[i - 1][j] + scheme.gap;
      const left = score[i][j - 1] + scheme.gap;

      let best = diag;
      let dir = 'diag';
      if (up > best) {
        best = up;
        dir = 'up';
      }
      if (left > best) {
        best = left;
        dir = 'left';
      }
      score[i][j] = best;
      trace[i][j] = dir;
    }
  }

  // Traceback dal fondo in alto a sinistra.
  let i = n;
  let j = m;
  const alignedAArr: string[] = [];
  const alignedBArr: string[] = [];
  const matchArr: string[] = [];

  while (i > 0 || j > 0) {
    const dir = trace[i][j];
    if (dir === 'diag' && i > 0 && j > 0) {
      alignedAArr.push(a[i - 1]);
      alignedBArr.push(b[j - 1]);
      matchArr.push(a[i - 1] === b[j - 1] ? '|' : ' ');
      i--;
      j--;
    } else if (dir === 'up' && i > 0) {
      alignedAArr.push(a[i - 1]);
      alignedBArr.push('-');
      matchArr.push(' ');
      i--;
    } else if (dir === 'left' && j > 0) {
      alignedAArr.push('-');
      alignedBArr.push(b[j - 1]);
      matchArr.push(' ');
      j--;
    } else if (i > 0) {
      alignedAArr.push(a[i - 1]);
      alignedBArr.push('-');
      matchArr.push(' ');
      i--;
    } else {
      alignedAArr.push('-');
      alignedBArr.push(b[j - 1]);
      matchArr.push(' ');
      j--;
    }
  }

  const alignedA = alignedAArr.reverse().join('');
  const alignedB = alignedBArr.reverse().join('');
  const matchLine = matchArr.reverse().join('');

  const alignedLength = alignedA.length;
  let identicalCount = 0;
  let mismatches = 0;
  let gaps = 0;
  for (let k = 0; k < alignedLength; k++) {
    const ca = alignedA[k];
    const cb = alignedB[k];
    if (ca === '-' || cb === '-') {
      gaps++;
    } else if (ca === cb) {
      identicalCount++;
    } else {
      mismatches++;
    }
  }

  const identityPct =
    alignedLength === 0
      ? 0
      : Math.round((identicalCount / alignedLength) * 1000) / 10;

  return {
    aLabel,
    bLabel,
    alignedA,
    alignedB,
    matchLine,
    identicalCount,
    alignedLength,
    identityPct,
    mismatches,
    gaps,
  };
}

/**
 * Una singola differenza trovata nel confronto — "la scoperta".
 * Dove il DNA cambia e, quando calcolabile, cosa comporta sull'amminoacido.
 */
export interface Difference {
  /** Posizione (1-based) nella colonna dell'allineamento. */
  position: number;
  fromBase: string;
  toBase: string;
  /** Numero del codone (1-based) in cui cade la differenza, se calcolabile. */
  codonNumber?: number;
  fromAA?: string;
  toAA?: string;
  fromAAName?: string;
  toAAName?: string;
  /** true se la mutazione NON cambia l'amminoacido (mutazione silente). */
  silent?: boolean;
}

/**
 * Estrae le differenze puntuali (mismatch) da un allineamento e, dove i codoni
 * sono integri, calcola l'effetto sull'amminoacido. È il momento scientifico
 * del Modulo 2: non un numero, ma "abbiamo trovato la differenza, e significa
 * qualcosa". Calcolo deterministico — l'AI poi lo commenta.
 */
export function describeDifferences(
  alignedA: string,
  alignedB: string,
): Difference[] {
  const diffs: Difference[] = [];
  for (let col = 0; col < alignedA.length; col++) {
    const ca = alignedA[col];
    const cb = alignedB[col];
    if (ca === '-' || cb === '-' || ca === cb) continue;

    const diff: Difference = {
      position: col + 1,
      fromBase: ca,
      toBase: cb,
    };

    // Effetto sull'amminoacido: prendo il codone (allineato) che contiene la
    // colonna. Lo calcolo solo se il codone è integro (nessun gap) in entrambe.
    const codonStart = Math.floor(col / 3) * 3;
    const aCodon = alignedA.slice(codonStart, codonStart + 3);
    const bCodon = alignedB.slice(codonStart, codonStart + 3);
    if (
      aCodon.length === 3 &&
      bCodon.length === 3 &&
      !aCodon.includes('-') &&
      !bCodon.includes('-')
    ) {
      const fromAA = translateCodon(aCodon);
      const toAA = translateCodon(bCodon);
      diff.codonNumber = codonStart / 3 + 1;
      diff.fromAA = fromAA;
      diff.toAA = toAA;
      diff.fromAAName = AA_NAMES[fromAA];
      diff.toAAName = AA_NAMES[toAA];
      diff.silent = fromAA === toAA;
    }

    diffs.push(diff);
  }
  return diffs;
}
