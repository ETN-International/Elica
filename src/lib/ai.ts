import type { ChatMessage } from '../types';

/**
 * Client dell'AI-interprete.
 *
 * Il browser NON parla mai direttamente con il modello AI né conosce la chiave
 * API: chiama la Edge Function (proxy) il cui URL sta in VITE_AI_PROXY_URL.
 * La function inoltra al modello con il prompt di sistema anti-allucinazione.
 *
 * Se il proxy non è configurato, l'app resta pienamente usabile per i dati veri
 * (3D, allineamento, lettura DNA); solo il tutor risponde con un avviso.
 */

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isAiConfigured(): boolean {
  return typeof PROXY_URL === 'string' && PROXY_URL.length > 0;
}

export interface AskAiOptions {
  /** Domanda/istruzione dell'utente. */
  prompt: string;
  /**
   * Contesto GIÀ CALCOLATO da passare all'AI (allineamento, metadati AlphaFold,
   * sequenza tradotta...). L'AI lo commenta, non lo ricalcola.
   */
  context?: string;
  /** Storia della conversazione, per continuità. */
  history?: ChatMessage[];
  /** Segnale di annullamento. */
  signal?: AbortSignal;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "Il tutor AI non è ancora configurato. Imposta VITE_AI_PROXY_URL con l'URL della Edge Function. " +
        'Nel frattempo i moduli scientifici (lettura DNA, confronto, proteina 3D) funzionano lo stesso.',
    );
    this.name = 'AiNotConfiguredError';
  }
}

/**
 * Invia una domanda al tutor AI tramite il proxy e restituisce la risposta
 * in italiano. Lancia AiNotConfiguredError se il proxy non è impostato.
 */
export async function askAi(opts: AskAiOptions): Promise<string> {
  if (!isAiConfigured()) {
    throw new AiNotConfiguredError();
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ANON_KEY) {
    headers['Authorization'] = `Bearer ${ANON_KEY}`;
    headers['apikey'] = ANON_KEY;
  }

  const res = await fetch(PROXY_URL as string, {
    method: 'POST',
    headers,
    signal: opts.signal,
    body: JSON.stringify({
      prompt: opts.prompt,
      context: opts.context ?? '',
      history: opts.history ?? [],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error ?? '';
    } catch {
      /* ignora */
    }
    throw new Error(
      `Il tutor AI ha risposto con un errore (${res.status}). ${detail}`.trim(),
    );
  }

  const data = (await res.json()) as { reply?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return data.reply?.trim() ?? '';
}
