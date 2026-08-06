/**
 * I ruoli di squadra, a rotazione giornaliera.
 *
 * Il problema che risolvono è banale e universale: chi prende il mouse il primo
 * giorno lo tiene per sessanta ore, e gli altri guardano. In un'aula paneuropea
 * a prerequisiti zero il ragazzo che cede il mouse è quasi sempre quello che ha
 * meno basi o meno confidenza con la lingua — cioè esattamente quello per cui il
 * lab esiste.
 *
 * Due scelte deliberate:
 *  - i ruoli sono definiti per GESTO, non per competenza. "Chi tiene il dossier"
 *    si può fare senza sapere nulla di biologia; "l'esperto di genetica" no. Un
 *    ruolo che richiede basi esclude proprio chi andrebbe incluso.
 *  - li assegna e li mostra l'APP, non l'host. L'host è uno stagista e non deve
 *    gestire dinamiche di gruppo: deve poter dire "guardate lo schermo".
 *
 * Non sono badge e non danno punti: sono turni.
 */

export interface Ruolo {
  id: string;
  nome: string;
  /** Che cosa fa, detto con un gesto concreto. */
  gesto: string;
  emoji: string;
}

export const RUOLI: Ruolo[] = [
  {
    id: 'schermo',
    nome: 'Chi guida lo schermo',
    gesto: 'tiene il mouse: ruota la 3D, clicca, apre i moduli. Non decide da solo: fa quello che la squadra dice.',
    emoji: '🖱️',
  },
  {
    id: 'dossier',
    nome: 'Chi tiene il dossier',
    gesto: 'scrive nel dossier quello che la squadra decide di salvare. È la memoria del gruppo.',
    emoji: '📓',
  },
  {
    id: 'tutor',
    nome: 'Chi parla con il tutor',
    gesto: 'formula le domande al tutor AI e legge le risposte agli altri. Se una risposta non si capisce, insiste.',
    emoji: '💬',
  },
  {
    id: 'racconto',
    nome: 'Chi racconta agli altri',
    gesto: "spiega a voce cosa ha capito la squadra, quando si incontra un'altra squadra e alla giuria.",
    emoji: '🗣️',
  },
];

/**
 * Chi fa cosa, in un dato giorno.
 *
 * La rotazione è deterministica — stesso giorno, stessa assegnazione, anche se
 * si ricarica la pagina — e ruota di uno al giorno, così in quattro giorni tutti
 * hanno tenuto il mouse almeno una volta. `scambi` è il numero di volte che la
 * squadra ha premuto "scambiamoci i ruoli": l'app propone, la squadra decide.
 */
export function assegnazione(
  membri: string[],
  giorno: number,
  scambi = 0,
): { ruolo: Ruolo; chi: string }[] {
  const nomi = membri.map((m) => m.trim()).filter(Boolean);
  if (nomi.length === 0) return [];
  return RUOLI.map((ruolo, i) => ({
    ruolo,
    // Con meno di quattro persone qualcuno prende due ruoli: è normale, e i due
    // ruoli restano diversi giorno per giorno.
    chi: nomi[(i + giorno + scambi) % nomi.length],
  }));
}

/** Quali ruoli tocca a una persona in un dato giorno (per il riepilogo). */
export function ruoliDi(
  nome: string,
  membri: string[],
  giorno: number,
  scambi = 0,
): Ruolo[] {
  return assegnazione(membri, giorno, scambi)
    .filter((a) => a.chi === nome.trim())
    .map((a) => a.ruolo);
}
