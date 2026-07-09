import type { PageId } from '../App';
import { THEMES, casesByTheme } from '../data/cases';
import { useStore } from '../store';
import { PageHeader, Note, Difficulty } from '../components/ui';

export function Home({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, selectCase } = useStore();

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Inizio · Il SmartLab di Genomica"
        title={
          <>
            Fai vera <em className="text-accent not-italic italic">scienza</em> del DNA
          </>
        }
        dek="Scegli un'indagine, leggi il DNA, confronta i geni e guarda la proteina in 3D. L'AI ti guida; i dati esatti vengono da banche scientifiche vere."
      />

      {THEMES.map((theme) => {
        const cases = casesByTheme(theme);
        if (cases.length === 0) return null;
        return (
          <div key={theme} className="mb-8">
            <h2 className="font-serif text-2xl text-ink mb-1">{theme}</h2>
            <div className="h-px bg-rule mb-4" />
            <div className="grid gap-4 md:grid-cols-3">
              {cases.map((c) => {
                const active = currentCase?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      selectCase(c.id);
                      // Mobilità: si parte dalla forma 3D (concreta), non dal DNA.
                      onNavigate('protein');
                    }}
                    className={`text-left rounded-xl border p-5 transition-all duration-200 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(26,23,20,.3)] ${
                      active
                        ? 'border-accent bg-[rgba(200,66,10,.05)]'
                        : 'border-rule bg-white/40 hover:border-ink-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[9px] tracking-[.14em] uppercase text-accent">
                        {c.protein.uniprot}
                      </span>
                      {c.difficulty && <Difficulty level={c.difficulty} />}
                    </div>
                    <div className="font-serif text-lg text-ink mb-2 leading-snug">
                      {c.title}
                    </div>
                    <p className="text-[13px] text-ink-light flex-1">{c.question}</p>
                    <span className="mt-3 font-mono text-[11px] text-accent">
                      Inizia l'indagine →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-accent-3/30 bg-[rgba(45,74,138,.06)] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-serif text-xl text-ink">Vuoi scegliere tu la proteina?</div>
          <p className="text-[14px] text-ink-light mt-1 max-w-lg">
            Nella <strong>modalità libera</strong> la squadra parte da un gene o una
            proteina a scelta: l'app scarica la struttura 3D vera e vi fa usare gli stessi
            moduli.
          </p>
        </div>
        <button
          onClick={() => onNavigate('libera')}
          className="rounded-lg bg-accent-3 text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition shrink-0"
        >
          Crea la tua indagine →
        </button>
      </div>

      <Note label="Perché casi pre-preparati">
        Invece di far cercare i ragazzi in database sterminati (dove si perderebbero come
        in Galaxy), partiamo da casi curati — sequenze già scelte, domande già poste. Ogni
        caso punta a una struttura 3D <strong>vera</strong> su AlphaFold DB. Quando siete
        pronti, la modalità libera toglie le rotelle.
      </Note>
    </div>
  );
}
