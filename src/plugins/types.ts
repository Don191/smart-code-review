import type { Category, DiffFile, Finding, Severity } from '../types.ts'

export interface AddedLine {
  line: number
  content: string
}

export interface RuleContext {
  file: DiffFile
  /** Lines this change adds, with their new line numbers. */
  added: AddedLine[]
  /** Every path in the change, for rules that look across files. */
  paths: string[]
  role: string
}

export type RuleHit = Pick<Finding, 'line' | 'title' | 'detail'> & Partial<Pick<Finding, 'severity' | 'category' | 'suggestion'>>

export interface Rule {
  id: string
  title: string
  severity: Severity
  category: Category
  /** Limit the rule to some files, e.g. only server routes. */
  appliesTo?: (path: string, role: string) => boolean
  check: (ctx: RuleContext) => RuleHit[]
}

/**
 * A plugin teaches the reviewer about a language or framework.
 *
 * `language` plugins name the language of a file (the first match wins).
 * `framework` plugins add roles, rules and review notes on top, and can match
 * the same files as a language plugin.
 */
export interface ReviewPlugin {
  name: string
  kind: 'language' | 'framework'
  /** Shown in the report, e.g. "TypeScript". */
  label: string
  /** Colour for the file's language dot in the report. */
  color?: string
  /** File extensions this plugin handles, with the dot. */
  extensions?: string[]
  /** For checks that need more than the extension. */
  match?: (path: string) => boolean
  /** Framework plugins can switch on only when the change looks like their project. */
  detect?: (paths: string[]) => boolean
  /** A short role for a file, e.g. "API route" or "Vue component". */
  classify?: (path: string) => string | undefined
  /** Extra weight for risky roles: 0 is normal, 1 is the riskiest. */
  roleRisk?: (role: string) => number
  rules?: Rule[]
  /** What the model should look for in these files. Keep it short. */
  guidance?: string
}

/** Helper for single-line pattern rules. */
export function lineRule(
  opts: Omit<Rule, 'check'> & {
    pattern: RegExp
    unless?: RegExp
    detail: string | ((match: RegExpMatchArray, content: string) => string)
    suggest?: (content: string) => string | undefined
  }
): Rule {
  return {
    id: opts.id,
    title: opts.title,
    severity: opts.severity,
    category: opts.category,
    appliesTo: opts.appliesTo,
    check: ({ added }) => {
      const hits: RuleHit[] = []
      for (const { line, content } of added) {
        const trimmed = content.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
          // Comments only count for rules that look for comment text.
          if (!/TODO|FIXME|HACK|ts-ignore|ts-nocheck|eslint-disable/.test(opts.pattern.source)) continue
        }
        const m = content.match(opts.pattern)
        if (!m || (opts.unless && opts.unless.test(content))) continue
        const after = opts.suggest?.(content)
        hits.push({
          line,
          title: opts.title,
          detail: typeof opts.detail === 'function' ? opts.detail(m, content) : opts.detail,
          suggestion: after !== undefined ? { before: content.trim(), after: after.trim() } : undefined
        })
      }
      return hits
    }
  }
}

export const isTestPath = (p: string) => /(^|\/)(__tests__|tests?|spec|e2e)\/|\.(test|spec|e2e)\.[cm]?[jt]sx?$/.test(p)
export const isScriptPath = (p: string) => /(^|\/)(scripts?|bin|tools)\//.test(p) || /(^|\/)cli\.[cm]?[jt]s$/.test(p)
