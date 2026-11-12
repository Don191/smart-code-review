/** Minimal LLM clients over fetch, so the package runs in Node, edge runtimes and serverless functions alike. */
export interface CompleteRequest {
    system: string;
    prompt: string;
    /** JSON schema for the reply. */
    schema: object;
    signal?: AbortSignal;
}
export interface LlmProvider {
    name: string;
    model: string;
    complete: (req: CompleteRequest) => Promise<string>;
}
/** Gemini API (Google AI Studio key). The free tier works. */
export declare function gemini(opts: {
    apiKey: string;
    model?: string;
}): LlmProvider;
/** Gemini on Vertex AI with an OAuth access token (e.g. from `gcloud auth print-access-token`). */
export declare function vertex(opts: {
    accessToken: string;
    project: string;
    location?: string;
    model?: string;
}): LlmProvider;
/** OpenAI, or any server with an OpenAI-compatible chat completions API (Groq, Ollama, LM Studio...). */
export declare function openai(opts: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
    name?: string;
}): LlmProvider;
type Env = Record<string, string | undefined>;
/** The OpenAI key under OPENAI_API_KEY, or any casing of OPENAPI_API_KEY. */
export declare function openaiKeyFrom(env: Env): string | undefined;
export declare function geminiKeyFrom(env: Env): string | undefined;
/** Picks a provider from env vars: `gemini` (default) or `openai`, or whichever has a key. */
export declare function providerFromEnv(env: Env, which?: string, model?: string): LlmProvider | undefined;
export {};
