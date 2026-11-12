import type { ContextItem } from '../types.ts';
/** A pointer to a work item, page or issue found in the PR text. */
export interface ContextRef {
    connector: string;
    id: string;
    url?: string;
}
export interface ConnectorEnv {
    [name: string]: string | undefined;
}
export interface ConnectorOptions {
    env: ConnectorEnv;
    /** owner/name of the repo under review, for short refs like #12. */
    repo?: string;
    fetch?: typeof fetch;
}
/**
 * A connector finds references to its system in the change (PR title, body,
 * branch, commits) and fetches them as requirements, bugs or docs.
 */
export interface Connector {
    name: string;
    label: string;
    /** Env vars it needs. If any are missing the connector is skipped. */
    requires: string[];
    /** Its references can match ordinary text (e.g. ABC-123), so stay quiet when it isn't set up. */
    weakRefs?: boolean;
    findRefs: (text: string, opts: ConnectorOptions) => ContextRef[];
    fetch: (ref: ContextRef, opts: ConnectorOptions) => Promise<ContextItem | null>;
}
/** Turns HTML from a work item field into plain text. */
export declare function htmlToText(html?: string): string;
/**
 * Pulls a list of acceptance criteria out of free text: checkbox and bullet
 * lines, Given/When/Then lines, or numbered lines. The first matching
 * section wins if the text has an "Acceptance criteria" heading.
 */
export declare function criteriaFrom(text?: string): string[];
export declare const clip: (s: string | undefined, n: number) => string | undefined;
