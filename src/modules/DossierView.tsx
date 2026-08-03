import { useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  Note,
  NoCaseNotice,
  Stepper,
  HowTo,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { dossierToHtml } from '../lib/dossier';
import { getCase } from '../data/cases';
import type { DossierEntry } from '../types';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';

const KIND_LABEL: Record<DossierEntry['kind'], string> = {
  domanda: 'La domanda',
  dna: 'La sequenza',
  confronto: 'Il confronto',
  proteina: 'La proteina 3D',
  conclusione: 'La conclusione',
};

/**
 * Da quale indagine viene una voce. Il dossier è cumulativo: senza questa
 * etichetta, al Giorno 7 la squadra vede venti voci di cinque casi diversi
 * tutte uguali.
 */
function entryCaseLabel(caseId?: string | null): string {
  if (!caseId) return 'Indagine';
  if (caseId === 'giorno0') return 'Giorno 0';
  if (caseId.startsWith('custom_')) return 'Indagine libera';
  return getCase(caseId)?.title ?? 'Indagine';
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'squadra'
  );
}

export function DossierView({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, dossier, addEntry, removeEntry, resetDossier } = useStore();
  const [conclusion, setConclusion] = useState('');

  // Il dossier è cumulativo e sopravvive al cambio di caso: si blocca solo se è
  // davvero vuoto. Dopo il Giorno 0 non c'è ancora un caso, ma la prima riga
  // scritta dalla squadra deve restare visibile.
  if (!currentCase && dossier.entries.length === 0) {
    return <NoCaseNotice moduleLabel="Il dossier" onNavigate={onNavigate} />;
  }

  // La domanda è considerata presente se esiste per il caso corrente.
  const hasQuestion = dossier.entries.some(
    (e) => e.kind === 'domanda' && (!e.caseId || e.caseId === dossier.caseId),
  );

  const exportTitle = `Dossier della squadra ${dossier.team || '—'}`;

  function exportHtml() {
    const html = dossierToHtml(dossier, exportTitle, entryCaseLabel);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier-${slugify(dossier.team)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const aiContext = [
    SCREEN_BRIEFINGS.dossier,
    currentCase ? `Caso in corso: ${currentCase.title}` : 'Nessuna indagine in corso.',
    currentCase ? `Domanda: ${currentCase.question}` : '',
    'Elementi già raccolti nel dossier:',
    ...dossier.entries.map(
      (e) => `- [${entryCaseLabel(e.caseId)} · ${KIND_LABEL[e.kind]}] ${e.title}: ${e.body}`,
    ),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="fade-up">
      <Stepper current="dossier" onNavigate={onNavigate} />
      <PageHeader
        eyebrow="Artefatto · Il dossier d'indagine"
        title={
          <>
            Il vostro <em className="text-accent not-italic italic">dossier</em>
          </>
        }
        dek="Il report scientifico navigabile che la squadra presenta alla giuria. Cresce modulo dopo modulo ed è esportabile."
      />

      <HowTo
        steps={[
          'Rileggi il percorso: ogni passo che avete salvato dai moduli.',
          'Scrivi la conclusione della squadra (il tutor può aiutarvi).',
          'Esporta il dossier e presentalo alla giuria.',
        ]}
      />

      <div className="flex items-baseline justify-between border-t border-rule pt-4">
        <div>
          <div className="font-serif text-xl text-ink">
            {currentCase ? currentCase.title : 'Il percorso della squadra'}
          </div>
          <div className="text-[13px] text-ink-muted italic">
            Squadra: {dossier.team || '—'}
            {currentCase ? ' · indagine in corso' : ' · nessuna indagine in corso'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dossier.entries.length > 0 && (
            <button
              onClick={() => {
                if (
                  confirm(
                    'Azzerare tutto? Verranno eliminate le voci raccolte, il nome della squadra e i nomi dei componenti. Usalo quando il computer passa a un\'altra squadra.',
                  )
                ) {
                  resetDossier();
                }
              }}
              className="rounded-lg border border-rule px-3 py-2 text-sm text-ink-muted hover:text-accent hover:border-accent/40 transition"
            >
              Azzera
            </button>
          )}
          <button
            onClick={exportHtml}
            disabled={dossier.entries.length === 0}
            className="rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 transition hover:bg-ink-light"
          >
            Esporta il dossier ↓
          </button>
        </div>
      </div>

      {currentCase && !hasQuestion && (
        <Note label="Inizia dalla domanda" tone="amber">
          Aggiungi la domanda biologica scelta dalla squadra: è il filo che lega tutta
          l'indagine.{' '}
          <button
            className="text-accent font-medium hover:underline"
            onClick={() =>
              addEntry({
                kind: 'domanda',
                title: 'La domanda della squadra',
                body: currentCase.question,
              })
            }
          >
            Usa la domanda del caso
          </button>
          .
        </Note>
      )}

      {!currentCase && (
        <Note label="Il vostro percorso è salvo">
          Qui resta tutto quello che avete raccolto finora — anche la prima riga
          scritta nel Giorno 0. Quando scegliete un'indagine, le nuove voci si
          aggiungono in fondo.{' '}
          <button
            onClick={() => onNavigate('home')}
            className="text-accent font-medium hover:underline"
          >
            Vai al catalogo delle indagini →
          </button>
        </Note>
      )}

      <Sub>Il percorso, passo dopo passo</Sub>
      <p className="text-[14px] mb-3">
        Un dossier non dice solo <em>cosa</em> avete scoperto, ma <strong>come</strong> ci
        siete arrivati: siamo partiti da una domanda, abbiamo letto, confrontato, trovato,
        guardato e concluso. In scienza il metodo conta quanto il risultato.
      </p>
      {dossier.entries.length === 0 ? (
        <p className="text-[15px] text-ink-muted italic">
          Il dossier è ancora vuoto. Torna nei moduli e usa «Aggiungi al dossier» per
          raccogliere i risultati.
        </p>
      ) : (
        <div className="space-y-0">
          {dossier.entries.map((e, i) => (
            <div key={e.id} className="py-4 border-b border-rule group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <span className="font-serif text-2xl text-accent leading-none pt-0.5 min-w-7">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-mono text-[9px] tracking-[.14em] uppercase text-accent">
                      {KIND_LABEL[e.kind]}
                      <span className="text-ink-muted normal-case tracking-normal">
                        {' · '}
                        {entryCaseLabel(e.caseId)}
                      </span>
                    </div>
                    <div className="font-serif text-lg text-ink mt-0.5">{e.title}</div>
                    <p className="text-[14px] text-ink-light mt-1">{e.body}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(e.id)}
                  className="text-ink-muted hover:text-accent text-xs shrink-0 opacity-0 group-hover:opacity-100 transition"
                  title="Rimuovi"
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sub>Scrivi la conclusione</Sub>
      <p className="text-[14px] mb-2">
        Cosa ha scoperto la squadra rispondendo alla domanda iniziale? Scrivila voi;
        il tutor può aiutarvi a migliorarla.
      </p>
      <textarea
        value={conclusion}
        onChange={(e) => setConclusion(e.target.value)}
        rows={4}
        placeholder="La nostra indagine ha mostrato che…"
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
      />
      <button
        onClick={() => {
          if (!conclusion.trim()) return;
          addEntry({
            kind: 'conclusione',
            title: 'La conclusione della squadra',
            body: conclusion.trim(),
          });
          setConclusion('');
        }}
        disabled={!conclusion.trim()}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-accent-3/40 bg-[rgba(45,74,138,.07)] px-4 py-2 text-sm font-medium text-accent-3 hover:bg-[rgba(45,74,138,.13)] disabled:opacity-40 transition"
      >
        ＋ Aggiungi la conclusione al dossier
      </button>

      <div className="mt-6">
        <AiTutor
          title="Il tutor aiuta a scrivere"
          cardine="Rileggete le voci raccolte: qual \u00e8 la scoperta pi\u00f9 importante che avete fatto? Provate a dirla in due righe, come la direste a un compagno che non era con voi."
          context={aiContext}
          intro="Ho sotto mano tutto quello che avete raccolto. Chiedimi di aiutarvi a scrivere la conclusione o a formulare meglio la domanda."
          suggestions={[
            'Aiutami a scrivere la conclusione',
            'La nostra domanda è ben posta?',
            'Cosa manca al dossier?',
          ]}
        />
      </div>
    </div>
  );
}
