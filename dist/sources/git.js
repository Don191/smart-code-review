import { execFileSync } from 'node:child_process';
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
/**
 * The current branch against a base branch (default: origin's default
 * branch, then main, then master), with commit messages for context.
 * `staged` reviews what is staged instead; `working` reviews uncommitted changes.
 */
export function fromGit(opts = {}) {
    const cwd = opts.cwd ?? process.cwd();
    const head = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    const remote = (() => { try {
        return git(['config', '--get', 'remote.origin.url'], cwd);
    }
    catch {
        return '';
    } })();
    const repo = remote.match(/[:/]([\w.-]+\/[\w.-]+?)(\.git)?$/)?.[1];
    if (opts.staged || opts.working) {
        const diff = git(['diff', '--no-color', '-M', ...(opts.staged ? ['--cached'] : ['HEAD'])], cwd);
        return { diff, title: `${opts.staged ? 'Staged' : 'Uncommitted'} changes on ${head}`, head, repo };
    }
    let base = opts.base;
    if (!base) {
        for (const b of ['origin/HEAD', 'origin/main', 'main', 'origin/master', 'master']) {
            try {
                git(['rev-parse', '--verify', '--quiet', b], cwd);
                base = b;
                break;
            }
            catch { }
        }
    }
    if (!base)
        throw new Error('No base branch found. Pass --base <branch>.');
    const mergeBase = git(['merge-base', base, 'HEAD'], cwd);
    const diff = git(['diff', '--no-color', '-M', `${mergeBase}...HEAD`], cwd);
    const log = git(['log', '--format=%B%x00', `${mergeBase}..HEAD`], cwd).split('\0').map(s => s.trim()).filter(Boolean);
    return {
        diff,
        title: log.length === 1 ? log[0].split('\n')[0] : `${head} (${log.length} commits)`,
        description: log.length === 1 ? log[0].split('\n').slice(1).join('\n').trim() : log.map(l => `- ${l.split('\n')[0]}`).join('\n'),
        head,
        base: base.replace(/^origin\//, ''),
        repo,
        commits: log
    };
}
