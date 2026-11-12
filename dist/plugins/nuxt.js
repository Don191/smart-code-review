import { lineRule } from "./types.js";
const inApp = (p) => /(^|\/)(app\/)?(pages|components|layouts|composables|plugins|middleware)\//.test(p) && !/(^|\/)server\//.test(p);
const inServer = (p) => /(^|\/)server\/(api|routes|middleware)\//.test(p);
export const nuxt = {
    name: 'nuxt',
    kind: 'framework',
    label: 'Nuxt',
    extensions: ['.vue', '.ts', '.js', '.mjs'],
    detect: (paths) => paths.some(p => /(^|\/)nuxt\.config\.[cm]?[jt]s$|(^|\/)app\.vue$|(^|\/)server\/(api|routes)\/|(^|\/)app\/pages\//.test(p)),
    classify: (p) => {
        if (/(^|\/)nuxt\.config\.[cm]?[jt]s$|(^|\/)app\.config\.ts$/.test(p))
            return 'Config';
        if (/(^|\/)server\/(api|routes)\//.test(p))
            return 'API route';
        if (/(^|\/)server\/middleware\//.test(p))
            return 'Server middleware';
        if (/(^|\/)server\//.test(p))
            return 'Server';
        if (/(^|\/)middleware\//.test(p))
            return 'Route middleware';
        if (/(^|\/)composables\//.test(p))
            return 'Composable';
        if (/(^|\/)stores?\//.test(p))
            return 'Store';
        if (/(^|\/)plugins\//.test(p))
            return 'Plugin';
        return undefined;
    },
    rules: [
        lineRule({
            id: 'nuxt/raw-fetch',
            title: 'fetch in a component instead of useFetch',
            severity: 'minor',
            category: 'performance',
            appliesTo: inApp,
            pattern: /await\s+(fetch|axios(\.\w+)?)\(/,
            detail: 'A plain fetch in setup runs on the server and again in the browser. useFetch or useAsyncData fetch once and pass the result to the page.'
        }),
        lineRule({
            id: 'nuxt/process-env',
            title: 'process.env read in app code',
            severity: 'major',
            category: 'bug',
            appliesTo: inApp,
            pattern: /\bprocess\.env\.\w+/,
            detail: 'process.env is empty in the browser, so this is undefined after hydration. Read it with useRuntimeConfig(), and keep secrets out of the public config.'
        }),
        lineRule({
            id: 'nuxt/unvalidated-body',
            title: 'Request body used without validation',
            severity: 'minor',
            category: 'security',
            appliesTo: inServer,
            pattern: /\breadBody\(|getQuery\(/,
            detail: 'Anything can be sent to this route. readValidatedBody or getValidatedQuery with a schema (e.g. zod) rejects bad input before it is used.'
        }),
        lineRule({
            id: 'nuxt/browser-global',
            title: 'Browser-only API during server render',
            severity: 'minor',
            category: 'bug',
            appliesTo: inApp,
            pattern: /^(?!.*(onMounted|import\.meta\.client|process\.client|typeof window)).*\b(window\.|document\.|localStorage\.|sessionStorage\.)/,
            detail: 'window, document and localStorage do not exist while the page renders on the server. Use them inside onMounted or behind import.meta.client.'
        }),
        lineRule({
            id: 'nuxt/server-secret-public',
            title: 'Secret in public runtime config',
            severity: 'blocker',
            category: 'security',
            pattern: /public\s*:\s*\{[^}]*(secret|token|apiKey|api_key|password)/i,
            detail: 'Everything under runtimeConfig.public is sent to every browser. Move secrets to the private part of runtimeConfig.'
        })
    ],
    guidance: 'Server and client split: code that runs twice, browser APIs during server render, secrets in public runtime config, data fetching with useFetch/useAsyncData keys, and input validation in server routes.'
};
export const node = {
    name: 'node',
    kind: 'framework',
    label: 'Node.js',
    extensions: ['.ts', '.js', '.mjs', '.cjs'],
    detect: (paths) => paths.some(p => /(^|\/)(server|api|src\/server|routes|lib)\//.test(p) || /(^|\/)package\.json$/.test(p)),
    classify: (p) => (/(^|\/)(server|api|routes)\//.test(p) ? 'Server' : undefined),
    rules: [
        lineRule({
            id: 'node/sync-fs',
            title: 'Blocking file read on the server',
            severity: 'minor',
            category: 'performance',
            appliesTo: (p, role) => /Server|API|middleware/.test(role) || /server\//.test(p),
            pattern: /\b(readFileSync|writeFileSync|existsSync|readdirSync)\(/,
            detail: 'Sync file calls block every other request while they run. Use the fs/promises versions in request handlers.'
        }),
        lineRule({
            id: 'node/shell-injection',
            title: 'Shell command built from a string',
            severity: 'major',
            category: 'security',
            pattern: /\b(exec|execSync)\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+)/,
            detail: 'Values put into a shell string can run extra commands. Use execFile or spawn with an argument array.'
        }),
        lineRule({
            id: 'node/sql-concat',
            title: 'SQL built from a string',
            severity: 'blocker',
            category: 'security',
            pattern: /`[^`]*\b(SELECT\b[^`]*\bFROM|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b[^`]*\$\{|['"][^'"]*\b(SELECT\b[^'"]*\bFROM|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM)\b[^'"]*['"]\s*\+/,
            unless: /sql`|Prisma\.sql/,
            detail: 'Joining values into SQL allows SQL injection. Use parameters (?, $1) or a tagged sql`` helper.'
        })
    ],
    guidance: 'Unbounded work per request, blocking calls, input that reaches a shell, the file system or a query, missing timeouts on outbound calls, and error responses that leak internals.'
};
