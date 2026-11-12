import type { ReviewPlugin } from './types.ts';
export declare const BUILT_IN_PLUGINS: ReviewPlugin[];
export declare class PluginRegistry {
    plugins: ReviewPlugin[];
    constructor(plugins?: ReviewPlugin[]);
    /** Adds a plugin. Later plugins are checked first, so they can take over a file type. */
    use(plugin: ReviewPlugin): this;
    private handles;
    language(path: string): ReviewPlugin | undefined;
    /** The language plugin plus every framework plugin active for this change. */
    forFile(path: string, activeFrameworks: ReviewPlugin[]): ReviewPlugin[];
    frameworks(paths: string[]): ReviewPlugin[];
}
