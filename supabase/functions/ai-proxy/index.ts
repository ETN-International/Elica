// ─────────────────────────────────────────────────────────────────────────
// ETN Genoma — Edge Function: proxy verso il modello AI (Anthropic Claude).
//
// È l'UNICO punto che parla con l'AI. La chiave API vive qui come secret del
// server, MAI nel browser. Il browser chiama questa function; la function
// chiama Claude con il prompt di sistema anti-allucinazione.
//
// Deploy (Supabase CLI):
//   supabase functions deploy ai-proxy --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   # opzionale: supabase secrets set AI_MODEL=claude-sonnet-5
//
// Runtime: Deno (Supabase Edge Functions).
// ─────────────────────────────────────────────────────────────────────────

// deno-lint-ignore-file no-explicit-any

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
// Modello di default: Sonnet 5 è il miglior equilibrio velocità/intelligenza
// per un tutor interattivo in aula. Sovrascrivibile con il secret AI_MODEL.
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5';
const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

// Il guardrail che tiene l'app onesta (dal brief di progetto).
const SYSTEM_PROMPT = [
  "Sei il tutor scientifico dell'app ETN Genoma, usata da studenti di scuola superiore",
  'nel SmartLab di Genomica e Bioinformatica. Parli sempre in italiano, in modo chiaro,',
  'incoraggiante e adatto a un ragazzo di quindici anni.',
  '',
  'REGOLE FONDAMENTALI (non violarle mai):',
  '1. NON calcolare mai allineamenti tra sequenze, né inventare strutture, numeri,',
  '   percentuali di identità, posizioni o coordinate scientifiche.',
  "2. I dati esatti ti vengono forniti nel CONTESTO, già calcolati da strumenti veri",
  '   (algoritmo di allineamento, banca dati AlphaFold). Il tuo compito è spiegarli,',
  '   confrontarli e guidare il ragionamento — non produrli.',
  '3. Se ti serve un dato che non è nel contesto, dillo apertamente invece di inventarlo.',
  '4. Guida con domande ("cosa ti aspetti di trovare? perché?"), traduci il gergo,',
  '   e aiuta a formulare ipotesi e conclusioni.',
  '',
  'Rispondi in modo conciso (di norma 2-5 frasi), senza formule inutili.',
].join('\n');

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metodo non consentito.' }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json(
      { error: 'ANTHROPIC_API_KEY non configurata nella Edge Function.' },
      500,
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo della richiesta non valido (JSON atteso).' }, 400);
  }

  const prompt: string = (payload?.prompt ?? '').toString().slice(0, 4000);
  const context: string = (payload?.context ?? '').toString().slice(0, 8000);
  const history: Array<{ role: string; content: string }> = Array.isArray(
    payload?.history,
  )
    ? payload.history.slice(-10)
    : [];

  if (!prompt.trim()) {
    return json({ error: 'La domanda è vuota.' }, 400);
  }

  // Costruzione dei messaggi: prima la storia, poi il turno corrente con il
  // contesto GIÀ CALCOLATO che l'AI deve commentare (non ricalcolare).
  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content.toString().slice(0, 4000) }],
    }));

  const userText = context
    ? `Contesto (dati già calcolati da strumenti veri — commentali, non ricalcolarli):\n${context}\n\nDomanda dello studente:\n${prompt}`
    : prompt;

  messages.push({ role: 'user', content: [{ type: 'text', text: userText }] });

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
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json(
        { error: `Il modello AI ha risposto ${res.status}: ${detail.slice(0, 300)}` },
        502,
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
      return json({
        reply:
          "Mi dispiace, non posso rispondere a questa richiesta. Riformuliamola sul contesto scientifico dell'indagine?",
      });
    }

    return json({ reply: reply || '(nessuna risposta dal modello)' });
  } catch (err) {
    return json(
      { error: `Errore nel contattare il modello AI: ${String(err)}` },
      502,
    );
  }
});
