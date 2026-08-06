// Modello dei dati dell'app ETN Genoma.

/** Una sequenza di DNA scelta o caricata, con la sua etichetta. */
export interface NamedSequence {
  /** Etichetta leggibile (es. "Uomo", "Maiale", "Emoglobina sana"). */
  label: string;
  /** Sequenza di DNA (A/T/G/C). Viene ripulita all'uso. */
  dna: string;
}

/**
 * Un "caso didattico": l'unità dell'indagine. È un dato, non codice —
 * aggiungerne uno nuovo significa solo aggiungere una voce a questo elenco
 * (o, in produzione, una riga in Supabase).
 */
/** Tema di un caso, per raggruppare il catalogo. */
export type CaseTheme =
  | 'Malattie genetiche'
  | 'Evoluzione e specie'
  | 'Enzimi e difese'
  | 'Proteine celebri';

export interface Case {
  id: string;
  /** Titolo del caso mostrato nella lista. */
  title: string;
  /** La domanda biologica di partenza. */
  question: string;
  /** Contesto breve per lo studente. */
  intro: string;
  /** Le sequenze in gioco (di norma due da confrontare). Può essere vuoto (modalità libera). */
  sequences: NamedSequence[];
  /** Proteina da vedere in 3D: UniProt ID + nome leggibile. */
  protein: {
    uniprot: string;
    name: string;
  };
  /**
   * Confronto a livello di PROTEINA, per la modalità libera: sequenze
   * amminoacidiche REALI prese da UniProt. Serve perché UniProt è la banca dati
   * delle proteine e non contiene DNA: una squadra che sceglie liberamente la
   * sua proteina può ottenere due sequenze proteiche vere, non due di DNA.
   * Mai ricostruite dalla proteina per retro-traduzione: sarebbe inventarle.
   */
  proteine?: { label: string; uniprot: string; seq: string }[];
  /** Tema per raggruppare i casi nel catalogo. */
  theme?: CaseTheme;
  /** Difficoltà 1–3 (1 = base, 3 = avanzato). */
  difficulty?: 1 | 2 | 3;
  /** Nota onesta sulla provenienza dei dati del caso. */
  provenance?: string;
  /** true se creato dalla squadra in modalità libera. */
  custom?: boolean;
}

/** Provenienza di una struttura 3D scaricata da AlphaFold DB. */
export interface AlphaFoldModel {
  uniprot: string;
  /** URL del file di coordinate (PDB o CIF). */
  modelUrl: string;
  format: 'pdb' | 'mmcif';
  /** Metadati veri restituiti dall'API di AlphaFold DB. */
  proteinName?: string;
  organism?: string;
  sequenceLength?: number;
  modelVersion?: string;
  /**
   * La sequenza amminoacidica VERA della proteina, come sta su UniProt.
   * Serve a verificare, prima di indicare un punto sulla struttura, che il
   * tratto didattico corrisponda davvero a questa proteina: senza il controllo
   * l'app punterebbe il residuo sbagliato (succede con l'estratto della CFTR).
   */
  sequence?: string;
}

/** Risultato di un allineamento tra due sequenze (calcolato da libreria, non dall'AI). */
export interface AlignmentResult {
  aLabel: string;
  bLabel: string;
  /** Sequenza A allineata (con eventuali gap "-"). */
  alignedA: string;
  /** Sequenza B allineata. */
  alignedB: string;
  /** Stringa di corrispondenza: "|" dove combaciano, " " dove differiscono. */
  matchLine: string;
  identicalCount: number;
  alignedLength: number;
  /** Percentuale di identità (0–100), arrotondata a un decimale. */
  identityPct: number;
  /** Numero di posizioni con base diversa (mismatch, esclusi i gap). */
  mismatches: number;
  /** Numero di gap introdotti. */
  gaps: number;
}

/** Un elemento salvato nel dossier d'indagine. */
export interface DossierEntry {
  id: string;
  createdAt: number;
  /** Caso a cui appartiene la voce (per distinguere le indagini nel dossier cumulativo). */
  caseId?: string;
  /**
   * "insieme" = ciò che nasce dall'incontro con un'altra squadra (lo scambio di
   * metà percorso, le domande ricevute in revisione, la scoperta appesa alla
   * parete comune). Ha una sua categoria perché nel dossier finale è la prova
   * che la squadra ha avuto un pubblico prima della giuria.
   */
  kind: 'domanda' | 'dna' | 'confronto' | 'proteina' | 'conclusione' | 'insieme';
  title: string;
  /** Testo/commento della squadra. */
  body: string;
  /** Dati strutturati opzionali (es. statistiche di allineamento). */
  data?: Record<string, unknown>;
}

/** Il dossier di una squadra. */
export interface Dossier {
  caseId: string | null;
  team: string;
  /** Nomi dei componenti della squadra. */
  members: string[];
  entries: DossierEntry[];
}

/** Un file allegato dalla squadra al tutor (immagine da "vedere" o testo da leggere). */
export interface ChatAttachment {
  kind: 'image' | 'text';
  name: string;
  /** Immagini: data URL base64 (data:image/…;base64,…), che il modello multimodale vede. */
  dataUrl?: string;
  /** File di testo: il contenuto, inserito nel messaggio. */
  text?: string;
}

/** Un messaggio nella conversazione con il tutor AI. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Allegati mostrati dalla squadra insieme al messaggio (solo lato utente). */
  attachments?: ChatAttachment[];
}
