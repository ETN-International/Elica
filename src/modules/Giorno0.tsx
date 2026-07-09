import { useEffect, useMemo, useState } from 'react';
import type { PageId } from '../App';
import type { AlphaFoldModel } from '../types';
import { useStore } from '../store';
import { PageHeader, Note } from '../components/ui';
import { PhaseTutor } from '../components/PhaseTutor';
import { MolstarViewer } from '../components/MolstarViewer';
import { fetchAlphaFoldModel } from '../lib/alphafold';
import { alignSequences } from '../lib/alignment';
import { cleanDna } from '../lib/dna';
import {
  GIORNO0_PHASES,
  GIORNO0_PROTEIN,
  GIORNO0_SEQ_A,
  GIORNO0_SEQ_B,
  GIORNO0_WORDS,
} from '../data/giorno0';
import { GIORNO0_PHASE_BRIEF } from '../data/tutorBriefings';

export function Giorno0({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = GIORNO0_PHASES[phaseIdx];

  return (
    <div className="fade-up">
      {/* Progresso a fasi */}
      <div className="flex items-center gap-2 mb-6 select-none">
        {GIORNO0_PHASES.map((ph, i) => (
          <div key={ph.id} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              onClick={() => i <= phaseIdx && setPhaseIdx(i)}
              disabled={i > phaseIdx}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-mono transition ${
                i < phaseIdx
                  ? 'bg-accent-2 text-white'
                  : i === phaseIdx
                    ? 'bg-accent text-white'
                    : 'bg-paper-2 text-ink-muted border border-rule'
              }`}
            >
              {i < phaseIdx ? '✓' : ph.id.toUpperCase()}
            </button>
            {i < GIORNO0_PHASES.length - 1 && (
              <span
                className="flex-1 h-px min-w-3"
                style={{
                  background: i < phaseIdx ? 'var(--color-accent-2)' : 'var(--color-rule)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <PageHeader
        eyebrow={`Giorno 0 · ${phase.tag}`}
        title={
          phaseIdx === 0 ? (
            <>
              Prima la <em className="text-accent not-italic italic">meraviglia</em>, poi la
              parola
            </>
          ) : (
            phase.name
          )
        }
        dek={phaseIdx === 0 ? 'Nessuno deve sapere cos\'è un gene per iniziare. Si parte da una forma che gira.' : undefined}
      />

      {phase.id === 'a' && (
        <PhaseA
          onNext={() => setPhaseIdx(1)}
          appSays={phase.appSays}
          cardine={phase.cardine}
          tag={phase.tag}
          brief={GIORNO0_PHASE_BRIEF.a}
        />
      )}
      {phase.id === 'b' && (
        <PhaseB
          onNext={() => setPhaseIdx(2)}
          appSays={phase.appSays}
          cardine={phase.cardine}
          tag={phase.tag}
          brief={GIORNO0_PHASE_BRIEF.b}
        />
      )}
      {phase.id === 'c' && (
        <PhaseC onNext={() => setPhaseIdx(3)} onNavigate={onNavigate} />
      )}
      {phase.id === 'd' && (
        <PhaseD
          appSays={phase.appSays}
          cardine={phase.cardine}
          tag={phase.tag}
          brief={GIORNO0_PHASE_BRIEF.d}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

// ── Fase A · la forma che gira ──────────────────────────────────────────
function PhaseA({
  onNext,
  appSays,
  cardine,
  tag,
  brief,
}: {
  onNext: () => void;
  appSays: string;
  cardine: string;
  tag: string;
  brief: string;
}) {
  const [model, setModel] = useState<AlphaFoldModel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAlphaFoldModel(GIORNO0_PROTEIN.uniprot)
      .then((m) => !cancelled && setModel(m))
      .catch((e) => !cancelled && setErr(String(e instanceof Error ? e.message : e)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {model ? (
        <MolstarViewer url={model.modelUrl} format={model.format} />
      ) : err ? (
        <Note label="Struttura non disponibile ora" tone="amber">
          Non si riesce a scaricare la forma 3D (serve la rete). Potete comunque
          proseguire: {err}
        </Note>
      ) : (
        <div className="molstar-wrap flex items-center justify-center text-[#e8e0d4] font-mono text-sm">
          Carico la forma 3D…
        </div>
      )}

      <div className="rounded-xl border border-accent-3/25 bg-[rgba(45,74,138,.06)] px-5 py-4 my-5">
        <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2">
          {tag}
        </div>
        <p className="text-[15.5px] text-ink-light">{appSays}</p>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        aria-label="La vostra impressione sulla forma"
        placeholder="Ci ricorda un… (un groviglio, un nodo, un fiore?)"
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setSubmitted(input.trim() || '(nessuna impressione scritta)')}
          className="rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-ink-light transition"
        >
          Ho scritto la mia impressione
        </button>
        <button
          onClick={onNext}
          className="text-sm font-mono text-accent hover:underline"
        >
          Prosegui <span className="nudge">→</span>
        </button>
      </div>

      {submitted && (
        <PhaseTutor phaseLabel={tag} teamInput={submitted} cardine={cardine} brief={brief} />
      )}
    </>
  );
}

// ── Fase B · trova le differenze ────────────────────────────────────────
function PhaseB({
  onNext,
  appSays,
  cardine,
  tag,
  brief,
}: {
  onNext: () => void;
  appSays: string;
  cardine: string;
  tag: string;
  brief: string;
}) {
  const result = useMemo(
    () => alignSequences(GIORNO0_SEQ_A.dna, GIORNO0_SEQ_B.dna, 'A', 'B'),
    [],
  );
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [submitted, setSubmitted] = useState('');

  const a = cleanDna(GIORNO0_SEQ_A.dna);
  const b = cleanDna(GIORNO0_SEQ_B.dna);

  function clickBase(i: number) {
    if (result.matchLine[i] === ' ' && a[i] !== '-' && b[i] !== '-') {
      setFound(true);
      setWrong(false);
    } else {
      setWrong(true);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-accent-3/25 bg-[rgba(45,74,138,.06)] px-5 py-4 my-5">
        <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2">
          {tag}
        </div>
        <p className="text-[15.5px] text-ink-light">{appSays}</p>
      </div>

      <div className="seq-scroll overflow-x-auto rounded-lg bg-paper-2 p-4">
        <div className="min-w-max font-mono text-[14px] leading-relaxed">
          <div className="flex">
            <span className="w-8 shrink-0 text-ink-muted text-[10px] pt-1">1</span>
            <span className="whitespace-pre">
              {a.split('').map((ch, i) => (
                <span
                  key={i}
                  className={result.matchLine[i] === '|' ? 'text-accent-2' : 'text-accent font-bold'}
                >
                  {ch}
                </span>
              ))}
            </span>
          </div>
          <div className="flex">
            <span className="w-8 shrink-0" />
            <span className="whitespace-pre">
              {b.split('').map((ch, i) => {
                const isDiff = result.matchLine[i] === ' ';
                const isTheOne = found && isDiff;
                return (
                  <button
                    key={i}
                    onClick={() => clickBase(i)}
                    className={`${
                      isTheOne
                        ? 'bg-accent text-white rounded'
                        : isDiff
                          ? 'text-accent font-bold hover:bg-accent/15 rounded'
                          : 'text-accent-2 hover:bg-black/5 rounded'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </span>
          </div>
        </div>
      </div>

      {found ? (
        <Note label="Trovato!">
          Proprio lì: una sola lettera diversa. Tenete a mente la domanda — una
          differenza così piccola può contare molto, o è un dettaglio? Scrivete cosa ne
          pensate.
        </Note>
      ) : wrong ? (
        <p className="text-[13.5px] text-accent mt-2">
          Non è quello il punto: guardate meglio dove i colori non combaciano.
        </p>
      ) : (
        <p className="text-[13.5px] text-ink-muted mt-2">
          Cliccate sulla riga di sotto la lettera che secondo voi è diversa.
        </p>
      )}

      <TeamAnswer
        placeholder="Secondo noi conta… perché…"
        onSubmit={(txt) => setSubmitted(txt)}
        disabled={!found}
        hint={!found ? 'Prima trovate la differenza qui sopra.' : ''}
      />

      <div className="mt-2 flex flex-wrap gap-3 items-center">
        <button
          onClick={onNext}
          className="text-sm font-mono text-accent hover:underline"
        >
          Prosegui <span className="nudge">→</span>
        </button>
      </div>

      {submitted && (
        <PhaseTutor phaseLabel={tag} teamInput={submitted} cardine={cardine} brief={brief} />
      )}
    </>
  );
}

// ── Fase C · emersione delle parole ─────────────────────────────────────
function PhaseC({
  onNext,
  onNavigate,
}: {
  onNext: () => void;
  onNavigate: (p: PageId) => void;
}) {
  return (
    <>
      <p className="text-[15.5px] mt-4">
        Adesso — solo dopo aver girato la forma e trovato la differenza — diamo un nome a
        ciò che avete toccato. Non è una lezione: sono le didascalie di quello che avete
        già fatto.
      </p>
      <div className="space-y-3 mt-4">
        {GIORNO0_WORDS.map((w) => (
          <div key={w.word} className="rounded-xl border border-rule bg-white/40 p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-2xl text-accent">{w.word}</span>
              <span className="text-[13px] text-ink-muted italic">
                = {w.gesture}
              </span>
            </div>
            <p className="text-[14.5px] text-ink-light mt-1.5">{w.meaning}</p>
          </div>
        ))}
      </div>

      <Note label="Se volete andare più a fondo">
        La teoria è lì quando vi serve, non prima: aprite le{' '}
        <button
          onClick={() => onNavigate('teoria')}
          className="text-accent font-medium hover:underline"
        >
          schede di teoria
        </button>{' '}
        se un concetto vi incuriosisce. Chi ha capito dal gesto può proseguire.
      </Note>

      <div className="mt-4">
        <button
          onClick={onNext}
          className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Ultima cosa: il vostro output <span className="nudge">→</span>
        </button>
      </div>
    </>
  );
}

// ── Fase D · la prima riga del dossier ──────────────────────────────────
function PhaseD({
  appSays,
  cardine,
  tag,
  brief,
  onNavigate,
}: {
  appSays: string;
  cardine: string;
  tag: string;
  brief: string;
  onNavigate: (p: PageId) => void;
}) {
  const { addEntry } = useStore();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState('');

  return (
    <>
      <div className="rounded-xl border border-accent-3/25 bg-[rgba(45,74,138,.06)] px-5 py-4 my-5">
        <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2">
          {tag}
        </div>
        <p className="text-[15.5px] text-ink-light">{appSays}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={4}
        aria-label="La prima riga del dossier"
        placeholder="La forma ci è sembrata… e cambiando una lettera abbiamo scoperto che…"
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => {
            if (!text.trim()) return;
            addEntry({
              kind: 'confronto',
              caseId: 'giorno0',
              title: 'Giorno 0 · La prima scoperta',
              body: text.trim(),
            });
            setSaved(true);
            setSubmitted(text.trim());
          }}
          disabled={!text.trim()}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            text.trim() ? 'bg-accent hover:opacity-90 cta-pulse' : 'bg-ink-muted opacity-40'
          }`}
        >
          {saved ? '✓ Salvato nel dossier' : 'Salva la prima riga del dossier'}
        </button>
      </div>

      {saved && (
        <>
          <Note label="Fatto!">
            È la prima riga del vostro dossier — il racconto che presenterete alla giuria.
            Da domani si indaga per davvero, un caso alla volta.{' '}
            <button
              onClick={() => onNavigate('home')}
              className="text-accent font-medium hover:underline"
            >
              Vai al catalogo delle indagini →
            </button>
          </Note>
          <PhaseTutor phaseLabel={tag} teamInput={submitted} cardine={cardine} />
        </>
      )}
    </>
  );
}

// Piccolo campo risposta della squadra con submit.
function TeamAnswer({
  placeholder,
  onSubmit,
  disabled,
  hint,
}: {
  placeholder: string;
  onSubmit: (txt: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const [v, setV] = useState('');
  return (
    <div className="mt-4">
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={2}
        disabled={disabled}
        aria-label="La risposta della squadra"
        placeholder={placeholder}
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent disabled:opacity-50"
      />
      <div className="mt-1.5 flex items-center gap-3">
        <button
          onClick={() => v.trim() && onSubmit(v.trim())}
          disabled={disabled || !v.trim()}
          className="rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 transition hover:bg-ink-light"
        >
          Abbiamo scritto
        </button>
        {hint && <span className="text-[12.5px] text-ink-muted">{hint}</span>}
      </div>
    </div>
  );
}
