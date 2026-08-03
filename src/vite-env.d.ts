/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Axon Brain: endpoint OpenAI-compatibile del DGX Spark (es. http://<spark-host>:8088/v1). */
  readonly VITE_SPARK_URL?: string;
  /** Nome del modello servito dallo Spark (default Qwen3.5-122B). */
  readonly VITE_SPARK_MODEL?: string;
  /** Alternativa: proxy Anthropic (Edge Function). */
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Token d'aula inviato al gateway (secret ACCESS_TOKEN lato function). */
  readonly VITE_GENOMA_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
