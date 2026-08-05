import { useEffect, useRef, useState } from 'react';
import { askTutorProactive, isAiConfigured } from '../lib/ai';
import { AiTutor } from './AiTutor';

/**
 * Il tutor PROATTIVO del Giorno 0: è lui ad aprire, dopo che la squadra ha
 * scritto qualcosa. Ma la sua domanda NON è un cartello morto: diventa il primo
 * messaggio di una conversazione vera (AiTutor), così i ragazzi possono
 * rispondergli e lui rilancia.
 *
 * - Se l'AI è attiva: l'apertura è una domanda personalizzata su ciò che hanno
 *   scritto, e la chat prosegue.
 * - Se l'AI è offline o non configurata: scopre la "rete" e mostra come apertura
 *   la domanda-cardine cablata di questa fase. L'app resta conducente comunque e
 *   l'host può raccoglierla a voce.
 */
export function PhaseTutor({
  phaseLabel,
  teamInput,
  cardine,
  brief,
}: {
  phaseLabel: string;
  teamInput: string;
  cardine: string;
  /** Scheda della fase: cos'è, cosa fa la squadra, il ruolo del tutor qui. */
  brief?: string;
}) {
  // Apertura del tutor: null = ancora da decidere; poi la domanda (AI o cablata).
  const [intro, setIntro] = useState<string | null>(null);
  // true quando l'apertura è la domanda-cardine di riserva (AI non disponibile).
  const [fallback, setFallback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Senza proxy configurato non ha senso interrogare l'AI: apri con la cardine.
    if (!isAiConfigured()) {
      setIntro(cardine);
      setFallback(true);
      return;
    }
    const c = new AbortController();
    abortRef.current = c;
    setIntro(null);
    setFallback(false);
    askTutorProactive({ phase: phaseLabel, teamInput, brief, signal: c.signal })
      .then((r) => {
        setIntro(r || cardine);
        setFallback(!r);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Rete di riserva: la domanda-cardine di questa fase.
        setIntro(cardine);
        setFallback(true);
      });
    return () => c.abort();
  }, [phaseLabel, teamInput, cardine, brief]);

  // Nota: AiTutor resta SEMPRE montato, anche mentre l'apertura è in arrivo.
  // Smontarlo (com'era prima) cancellava tutta la conversazione ogni volta che
  // la squadra rilanciava il proprio testo.
  return (
    <div className="mt-4">
      {intro === null && (
        <p className="text-[#8a7f73] text-[12px] italic mb-1 px-1">
          Il tutor sta preparando una domanda…
        </p>
      )}
      <AiTutor
        title={fallback ? 'Una domanda per voi' : 'Il tutor rilancia'}
        intro={intro ?? undefined}
        context={[
          brief,
          `${phaseLabel}. La squadra ha appena scritto: "${
            teamInput || '(ancora nulla)'
          }". Continua a facilitare a partire dalle loro risposte.`,
        ]
          .filter(Boolean)
          .join('\n')}
      />
      <p className="text-[#8a7f73] text-[12px] italic mt-2 px-1">
        Potete rispondergli qui sotto o tirare dritto: decidete voi.
      </p>
    </div>
  );
}
