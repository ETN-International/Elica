import type { ChatMessage, ChatAttachment } from '../types';

/**
 * Client dell'AI-interprete (il "tutor-facilitatore").
 *
 * DUE possibili cervelli, in ordine di preferenza:
 *
 *  1. AXON BRAIN — un DGX Spark sulla rete/Tailscale che serve Qwen3.5-122B con
 *     un endpoint OpenAI-compatibile (llama.cpp). Configurato via VITE_SPARK_URL.
 *     Il browser lo chiama DIRETTAMENTE (l'endpoint ha CORS aperto): costo per
 *     token = 0. Il prompt di sistema del facilitatore viaggia col messaggio.
 *
 *  2. PROXY ANTHROPIC — la Edge Function (VITE_AI_PROXY_URL) che inoltra a Claude
 *     con la chiave lato server. Usato come alternativa se lo Spark non c'è.
 *
 * In entrambi i casi vale la regola d'oro: i dati scientifici esatti arrivano nel
 * CONTESTO (già calcolati da codice/AlphaFold); l'AI li commenta, non li produce.
 * Se nessuno dei due è configurato, l'app resta usabile per i dati veri (3D,
 * allineamento, lettura DNA) e il tutor mostra un avviso / la rete di riserva.
 */

// ── Configurazione ────────────────────────────────────────────────────────
// Axon Brain (Spark): es. VITE_SPARK_URL=http://100.72.206.121:8088/v1
const SPARK_URL = (import.meta.env.VITE_SPARK_URL as string | undefined)?.replace(/\/+$/, '');
const SPARK_MODEL =
  (import.meta.env.VITE_SPARK_MODEL as string | undefined) ??
  'unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL';

// Proxy Anthropic (alternativa)
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function hasSpark(): boolean {
  return typeof SPARK_URL === 'string' && SPARK_URL.length > 0;
}
function hasProxy(): boolean {
  return typeof PROXY_URL === 'string' && PROXY_URL.length > 0;
}

export function isAiConfigured(): boolean {
  return hasSpark() || hasProxy();
}

/** Quale cervello è attivo (per messaggi/diagnostica). */
export function aiBackend(): 'spark' | 'proxy' | 'none' {
  if (hasSpark()) return 'spark';
  if (hasProxy()) return 'proxy';
  return 'none';
}

// Il tutor facilita il ragionamento MA sa anche orientare quando serve: non è un
// muro socratico. NB: identico allo SYSTEM_PROMPT della Edge Function, così il
// comportamento è lo stesso sia via Spark (prompt lato client) sia via proxy.
export const FACILITATOR_SYSTEM_PROMPT = [
  "Sei il tutor dell'app ETN Genoma, usata da squadre di studenti di scuola",
  'superiore di tutta Europa, che possono NON avere basi di biologia. Parli sempre',
  'in italiano semplice, come a un ragazzo di quindici anni. Sei conciso: di norma',
  '1-3 frasi, senza giri di parole.',
  '',
  'IL TUO STILE: aiuti la squadra a ragionare con la propria testa. Non fai il',
  'lavoro al posto loro e non riveli la "scoperta" dell\'indagine — a quella devono',
  'arrivare loro. Ma facilitare NON vuol dire negare aiuto.',
  '',
  'COME TI COMPORTI:',
  '1. Rispondi SEMPRE a ciò che hanno appena scritto. Se fanno una domanda diretta o',
  '   basilare ("cos\'è?", "non capisco", "di cosa si tratta?"), dai PRIMA una',
  '   risposta breve e chiara (1-2 frasi) che dia loro un appiglio; poi, se utile,',
  '   una domanda leggera. Restare bloccati non è imparare.',
  '2. Se propongono un\'ipotesi non dire "giusto" o "sbagliato": esplorala con loro,',
  '   fai notare qualcosa, chiedi come potrebbero verificarla.',
  '3. NON ripetere una domanda che hai già fatto: se non l\'hanno raccolta, cambia',
  '   angolo o chiarisci. Varia il modo di aprire — niente frasi-formula ripetute.',
  '4. Una cosa alla volta. Lascia spazio: la squadra può ignorarti e proseguire.',
  '',
  'REGOLE SCIENTIFICHE (non violarle mai):',
  '5. NON calcolare mai allineamenti, né inventare strutture, numeri, percentuali,',
  '   posizioni o amminoacidi. I dati esatti ti arrivano nel CONTESTO, già calcolati',
  '   da strumenti veri (algoritmo di allineamento, AlphaFold): commentali, non',
  "   produrli. Se un dato non c'è nel contesto, dillo, non inventarlo.",
].join('\n');

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
  /** File allegati a QUESTO messaggio (immagini da vedere, testo da leggere). */
  attachments?: ChatAttachment[];
  /** Segnale di annullamento. */
  signal?: AbortSignal;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      'Il tutor AI non è ancora configurato. Imposta VITE_SPARK_URL (Axon Brain sul DGX Spark) ' +
        'oppure VITE_AI_PROXY_URL (proxy Anthropic). ' +
        'Nel frattempo i moduli scientifici (lettura DNA, confronto, proteina 3D) funzionano lo stesso.',
    );
    this.name = 'AiNotConfiguredError';
  }
}

/**
 * Costruisce il messaggio di SISTEMA: prompt facilitatore + eventuale contesto
 * (dati veri della schermata), inserito UNA volta soltanto. Così la domanda dello
 * studente viaggia come in una chat normale, senza essere reincollata sopra il
 * contesto a ogni turno (che faceva fissare il modello sull'ultima cosa scritta).
 */
