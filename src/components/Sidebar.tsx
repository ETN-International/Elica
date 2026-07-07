import { useState, type ReactNode } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  DAYS,
  dayActivities,
  ALL_ACTIVITIES,
  type DayActivity,
} from '../data/days';

export function Sidebar({
  page,
  onNavigate,
  open,
  onClose,
}: {
  page: PageId;
  onNavigate: (p: PageId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const { currentCase, progress, toggleUnit } = useStore();
  const doneSet = new Set(progress.unitsDone);

  // Apri di default la prima giornata non ancora completata.
  const firstIncomplete =
    DAYS.find((d) => dayActivities(d).some((act) => !doneSet.has(act.id)))?.n ??
    DAYS[0].n;
  const [openDay, setOpenDay] = useState<number>(firstIncomplete);

  const totalDone = ALL_ACTIVITIES.filter((act) => doneSet.has(act.id)).length;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-screen w-[300px] bg-ink text-paper flex flex-col px-5 pt-8 pb-5 z-50 transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-1 font-serif text-2xl leading-none tracking-tight">
          ETN <em className="text-accent not-italic italic">Genoma</em>
        </div>
        <div className="px-1 font-mono text-[9.5px] tracking-[.2em] uppercase text-ink-muted mt-2.5">
          SmartLab · Genomica
        </div>

        <div className="flex items-center justify-between px-1 mt-5 mb-1.5">
          <span className="font-mono text-[8.5px] tracking-[.2em] uppercase text-[#6b5f54]">
            Il percorso · 10 giorni
          </span>
          <span className="font-mono text-[8.5px] text-accent">
            {totalDone}/{ALL_ACTIVITIES.length}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto flex flex-col gap-0.5 -mr-2 pr-2">
          {DAYS.map((day) => {
            const acts = dayActivities(day);
            const done = acts.filter((act) => doneSet.has(act.id)).length;
            const complete = done === acts.length;
            const isOpen = openDay === day.n;
            return (
              <div key={day.n}>
                {/* Testata della giornata */}
                <button
                  onClick={() => setOpenDay(isOpen ? -1 : day.n)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition ${
                    isOpen ? 'bg-white/[0.06]' : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-mono font-medium leading-none"
                    style={{
                      background: complete ? 'var(--color-accent-2)' : 'rgba(200,66,10,.18)',
                      color: complete ? '#fff' : 'var(--color-accent)',
                    }}
                  >
                    {complete ? '✓' : `G${day.n}`}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-medium text-paper leading-tight truncate">
                      {day.title}
                    </span>
                    <span className="block font-mono text-[8px] tracking-[.06em] uppercase text-ink-muted truncate">
                      {day.focus}
                    </span>
                  </span>
                  <span className="font-mono text-[8.5px] text-ink-muted shrink-0">
                    {done}/{acts.length}
                  </span>
                  <span className="text-ink-muted text-[11px] shrink-0 w-2 text-center">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {/* Attività della giornata */}
                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-white/10 mb-2 mt-0.5">
                    <BlockLabel>Mattina</BlockLabel>
                    {day.morning.map((act) => (
                      <ActivityRow
                        key={act.id}
                        act={act}
                        page={page}
                        checked={doneSet.has(act.id)}
                        disabled={!!act.requiresCase && !currentCase}
                        onToggle={() => toggleUnit(act.id)}
                        onGo={() => {
                          if (act.page) {
                            onNavigate(act.page);
                            onClose();
                          }
                        }}
                      />
                    ))}
                    <BlockLabel>Pomeriggio</BlockLabel>
                    {day.afternoon.map((act) => (
                      <ActivityRow
                        key={act.id}
                        act={act}
                        page={page}
                        checked={doneSet.has(act.id)}
                        disabled={!!act.requiresCase && !currentCase}
                        onToggle={() => toggleUnit(act.id)}
                        onGo={() => {
                          if (act.page) {
                            onNavigate(act.page);
                            onClose();
                          }
                        }}
                      />
                    ))}
                    <div className="mt-1.5">
                      <ActivityRow
                        act={day.output}
                        page={page}
                        checked={doneSet.has(day.output.id)}
                        disabled={!!day.output.requiresCase && !currentCase}
                        onToggle={() => toggleUnit(day.output.id)}
                        onGo={() => {
                          if (day.output.page) {
                            onNavigate(day.output.page);
                            onClose();
                          }
                        }}
                        isOutput
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {currentCase && (
          <div className="px-1 font-mono text-[9px] tracking-[.06em] text-ink-muted border-t border-white/10 pt-3 mt-2 leading-relaxed">
            <div className="text-[#8a7f73] uppercase text-[8px] tracking-[.15em]">
              Indagine in corso
            </div>
            {currentCase.title}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-3 px-1">
          <div className="font-mono text-[8.5px] tracking-[.12em] uppercase text-ink-muted leading-loose">
            Creato da Axonforce
            <br />
            Erogato da ETN
          </div>
          <button
            onClick={() => onNavigate('valutazione')}
            className="text-right shrink-0"
            title="Avanzamento"
          >
            <div className="font-serif text-lg text-accent leading-none">
              {totalDone}/{ALL_ACTIVITIES.length}
            </div>
            <div className="font-mono text-[7.5px] tracking-[.14em] uppercase text-ink-muted">
              attività
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[8px] tracking-[.18em] uppercase text-[#6b5f54] px-1 pt-1.5 pb-0.5">
      {children}
    </div>
  );
}

function ActivityRow({
  act,
  page,
  checked,
  disabled,
  onToggle,
  onGo,
  isOutput,
}: {
  act: DayActivity;
  page: PageId;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onGo: () => void;
  isOutput?: boolean;
}) {
  const active = act.page === page;
  return (
    <div
      className={`flex items-start gap-2 rounded-md pr-1 ${
        active ? 'bg-[rgba(200,66,10,.16)]' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        title="Segna come svolta"
        className="ml-1 mt-1.5 h-3.5 w-3.5 shrink-0 disabled:opacity-30"
        style={{ accentColor: 'var(--color-accent-2)' }}
      />
      <button
        disabled={disabled || !act.page}
        onClick={onGo}
        className={`flex-1 text-left py-1 pr-1 text-[11.5px] leading-snug transition ${
          active
            ? 'text-white font-medium'
            : isOutput
              ? 'text-[#d9a389]'
              : checked
                ? 'text-[#7c9c8f]'
                : 'text-[#c9bfb4]'
        } ${act.page && !disabled ? 'hover:text-paper cursor-pointer' : 'cursor-default'} ${
          disabled ? 'opacity-35' : ''
        }`}
      >
        {act.label}
      </button>
    </div>
  );
}
