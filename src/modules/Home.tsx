import type { PageId } from '../App';
import { THEMES, casesByTheme } from '../data/cases';
import { useStore } from '../store';
import { PageHeader, Note, Difficulty } from '../components/ui';
import { casiSvolti } from '../lib/progresso';

export function Home({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, selectCase, dossier, progress } = useStore();

  // La squadra arriva qui a freddo, spesso senza sapere cosa sia un gene: prima
  // del catalogo deve vedere DA DOVE SI COMINCIA, e a che punto è già.
  const haSquadra = !!dossier.team?.trim();
  const haFattoGiorno0 =
    progress.unitsDone.includes('d1-m0') ||
    dossier.entries.some((e) => e.caseId === 'giorno0');

  const passi = [
    {
      fatto: haSquadra,
      titolo: 'Formate la squadra',
      testo: 'Un nome e i componenti: comparirà sul dossier che presenterete.',
      azione: 'Vai alla squadra',
      page: 'squadra' as PageId,
    },
    {
      fatto: haFattoGiorno0,
      titolo: 'Fate il Giorno 0',
      testo:
        'Mezz\'ora senza parole difficili: una forma che gira, due sequenze quasi uguali, e le parole arrivano dopo. Si parte da qui anche senza sapere nulla di biologia.',
      azione: 'Comincia dal Giorno 0',
      page: 'giorno0' as PageId,
    },
    {
      fatto: !!currentCase,
      titolo: "Scegliete la prima indagine",
      testo: 'Le trovate qui sotto. Consigliata la prima: «Emoglobina».',
      azione: null,
      page: 'home' as PageId,
    },
  ];
  const prossimo = passi.find((p) => !p.fatto);

  /**
   * Il cambio di passo, dichiarato.
   *
   * Dalla terza indagine in poi il percorso non introduce più gesti nuovi: la
   * squadra rifà gli stessi tre su casi diversi. È didatticamente giusto — la
   * padronanza si costruisce ripetendo su materiale nuovo — ma l'app continuava
   * a chiamarla scoperta, e lo studente sentiva lo scarto: «il caso è diverso ma
   * io faccio le stesse cose, e ormai le faccio senza pensarci». Dirlo cambia
   * l'esperienza senza cambiare l'attività: non è più ripetizione, è autonomia.
   */
  const cambioDiPasso = casiSvolti(dossier) >= 3;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Inizio · Il SmartLab di Genomica"
        title={
          <>
            Fai vera <em className="text-accent not-italic italic">scienza</em> del DNA
          </>
        }
        dek="Scegli un'indagine, guarda la proteina in 3D, confronta i geni e leggi il DNA. L'AI ti guida; i dati esatti vengono da banche scientifiche vere."
      />

      {/* Volutamente indipendente dalla bussola d'avvio: una squadra che ha già
          fatto tre indagini deve vedere il cambio di passo anche se, per come è
          andata l'aula, si è saltata un pezzo dell'avvio. */}
      {cambioDiPasso && (
        <div className="rounded-xl border border-accent-3/30 bg-[rgba(45,74,138,.06)] px-5 py-5 mb-8">
          <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2">
            Il percorso cambia passo
          </div>
          <p className="font-serif text-[22px] text-ink leading-snug mb-2">
            Da qui in poi non vi insegniamo più niente di nuovo.
          </p>
          <p className="text-[15px] text-ink-light">
            I tre gesti li conoscete: guardare la forma, confrontare le sequenze,
            leggere le lettere. Nelle prossime indagini non cambiano gli
            strumenti — cambia chi li usa. Prima ve li mettevamo in mano noi, uno
            alla volta, spiegandoli; adesso è la squadra a decidere da quale
            partire e perché.
          </p>
          <p className="text-[15px] text-ink-light mt-2">
            Se una spiegazione vi serve ancora, c'è: i riquadri «Che cosa stai
            guardando» ora sono chiusi, e si aprono solo se li aprite voi.
          </p>
        </div>
      )}

      {/* Bussola d'avvio: sempre visibile finché il giro non è completo. */}
      {prossimo && (
        <div className="rounded-xl border border-accent/30 bg-[rgba(200,66,10,.05)] px-5 py-5 mb-8">
          <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent mb-3">
            Da dove si comincia
          </div>
          <ol className="space-y-2.5 mb-4">
            {passi.map((p, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono mt-0.5 ${
                    p.fatto
                      ? 'bg-accent-2 text-white'
                      : p === prossimo
                        ? 'bg-accent text-white'
                        : 'bg-white/60 text-ink-muted border border-rule'
                  }`}
                >
                  {p.fatto ? '✓' : i + 1}
                </span>
                <span className={p.fatto ? 'opacity-55' : ''}>
                  <span className="text-[15px] text-ink font-medium">{p.titolo}</span>
                  {p === prossimo && (
                    <span className="block text-[13.5px] text-ink-light mt-0.5">
                      {p.testo}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {prossimo.azione && (
            <button
              onClick={() => onNavigate(prossimo.page)}
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition cta-pulse"
            >
              {prossimo.azione} <span className="nudge">→</span>
            </button>
          )}
          {!prossimo.azione && (
            <p className="text-[13.5px] text-ink-muted">
              👇 Scegliete un'indagine dall'elenco qui sotto.
            </p>
          )}
        </div>
      )}

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
