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
// Axon Brain (Spark): es. VITE_SPARK_URL=http://<spark-host>:8088/v1
const SPARK_URL = (import.meta.env.VITE_SPARK_URL as string | undefined)?.replace(/\/+$/, '');
const SPARK_MODEL =
  (import.meta.env.VITE_SPARK_MODEL as string | undefined) ??
  'unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL';

// Proxy Anthropic (alternativa)
const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
/** Token d'aula, deve combaciare con il secret ACCESS_TOKEN della function. */
const GENOMA_KEY = import.meta.env.VITE_GENOMA_KEY as string | undefined;

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
  "Sei il tutor dell'app ETN Genoma. Parlano con te squadre di studenti di scuola",
  'superiore di tutta Europa, che possono NON avere basi di biologia.',
  '',
  'COME PARLI',
  '- Italiano semplice, frasi corte, parole di tutti i giorni. Come parleresti a un',
  '  ragazzo di quindici anni sveglio ma digiuno di biologia.',
  '- Se usi un termine tecnico, spiegalo nella stessa frase con parole comuni.',
  '- Massimo 3 frasi brevi, circa 40 parole. Se ti accorgi di stare scrivendo la',
  '  quarta frase, taglia: meglio dire una cosa sola e dirla bene.',
  '- Niente frasi a effetto e niente parole grosse. Se una frase suona come un',
  '  documentario, riscrivila come la diresti a voce.',
  '',
  'LA REGOLA PIÙ IMPORTANTE: NON FINIRE SEMPRE CON UNA DOMANDA.',
  'Una domanda a ogni risposta è sfiancante: la squadra non arriva mai da nessuna',
  'parte, ogni volta le tocca un altro compito. Rilancia con una domanda AL MASSIMO',
  'una volta ogni due o tre risposte, e solo quando serve davvero. Le altre volte',
  'rispondi, chiudi il punto e fermati — lascia che si godano l\'aver capito',
  'qualcosa. Finire con un\'affermazione va benissimo.',
  '',
  'QUANDO SONO PERSI ("non ho capito", "cosa devo fare?", "e quindi?")',
  'Non dare loro un altro compito. Orientali: di\' in due frasi semplici che cosa',
  'hanno davanti, a che cosa serve, e cosa possono fare adesso. Poi fermati.',
  '',
  'RESTA ANCORATO ALL\'INDAGINE',
  'Nel contesto trovi il caso su cui stanno lavorando e la sua domanda. Collega',
  'quello che dici a QUELLA storia concreta — l\'emoglobina che porta l\'ossigeno,',
  'la mutazione che causa l\'anemia falciforme — non alla biologia in astratto.',
  'Riprendi quello che hanno detto nei messaggi precedenti: è una conversazione,',
  'non una serie di risposte separate.',
  '',
  'COSA NON FARE',
  '- Se dicono una cosa di FATTO sbagliata (per esempio che il DNA è fatto di',
  '  proteine), correggila subito e con garbo: lasciarla passare non aiuta nessuno.',
  '- Ma se propongono un\'IPOTESI sull\'indagine, non fare il giudice: non dire',
  '  "giusto" o "sbagliato", esplorala con loro e falla verificare sui dati.',
  '- Distingui due cose. La BIOLOGIA GENERALE (a cosa serve una proteina, perché',
  '  la forma conta, cos\'è un gene) spiegagliela volentieri quando la chiedono: è',
  '  il tuo lavoro. La SCOPERTA DELL\'INDAGINE — il risultato preciso che devono',
  '  trovare nei dati, quale lettera cambia, quale amminoacido, che effetto ha su',
  '  questa proteina — quella no: la trovano loro nei moduli, ed è il bello del',
  '  laboratorio. Se te la chiedono, di\' dove andare a cercarla.',
  '- Non ripetere una domanda che hai già fatto, e non aprire sempre allo stesso modo.',
  '- Niente metafore accumulate una sull\'altra: una immagine concreta basta.',
  '',
  'REGOLE SCIENTIFICHE (non violarle mai)',
  'Non calcolare allineamenti né inventare numeri, percentuali, posizioni o',
  'amminoacidi. I dati esatti ti arrivano nel CONTESTO, già calcolati da strumenti',
  "veri: commentali, non produrli. Se un dato non c'è nel contesto, dillo.",
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

/**
 * Nessun cervello configurato.
 *
 * Il messaggio è rivolto agli STUDENTI: in aula legge questa riga un ragazzo di
 * quindici anni, non chi ha fatto il deploy. I nomi delle variabili d'ambiente
 * finiscono nella console, dove serve a chi configura.
 */
