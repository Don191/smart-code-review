import type { ChangeInput } from '../types.ts';
/**
 * The current branch against a base branch (default: origin's default
 * branch, then main, then master), with commit messages for context.
 * `staged` reviews what is staged instead; `working` reviews uncommitted changes.
 */
export declare function fromGit(opts?: {
    cwd?: string;
    base?: string;
    staged?: boolean;
    working?: boolean;
}): ChangeInput;
