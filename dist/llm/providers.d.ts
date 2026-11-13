/** LLM clients. Claude uses the official Anthropic SDK; the others are small fetch clients, so the package runs in Node, edge runtimes and serverless functions alike. */
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
/** Strips schema keywords that structured outputs don't take, and closes every object. */
export declare function strictSchema(schema: any): any;
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
/** Claude through the Anthropic API. Defaults to Opus 5.5 at high effort. */
export declare function claude(opts?: {
    apiKey?: string;
    model?: string;
    effort?: Effort;
    maxTokens?: number;
    baseUrl?: string;
}): LlmProvider;
type Env = Record<string, string | undefined>;
/** The OpenAI key under OPENAI_API_KEY, or any casing of OPENAPI_API_KEY. */
export declare function openaiKeyFrom(env: Env): string | undefined;
export declare function geminiKeyFrom(env: Env): string | undefined;
/** Picks a provider from env vars: `claude` (default), `gemini`, `openai` or `vertex`, or whichever has a key. */
export declare function providerFromEnv(env: Env, which?: string, model?: string): LlmProvider | undefined;
export {};
