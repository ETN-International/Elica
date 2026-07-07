import type { PageId } from '../App';
import { PageHeader, Stat } from '../components/ui';
import { PROGRAM, TOTAL_HOURS } from '../data/theory';

export function Programma({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Il SmartLab · Programma"
        title={
          <>
            Il percorso in <em className="text-accent not-italic italic">60 ore</em>
          </>
        }
        dek="Il laboratorio si svolge in sei tappe: dalla teoria di base al progetto autonomo, fino alla presentazione alla giuria."
      />

      <div className="flex flex-wrap gap-6 border-t border-rule pt-4 mb-6">
        <Stat value={TOTAL_HOURS} label="ore totali" />
        <Stat value={PROGRAM.length} label="tappe" />
        <Stat value="3" label="moduli scientifici" />
        <Stat value="9+" label="casi + modalità libera" />
      </div>
      <p className="text-[13px] text-ink-muted mb-4">
        Il piano delle attività, tappa per tappa. Nel menu a sinistra ogni schermata si
        può spuntare come svolta man mano che la squadra avanza.
      </p>

      <div className="space-y-0">
        {PROGRAM.map((stage) => (
          <div key={stage.n} className="flex gap-5 py-5 border-b border-rule">
            <div className="shrink-0 text-center w-14">
              <div className="font-serif text-3xl text-accent leading-none">{stage.n}</div>
              <div className="font-mono text-[10px] text-ink-muted mt-1">
                {stage.hours}h
              </div>
            </div>
            <div className="flex-1">
              <div className="font-serif text-xl text-ink">{stage.title}</div>
              <p className="text-[14px] text-ink-light italic mt-0.5">{stage.goal}</p>
              <ul className="mt-2 space-y-1">
                {stage.activities.map((a, i) => (
                  <li key={i} className="text-[13.5px] text-ink-light pl-4 relative">
                    <span className="absolute left-0 text-accent">›</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-8">
        <button
          onClick={() => onNavigate('teoria')}
          className="rounded-lg border border-rule bg-white/40 px-5 py-2.5 text-sm font-medium text-ink hover:border-ink-muted transition"
        >
          Ripassa la teoria
        </button>
        <button
          onClick={() => onNavigate('home')}
          className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Inizia un'indagine →
        </button>
      </div>
    </div>
  );
}
