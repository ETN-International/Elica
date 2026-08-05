import { needlemanWunsch, DEFAULT_SCHEME, MAX_SEQ_LENGTH } from './alignment';
import { AA_NAMES } from './dna';

/**
 * Confronto fra due sequenze PROTEICHE reali.
 *
 * Serve alla modalità libera. UniProt è la banca dati delle proteine e NON
 * contiene DNA: una squadra che sceglie liberamente la sua proteina può
 * ottenere due sequenze amminoacidiche vere (la stessa proteina in due specie,
 * per esempio) ma non due sequenze di DNA. Senza questo percorso il progetto
 * finale — quello che va davanti alla giuria — resterebbe l'unico del corso a
 * usare uno solo dei tre gesti.
 *
 * DIVIETO, deliberato e non aggirabile: NON si ricostruisce il DNA a partire
 * dalla proteina. Il codice genetico è ridondante, quel DNA non esisterebbe in
 * nessun organismo, e sarebbe fabbricazione di dati proprio nel modulo che la
 * squadra presenta alla giuria. Qui si allineano amminoacidi con amminoacidi.
 *
 * Il motore è lo stesso Needleman-Wunsch usato per il DNA: cambia l'alfabeto,
 * non l'algoritmo.
 */

/** Le 20 lettere degli amminoacidi, più X per "sconosciuto". */
const AA_VALIDI = /[^ACDEFGHIKLMNPQRSTVWYXBZU]/gi;

/** Ripulisce una sequenza proteica: maiuscole, nessun carattere estraneo. */
export function pulisciProteina(seq: string): string {
  return (seq ?? '').toUpperCase().replace(AA_VALIDI, '');
}

export interface ConfrontoProteine {
  aLabel: string;
  bLabel: string;
  allineataA: string;
  allineataB: string;
  /** '|' dove combaciano, ' ' dove no. */
  matchLine: string;
  lunghezzaAllineata: number;
  identici: number;
  identitaPct: number;
  /** Posizioni con amminoacidi diversi (senza gap). */
  diversi: number;
  /** Posizioni in cui una delle due ha un buco. */
  gap: number;
}

/** Allinea due sequenze proteiche e misura quanto si somigliano. */
export function confrontaProteine(
  a: string,
  b: string,
  aLabel: string,
  bLabel: string,
): ConfrontoProteine | null {
  const A = pulisciProteina(a);
  const B = pulisciProteina(b);
  if (!A || !B) return null;
  if (A.length > MAX_SEQ_LENGTH || B.length > MAX_SEQ_LENGTH) return null;

  // Stessa lunghezza: confronto posizionale, senza inventare gap.
  const { A: al, B: bl } =
    A.length === B.length ? { A, B } : needlemanWunsch(A, B, DEFAULT_SCHEME);

  let identici = 0;
  let diversi = 0;
  let gap = 0;
  let match = '';
  for (let i = 0; i < al.length; i++) {
    if (al[i] === '-' || bl[i] === '-') {
      gap++;
      match += ' ';
    } else if (al[i] === bl[i]) {
      identici++;
      match += '|';
    } else {
      diversi++;
      match += ' ';
    }
  }
  return {
    aLabel,
    bLabel,
    allineataA: al,
    allineataB: bl,
    matchLine: match,
    lunghezzaAllineata: al.length,
    identici,
    identitaPct: Math.round((identici / al.length) * 1000) / 10,
    diversi,
    gap,
  };
}

export interface DifferenzaProteica {
  /** Posizione nell'allineamento (1-based). */
  posizione: number;
  da: string;
  a: string;
  daNome: string;
  aNome: string;
}

/**
 * Le differenze amminoacido per amminoacido. Se sono tantissime le tronchiamo:
 * una squadra non impara nulla da un elenco di duecento righe, e il dato che
 * conta (quante sono, dove si concentrano) è già nella percentuale di identità.
 */
export function differenzeProteiche(
  c: ConfrontoProteine,
  max = 12,
): { elenco: DifferenzaProteica[]; totale: number } {
  const elenco: DifferenzaProteica[] = [];
  let totale = 0;
  for (let i = 0; i < c.lunghezzaAllineata; i++) {
    const x = c.allineataA[i];
    const y = c.allineataB[i];
    if (x === '-' || y === '-' || x === y) continue;
    totale++;
    if (elenco.length < max) {
      elenco.push({
        posizione: i + 1,
        da: x,
        a: y,
        daNome: AA_NAMES[x] ?? x,
        aNome: AA_NAMES[y] ?? y,
      });
    }
  }
  return { elenco, totale };
}

/**
 * Dove si concentrano le differenze: risponde alla domanda che la squadra si fa
 * guardando l'allineamento ("sono sparse o tutte in un punto?"). Divide la
 * proteina in tre parti uguali e conta.
 */
export function distribuzioneDifferenze(c: ConfrontoProteine): {
  inizio: number;
  centro: number;
  fine: number;
} {
  const terzo = Math.max(1, Math.floor(c.lunghezzaAllineata / 3));
  let inizio = 0;
  let centro = 0;
  let fine = 0;
  for (let i = 0; i < c.lunghezzaAllineata; i++) {
    const x = c.allineataA[i];
    const y = c.allineataB[i];
    if (x === '-' || y === '-' || x === y) continue;
    if (i < terzo) inizio++;
    else if (i < terzo * 2) centro++;
    else fine++;
  }
  return { inizio, centro, fine };
}
