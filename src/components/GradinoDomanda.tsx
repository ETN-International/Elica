import { useState } from 'react';
import type { Case, Dossier } from '../types';
import { casiSvolti, TITOLO_DOMANDA_PROPRIA } from '../lib/progresso';
import { Fase } from './ui';

export { TITOLO_DOMANDA_PROPRIA };

/**
 * Il gradino di autonomia sulla domanda.
 *
 * Per sei giornate la domanda d'indagine gliel'abbiamo data noi; al Giorno 8
 * devono scriverla da soli, e sarà il loro progetto davanti alla giuria. In
 * mezzo non c'era niente: si passava da "leggi la domanda" a "inventa la
 * domanda" senza mai averci provato una volta con la rete sotto.
 *
 * Qui, all'ultima indagine preparata, la domanda dell'app resta coperta finché
 * la squadra non ha scritto la propria. Poi si vedono affiancate — e NON si dà
 * un voto: la nostra non è la risposta giusta, è solo una domanda a cui si può
 * rispondere con i tre gesti che hanno in mano. Se la loro è diversa, meglio:
 * fra due giorni servirà esattamente quello.
 */

/**
 * Il gradino si accende all'ultima indagine preparata (la quarta o oltre) e
 * solo sui casi del catalogo: in modalità libera la domanda è già tutta loro.
 */
export function serveIlGradino(caso: Case, dossier: Dossier): boolean {
  if (caso.custom) return false;
  if (giaScritta(caso, dossier)) return false;
  return casiSvolti(dossier) >= 3;
}

/** La squadra ha già scritto la propria domanda per questa indagine? */
export function giaScritta(caso: Case, dossier: Dossier): boolean {
  return dossier.entries.some(
    (e) => e.caseId === caso.id && e.title === TITOLO_DOMANDA_PROPRIA,
  );
}

export function GradinoDomanda({
  caso,
  onSalva,
}: {
  caso: Case;
  /** Salva la domanda della squadra nel dossier: è già un pezzo di progetto. */
  onSalva: (testo: string) => void;
}) {
  const [testo, setTesto] = useState('');
  const [scritta, setScritta] = useState<string | null>(null);

  if (scritta) {
    return (
      <Fase
        n={0}
        titolo="La vostra domanda e la nostra"
        perche="Le mettiamo una accanto all'altra. Non per dire quale è giusta — non c'è una risposta giusta — ma per vedere in che cosa differiscono due domande sullo stesso caso."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-accent-2/40 bg-[rgba(26,107,82,.06)] px-4 py-3">
            <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-2 mb-1.5">
              La vostra
            </div>
            <p className="text-[15px] text-ink leading-snug">{scritta}</p>
          </div>
          <div className="rounded-lg border border-rule bg-white/40 px-4 py-3">
            <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent mb-1.5">
              La nostra
            </div>
            <p className="text-[15px] text-ink leading-snug">{caso.question}</p>
          </div>
        </div>
        <p className="text-[14px] text-ink-light mt-3 border-l-2 border-accent-2 pl-3">
          La nostra non è più giusta della vostra: è solo una domanda scelta
          perché ci si può rispondere con i tre gesti che avete in mano — guardare
          la forma, confrontare due sequenze, leggere il DNA. Provate a chiedervi:
          con quale gesto si risponde alla vostra? Se non ce n'è uno, non è una
          domanda sbagliata — è una domanda per un altro strumento.
        </p>
        <p className="text-[13.5px] text-ink-muted mt-2">
          La vostra domanda è finita nel dossier. Al Giorno 8, quando l'indagine
          sarà tutta vostra, partirete da lì.
        </p>
      </Fase>
    );
  }

  return (
    <Fase
      n={0}
      titolo="Prima di leggere la nostra domanda"
      perche="Fin qui la domanda ve l'abbiamo data noi. Fra due giorni dovrete scriverla da soli, e sarà il vostro progetto: tanto vale provarci adesso, che c'è ancora la rete."
    >
      <div className="rounded-lg border border-rule bg-white/40 px-4 py-3 mb-3">
        <p className="text-[15px] text-ink">
          <strong>{caso.title}</strong>
        </p>
        <p className="text-[14px] text-ink-light mt-1 leading-snug">{caso.intro}</p>
        <p className="text-[13px] text-ink-muted mt-2">
          La proteina in gioco è <strong>{caso.protein.name}</strong>
          {caso.sequences.length >= 2
            ? `, e avete due sequenze da confrontare: ${caso.sequences[0].label} e ${caso.sequences[1].label}.`
            : '.'}
        </p>
      </div>

      <p className="text-[14.5px] text-ink-light mb-2">
        Con questo davanti: <strong>che cosa chiedereste voi?</strong> Una domanda
        sola, quella a cui vorreste rispondere entro stasera.
      </p>
      <textarea
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        rows={2}
        aria-label="La domanda che avremmo fatto noi"
        placeholder="Noi ci chiederemmo…"
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
      />
      <button
        onClick={() => {
          const t = testo.trim();
          if (t.length < 10) return;
          onSalva(t);
          setScritta(t);
        }}
        disabled={testo.trim().length < 10}
        className="mt-2 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-ink-light transition"
      >
        Scritta — ora mostrateci la vostra
      </button>
      {testo.trim().length > 0 && testo.trim().length < 10 && (
        <span className="ml-3 text-[13px] text-ink-muted">
          Ancora qualche parola.
        </span>
      )}
    </Fase>
  );
}
