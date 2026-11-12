import type { ModuleKind } from './types.ts';
/** A named part of the codebase, matched by path prefix. Set these when the defaults guess wrong. */
export interface ModuleRule {
    name: string;
    kind?: ModuleKind;
    /** Path prefixes, e.g. ["apps/portal/", "packages/portal-ui/"]. */
    paths: string[];
}
export declare function kindFromName(name: string): ModuleKind;
/**
 * Groups a file into a high level module. In a monorepo that is the
 * workspace (apps/portal, packages/ui). Elsewhere it is the layer:
 * frontend, backend, shared code, tests, docs, or build and config.
 */
export declare function moduleOf(path: string, role: string, isMonorepo: boolean, rules?: ModuleRule[]): {
    name: string;
    kind: ModuleKind;
    root?: string;
};
/** True when the change touches two or more workspaces under apps/, packages/ and the like. */
export declare function looksLikeMonorepo(paths: string[]): boolean;
