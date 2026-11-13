/** Files that set up AI coding agents: instructions, skills, subagents, commands, hooks and MCP servers. */
export const AGENT_FILE = /(^|\/)(CLAUDE|AGENTS|GEMINI)(\.local)?\.md$|(^|\/)\.claude\/|(^|\/)\.mcp\.json$|(^|\/)\.cursor\/|(^|\/)\.cursorrules$|(^|\/)\.windsurfrules$|(^|\/)\.github\/(copilot-instructions\.md|instructions\/|prompts\/|agents\/|chatmodes\/)|(^|\/)\.(codex|gemini|agents)\/|(^|\/)skills\/[^/]+\/SKILL\.md$|(^|\/)\.smart-code-review\.(md|json)$/;
const WORKSPACE_DIRS = new Set(['apps', 'packages', 'services', 'libs', 'modules', 'projects', 'sites', 'functions']);
export function kindFromName(name) {
    const n = name.toLowerCase();
    if (/portal|web|front|site|dashboard|ui\b|admin|client|app$|mobile|docs-site|storybook/.test(n))
        return 'frontend';
    if (/api|server|back|worker|service|jobs|queue|db|database|auth|gateway|lambda|functions?/.test(n))
        return 'backend';
    if (/agent|claude|skill|copilot|\bai\b/.test(n))
        return 'agents';
    if (/test|e2e/.test(n))
        return 'tests';
    if (/doc/.test(n))
        return 'docs';
    if (/config|tooling|scripts|ci/.test(n))
        return 'config';
    return 'shared';
}
/**
 * Groups a file into a high level module. In a monorepo that is the
 * workspace (apps/portal, packages/ui). Elsewhere it is the layer:
 * frontend, backend, shared code, tests, docs, or build and config.
 */
export function moduleOf(path, role, isMonorepo, rules = []) {
    for (const r of rules) {
        const hit = r.paths.find(p => path.startsWith(p));
        if (hit)
            return { name: r.name, kind: r.kind ?? kindFromName(r.name), root: hit };
    }
    if (AGENT_FILE.test(path))
        return { name: 'AI agent setup', kind: 'agents' };
    const parts = path.split('/');
    if (isMonorepo && parts.length > 2 && WORKSPACE_DIRS.has(parts[0])) {
        const ws = parts[1];
        return { name: ws, kind: kindFromName(ws), root: `${parts[0]}/${ws}/` };
    }
    if (role === 'Test' || /(^|\/)(tests?|e2e|__tests__)\//.test(path))
        return { name: 'Tests', kind: 'tests' };
    if (role === 'Docs' || /(^|\/)docs?\//.test(path) || /\.(md|mdx)$/i.test(path))
        return { name: 'Docs', kind: 'docs' };
    if (role === 'Config' || role === 'Lockfile' || /^\.github\/|^\.?[\w.-]+\.(json|ya?ml|toml|config\.[cm]?[jt]s)$|(^|\/)(Dockerfile|Makefile|\.env\.example)$/.test(path))
        return { name: 'Build and config', kind: 'config' };
    if (/API route|Server|middleware|Migration/i.test(role) || /(^|\/)(server|api|backend|routes|db|prisma|migrations?|workers?)\//.test(path))
        return { name: 'Backend', kind: 'backend' };
    if (/Page|Layout|Vue component|Composable|Store|Plugin|Route middleware/.test(role) || /(^|\/)(components|pages|views|layouts|composables|stores|assets|public|styles|frontend|client)\//.test(path) || /\.(vue|svelte|tsx|jsx|css|scss|html)$/.test(path))
        return { name: 'Frontend', kind: 'frontend' };
    return { name: 'Shared code', kind: 'shared' };
}
/** True when the change touches two or more workspaces under apps/, packages/ and the like. */
export function looksLikeMonorepo(paths) {
    const ws = new Set(paths.map(p => p.split('/')).filter(p => p.length > 2 && WORKSPACE_DIRS.has(p[0])).map(p => `${p[0]}/${p[1]}`));
    return ws.size >= 1 && paths.some(p => /^(apps|packages|services)\//.test(p));
}
