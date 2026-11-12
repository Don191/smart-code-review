import { type Connector } from './connectors/index.ts';
import type { LlmProvider } from './llm/providers.ts';
import { type ModuleRule } from './modules.ts';
import { PluginRegistry } from './plugins/registry.ts';
import type { ReviewPlugin } from './plugins/types.ts';
import { type ChangeInput, type ContextItem, type Review } from './types.ts';
export interface ReviewOptions {
    /** Leave out to run the static checks only. */
    provider?: LlmProvider;
    /** Extra plugins, checked before the built-in ones. */
    plugins?: ReviewPlugin[];
    /** Replace the built-in plugins entirely. */
    registry?: PluginRegistry;
    /** Defaults to Azure DevOps, Notion, GitHub Issues and Jira. */
    connectors?: Connector[];
    /** Tokens for connectors and nothing else. Defaults to none. */
    env?: Record<string, string | undefined>;
    /** Requirements handed in directly, e.g. by an agent with its own Notion tools. */
    context?: ContextItem[];
    /** Set false to skip fetching linked work items. */
    fetchContext?: boolean;
    /** House rules added to the prompt. */
    instructions?: string;
    /** Name the high level modules yourself (portal, API...). Otherwise workspaces or layers are used. */
    modules?: ModuleRule[];
    /** Paths to leave out of the review. */
    ignore?: (path: string) => boolean;
    onProgress?: (step: string) => void;
    signal?: AbortSignal;
}
export declare function review(input: ChangeInput, opts?: ReviewOptions): Promise<Review>;
