// Utilità di lettura del DNA — calcoli deterministici, NON generati dall'AI.
// L'AI più tardi commenta questi risultati; qui li produciamo con codice esatto.

/** Ripulisce una sequenza: maiuscolo, solo A/T/G/C/N e gap. */
export function cleanDna(raw: string): string {
  return raw.toUpperCase().replace(/[^ATGCNU-]/g, '').replace(/U/g, 'T');
}

/** Contenuto in GC (%) — indicatore classico di composizione. */
export function gcContent(dna: string): number {
  const seq = cleanDna(dna).replace(/-/g, '');
  if (seq.length === 0) return 0;
  const gc = (seq.match(/[GC]/g) || []).length;
  return Math.round((gc / seq.length) * 1000) / 10;
}

/** Trascrive DNA (filamento codificante) in mRNA. */
export function transcribe(dna: string): string {
  return cleanDna(dna).replace(/T/g, 'U');
}

/** Spezza una sequenza in codoni (triplette) dal primo nucleotide. */
export function toCodons(dna: string): string[] {
  const seq = cleanDna(dna).replace(/-/g, '');
  const codons: string[] = [];
  for (let i = 0; i + 3 <= seq.length; i += 3) {
    codons.push(seq.slice(i, i + 3));
  }
  return codons;
}

// Codice genetico standard (DNA -> amminoacido, codice a una lettera; '*' = stop).
const CODON_TABLE: Record<string, string> = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L',
  CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S',
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*',
  CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W',
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

// Nome esteso italiano degli amminoacidi (per la didattica).
export const AA_NAMES: Record<string, string> = {
  A: 'Alanina', R: 'Arginina', N: 'Asparagina', D: 'Acido aspartico',
  C: 'Cisteina', E: 'Acido glutammico', Q: 'Glutammina', G: 'Glicina',
  H: 'Istidina', I: 'Isoleucina', L: 'Leucina', K: 'Lisina',
  M: 'Metionina', F: 'Fenilalanina', P: 'Prolina', S: 'Serina',
  T: 'Treonina', W: 'Triptofano', Y: 'Tirosina', V: 'Valina',
  '*': 'STOP',
};

/** Traduce una tripletta in amminoacido (codice a una lettera). */
export function translateCodon(codon: string): string {
  return CODON_TABLE[codon.toUpperCase()] ?? '?';
}

/** Traduce l'intera sequenza (dal primo nucleotide) in proteina. */
export function translate(dna: string): string {
  return toCodons(dna).map(translateCodon).join('');
}

/**
 * Un esito del controllo qualità della sequenza.
 * `ok = true` → indicatore verde; `false` → rosso.
 */
export interface QualityCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Controllo qualità del dato in versione leggera (ispirato a FastQC di Galaxy,
 * ma senza venti grafici tecnici).
 *
 * Insegna il gesto scientifico più importante: NON ti fidi di un dato prima di
 * averne verificato la qualità. Pochi indicatori verde/rosso, spiegati dall'AI.
 */
export function qualityChecks(dna: string): QualityCheck[] {
  const seq = cleanDna(dna).replace(/-/g, '');
  const checks: QualityCheck[] = [];

  // 1. Basi valide (nessuna base ambigua tipo N).
  const ambiguous = (seq.match(/[^ATGC]/g) || []).length;
  checks.push({
    label: 'Basi valide',
    ok: ambiguous === 0,
    detail:
      ambiguous === 0
        ? 'Solo A, T, G, C: nessuna base ambigua o illeggibile.'
        : `${ambiguous} basi ambigue (es. N): il sequenziatore non le ha lette bene.`,
  });

  // 2. Codoni completi (lunghezza multiplo di 3).
  const complete = seq.length % 3 === 0;
  checks.push({
    label: 'Codoni completi',
    ok: complete,
    detail: complete
      ? `${seq.length} basi = ${seq.length / 3} codoni interi, senza avanzi.`
      : `${seq.length} basi: non è un multiplo di 3, la lettura in codoni resta monca.`,
  });

  // 3. Codone d'inizio (ATG = Metionina).
  const startsATG = seq.slice(0, 3) === 'ATG';
  checks.push({
    label: "Codone d'inizio",
    ok: startsATG,
    detail: startsATG
      ? 'Inizia con ATG (Metionina): la lettura parte dal punto giusto del gene.'
      : "Non inizia con ATG: potrebbe non essere l'inizio di un gene.",
  });

  // 4. Nessuno STOP prematuro nel mezzo.
  const protein = translate(seq);
  const stopIdx = protein.indexOf('*');
  const noEarlyStop = stopIdx === -1 || stopIdx === protein.length - 1;
  checks.push({
    label: 'Nessuno STOP prematuro',
    ok: noEarlyStop,
    detail: noEarlyStop
      ? 'Nessun segnale di STOP nel mezzo: la proteina si legge fino in fondo.'
      : `Segnale di STOP già al codone ${stopIdx + 1}: la proteina si interromperebbe prima.`,
  });

  return checks;
}
