/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Axon Brain: endpoint OpenAI-compatibile del DGX Spark (es. http://100.72.206.121:8088/v1). */
  readonly VITE_SPARK_URL?: string;
  /** Nome del modello servito dallo Spark (default Qwen3.5-122B). */
  readonly VITE_SPARK_MODEL?: string;
  /** Alternativa: proxy Anthropic (Edge Function). */
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
