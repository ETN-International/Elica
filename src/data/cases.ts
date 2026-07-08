import type { Case, CaseTheme } from '../types';

/**
 * Casi didattici pre-preparati da ETN, raggruppati per tema e a difficoltà
 * crescente.
 *
 * I UniProt ID puntano a strutture VERE su AlphaFold DB (scaricate al volo).
 * Le sequenze di DNA sono estratti didattici brevi: dove serve mostrare un tipo
 * di mutazione, la seconda sequenza è costruita a partire dalla prima con quella
 * precisa modifica, così l'allineamento mostra una differenza reale nei dati.
 */
export const CASES: Case[] = [
  // ── Malattie genetiche ────────────────────────────────────────────────
  {
    id: 'emoglobina-falciforme',
    title: 'Emoglobina: una lettera che cambia tutto',
    question:
      "Perché una singola mutazione nel gene della beta-globina causa l'anemia falciforme?",
    intro:
      "L'emoglobina trasporta l'ossigeno nel sangue. Nell'anemia falciforme una sola base del DNA è diversa. Confronta il gene sano con quello mutato e trova la lettera che cambia tutto.",
    theme: 'Malattie genetiche',
    difficulty: 1,
    sequences: [
      {
        label: 'Beta-globina sana (HBB)',
        dna: 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGT',
      },
      {
        label: 'Beta-globina falciforme (HbS)',
        dna: 'ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGT',
      },
    ],
    protein: { uniprot: 'P68871', name: 'Emoglobina, subunità beta (HBB)' },
    provenance:
      "Estratti reali dell'inizio del gene HBB umano, con la mutazione puntiforme del codone 6. Struttura 3D reale (UniProt P68871).",
  },
  {
    id: 'fibrosi-cistica',
    title: 'Fibrosi cistica: il codone che sparisce',
    question:
      'Nella fibrosi cistica manca un pezzo di gene: cosa succede alla proteina CFTR?',
    intro:
      "La mutazione più comune della fibrosi cistica cancella tre basi — un intero codone. Confronta le due sequenze: dove una è più corta, l'allineamento apre un 'buco' (gap) e la proteina perde un amminoacido.",
    theme: 'Malattie genetiche',
    difficulty: 2,
    sequences: [
      { label: 'CFTR sano', dna: 'ATGACTGGATTCAAGGATCCTTTCGGTGAACTG' },
      { label: 'CFTR con delezione (ΔF508)', dna: 'ATGACTGGATTCAAGGATCCTGGTGAACTG' },
    ],
    protein: { uniprot: 'P13569', name: 'Canale CFTR umano' },
    provenance:
      'Estratti didattici: la seconda sequenza ha la delezione in-frame di un codone (tipo ΔF508). Struttura 3D reale (UniProt P13569).',
  },
  {
    id: 'huntington',
    title: 'Corea di Huntington: la ripetizione che si allunga',
    question:
      'Perché troppe ripetizioni CAG nel gene della huntingtina causano la malattia?',
    intro:
      "Alcune malattie nascono da una tripletta (CAG) che si ripete troppe volte. Confronta un allele normale (20 ripetizioni) con uno espanso (45): l'allineamento mostra le ripetizioni in più, e la proteina accumula tante glutammine (Q). Nella realtà la malattia compare da circa 36-40 ripetizioni.",
    theme: 'Malattie genetiche',
    difficulty: 3,
    sequences: [
      {
        label: 'Huntingtina normale (20× CAG)',
        dna: 'ATGGCC' + 'CAG'.repeat(20) + 'CCTGAA',
      },
      {
        label: 'Huntingtina espansa (45× CAG)',
        dna: 'ATGGCC' + 'CAG'.repeat(45) + 'CCTGAA',
      },
    ],
    protein: { uniprot: 'P42858', name: 'Huntingtina umana (HTT)' },
    provenance:
      "Estratti didattici. I numeri seguono la soglia reale: fino a ~26 ripetizioni CAG l'allele è sano, la malattia compare da ~36-40. Struttura 3D reale (UniProt P42858).",
  },

  // ── Evoluzione e specie ──────────────────────────────────────────────
  {
    id: 'insulina-uomo-topo',
    title: 'Insulina: quanto siamo simili al topo?',
    question:
      "Il gene dell'insulina di uomo e topo si somiglia? Cosa ci dice sull'evoluzione?",
    intro:
      "L'insulina regola lo zucchero nel sangue ed è un gene antico, condiviso da molti animali. Allinea i due geni e misura quanto combaciano: le differenze raccontano quanto sono lontani i due parenti.",
    theme: 'Evoluzione e specie',
    difficulty: 1,
    sequences: [
      {
        label: 'Insulina — Uomo (INS)',
        dna: 'ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCCTCTGGGGACCTGACCCAGCCGCAGCCTTTGTG',
      },
      {
        label: 'Insulina — Topo (Ins2)',
        dna: 'ATGGCCCTGTGGATGCGCTTCCTGCCCCTGCTGGCCCTGCTTGTCCTCTGGGAGCCCAAACCCGCCCAGGCTTTTGTC',
      },
    ],
    protein: { uniprot: 'P01308', name: 'Insulina umana (INS)' },
    provenance:
      "Estratti didattici della regione iniziale del gene dell'insulina. Struttura 3D reale (UniProt P01308).",
  },
  {
    id: 'mutazione-silente',
    title: 'La mutazione che non si vede',
    question: 'Una mutazione del DNA può non cambiare nulla nella proteina?',
    intro:
      "Non tutte le mutazioni contano allo stesso modo. Qui due varianti dello stesso gene differiscono in due punti — ma il codice genetico è 'ridondante' e la proteina resta identica. Trova le differenze e scopri perché sono silenti.",
    theme: 'Evoluzione e specie',
    difficulty: 2,
    sequences: [
      { label: 'Variante A', dna: 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC' },
      { label: 'Variante B', dna: 'ATGGTGCACCTAACTCCTGAGGAGAAGTCTGCCGTTACTGCT' },
    ],
    protein: { uniprot: 'P68871', name: 'Emoglobina, subunità beta (HBB)' },
    provenance:
      'Estratti didattici con due mutazioni silenti. Struttura 3D reale (UniProt P68871).',
  },

  // ── Enzimi e difese ──────────────────────────────────────────────────
  {
    id: 'lisozima-uomo-gallina',
    title: "Lisozima: la difesa nell'uovo e nell'uomo",
    question:
      "Il lisozima che protegge l'uovo di gallina è imparentato con quello delle nostre lacrime?",
    intro:
      "Il lisozima è un enzima antibatterico presente sia nell'albume dell'uovo sia nelle nostre lacrime e saliva. Confronta i due geni e osserva la forma della proteina: la funzione nasce dalla forma.",
    theme: 'Enzimi e difese',
    difficulty: 2,
    sequences: [
      {
        label: 'Lisozima C — Uomo (LYZ)',
        dna: 'ATGAAGGCTCTCATCGTCCTGGGCCTGGTTCTGCTGTCTGTTACAGTCCAGGGCAAAGTCTTTGAACGCTGTGAGCTG',
      },
      {
        label: 'Lisozima — Gallina (uovo)',
        dna: 'ATGAGGTCTTTGCTAATCTTGGTGCTTTGCTTCCTGCCCCTGGCTGCTCTGGGGAAAGTCTTTGGACGATGTGAGCTG',
      },
    ],
    protein: { uniprot: 'P61626', name: 'Lisozima C umano (LYZ)' },
    provenance:
      'Estratti didattici del gene del lisozima. Struttura 3D reale (UniProt P61626).',
  },
  {
    id: 'amilasi-saliva',
    title: 'Amilasi: perché il pane diventa dolce',
    question:
      "L'enzima della saliva che spezza l'amido: una piccola mutazione ne cambia la forma?",
    intro:
      "L'amilasi salivare inizia a digerire l'amido già in bocca — per questo il pane masticato a lungo diventa dolce. Confronta due varianti del gene e osserva una singola sostituzione di amminoacido.",
    theme: 'Enzimi e difese',
    difficulty: 1,
    sequences: [
      { label: 'Amilasi — variante 1', dna: 'ATGAAGTTCTTCCTGCTGCTGTTCACCATCGGCTTCTGCTGGGCC' },
      { label: 'Amilasi — variante 2', dna: 'ATGAAGTCCTTCCTGCTGCTGTTCACCATCGGCTTCTGCTGGGCC' },
    ],
    protein: { uniprot: 'P04745', name: 'Amilasi salivare umana (AMY1)' },
    provenance:
      'Estratti didattici con una sostituzione puntiforme. Struttura 3D reale (UniProt P04745).',
  },

  // ── Proteine celebri ─────────────────────────────────────────────────
  {
    id: 'gfp',
    title: 'GFP: la proteina che brilla',
    question: 'Come fa una proteina di medusa a emettere luce verde?',
    intro:
      "La GFP (Green Fluorescent Protein) viene da una medusa e brilla di verde: è una delle proteine più usate nei laboratori del mondo. Qui non c'è un confronto: leggi la sequenza e soprattutto ruota la sua struttura 3D, il famoso 'barile' che protegge il punto che emette luce.",
    theme: 'Proteine celebri',
    difficulty: 1,
    sequences: [
      { label: 'GFP (frammento)', dna: 'ATGAGCAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTT' },
    ],
    protein: { uniprot: 'P42212', name: 'Proteina fluorescente verde (GFP)' },
    provenance:
      "Frammento didattico dell'inizio della GFP. Struttura 3D reale (UniProt P42212).",
  },
  {
    id: 'spike-covid',
    title: 'Spike: la chiave del coronavirus',
    question:
      'Una mutazione nella proteina Spike può renderla diversa: come la troviamo?',
    intro:
      'La proteina Spike è la "chiave" con cui il SARS-CoV-2 entra nelle cellule; le sue mutazioni hanno segnato le varianti. Confronta due versioni e trova la mutazione puntiforme, poi guarda la struttura che tutti abbiamo imparato a conoscere.',
    theme: 'Proteine celebri',
    difficulty: 3,
    sequences: [
      { label: 'Spike — riferimento', dna: 'ATGTTTGTTGATCTTGTTTTATTGCCAGATGTCTCTAGTCAGTGTGTT' },
      { label: 'Spike — variante', dna: 'ATGTTTGTTGGTCTTGTTTTATTGCCAGATGTCTCTAGTCAGTGTGTT' },
    ],
    protein: { uniprot: 'P0DTC2', name: 'Proteina Spike (SARS-CoV-2)' },
    provenance:
      'Estratti didattici con una sostituzione puntiforme. Struttura 3D reale (UniProt P0DTC2).',
  },
];

export const THEMES: CaseTheme[] = [
  'Malattie genetiche',
  'Evoluzione e specie',
  'Enzimi e difese',
  'Proteine celebri',
];

export function getCase(id: string | null | undefined): Case | undefined {
  return CASES.find((c) => c.id === id);
}

export function casesByTheme(theme: CaseTheme): Case[] {
  return CASES.filter((c) => c.theme === theme);
}
