import { agents } from './agents.ts'
import { javascript, typescript } from './javascript.ts'
import { vue } from './vue.ts'
import { nuxt, node } from './nuxt.ts'
import { python, plain } from './others.ts'
import type { ReviewPlugin } from './types.ts'

export const BUILT_IN_PLUGINS: ReviewPlugin[] = [agents, typescript, javascript, vue, nuxt, node, python, ...plain]

const extOf = (path: string) => {
  const m = path.toLowerCase().match(/(\.d)?\.[a-z0-9]+$/)
  return m ? m[0].replace(/^\.d\./, '.') : ''
}

export class PluginRegistry {
  plugins: ReviewPlugin[]

  constructor(plugins: ReviewPlugin[] = BUILT_IN_PLUGINS) {
    this.plugins = [...plugins]
  }

  /** Adds a plugin. Later plugins are checked first, so they can take over a file type. */
  use(plugin: ReviewPlugin): this {
    this.plugins.unshift(plugin)
    return this
  }

  private handles(p: ReviewPlugin, path: string) {
    if (p.match) return p.match(path)
    return (p.extensions ?? []).includes(extOf(path))
  }

  language(path: string): ReviewPlugin | undefined {
    return this.plugins.find(p => p.kind === 'language' && this.handles(p, path))
  }

  /** The language plugin plus every framework plugin active for this change. */
  forFile(path: string, activeFrameworks: ReviewPlugin[]): ReviewPlugin[] {
    const lang = this.language(path)
    return [...(lang ? [lang] : []), ...activeFrameworks.filter(f => this.handles(f, path))]
  }

  frameworks(paths: string[]): ReviewPlugin[] {
    return this.plugins.filter(p => p.kind === 'framework' && (!p.detect || p.detect(paths)))
  }
}