function buildSystem(context?: string): string {
  if (!context) return FACILITATOR_SYSTEM_PROMPT;
  return (
    `${FACILITATOR_SYSTEM_PROMPT}\n\n` +
    '─── CONTESTO DI QUESTA SCHERMATA (dati già calcolati da strumenti veri: ' +
    'commentali, non ricalcolarli; NON è un messaggio della squadra) ───\n' +
    context
  );
}

/** Rimuove eventuali blocchi di ragionamento <think>…</think> dei modelli Qwen. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Contenuto di un messaggio OpenAI-compatibile: testo semplice o parti miste. */
type SparkPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };
type SparkContent = string | SparkPart[];

/**
 * Costruisce il contenuto del messaggio utente unendo la domanda e gli allegati:
 * i file di testo finiscono nel testo, le immagini come parti `image_url` che il
 * modello multimodale (Qwen3.5) vede davvero.
 */
function buildUserContent(prompt: string, attachments?: ChatAttachment[]): SparkContent {
  const imgs = (attachments ?? []).filter((a) => a.kind === 'image' && a.dataUrl);
  const texts = (attachments ?? []).filter((a) => a.kind === 'text' && a.text);

  let text = prompt;
  for (const t of texts) {
    text += `\n\n─── File allegato: ${t.name} ───\n${(t.text ?? '').slice(0, 12000)}`;
  }
  if (imgs.length === 0) return text;
  return [
    { type: 'text', text },
    ...imgs.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl as string } })),
  ];
}

/**
 * Invia una domanda al tutor AI e restituisce la risposta in italiano.
 * Sceglie automaticamente Axon Brain (Spark) o il proxy Anthropic.
 * Lancia AiNotConfiguredError se nessun cervello è impostato.
 */
export async function askAi(opts: AskAiOptions): Promise<string> {
  if (hasSpark()) return askSpark(opts);
  if (hasProxy()) return askProxy(opts);
  throw new AiNotConfiguredError();
}

// ── Axon Brain (DGX Spark, OpenAI-compatibile) ─────────────────────────────
async function askSpark(opts: AskAiOptions): Promise<string> {
  const history = (opts.history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content.toString().slice(0, 4000) }));

  const messages: { role: string; content: SparkContent }[] = [
    { role: 'system', content: buildSystem(opts.context) },
    ...history,
    // La domanda dello studente (+ eventuali allegati) — come in una chat normale.
    { role: 'user', content: buildUserContent(opts.prompt, opts.attachments) },
  ];

  const res = await fetch(`${SPARK_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      model: SPARK_MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignora */
    }
    throw new Error(`Axon Brain ha risposto con un errore (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string } | string;
  };
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message;
    throw new Error(msg || 'Errore sconosciuto da Axon Brain.');
  }
  const raw = data.choices?.[0]?.message?.content ?? '';
  return stripThinking(raw) || '(nessuna risposta dal modello)';
}

// ── Proxy Anthropic (Edge Function) ────────────────────────────────────────
async function askProxy(opts: AskAiOptions): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ANON_KEY) {
    headers['Authorization'] = `Bearer ${ANON_KEY}`;
    headers['apikey'] = ANON_KEY;
  }

  // Via proxy Anthropic i file di testo li inseriamo nel prompt; le immagini
  // richiederebbero il formato a blocchi di Anthropic (non gestito qui).
  const texts = (opts.attachments ?? []).filter((a) => a.kind === 'text' && a.text);
  const hasImages = (opts.attachments ?? []).some((a) => a.kind === 'image');
  let prompt = opts.prompt;
  for (const t of texts) {
    prompt += `\n\n─── File allegato: ${t.name} ───\n${(t.text ?? '').slice(0, 12000)}`;
  }
  if (hasImages) {
    prompt += '\n\n(La squadra ha allegato un\'immagine, ma questo tutor di riserva non può vederla.)';
  }

  const res = await fetch(PROXY_URL as string, {
    method: 'POST',
    headers,
    signal: opts.signal,
    body: JSON.stringify({
      prompt,
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
    throw new Error(`Il tutor AI ha risposto con un errore (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as { reply?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return data.reply?.trim() ?? '';
}

/**
 * Tutor PROATTIVO: è l'app a farlo intervenire, senza che lo studente chieda.
 * Riceve il contesto della fase (cosa la squadra ha appena fatto e scritto) e
 * restituisce UN rilancio che propone e si domanda — mai una spiegazione.
 * Lancia AiNotConfiguredError se nessun cervello è impostato: il chiamante mostra
 * allora la domanda-cardine di riserva.
 */
export async function askTutorProactive(opts: {
  phase: string;
  teamInput: string;
  /** Scheda della schermata/fase (cosa è, cosa fanno, il tuo ruolo qui). */
  brief?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const context = [
    opts.brief,
    `Giorno 0 — ${opts.phase}`,
    `La squadra ha appena scritto: "${opts.teamInput || '(ancora nulla)'}"`,
  ]
    .filter(Boolean)
    .join('\n');
  return askAi({
    prompt:
      "La squadra ha appena scritto qualcosa. Reagisci a ciò che hanno detto con UN breve rilancio: una domanda curiosa o un'osservazione che li faccia guardare meglio. Non dare la soluzione, non dire giusto o sbagliato, non fare una lezione, non usare frasi-formula fisse (evita di aprire sempre allo stesso modo). Se sembrano spaesati, una frase per orientarli va bene. La squadra può ignorarti.",
    context,
    signal: opts.signal,
  });
}
