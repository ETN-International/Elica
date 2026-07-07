import { useEffect, useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import { PageHeader, Sub, Note } from '../components/ui';
import { QUIZZES, CHALLENGES, type QuizSet } from '../data/quiz';

export function Quiz({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { progress, toggleChallenge } = useStore();

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Impara · Quiz e sfide"
        title={
          <>
            Mettiti alla <em className="text-accent not-italic italic">prova</em>
          </>
        }
        dek="Tre quiz veloci per consolidare, e alcune sfide da completare come squadra durante il laboratorio."
      />

      {QUIZZES.map((q) => (
        <QuizSetView key={q.id} set={q} />
      ))}

      <Sub>Le sfide della squadra</Sub>
      <p className="text-[14px] mb-3">
        Obiettivi concreti da raggiungere durante il percorso. Spuntateli quando li
        completate.
      </p>
      <div className="space-y-2">
        {CHALLENGES.map((c) => {
          const done = progress.challengesDone.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleChallenge(c.id)}
              className={`w-full flex items-start gap-3 text-left rounded-lg border px-4 py-3 transition ${
                done ? 'border-accent-2/50 bg-[rgba(26,107,82,.07)]' : 'border-rule bg-white/40 hover:border-ink-muted'
              }`}
            >
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: done ? 'var(--color-accent-2)' : 'var(--color-rule)' }}
              >
                {done ? '✓' : ''}
              </span>
              <span>
                <span className="font-serif text-[16px] text-ink">{c.title}</span>
                <span className="block text-[13.5px] text-ink-light">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Note label="A cosa servono">
        Quiz e sfide non danno un voto: servono a voi per capire cosa avete imparato e cosa
        vale la pena rivedere. I progressi contano per i badge nella pagina Valutazione.
      </Note>

      <div className="mt-6">
        <button
          onClick={() => onNavigate('valutazione')}
          className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Vedi i tuoi badge →
        </button>
      </div>
    </div>
  );
}

function QuizSetView({ set }: { set: QuizSet }) {
  const { markQuizPassed, progress } = useStore();
  const [answers, setAnswers] = useState<(number | null)[]>(
    set.questions.map(() => null),
  );

  const answeredAll = answers.every((a) => a !== null);
  const allCorrect =
    answeredAll && answers.every((a, i) => a === set.questions[i].correct);

  useEffect(() => {
    if (allCorrect && !progress.quizPassed.includes(set.id)) {
      markQuizPassed(set.id);
    }
  }, [allCorrect, progress.quizPassed, set.id, markQuizPassed]);

  const correctCount = answers.filter(
    (a, i) => a === set.questions[i].correct,
  ).length;

  return (
    <div className="mb-8">
      <Sub>{set.title}</Sub>
      <div className="space-y-4">
        {set.questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <div key={qi} className="rounded-xl border border-rule bg-white/40 p-4">
              <div className="text-[15px] text-ink font-medium mb-2">
                {qi + 1}. {q.question}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isCorrect = oi === q.correct;
                  let cls = 'border-rule bg-white/50 hover:border-ink-muted text-ink-light';
                  if (chosen !== null) {
                    if (isCorrect) cls = 'border-accent-2 bg-[rgba(26,107,82,.1)] text-accent-2';
                    else if (isChosen) cls = 'border-accent bg-[rgba(200,66,10,.08)] text-accent';
                    else cls = 'border-rule bg-white/30 text-ink-muted';
                  }
                  return (
                    <button
                      key={oi}
                      disabled={chosen !== null}
                      onClick={() =>
                        setAnswers((a) => a.map((v, k) => (k === qi ? oi : v)))
                      }
                      className={`text-left rounded-lg border px-3 py-2 text-[14px] transition ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen !== null && (
                <p className="text-[13px] text-ink-muted mt-2">
                  {chosen === q.correct ? '✓ Giusto! ' : '✗ '}
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {answeredAll && (
        <div
          className="mt-3 rounded-lg px-4 py-3 text-[14px]"
          style={{
            background: allCorrect ? 'rgba(26,107,82,.1)' : 'rgba(200,66,10,.08)',
            color: allCorrect ? 'var(--color-accent-2)' : 'var(--color-accent)',
          }}
        >
          {allCorrect
            ? '✓ Quiz superato! Complimenti.'
            : `Hai ${correctCount}/${set.questions.length} risposte giuste. `}
          {!allCorrect && (
            <button
              onClick={() => setAnswers(set.questions.map(() => null))}
              className="underline font-medium"
            >
              Riprova
            </button>
          )}
        </div>
      )}
    </div>
  );
}
