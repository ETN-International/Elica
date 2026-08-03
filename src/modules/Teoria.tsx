import { useState } from 'react';
import type { PageId } from '../App';
import { PageHeader, Note, HowTo } from '../components/ui';
import { THEORY } from '../data/theory';

export function Teoria({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [open, setOpen] = useState<string | null>(THEORY[0]?.id ?? null);

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Impara · Schede di teoria"
        title={
          <>
            La <em className="text-accent not-italic italic">teoria</em>, in breve
          </>
        }
        dek="Otto schede essenziali per capire cosa fai in laboratorio. Clicca su una scheda per aprirla."
      />

      <HowTo
        steps={[
          "Non serve leggerle tutte: apri la scheda della parola che ti serve adesso.",
          "Ogni scheda si legge in un minuto.",
          "Se qualcosa resta oscuro, chiedilo al tutor dentro il modulo su cui stai lavorando.",
        ]}
      />

      <div className="space-y-2">
        {THEORY.map((card) => {
          const isOpen = open === card.id;
          return (
            <div key={card.id} className="rounded-xl border border-rule bg-white/40 overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : card.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div>
                  <div className="font-serif text-lg text-ink">{card.title}</div>
                  {!isOpen && (
                    <div className="text-[13px] text-ink-muted italic">{card.short}</div>
                  )}
                </div>
                <span className="text-accent text-lg shrink-0">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-[14.5px] text-ink-light">{card.body}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Note label="Come si usa">
        Non serve studiare tutto prima di iniziare: apri la scheda che ti serve quando ti
        serve. Il tutor AI dentro ai moduli è lì per spiegarti ogni concetto con parole tue.
      </Note>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate('quiz')}
          className="rounded-lg border border-rule bg-white/40 px-5 py-2.5 text-sm font-medium text-ink hover:border-ink-muted transition"
        >
          Mettiti alla prova col quiz
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
