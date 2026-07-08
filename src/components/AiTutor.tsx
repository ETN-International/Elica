import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';
import { AiNotConfiguredError, askAi, isAiConfigured } from '../lib/ai';

interface AiTutorProps {
  /** Titolo del pannello (es. "Chiedi al tutor"). */
  title?: string;
  /**
   * Contesto già calcolato da passare all'AI a ogni domanda
   * (allineamento, metadati AlphaFold, traduzione...). Aggiornato dal modulo.
   */
  context?: string;
  /** Suggerimenti di domanda mostrati come pulsanti. */
  suggestions?: string[];
  /** Messaggio introduttivo del tutor. */
  intro?: string;
}

/**
 * Pannello di dialogo con l'AI-interprete. Accompagna ogni modulo: spiega,
 * confronta a parole, guida le ipotesi. Riceve il contesto già calcolato.
 */
export function AiTutor({
  title = 'Chiedi al tutor',
  context,
  suggestions = [],
  intro,
}: AiTutorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    intro ? [{ role: 'assistant', content: intro }] : [],
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    isAiConfigured()
      ? null
      : 'Tutor AI non ancora collegato: i moduli scientifici funzionano comunque.',
  );
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Allo smontaggio del componente, annulla la richiesta al tutor in volo.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput('');
    const history = messages;
    const next: ChatMessage[] = [...history, { role: 'user', content: question }];
    setMessages(next);
    setBusy(true);
    setNotice(null);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askAi({
        prompt: question,
        context,
        history,
        signal: controller.signal,
      });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // componente smontato: nessun aggiornamento di stato
      }
      if (err instanceof AiNotConfiguredError) {
        setNotice(err.message);
        setMessages(history); // togli la domanda rimasta senza risposta
      } else {
        setMessages([
          ...next,
          {
            role: 'assistant',
            content: `Ops, qualcosa non va con il tutor: ${String(
              err instanceof Error ? err.message : err,
            )}`,
          },
        ]);
      }
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo(0, listRef.current.scrollHeight);
      });
    }
  }

  return (
    <div className="rounded-xl bg-ink text-paper p-5 flex flex-col">
      <div className="font-mono text-[10px] tracking-[.18em] uppercase text-[#e8935f] mb-3">
        {title}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-3 max-h-80 min-h-24 pr-1"
      >
        {messages.length === 0 && (
          <p className="text-[#c9bfb4] text-sm italic">
            Scrivi una domanda o scegli un suggerimento qui sotto.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'text-right'
                : 'text-left'
            }
          >
            <div
              className={
                m.role === 'user'
                  ? 'inline-block bg-[#3a342e] rounded-lg px-3 py-2 text-sm text-paper max-w-[85%] text-left'
                  : 'inline-block text-[#ece4d7] text-sm leading-relaxed max-w-[92%]'
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="text-[#c9bfb4] text-sm italic">Il tutor sta pensando…</div>
        )}
      </div>

      {notice && (
        <div className="mt-3 text-[12.5px] text-[#e8b79f] bg-[#2a1712] rounded-md px-3 py-2">
          {notice}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="font-mono text-[11px] rounded-full border border-[#4a423a] px-3 py-1.5 text-[#d9cfc3] hover:bg-[#2a2620] disabled:opacity-40 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Domanda al tutor"
          placeholder="Fai una domanda al tutor…"
          className="flex-1 rounded-lg bg-[#2a2620] border border-[#4a423a] px-3 py-2 text-sm text-paper placeholder:text-[#8a7f73] focus:outline-none focus:border-[#e8935f]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
