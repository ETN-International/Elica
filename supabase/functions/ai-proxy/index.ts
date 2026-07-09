// ─────────────────────────────────────────────────────────────────────────
// ETN Genoma — Edge Function: gateway sicuro verso il modello AI.
//
// È l'UNICO punto pubblico che parla con l'AI. Tiene la chiave e il prompt di
// sistema come SECRET del server, MAI nel browser. Il browser chiama questa
// function; la function inoltra al cervello:
//
//   • AXON BRAIN (DGX Spark) — endpoint OpenAI-compatibile, raggiunto in PRIVATO
//     via Tailscale (lo Spark NON è mai esposto su internet). Preferito (costo 0).
//     Config: SPARK_URL (es. http://100.72.206.121:8088/v1), SPARK_MODEL.
//     SPARK_KEY è opzionale: serve solo se un giorno lo Spark richiedesse un token.
//   • ANTHROPIC (fallback) — se SPARK_URL non è impostato ma c'è ANTHROPIC_API_KEY.
//
// Deploy su Supabase SELF-HOSTED (Coolify): copiare questo file in
//   volumes/functions/ai-proxy/index.ts  e riavviare il servizio `functions`.
// Env del container functions (via Coolify):
//   SPARK_URL=http://100.72.206.121:8088/v1
//   SPARK_MODEL=unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL
//   ALLOWED_ORIGINS=https://<dominio-frontend>
//   RATE_LIMIT_PER_MIN=30
//
// Runtime: Deno (Supabase Edge Functions).
// ─────────────────────────────────────────────────────────────────────────

// deno-lint-ignore-file no-explicit-any

// Cervello 1: Axon Brain sullo Spark (OpenAI-compatibile).
const SPARK_URL = (Deno.env.get('SPARK_URL') ?? '').replace(/\/+$/, '');
const SPARK_KEY = Deno.env.get('SPARK_KEY') ?? '';
const SPARK_MODEL =
  Deno.env.get('SPARK_MODEL') ?? 'unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL';

// Cervello 2 (fallback): Anthropic.
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5';
const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

// Hardening opzionale (via secrets). Se ALLOWED_ORIGINS non è impostato, CORS = '*'.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const RATE_LIMIT_PER_MIN = Number(Deno.env.get('RATE_LIMIT_PER_MIN') ?? '30');

// Il tutor facilita il ragionamento MA sa anche orientare quando serve (non è un
// muro socratico). Identico a FACILITATOR_SYSTEM_PROMPT in src/lib/ai.ts.
const SYSTEM_PROMPT = [
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
  '   produrli. Se un dato non c\'è nel contesto, dillo, non inventarlo.',
].join('\n');

// Rate limit in-memory (best-effort): per IP, finestra di 60 s.
const hits = new Map<string, { count: number; resetAt: number }>();

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? '*'
      : origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/** Costruisce il testo utente unendo la domanda ed eventuali file di TESTO. */
function userText(prompt: string, attachments: any[]): string {
  let text = prompt;
  for (const a of attachments) {
    if (a?.kind === 'text' && a?.text) {
      text += `\n\n─── File allegato: ${a.name ?? 'file'} ───\n${String(a.text).slice(0, 12000)}`;
    }
  }
  return text;
}

/** Costruisce il messaggio system: prompt facilitatore + contesto (una volta). */
function systemWithContext(context: string): string {
  return context
    ? `${SYSTEM_PROMPT}\n\n─── CONTESTO DI QUESTA SCHERMATA (dati già calcolati da strumenti veri: commentali, non ricalcolarli; NON è un messaggio della squadra) ───\n${context}`
    : SYSTEM_PROMPT;
}

// ── Axon Brain (Spark, OpenAI-compatibile) ────────────────────────────────
async function callSpark(
  prompt: string,
  context: string,
  history: Array<{ role: string; content: string }>,
  attachments: any[],
): Promise<{ reply?: string; error?: string; status?: number }> {
  const imgs = attachments.filter((a) => a?.kind === 'image' && a?.dataUrl);
  const userContent: any = imgs.length
    ? [
        { type: 'text', text: userText(prompt, attachments) },
        ...imgs.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
      ]
    : userText(prompt, attachments);

  const messages = [
    { role: 'system', content: systemWithContext(context) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // In privato (Spark raggiunto via Tailscale) SPARK_KEY è vuoto: niente header.
  if (SPARK_KEY) headers['Authorization'] = `Bearer ${SPARK_KEY}`;

  const res = await fetch(`${SPARK_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: SPARK_MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return { error: `Axon Brain ha risposto ${res.status}: ${detail}`, status: 502 };
  }
  const data: any = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  return { reply: stripThinking(String(raw)) || '(nessuna risposta dal modello)' };
}

// ── Anthropic (fallback) ──────────────────────────────────────────────────
async function callAnthropic(
  prompt: string,
  context: string,
  history: Array<{ role: string; content: string }>,
): Promise<{ reply?: string; error?: string; status?: number }> {
  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content }] }));
  messages.push({ role: 'user', content: [{ type: 'text', text: prompt }] });

  const res = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemWithContext(context),
      messages,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return { error: `Il modello AI ha risposto ${res.status}: ${detail}`, status: 502 };
  }
  const data: any = await res.json();
  if (data?.stop_reason === 'refusal') {
    return {
      reply: 'Riformuliamola sul contesto scientifico dell\'indagine — su questo posso aiutarvi.',
    };
  }
  const reply: string = Array.isArray(data?.content)
    ? data.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n').trim()
    : '';
  return { reply: reply || '(nessuna risposta dal modello)' };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405, cors);

  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'Origine non autorizzata.' }, 403, cors);
  }

  if (RATE_LIMIT_PER_MIN > 0) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now > rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
    } else if (++rec.count > RATE_LIMIT_PER_MIN) {
      return json({ error: 'Troppe richieste, riprova tra poco.' }, 429, cors);
    }
  }

  if (!SPARK_URL && !ANTHROPIC_API_KEY) {
    return json(
      { error: 'Nessun cervello configurato: imposta SPARK_URL (+ SPARK_KEY) o ANTHROPIC_API_KEY.' },
      500,
      cors,
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo della richiesta non valido (JSON atteso).' }, 400, cors);
  }

  const prompt: string = (payload?.prompt ?? '').toString().slice(0, 4000);
  const context: string = (payload?.context ?? '').toString().slice(0, 8000);
  const history: Array<{ role: string; content: string }> = Array.isArray(payload?.history)
    ? payload.history
        .filter((m: any) => m?.role === 'user' || m?.role === 'assistant')
        .slice(-10)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    : [];
  const attachments: any[] = Array.isArray(payload?.attachments) ? payload.attachments.slice(0, 4) : [];

  if (!prompt.trim() && attachments.length === 0) {
    return json({ error: 'La domanda è vuota.' }, 400, cors);
  }

  try {
    const out = SPARK_URL
      ? await callSpark(prompt, context, history, attachments)
      : await callAnthropic(prompt, context, history);
    if (out.error) return json({ error: out.error }, out.status ?? 502, cors);
    return json({ reply: out.reply }, 200, cors);
  } catch (err) {
    return json({ error: `Errore nel contattare il modello AI: ${String(err)}` }, 502, cors);
  }
});
