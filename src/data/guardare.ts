/**
 * Le spiegazioni di ciò che la squadra ha SOTTO GLI OCCHI in quel momento.
 *
 * Prima mancavano del tutto: si vedevano nastri e spirali colorate e nessuno
 * diceva mai che cosa fossero. Restano fuori dalle schede di teoria generali
 * perché queste vanno lette guardando lo schermo, non prima.
 *
 * Testi scritti a mano e verificabili: nessuno di questi enunciati viene
 * generato dall'AI.
 */

/** Come si legge un modello 3D "a nastro" (la resa di Mol* e AlphaFold). */
export const LEGGERE_LA_3D = {
  voci: [
    {
      termine: 'Il nastro',
      spiegazione:
        'è la catena di amminoacidi, disegnata in modo semplificato: invece di milioni di atomi si traccia il percorso che la catena segue nello spazio.',
    },
    {
      termine: 'Le spirali (α-eliche)',
      spiegazione:
        'sono tratti in cui la catena si avvolge su se stessa come un cavo del telefono. È uno dei due modi tipici in cui una proteina si ripiega.',
    },
    {
      termine: 'I nastri piatti (foglietti β)',
      spiegazione:
        'sono tratti distesi affiancati l’uno all’altro come le assi di un parquet. L’altro modo tipico di ripiegarsi.',
    },
    {
      termine: 'Il ripiegamento',
      spiegazione:
        'non è casuale: la stessa sequenza di amminoacidi produce sempre la stessa forma. Ed è la forma a decidere cosa la proteina sa fare.',
    },
  ],
  cerca:
    'girate la struttura e guardate se prevalgono le spirali o i nastri piatti. Poi cercate il punto dove la catena sembra più fitta e compatta: di solito è il cuore che tiene insieme tutto il resto.',
};

/** Come si legge l'allineamento di due sequenze. */
export const LEGGERE_ALLINEAMENTO = {
  voci: [
    {
      termine: 'Le due righe A e B',
      spiegazione:
        'sono i due geni messi uno sopra l’altro, lettera per lettera, in modo che le parti uguali si corrispondano.',
    },
    {
      termine: 'Le barrette in mezzo',
      spiegazione:
        'segnano le posizioni in cui le due sequenze combaciano. Dove la barretta manca, lì qualcosa è cambiato.',
    },
    {
      termine: 'Il trattino —',
      spiegazione:
        'è un “buco” (gap): significa che in quella sequenza manca una lettera che l’altra ha. Succede quando un pezzo di DNA è stato tolto o aggiunto.',
    },
    {
      termine: 'La percentuale di identità',
      spiegazione:
        'dice quanto le due sequenze si somigliano. Più è alta, più i due geni sono imparentati — o più la mutazione è piccola.',
    },
  ],
  cerca:
    'scorrete l’allineamento e contate a occhio quante posizioni sono rosse: sono poche e concentrate, o tante e sparse? La risposta cambia completamente il significato biologico.',
};

/** Come si legge la sequenza divisa in codoni. */
export const LEGGERE_CODONI = {
  voci: [
    {
      termine: 'Il codone',
      spiegazione:
        'è un gruppo di tre lettere di DNA. Tre lettere = un amminoacido: è la regola con cui la cellula legge il gene.',
    },
    {
      termine: 'La lettera sotto',
      spiegazione:
        'è l’amminoacido che quel codone produce, scritto con la sua sigla di una lettera (M = metionina, V = valina…).',
    },
    {
      termine: 'ATG',
      spiegazione:
        'è il segnale di partenza: dice alla cellula da dove cominciare a leggere. Per questo quasi tutte le proteine iniziano con la metionina.',
    },
    {
      termine: 'Lo STOP (*)',
      spiegazione:
        'è il segnale di fine. Se compare troppo presto, la proteina viene tagliata a metà e di solito non funziona più.',
    },
  ],
  cerca:
    'la lettura procede a blocchi di tre, sempre. Provate a immaginare cosa succederebbe togliendo UNA sola lettera all’inizio: da quel punto in poi tutti i gruppi da tre slitterebbero di una posizione.',
};
