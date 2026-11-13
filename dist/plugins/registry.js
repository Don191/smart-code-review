import { agents } from "./agents.js";
import { javascript, typescript } from "./javascript.js";
import { vue } from "./vue.js";
import { nuxt, node } from "./nuxt.js";
import { python, plain } from "./others.js";
export const BUILT_IN_PLUGINS = [agents, typescript, javascript, vue, nuxt, node, python, ...plain];
const extOf = (path) => {
    const m = path.toLowerCase().match(/(\.d)?\.[a-z0-9]+$/);
    return m ? m[0].replace(/^\.d\./, '.') : '';
};
export class PluginRegistry {
    plugins;
    constructor(plugins = BUILT_IN_PLUGINS) {
        this.plugins = [...plugins];
    }
    /** Adds a plugin. Later plugins are checked first, so they can take over a file type. */
    use(plugin) {
        this.plugins.unshift(plugin);
        return this;
    }
    handles(p, path) {
        if (p.match)
            return p.match(path);
        return (p.extensions ?? []).includes(extOf(path));
    }
    language(path) {
        return this.plugins.find(p => p.kind === 'language' && this.handles(p, path));
    }
    /** The language plugin plus every framework plugin active for this change. */
    forFile(path, activeFrameworks) {
        const lang = this.language(path);
        return [...(lang ? [lang] : []), ...activeFrameworks.filter(f => this.handles(f, path))];
    }
    frameworks(paths) {
        return this.plugins.filter(p => p.kind === 'framework' && (!p.detect || p.detect(paths)));
    }
}
