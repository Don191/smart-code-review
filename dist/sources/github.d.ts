import type { ChangeInput } from '../types.ts';
export declare function parsePrUrl(url: string): {
    repo: string;
    number: number;
} | undefined;
/**
 * Loads a GitHub pull request: its diff, title, body, branches and commit
 * messages. Public repos work without a token.
 */
export declare function fromGitHubPr(url: string, opts?: {
    token?: string;
    fetch?: typeof fetch;
    maxDiffBytes?: number;
}): Promise<ChangeInput>;
