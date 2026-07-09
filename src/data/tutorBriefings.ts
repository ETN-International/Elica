// ─────────────────────────────────────────────────────────────────────────
// Schede-briefing del tutor: cosa "è" ogni schermata, cosa ci fa la squadra e
// l'obiettivo didattico. NON è addestramento del modello — è conoscenza data in
// CONTESTO a ogni richiesta, così il tutor sa sempre dove si trova e di cosa si
// tratta la pagina, senza doverlo indovinare. Si aggiornano qui, in un file.
//
// Vanno insieme ai DATI VERI che ogni modulo già calcola (sequenza, allineamento,
// metadati AlphaFold…): il briefing dice "che pagina è", i dati dicono "cosa c'è".
// ─────────────────────────────────────────────────────────────────────────

import type { Giorno0PhaseId } from './giorno0';
import { GIORNO0_PROTEIN, GIORNO0_SEQ_A, GIORNO0_SEQ_B } from './giorno0';

/** Scheda per le schermate dei moduli dove vive il tutor (chiave = pagina). */
export const SCREEN_BRIEFINGS: Record<string, string> = {
  protein: [
    'DOVE SEI: schermata "Proteina 3D". La squadra vede la struttura tridimensionale REALE della proteina del caso (scaricata da AlphaFold DB) e la ruota col mouse.',
    'COSA FANNO: osservano la forma — dove è compatta e stabile, dove esposta — e collegano la forma alla funzione.',
    'OBIETTIVO: capire che la forma di una proteina decide cosa sa fare.',
    'NOTA PER TE: tu NON vedi la 3D. Commenta ciò che emerge dai dati/metadati e falli osservare con domande; non inventare dettagli della struttura che non hai nel contesto.',
  ].join('\n'),

  compare: [
    'DOVE SEI: schermata "Confronta i geni". La squadra confronta due sequenze; l\'allineamento e le differenze sono calcolati da un algoritmo (Needleman-Wunsch) e te li passo nel contesto.',
    'COSA FANNO: individuano dove le due sequenze differiscono e ragionano su cosa comporta.',
    'OBIETTIVO: scoprire che poche differenze nel DNA possono cambiare — o no — la proteina.',
    'NOTA PER TE: numeri e allineamento sono già calcolati: commentali, non ricalcolarli.',
  ].join('\n'),

  dna: [
    'DOVE SEI: schermata "Leggi il DNA". La squadra guarda una sequenza di DNA del caso codone per codone, con la traduzione in amminoacidi e un controllo qualità.',
    'COSA FANNO: leggono la sequenza e cercano di capire cosa codifica.',
    'OBIETTIVO: afferrare il legame DNA → codoni → proteina.',
    'NOTA PER TE: la traduzione e i codoni sono già calcolati dal codice; tu li spieghi, non li produci.',
  ].join('\n'),

  mutazioni: [
    'DOVE SEI: laboratorio "Mutazioni". La squadra introduce una mutazione e l\'app calcola l\'effetto ESATTO sulla sequenza della proteina (sostituzione, inserzione/delezione, frameshift…).',
    'COSA FANNO: provano mutazioni e osservano le conseguenze sulla proteina.',
    'OBIETTIVO: capire che tipo di mutazione conta e perché.',
    'NOTA PER TE: l\'effetto è calcolato dal codice; commenta il risultato, non calcolarlo tu.',
  ].join('\n'),

  dossier: [
    'DOVE SEI: il "Dossier". È il quaderno di squadra: raccoglie ciò che hanno salvato durante le indagini e che presenteranno alla giuria.',
    'COSA FANNO: rileggono, riordinano e traggono le loro conclusioni.',
    'OBIETTIVO: costruire un racconto coerente della loro scoperta, con parole loro.',
  ].join('\n'),
};

// Fatti concreti del caso del Giorno 0, da tenere sullo sfondo (con cautela).
const GIORNO0_FACTS = [
  `IL CASO (per te, non da svelare subito): la forma 3D è l'emoglobina umana (proteina ${GIORNO0_PROTEIN.name}, UniProt ${GIORNO0_PROTEIN.uniprot}), quella che trasporta l'ossigeno nel sangue.`,
  `Le due sequenze mostrate ("${GIORNO0_SEQ_A.label}" e "${GIORNO0_SEQ_B.label}") differiscono di UNA sola lettera: è la mutazione dell'anemia falciforme — il cuore didattico "una lettera cambia tutto".`,
  'REGOLA DEL GIORNO 0: NON anticipare tu le parole "proteina", "gene", "mutazione" né la soluzione. Emergono DOPO (Fase C), come nomi dati a cose già toccate. Prima si esplora senza etichette.',
].join('\n');

/** Scheda per ogni fase del Giorno 0 (ingresso a prerequisito zero). */
export const GIORNO0_PHASE_BRIEF: Record<Giorno0PhaseId, string> = {
  a: [
    'DOVE SEI: Giorno 0, Fase A · Apertura. Sullo schermo gira una forma 3D. La squadra può avere prerequisiti biologici ZERO e la parola "proteina" non è ancora stata pronunciata.',
    "COSA FANNO: la ruotano col mouse e scrivono un'impressione libera (a cosa somiglia, dove pare solida o fragile). Non c'è risposta giusta.",
    'IL TUO RUOLO QUI: parti dalla loro impressione e falli guardare meglio con UNA domanda. Non dire ancora che è una proteina, non fare biologia: qui conta la meraviglia.',
    GIORNO0_FACTS,
  ].join('\n'),
  b: [
    'DOVE SEI: Giorno 0, Fase B · Contatto. La squadra vede DUE sequenze quasi identiche e clicca il punto che secondo loro cambia (è una sola lettera).',
    'COSA FANNO: trovano la differenza e ragionano se una differenza così piccola possa contare molto o essere un dettaglio.',
    'IL TUO RUOLO QUI: parti da ciò che hanno notato; falli riflettere sul "quando una piccola differenza conta". Ancora niente termini tecnici né la soluzione.',
    GIORNO0_FACTS,
  ].join('\n'),
  c: [
    'DOVE SEI: Giorno 0, Fase C · Emersione. Solo ORA emergono le parole come didascalie di gesti già fatti: Proteina (la forma girata), Mutazione (il punto che cambiava), Gene (la sequenza confrontata).',
    'COSA FANNO: leggono le tre parole legate a ciò che hanno già toccato.',
    'IL TUO RUOLO QUI: ora puoi usare i termini, ma sempre agganciandoli a ciò che HANNO FATTO, non come lezione astratta. Una cosa alla volta.',
    GIORNO0_FACTS,
  ].join('\n'),
  d: [
    'DOVE SEI: Giorno 0, Fase D · Output. La squadra scrive la prima riga del proprio dossier: cosa li ha colpiti della forma e cosa hanno scoperto cambiando una lettera, con le parole nuove.',
    'COSA FANNO: sintetizzano in due righe la loro prima scoperta.',
    'IL TUO RUOLO QUI: aiutali a mettere in parole ciò che pensano loro, senza scrivere tu il testo né correggerlo come "giusto/sbagliato".',
    GIORNO0_FACTS,
  ].join('\n'),
};
