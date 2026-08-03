import { useEffect, useRef, useState } from 'react';
import type { ChatAttachment, ChatMessage } from '../types';
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
  /**
   * Domanda di riserva, cablata nell'app: si mostra quando il tutor non è
   * disponibile. In aula la rete può mancare o il modello essere spento, e la
   * squadra deve avere comunque qualcosa su cui ragionare — è la promessa fatta
   * a chi conduce nella pagina "Per chi conduce".
   */
  cardine?: string;
}

/** Estensioni/tipi accettati come allegato. */
const ACCEPT = 'image/*,.txt,.csv,.tsv,.md,.json,.fasta,.fa,.fna,.seq,.pdb';
const MAX_ATTACHMENTS = 4;
/** Oltre questo non si legge nemmeno: sarebbero decine di MB di base64. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Pannello di dialogo con l'AI-interprete. Accompagna ogni modulo: spiega,
 * confronta a parole, guida le ipotesi. Riceve il contesto già calcolato e può
 * ricevere ALLEGATI (immagini che il modello multimodale vede, file di testo).
 */
export function AiTutor({
  title = 'Chiedi al tutor',
  context,
  suggestions = [],
  intro,
  cardine,
}: AiTutorProps) {
  const aiOff = !isAiConfigured();
  const apertura = aiOff && cardine ? cardine : intro;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    apertura ? [{ role: 'assistant', content: apertura }] : [],
  );
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  /** true mentre si stanno leggendo file: senza, un allegato ancora in
   *  lavorazione finirebbe nel messaggio SUCCESSIVO. */
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    isAiConfigured()
      ? null
      : 'Il tutor non è disponibile su questa postazione — tutto il resto funziona: osservate, confrontate e leggete come al solito.',
  );
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Allo smontaggio del componente, annulla la richiesta al tutor in volo.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // L'apertura del tutor cambia quando cambia ciò che la schermata mostra (per
  // esempio si passa a un'altra sequenza in "Leggi il DNA", o il tutor proattivo
  // del Giorno 0 finisce di pensare). Finché la squadra non ha ancora scritto,
  // il primo messaggio deve seguire: altrimenti il tutor parla di ciò che non
  // c'è più. A conversazione avviata invece non si tocca nulla.
  useEffect(() => {
    if (!apertura) return;
    setMessages((prev) => {
      if (prev.some((m) => m.role === 'user')) return prev;
      if (prev.length === 1 && prev[0].content === apertura) return prev;
      return [{ role: 'assistant', content: apertura }];
    });
  }, [apertura]);

  // Legge i file scelti: immagini → data URL (ridotte a 1024px), testo → contenuto.
  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    if (files.length > MAX_ATTACHMENTS) {
      setNotice(`Puoi allegare al massimo ${MAX_ATTACHMENTS} file per messaggio.`);
    }
    const read: ChatAttachment[] = [];
    setReading(true);
    try {
      for (const f of files) {
        try {
          if (f.type.startsWith('image/')) {
            if (f.size > MAX_IMAGE_BYTES) {
              setNotice(`"${f.name}" è troppo grande (max 10 MB).`);
              continue;
            }
            read.push({ kind: 'image', name: f.name, dataUrl: await downscaleImage(f) });
          } else {
            if (f.size > 1_000_000) {
              setNotice(`"${f.name}" è troppo grande da leggere come testo.`);
              continue;
            }
            read.push({ kind: 'text', name: f.name, text: await f.text() });
          }
        } catch {
          // Tipico con gli HEIC di iPhone: il browser non li decodifica.
          setNotice(
            `Non riesco a leggere "${f.name}". Se è una foto dell'iPhone, prova a salvarla come JPEG.`,
          );
        }
      }
      setPending((p) => [...p, ...read].slice(0, MAX_ATTACHMENTS));
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function send(text: string) {
    const question = text.trim();
    const atts = pending;
    if ((!question && atts.length === 0) || busy || reading) return;
    setInput('');
    setPending([]);
    const history = messages;
    const userMsg: ChatMessage = {
      role: 'user',
      content: question,
      attachments: atts.length ? atts : undefined,
    };
    const next: ChatMessage[] = [...history, userMsg];
    setMessages(next);
    setBusy(true);
    setNotice(null);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askAi({
        prompt:
          question ||
          'Dai un’occhiata a cosa ho allegato e aiutami a ragionarci su.',
        context,
        history,
        attachments: atts,
        signal: controller.signal,
      });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // componente smontato: nessun aggiornamento di stato
      }
      if (err instanceof AiNotConfiguredError) {
        // Non cancello ciò che la squadra ha scritto: rimetto testo e allegati
        // nel campo, così non devono riscrivere né riallegare.
        setNotice(err.message);
        setMessages(history);
        setInput(question);
        setPending(atts);
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
        {aiOff && cardine ? 'Una domanda per voi' : title}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-3 max-h-80 min-h-24 pr-1"
      >
        {aiOff && cardine && (
          <p className="text-[#8a7f73] text-[12px] italic">
            Discutetene fra voi e scrivete la vostra risposta nel project work qui
            sopra: è quella che conta per la giuria.
          </p>
        )}
        {messages.length === 0 && !(aiOff && cardine) && (
          <p className="text-[#c9bfb4] text-sm italic">
            Scrivi una domanda, allega un file 📎, o scegli un suggerimento qui sotto.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.content && (
              <div
                className={
                  m.role === 'user'
                    ? 'inline-block bg-[#3a342e] rounded-lg px-3 py-2 text-sm text-paper max-w-[85%] text-left'
                    : 'inline-block text-[#ece4d7] text-sm leading-relaxed max-w-[92%]'
                }
              >
                {m.content}
              </div>
            )}
            {m.attachments && m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5 justify-end">
                {m.attachments.map((a, k) =>
                  a.kind === 'image' && a.dataUrl ? (
                    <img
                      key={k}
                      src={a.dataUrl}
                      alt={a.name}
                      className="h-20 rounded-lg border border-[#4a423a] object-cover"
                    />
                  ) : (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-[11px] text-[#c9bfb4] bg-[#2a2620] rounded px-2 py-1"
                    >
                      📄 {a.name}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="text-[#c9bfb4] text-sm italic">Il tutor sta pensando…</div>
        )}
        {reading && (
          <div className="text-[#c9bfb4] text-sm italic">Sto aprendo il file…</div>
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

      {/* Anteprima degli allegati in attesa di invio */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pending.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-[#2a2620] border border-[#4a423a] px-2 py-1 text-[12px] text-[#d9cfc3]"
            >
              {a.kind === 'image' && a.dataUrl ? (
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-8 w-8 object-cover rounded"
                />
              ) : (
                <span>📄</span>
              )}
              <span className="max-w-[140px] truncate">{a.name}</span>
              <button
                onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                className="text-[#8a7f73] hover:text-paper"
                aria-label={`Togli ${a.name}`}
              >
                ✕
              </button>
            </div>
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
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || reading || pending.length >= MAX_ATTACHMENTS}
          title="Allega un'immagine o un file"
          aria-label="Allega un file"
          className="rounded-lg bg-[#2a2620] border border-[#4a423a] px-3 py-2 text-[#d9cfc3] hover:bg-[#332e27] disabled:opacity-40 transition"
        >
          📎
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Domanda al tutor"
          placeholder="Fai una domanda o allega un file…"
          className="flex-1 rounded-lg bg-[#2a2620] border border-[#4a423a] px-3 py-2 text-sm text-paper placeholder:text-[#8a7f73] focus:outline-none focus:border-[#e8935f]"
        />
        <button
          type="submit"
          disabled={busy || reading || (!input.trim() && pending.length === 0)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition"
        >
          Invia
        </button>
      </form>
    </div>
  );
}

/**
 * Riduce un'immagine a max 1024px di lato e la restituisce come data URL JPEG.
 * Se il browser non sa decodificarla (per esempio un HEIC di iPhone) LANCIA:
 * meglio dirlo alla squadra che spedire al modello megabyte che non può leggere.
 */
async function downscaleImage(file: File): Promise<string> {
  const original = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('decode'));
    im.src = original;
  });

  const MAX = 1024;
  let { width, height } = img;
  if (!width || !height) throw new Error('decode');
  if (width > MAX || height > MAX) {
    const s = MAX / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // Fondo bianco: l'uscita è JPEG (senza trasparenza) e senza questo una PNG
  // ritagliata arriverebbe al tutor tutta nera.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
