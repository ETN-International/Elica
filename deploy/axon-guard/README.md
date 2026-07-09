# Andare online: Netlify + Axon Brain (DGX Spark) — runbook

Architettura scelta (la più sicura):

```
Browser (sito Netlify, HTTPS)
   → Edge Function Supabase  (tiene il token e il prompt: SEGRETI, lato server)
      → Tailscale Funnel  https://spark-402c-1.tail9aec7d.ts.net/axon/...
         → guardia :8091  (controlla il Bearer token, toglie /axon)
            → llama.cpp :8088  (Axon Brain = Qwen3.5-122B)
```

Il browser non tocca mai lo Spark. Il modello è raggiungibile pubblicamente solo
con il token, che vive solo nei secret di Supabase.

## Valori di questo deploy
> ⚠️ Il **SPARK_KEY** è un SEGRETO: non va scritto qui né committato. Generalo una
> volta con `openssl rand -hex 24` e usa lo STESSO valore nella unit systemd (passo A)
> e nei secret Supabase (passo B). (Per questo deploy te l'ho già generato e passato a voce.)
- **SPARK_KEY** (token guardia): `<SPARK_KEY>`  ← sostituisci col token generato
- **SPARK_URL** (secret Supabase): `https://spark-402c-1.tail9aec7d.ts.net/axon/v1`
- **SPARK_MODEL**: `unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL`
- **VITE_AI_PROXY_URL** (env Netlify): `https://uwattxwvdoewfnvzmrpg.supabase.co/functions/v1/ai-proxy`
  (riusa il progetto Supabase esistente; per un progetto dedicato, sostituisci il ref)

---

## A) Sullo Spark — la guardia + il Funnel (lancia TU, dal tuo terminale)

```bash
# 1. copia la guardia sullo Spark
ssh axonfroce-spark 'mkdir -p ~/axon-guard'
scp deploy/axon-guard/guard.py axonfroce-spark:~/axon-guard/guard.py

# 2. installa il servizio systemd (con il token dentro)
KEY=<incolla-qui-il-token-SPARK_KEY>
scp deploy/axon-guard/axon-guard.service axonfroce-spark:/tmp/axon-guard.service
ssh axonfroce-spark "sudo sed 's|<SPARK_KEY>|$KEY|' /tmp/axon-guard.service | sudo tee /etc/systemd/system/axon-guard.service >/dev/null \
  && sudo systemctl daemon-reload \
  && sudo systemctl enable --now axon-guard \
  && systemctl status axon-guard --no-pager | head -5"

# 3. esponi la guardia (:8091) sul Funnel già attivo, sotto /axon
#    (NON tocca il mount esistente / -> 8090)
ssh axonfroce-spark 'tailscale serve --bg --set-path /axon 8091 || sudo tailscale serve --bg --set-path /axon 8091'
ssh axonfroce-spark 'tailscale serve status'

# 4. verifica: col token risponde il modello, senza token = 401
ssh axonfroce-spark "curl -s -o /dev/null -w 'con token: %{http_code}\n' -H 'Authorization: Bearer $KEY' https://spark-402c-1.tail9aec7d.ts.net/axon/v1/models"
ssh axonfroce-spark "curl -s -o /dev/null -w 'senza token: %{http_code}\n' https://spark-402c-1.tail9aec7d.ts.net/axon/v1/models"
# atteso: con token: 200   senza token: 401
```

## B) Supabase — deploy della Edge Function (lancia TU)

```bash
supabase login                                   # si apre il browser
supabase link --project-ref uwattxwvdoewfnvzmrpg # o il ref del progetto dedicato
supabase functions deploy ai-proxy --no-verify-jwt

supabase secrets set \
  SPARK_URL="https://spark-402c-1.tail9aec7d.ts.net/axon/v1" \
  SPARK_KEY="<SPARK_KEY>" \
  SPARK_MODEL="unsloth/Qwen3.5-122B-A10B-GGUF:UD-Q4_K_XL" \
  ALLOWED_ORIGINS="https://<il-tuo-sito>.netlify.app" \
  RATE_LIMIT_PER_MIN=30
```

Prova rapida della function:
```bash
curl -s -X POST https://uwattxwvdoewfnvzmrpg.supabase.co/functions/v1/ai-proxy \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"ciao, chi sei?","context":"","history":[]}'
# atteso: {"reply":"..."}
```

## C) Netlify — collega il cervello (lo fai TU nella dashboard)

1. Site settings → Environment variables → aggiungi
   `VITE_AI_PROXY_URL = https://uwattxwvdoewfnvzmrpg.supabase.co/functions/v1/ai-proxy`
2. Trigger deploy (o push). Alla build, l'app userà il proxy come cervello.
3. In `ALLOWED_ORIGINS` (passo B) metti l'URL esatto del sito Netlify.

Fatto: il tutor risponde dal sito pubblico, a costo zero, con lo Spark come cervello.
```
```