export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      'Il tutor non è disponibile su questa postazione. Potete proseguire lo stesso: ' +
        'la proteina 3D, il confronto dei geni e la lettura del DNA funzionano tutti — ' +
        'sono la parte che conta, e i dati restano quelli veri. Se vi serve una mano, ' +
        'chiedete a chi conduce il laboratorio.',
    );
    this.name = 'AiNotConfiguredError';
    console.warn(
      '[ETN Genoma] Tutor non configurato: imposta VITE_SPARK_URL (Axon Brain sullo Spark) ' +
        'oppure VITE_AI_PROXY_URL (gateway). In produzione le variabili VITE_ vanno definite ' +
        'nella build del sito: un file .env.local non arriva al server di build.',
    );
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
  const parts: SparkPart[] = [{ type: 'text', text }];
  for (const a of imgs) {
    parts.push({ type: 'image_url', image_url: { url: a.dataUrl as string } });
  }
  return parts;
}

/** Testo di rimpiazzo quando la squadra invia solo allegati, senza scrivere. */
const ONLY_ATTACHMENT_PROMPT =
  'Dai un’occhiata a cosa ho allegato e aiutami a ragionarci su.';

/**
 * Trasforma la cronologia in messaggi per il modello.
 *
 * Due trappole opposte, entrambe viste sul campo:
 *  - scartare gli allegati passati → al turno dopo il modello non "vede" più
 *    l'immagine di cui la squadra sta parlando, e riceve un messaggio vuoto;
 *  - rimandarli tutti a ogni turno → megabyte di base64 duplicati.
 * Compromesso: le immagini restano solo per l'ULTIMO turno che ne aveva; i più
 * vecchi diventano una menzione testuale.
 */
function historyToMessages(
  history: ChatMessage[],
): { role: string; content: SparkContent }[] {
  const msgs = history.filter((m) => m.role === 'user' || m.role === 'assistant');
  let lastWithImage = -1;
  msgs.forEach((m, i) => {
    if (m.role === 'user' && m.attachments?.some((a) => a.kind === 'image' && a.dataUrl)) {
      lastWithImage = i;
    }
  });

  return msgs.map((m, i) => {
    const text = (m.content ?? '').toString().slice(0, 4000);
    if (m.role !== 'user' || !m.attachments?.length) {
      return { role: m.role, content: text || ONLY_ATTACHMENT_PROMPT };
    }
    if (i === lastWithImage) {
      return {
        role: m.role,
        content: buildUserContent(text || ONLY_ATTACHMENT_PROMPT, m.attachments),
      };
    }
    const names = m.attachments.map((a) => a.name).join(', ');
    return { role: m.role, content: `${text || ONLY_ATTACHMENT_PROMPT}\n[allegati: ${names}]` };
  });
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
  const messages: { role: string; content: SparkContent }[] = [
    { role: 'system', content: buildSystem(opts.context) },
    ...historyToMessages(opts.history ?? []),
    // La domanda dello studente (+ eventuali allegati) — come in una chat normale.
    {
      role: 'user',
      content: buildUserContent(opts.prompt || ONLY_ATTACHMENT_PROMPT, opts.attachments),
    },
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
  // Token d'aula: distingue l'app da uno script qualsiasi che conosce l'URL.
  if (GENOMA_KEY) headers['x-genoma-key'] = GENOMA_KEY;

  // La cronologia viaggia in solo testo: gli allegati del turno CORRENTE sono in
  // `attachments`, quelli vecchi resterebbero megabyte di base64 duplicati.
  const history = (opts.history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content:
        (m.content || ONLY_ATTACHMENT_PROMPT).toString().slice(0, 4000) +
        (m.attachments?.length
          ? `\n[allegati: ${m.attachments.map((a) => a.name).join(', ')}]`
          : ''),
    }));

  const res = await fetch(PROXY_URL as string, {
    method: 'POST',
    headers,
    signal: opts.signal,
    body: JSON.stringify({
      prompt: opts.prompt || ONLY_ATTACHMENT_PROMPT,
      context: opts.context ?? '',
      history,
      attachments: opts.attachments ?? [],
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
  /** Dove siamo: "Giorno 0 · Fase A", "Modulo · Proteina 3D"… */
  phase: string;
  teamInput: string;
  /** Scheda della schermata/fase (cosa è, cosa fanno, il tuo ruolo qui). */
  brief?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const context = [
    opts.brief,
    `Dove siamo: ${opts.phase}`,
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
