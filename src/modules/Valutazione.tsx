import type { PageId } from '../App';
import { useStore } from '../store';
import { PageHeader, Sub, Note } from '../components/ui';
import { QUIZZES, CHALLENGES } from '../data/quiz';

/** Criteri della rubrica che la giuria (e la squadra) usano per valutare il dossier. */
const RUBRIC = [
  {
    c: 'La domanda',
    good: 'La domanda biologica è chiara e ben posta.',
  },
  {
    c: 'I dati',
    good: 'Le sequenze e la struttura 3D sono state lette e capite, non solo mostrate.',
  },
  {
    c: 'La scoperta',
    good: 'La differenza/mutazione trovata è spiegata: cosa cambia e cosa comporta.',
  },
  {
    c: 'Il metodo',
    good: 'Il dossier racconta il percorso (domanda → analisi → scoperta → conclusione).',
  },
  {
    c: "L'uso dell'AI",
    good: "La squadra sa distinguere ciò che ha spiegato l'AI da ciò che viene dai dati veri.",
  },
  {
    c: 'La conclusione',
    good: 'La conclusione risponde alla domanda iniziale con parole della squadra.',
  },
];

interface Badge {
  id: string;
  label: string;
  earned: boolean;
  hint: string;
}

export function Valutazione({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { dossier, progress } = useStore();

  const kinds = new Set(dossier.entries.map((e) => e.kind));
  const badges: Badge[] = [
    {
      id: 'lettore',
      label: 'Lettore di DNA',
      earned: kinds.has('dna'),
      hint: 'Salva una sequenza letta nel dossier.',
    },
    {
      id: 'detective',
      label: 'Detective del gene',
      earned: kinds.has('confronto'),
      hint: 'Salva un confronto o una mutazione nel dossier.',
    },
    {
      id: 'strutturista',
      label: 'Esploratore 3D',
      earned: kinds.has('proteina'),
      hint: 'Salva una proteina 3D nel dossier.',
    },
    {
      id: 'quiz',
      label: 'Mente allenata',
      earned: progress.quizPassed.length >= QUIZZES.length,
      hint: `Supera tutti i ${QUIZZES.length} quiz (${progress.quizPassed.length}/${QUIZZES.length}).`,
    },
    {
      id: 'sfide',
      label: 'Squadra tosta',
      earned: progress.challengesDone.length >= CHALLENGES.length,
      hint: `Completa tutte le ${CHALLENGES.length} sfide (${progress.challengesDone.length}/${CHALLENGES.length}).`,
    },
    {
      id: 'ricercatore',
      label: 'Ricercatore completo',
      earned: kinds.has('conclusione'),
      hint: 'Scrivi la conclusione nel dossier.',
    },
  ];
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Giuria · Valutazione"
        title={
          <>
            Rubrica e <em className="text-accent not-italic italic">badge</em>
          </>
        }
        dek="Come si valuta un'indagine e a che punto è la vostra squadra. La rubrica è la stessa che userà la giuria."
      />

      <Sub>I vostri badge · {earned}/{badges.length}</Sub>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-xl border p-4 text-center transition ${
              b.earned
                ? 'border-accent-2/50 bg-[rgba(26,107,82,.08)]'
                : 'border-rule bg-white/30'
            }`}
          >
            <div
              className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xl"
              style={{
                background: b.earned ? 'var(--color-accent-2)' : 'var(--color-paper-2)',
                color: b.earned ? '#fff' : 'var(--color-ink-muted)',
              }}
            >
              {b.earned ? '★' : '☆'}
            </div>
            <div className={`font-serif text-[16px] ${b.earned ? 'text-ink' : 'text-ink-muted'}`}>
              {b.label}
            </div>
            <div className="text-[12px] text-ink-muted mt-1">{b.hint}</div>
          </div>
        ))}
      </div>

      <Sub>La rubrica della giuria</Sub>
      <div className="matrix-wrap overflow-x-auto">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 border-b-2 border-ink font-mono text-[10px] tracking-[.13em] uppercase text-accent">
                Criterio
              </th>
              <th className="text-left py-2 border-b-2 border-ink font-mono text-[10px] tracking-[.13em] uppercase text-accent">
                Cosa cerca la giuria
              </th>
            </tr>
          </thead>
          <tbody>
            {RUBRIC.map((r) => (
              <tr key={r.c}>
                <td className="py-3 pr-4 border-b border-rule font-serif text-ink align-top w-40">
                  {r.c}
                </td>
                <td className="py-3 border-b border-rule text-ink-light align-top">
                  {r.good}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note label="Non è un voto">
        La rubrica non serve a dare un numero, ma a capire se l'indagine è solida e
        raccontata bene. Usatela come lista di controllo prima di presentare alla giuria.
      </Note>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate('dossier')}
          className="rounded-lg border border-rule bg-white/40 px-5 py-2.5 text-sm font-medium text-ink hover:border-ink-muted transition"
        >
          Torna al dossier
        </button>
        <button
          onClick={() => onNavigate('quiz')}
          className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Vai ai quiz e alle sfide →
        </button>
      </div>
    </div>
  );
}
