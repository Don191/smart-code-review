import type { ChangeInput, ContextItem } from '../types.ts';
import { type Connector, type ConnectorOptions } from './types.ts';
export * from './types.ts';
export * from './builtin.ts';
/**
 * Context written by hand or handed over by an agent: Markdown with one
 * "# Heading" per item, or a JSON array of ContextItems. Lets an agent that
 * already has Notion or Azure DevOps tools (e.g. over MCP) pass in what it
 * found without this package holding any tokens.
 */
export declare function parseContext(text: string, source?: string): ContextItem[];
export interface GatherResult {
    items: ContextItem[];
    connectors: string[];
    warnings: string[];
}
/** Finds references in the change and fetches them from every connector that is set up. */
export declare function gatherContext(input: ChangeInput, opts: ConnectorOptions & {
    connectors?: Connector[];
    max?: number;
    have?: string[];
}): Promise<GatherResult>;
