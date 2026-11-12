import { clip, criteriaFrom, htmlToText } from "./types.js";
const uniq = (refs) => [...new Map(refs.map(r => [`${r.connector}:${r.id}`, r])).values()];
async function getJson(url, headers, f = fetch) {
    const res = await f(url, { headers });
    if (!res.ok)
        throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
    return res.json();
}
/**
 * Azure DevOps Boards. Finds AB#123 (the standard link syntax) and work item
 * URLs, and reads the title, state, description, acceptance criteria and
 * repro steps. Needs AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT (work items: read).
 */
export const azureDevOps = {
    name: 'azure-devops',
    label: 'Azure DevOps',
    requires: ['AZURE_DEVOPS_ORG', 'AZURE_DEVOPS_PAT'],
    findRefs: (text) => {
        const refs = [];
        for (const m of text.matchAll(/\bAB#(\d+)\b/g))
            refs.push({ connector: 'azure-devops', id: m[1] });
        for (const m of text.matchAll(/https:\/\/(?:dev\.azure\.com\/[^/\s]+|[\w-]+\.visualstudio\.com)\/[^\s)]*?_workitems\/edit\/(\d+)/g))
            refs.push({ connector: 'azure-devops', id: m[1], url: m[0] });
        return uniq(refs);
    },
    fetch: async (ref, { env, fetch: f }) => {
        const org = env.AZURE_DEVOPS_ORG.replace(/^https:\/\/dev\.azure\.com\//, '').replace(/\/$/, '');
        const auth = `Basic ${btoa(`:${env.AZURE_DEVOPS_PAT}`)}`;
        const data = await getJson(`https://dev.azure.com/${org}/_apis/wit/workitems/${ref.id}?api-version=7.1`, { authorization: auth }, f);
        const fields = data.fields ?? {};
        const type = fields['System.WorkItemType'] ?? '';
        const description = htmlToText(fields['System.Description']);
        const ac = htmlToText(fields['Microsoft.VSTS.Common.AcceptanceCriteria']);
        const repro = htmlToText(fields['Microsoft.VSTS.TCM.ReproSteps']);
        return {
            source: 'Azure DevOps',
            id: `AB#${ref.id}`,
            kind: /bug/i.test(type) ? 'bug' : /story|requirement|feature|epic|backlog/i.test(type) ? 'requirement' : 'task',
            title: fields['System.Title'] ?? `Work item ${ref.id}`,
            url: data._links?.html?.href ?? ref.url ?? `https://dev.azure.com/${org}/_workitems/edit/${ref.id}`,
            status: fields['System.State'],
            summary: clip(description || repro, 600),
            acceptanceCriteria: criteriaFrom(ac).length ? criteriaFrom(ac) : ac ? [clip(ac, 300)] : criteriaFrom(description),
            reproSteps: clip(repro, 800) || undefined
        };
    }
};
const NOTION_ID = /([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
function notionText(rich = []) {
    return rich.map(r => r.plain_text ?? '').join('');
}
/**
 * Notion pages, e.g. a spec or a ticket in a database. Finds notion.so and
 * notion.site links, reads the page title, its text, and to-do or bullet
 * blocks as acceptance criteria. Needs NOTION_TOKEN, and the page must be
 * shared with that integration.
 */
export const notion = {
    name: 'notion',
    label: 'Notion',
    requires: ['NOTION_TOKEN'],
    findRefs: (text) => {
        const refs = [];
        for (const m of text.matchAll(/https:\/\/(?:www\.)?(?:notion\.so|[\w-]+\.notion\.site)\/[^\s)>\]]+/g)) {
            const id = m[0].split('?')[0].match(new RegExp(`${NOTION_ID.source}$`, 'i'))?.[1] ?? m[0].match(NOTION_ID)?.[1];
            if (id)
                refs.push({ connector: 'notion', id: id.replace(/-/g, ''), url: m[0] });
        }
        return uniq(refs);
    },
    fetch: async (ref, { env, fetch: f }) => {
        const headers = { authorization: `Bearer ${env.NOTION_TOKEN}`, 'notion-version': '2022-06-28' };
        const page = await getJson(`https://api.notion.com/v1/pages/${ref.id}`, headers, f);
        const props = page.properties ?? {};
        const titleProp = Object.values(props).find(p => p.type === 'title');
        const statusProp = Object.values(props).find(p => p.type === 'status' || (p.type === 'select' && /status|state/i.test(p.name ?? '')));
        const typeProp = Object.entries(props).find(([k]) => /type|kind/i.test(k))?.[1];
        const blocks = await getJson(`https://api.notion.com/v1/blocks/${ref.id}/children?page_size=100`, headers, f);
        const lines = [];
        for (const b of blocks.results ?? []) {
            const body = b[b.type];
            const t = notionText(body?.rich_text);
            if (!t)
                continue;
            if (b.type.startsWith('heading'))
                lines.push(`## ${t}`);
            else if (b.type === 'to_do')
                lines.push(`- [${body.checked ? 'x' : ' '}] ${t}`);
            else if (b.type === 'bulleted_list_item')
                lines.push(`- ${t}`);
            else if (b.type === 'numbered_list_item')
                lines.push(`1. ${t}`);
            else
                lines.push(t);
        }
        const text = lines.join('\n');
        const kindText = `${typeProp?.select?.name ?? ''} ${notionText(titleProp?.title)}`;
        return {
            source: 'Notion',
            id: ref.id.slice(0, 8),
            kind: /bug|defect|incident/i.test(kindText) ? 'bug' : /spec|story|requirement|feature/i.test(kindText) ? 'requirement' : 'doc',
            title: notionText(titleProp?.title) || 'Notion page',
            url: page.url ?? ref.url,
            status: statusProp?.status?.name ?? statusProp?.select?.name,
            summary: clip(lines.filter(l => !l.startsWith('-') && !l.startsWith('#')).join(' '), 600),
            acceptanceCriteria: criteriaFrom(text)
        };
    }
};
/**
 * GitHub issues linked from the PR ("Fixes #12", owner/repo#12, issue URLs).
 * Works on public repos with no token; GITHUB_TOKEN raises the rate limit and
 * reaches private ones.
 */
export const githubIssues = {
    name: 'github',
    label: 'GitHub Issues',
    requires: [],
    findRefs: (text, { repo }) => {
        const refs = [];
        for (const m of text.matchAll(/https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d+)/g))
            refs.push({ connector: 'github', id: `${m[1]}#${m[2]}`, url: m[0] });
        for (const m of text.matchAll(/(?:^|[\s(])([\w.-]+\/[\w.-]+)#(\d+)\b/g))
            refs.push({ connector: 'github', id: `${m[1]}#${m[2]}` });
        if (repo)
            for (const m of text.matchAll(/(?:^|[\s(])#(\d+)\b/g))
                refs.push({ connector: 'github', id: `${repo}#${m[1]}` });
        return uniq(refs).slice(0, 8);
    },
    fetch: async (ref, { env, fetch: f }) => {
        const [repo, num] = ref.id.split('#');
        const headers = { accept: 'application/vnd.github+json', 'user-agent': 'smart-code-review' };
        if (env.GITHUB_TOKEN)
            headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
        const issue = await getJson(`https://api.github.com/repos/${repo}/issues/${num}`, headers, f);
        // A #number can be a PR. Those aren't requirements, so skip them.
        if (issue.pull_request)
            return null;
        const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
        const body = issue.body ?? '';
        return {
            source: 'GitHub',
            id: ref.id,
            kind: labels.some(l => /bug|defect|regression/i.test(l)) ? 'bug' : labels.some(l => /feature|enhancement|story/i.test(l)) ? 'requirement' : 'issue',
            title: issue.title,
            url: issue.html_url,
            status: issue.state,
            summary: clip(body.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim(), 600),
            acceptanceCriteria: criteriaFrom(body)
        };
    }
};
/**
 * Jira issues by key (PROJ-123) or browse URL. Needs JIRA_BASE_URL,
 * JIRA_EMAIL and JIRA_API_TOKEN.
 */
export const jira = {
    name: 'jira',
    label: 'Jira',
    requires: ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'],
    weakRefs: true,
    findRefs: (text) => uniq([...text.matchAll(/\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g)].map(m => ({ connector: 'jira', id: m[1] }))).slice(0, 8),
    fetch: async (ref, { env, fetch: f }) => {
        const base = env.JIRA_BASE_URL.replace(/\/$/, '');
        const auth = `Basic ${btoa(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`)}`;
        const data = await getJson(`${base}/rest/api/2/issue/${ref.id}?fields=summary,status,issuetype,description`, { authorization: auth }, f);
        const desc = data.fields?.description ?? '';
        const type = data.fields?.issuetype?.name ?? '';
        return {
            source: 'Jira',
            id: ref.id,
            kind: /bug/i.test(type) ? 'bug' : /story|feature|epic/i.test(type) ? 'requirement' : 'task',
            title: data.fields?.summary ?? ref.id,
            url: `${base}/browse/${ref.id}`,
            status: data.fields?.status?.name,
            summary: clip(desc.replace(/\s+/g, ' '), 600),
            acceptanceCriteria: criteriaFrom(desc)
        };
    }
};
export const BUILT_IN_CONNECTORS = [azureDevOps, notion, githubIssues, jira];
