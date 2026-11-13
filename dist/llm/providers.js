/** LLM clients. Claude uses the official Anthropic SDK; the others are small fetch clients, so the package runs in Node, edge runtimes and serverless functions alike. */
async function failText(res) {
    const body = await res.text().catch(() => '');
    try {
        const j = JSON.parse(body);
        return j.error?.message ?? body;
    }
    catch {
        return body;
    }
}
function geminiBody(req, withSchema) {
    return {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            ...(withSchema ? { responseJsonSchema: req.schema } : {})
        }
    };
}
async function geminiCall(url, headers, req, label) {
    let withSchema = true;
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(geminiBody(req, withSchema)), signal: req.signal });
        if (res.ok) {
            const data = await res.json();
            const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('');
            if (!text)
                throw new Error(`${label} returned no text (${data.candidates?.[0]?.finishReason ?? 'no candidates'})`);
            return text;
        }
        const msg = await failText(res);
        // Older models don't take a JSON schema; ask for plain JSON instead.
        if (res.status === 400 && withSchema && /schema/i.test(msg)) {
            withSchema = false;
            continue;
        }
        // The free tier often answers "high demand" for a few seconds.
        if ((res.status === 429 || res.status === 503 || res.status === 500) && attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
        }
        throw new Error(`${label} ${res.status}: ${msg.slice(0, 300)}`);
    }
    throw new Error(`${label} kept failing`);
}
/** Gemini API (Google AI Studio key). The free tier works. */
export function gemini(opts) {
    const model = opts.model ?? 'gemini-3.1-flash-lite';
    return {
        name: 'Gemini',
        model,
        complete: (req) => geminiCall(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': opts.apiKey }, req, `Gemini ${model}`)
    };
}
/** Gemini on Vertex AI with an OAuth access token (e.g. from `gcloud auth print-access-token`). */
export function vertex(opts) {
    const model = opts.model ?? 'gemini-3.1-flash-lite';
    const loc = opts.location ?? 'global';
    const host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`;
    return {
        name: 'Vertex AI',
        model,
        complete: (req) => geminiCall(`https://${host}/v1/projects/${opts.project}/locations/${loc}/publishers/google/models/${model}:generateContent`, { authorization: `Bearer ${opts.accessToken}` }, req, `Vertex ${model}`)
    };
}
/** OpenAI, or any server with an OpenAI-compatible chat completions API (Groq, Ollama, LM Studio...). */
export function openai(opts) {
    const model = opts.model ?? 'gpt-5-mini';
    const base = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    return {
        name: opts.name ?? (opts.baseUrl ? 'OpenAI-compatible' : 'OpenAI'),
        model,
        complete: async (req) => {
            const res = await fetch(`${base}/chat/completions`, {
                method: 'POST',
                signal: req.signal,
                headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
                    response_format: { type: 'json_object' }
                })
            });
            if (!res.ok)
                throw new Error(`${model} ${res.status}: ${(await failText(res)).slice(0, 300)}`);
            const data = await res.json();
            return data.choices?.[0]?.message?.content ?? '';
        }
    };
}
/** Strips schema keywords that structured outputs don't take, and closes every object. */
export function strictSchema(schema) {
    if (Array.isArray(schema))
        return schema.map(strictSchema);
    if (!schema || typeof schema !== 'object')
        return schema;
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
        if (['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'maxItems', 'minItems', 'uniqueItems'].includes(k))
            continue;
        out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v).map(([n, d]) => [n, strictSchema(d)])) : strictSchema(v);
    }
    if (out.type === 'object')
        out.additionalProperties = false;
    return out;
}
/** Claude through the Anthropic API. Defaults to Opus 5.5 at high effort. */
export function claude(opts = {}) {
    const model = opts.model ?? 'claude-opus-5-5';
    const effort = opts.effort ?? 'high';
    let client;
    // Loaded on first use, so the other providers work without the SDK installed.
    const getClient = async () => (client ??= new (await import('@anthropic-ai/sdk')).default({ apiKey: opts.apiKey, baseURL: opts.baseUrl }));
    return {
        name: 'Claude',
        model,
        complete: async (req) => {
            // Streams so a long review never hits the request timeout.
            const stream = (await getClient()).beta.messages.stream({
                model,
                max_tokens: opts.maxTokens ?? 64000,
                system: req.system,
                messages: [{ role: 'user', content: req.prompt }],
                thinking: { type: 'adaptive' },
                output_config: { effort, format: { type: 'json_schema', schema: strictSchema(req.schema) } },
                // If a safety check declines the request, the API reruns it on the recommended fallback model.
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default'
            }, { signal: req.signal });
            const msg = await stream.finalMessage();
            if (msg.stop_reason === 'refusal')
                throw new Error(`Claude ${model} declined to review this change${msg.stop_details?.explanation ? `: ${msg.stop_details.explanation}` : ''}`);
            const text = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('');
            if (!text)
                throw new Error(`Claude ${model} returned no text (${msg.stop_reason})`);
            if (msg.stop_reason === 'max_tokens')
                throw new Error(`Claude ${model} ran out of output tokens before finishing the review`);
            return text;
        }
    };
}
/** The OpenAI key under OPENAI_API_KEY, or any casing of OPENAPI_API_KEY. */
export function openaiKeyFrom(env) {
    for (const [k, v] of Object.entries(env))
        if (v && /^(openai|openapi)_api_key$/i.test(k))
            return v;
    return undefined;
}
export function geminiKeyFrom(env) {
    return env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_VERTEX_API_KEY;
}
/** Picks a provider from env vars: `claude` (default), `gemini`, `openai` or `vertex`, or whichever has a key. */
export function providerFromEnv(env, which, model) {
    const a = env.ANTHROPIC_API_KEY;
    const g = geminiKeyFrom(env);
    const o = openaiKeyFrom(env);
    let want = which ?? env.SMART_REVIEW_PROVIDER ?? (a ? 'claude' : g ? 'gemini' : o ? 'openai' : undefined);
    if (want === 'anthropic')
        want = 'claude';
    if (want === 'claude' && a)
        return claude({ apiKey: a, model: model ?? env.SMART_REVIEW_MODEL, effort: env.SMART_REVIEW_EFFORT || undefined, baseUrl: env.ANTHROPIC_BASE_URL });
    if (want === 'gemini' && g)
        return gemini({ apiKey: g, model: model ?? env.SMART_REVIEW_MODEL });
    if (want === 'openai' && o)
        return openai({ apiKey: o, model: model ?? env.SMART_REVIEW_MODEL, baseUrl: env.OPENAI_BASE_URL });
    if (want === 'vertex' && env.VERTEX_ACCESS_TOKEN && env.VERTEX_PROJECT)
        return vertex({ accessToken: env.VERTEX_ACCESS_TOKEN, project: env.VERTEX_PROJECT, location: env.VERTEX_LOCATION, model: model ?? env.SMART_REVIEW_MODEL });
    return undefined;
}
