// ─────────────────────────────────────────────────────────────────────────
// ETN Genoma — Edge Function: proxy verso il modello AI (Anthropic Claude).
//
// È l'UNICO punto che parla con l'AI. La chiave API vive qui come secret del
// server, MAI nel browser. Il browser chiama questa function; la function
// chiama Claude con il prompt di sistema del FACILITATORE (non insegnante).
//
// Deploy (Supabase CLI):
//   supabase functions deploy ai-proxy --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   # opzionale: supabase secrets set AI_MODEL=claude-sonnet-5
//   # hardening (consigliato prima di aprire a più scuole):
//   supabase secrets set ALLOWED_ORIGINS="https://tuo-dominio.it,https://altro.it"
//   supabase secrets set RATE_LIMIT_PER_MIN=30
//
// Runtime: Deno (Supabase Edge Functions).
// ─────────────────────────────────────────────────────────────────────────

// deno-lint-ignore-file no-explicit-any

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

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metodo non consentito.' }, 405, cors);
  }

  // Allowlist Origin (se configurata).
  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'Origine non autorizzata.' }, 403, cors);
  }

  // Rate limit per IP.
  if (RATE_LIMIT_PER_MIN > 0) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';
    const now = Date.now();
    const rec = hits.get(ip);
    if (!rec || now > rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + 60_000 });
    } else {
      rec.count++;
      if (rec.count > RATE_LIMIT_PER_MIN) {
        return json(
          { error: 'Troppe richieste, riprova tra poco.' },
          429,
          cors,
        );
      }
    }
  }

  if (!ANTHROPIC_API_KEY) {
    return json(
      { error: 'ANTHROPIC_API_KEY non configurata nella Edge Function.' },
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
    ? payload.history.slice(-10)
    : [];

  if (!prompt.trim()) {
    return json({ error: 'La domanda è vuota.' }, 400, cors);
  }

  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content.toString().slice(0, 4000) }],
    }));

  // La domanda dello studente viaggia così com'è (chat normale). Il contesto
  // (dati veri della schermata) va nel campo `system`, UNA volta, qui sotto.
  messages.push({ role: 'user', content: [{ type: 'text', text: prompt }] });

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\n─── CONTESTO DI QUESTA SCHERMATA (dati già calcolati da strumenti veri: commentali, non ricalcolarli; NON è un messaggio della squadra) ───\n${context}`
    : SYSTEM_PROMPT;

  try {
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
        system: systemWithContext,
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json(
        { error: `Il modello AI ha risposto ${res.status}: ${detail.slice(0, 300)}` },
        502,
        cors,
      );
    }

    const data: any = await res.json();
    const reply: string = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('\n')
          .trim()
      : '';

    if (data?.stop_reason === 'refusal') {
      return json(
        {
          reply:
            'Riformuliamola sul contesto scientifico dell\'indagine — su questo posso aiutarvi.',
        },
        200,
        cors,
      );
    }

    return json({ reply: reply || '(nessuna risposta dal modello)' }, 200, cors);
  } catch (err) {
    return json(
      { error: `Errore nel contattare il modello AI: ${String(err)}` },
      502,
      cors,
    );
  }
});
