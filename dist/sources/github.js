export function parsePrUrl(url) {
    const m = url.match(/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/);
    return m ? { repo: m[1], number: Number(m[2]) } : undefined;
}
/**
 * Loads a GitHub pull request: its diff, title, body, branches and commit
 * messages. Public repos work without a token.
 */
export async function fromGitHubPr(url, opts = {}) {
    const pr = parsePrUrl(url);
    if (!pr)
        throw new Error('Not a GitHub pull request URL, e.g. https://github.com/owner/repo/pull/123');
    const f = opts.fetch ?? fetch;
    const headers = { 'user-agent': 'smart-code-review', accept: 'application/vnd.github+json' };
    if (opts.token)
        headers.authorization = `Bearer ${opts.token}`;
    const api = `https://api.github.com/repos/${pr.repo}/pulls/${pr.number}`;
    const [metaRes, diffRes, commitsRes] = await Promise.all([
        f(api, { headers }),
        f(api, { headers: { ...headers, accept: 'application/vnd.github.diff' } }),
        f(`${api}/commits?per_page=50`, { headers })
    ]);
    if (!metaRes.ok) {
        const hint = metaRes.status === 404 ? ' (private repo or wrong URL?)' : metaRes.status === 403 ? ' (rate limited; set GITHUB_TOKEN)' : '';
        throw new Error(`GitHub returned ${metaRes.status} for ${pr.repo}#${pr.number}${hint}`);
    }
    if (!diffRes.ok)
        throw new Error(`GitHub returned ${diffRes.status} for the diff${diffRes.status === 406 ? ' (the diff is too large for the API)' : ''}`);
    const meta = await metaRes.json();
    const diff = await diffRes.text();
    if (opts.maxDiffBytes && diff.length > opts.maxDiffBytes)
        throw new Error(`The diff is ${Math.round(diff.length / 1024)} KB, over the ${Math.round(opts.maxDiffBytes / 1024)} KB limit.`);
    const commits = commitsRes.ok ? await commitsRes.json() : [];
    return {
        diff,
        title: meta.title,
        description: meta.body ?? '',
        url: meta.html_url,
        repo: pr.repo,
        author: meta.user?.login,
        base: meta.base?.ref,
        head: meta.head?.ref,
        commits: commits.map(c => c.commit?.message).filter(Boolean)
    };
}
