import { isScriptPath, isTestPath, lineRule, type ReviewPlugin, type Rule } from './types.ts'

const notTestOrScript = (p: string) => !isTestPath(p) && !isScriptPath(p)

/** Rules shared by every JavaScript flavour, including the script blocks of .vue files. */
export const scriptRules: Rule[] = [
  lineRule({
    id: 'js/debugger',
    title: 'debugger statement left in',
    severity: 'major',
    category: 'bug',
    pattern: /(^|[;{\s])debugger\s*;?\s*$/,
    detail: 'This stops execution whenever dev tools are open. Remove it before merging.',
    suggest: () => ''
  }),
  lineRule({
    id: 'js/console',
    title: 'console.log left in',
    severity: 'nit',
    category: 'maintainability',
    appliesTo: notTestOrScript,
    pattern: /\bconsole\.(log|debug|trace)\(/,
    detail: 'Debug logging adds noise in production. Use the project logger or remove it.'
  }),
  lineRule({
    id: 'js/eval',
    title: 'Code built from strings',
    severity: 'major',
    category: 'security',
    pattern: /\beval\s*\(|new Function\s*\(/,
    detail: 'eval and new Function run any string as code. If any part of it comes from input, it can run an attacker\'s code.'
  }),
  lineRule({
    id: 'js/inner-html',
    title: 'HTML set from a string',
    severity: 'major',
    category: 'security',
    pattern: /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\(|document\.write\(/,
    detail: 'Setting HTML from a string can run injected scripts (XSS). Set textContent, build elements, or sanitise the HTML first.'
  }),
  lineRule({
    id: 'js/loose-equality',
    title: 'Loose equality',
    severity: 'minor',
    category: 'bug',
    pattern: /[^=!<>]\s(==|!=)\s(?!=)/,
    unless: /(==|!=)\s*null\b|^\s*(\/\/|\*)|['"`][^'"`]*\s(==|!=)\s[^'"`]*['"`]/,
    detail: (m) => `${m[1]} converts types before comparing, so 0 == '' is true. Use ${m[1]}= unless the conversion is wanted.`,
    suggest: (c) => c.replace(/([^=!<>]\s)(==|!=)(\s)(?!=)/, '$1$2=$3')
  }),
  lineRule({
    id: 'js/foreach-async',
    title: 'forEach with an async callback',
    severity: 'major',
    category: 'bug',
    pattern: /\.forEach\(\s*async\b/,
    detail: 'forEach does not wait for async callbacks, so the code after it runs before they finish and their errors are lost. Use for...of with await, or Promise.all with map.',
    suggest: (c) => c.replace(/(\S+)\.forEach\(\s*async\s*\(?\s*(\w+)\s*\)?\s*=>/, 'await Promise.all($1.map(async ($2) =>')
  }),
  lineRule({
    id: 'js/empty-catch',
    title: 'Error swallowed',
    severity: 'minor',
    category: 'bug',
    pattern: /catch\s*(\([^)]*\))?\s*\{\s*\}/,
    detail: 'An empty catch hides failures. Log the error, rethrow it, or add a comment saying why it is safe to ignore.'
  }),
  lineRule({
    id: 'js/promise-no-catch',
    title: 'Promise chain without a catch',
    severity: 'minor',
    category: 'bug',
    pattern: /\.then\([^)]*\)\s*;?\s*$/,
    unless: /\.catch\(|await |return /,
    detail: 'A rejected promise with no catch becomes an unhandled rejection, which can crash a Node process.'
  }),
  lineRule({
    id: 'js/only-test',
    title: 'Focused test left in',
    severity: 'major',
    category: 'tests',
    appliesTo: isTestPath,
    pattern: /\b(it|test|describe)\.only\(|\bf(it|describe)\(/,
    detail: '.only makes the runner skip every other test in the file, so CI can pass while tests are not run.',
    suggest: (c) => c.replace(/\.only\(/, '(')
  }),
  lineRule({
    id: 'js/skip-test',
    title: 'Test skipped',
    severity: 'minor',
    category: 'tests',
    appliesTo: isTestPath,
    pattern: /\b(it|test|describe)\.skip\(|\bx(it|describe)\(/,
    detail: 'A skipped test stops guarding the behaviour it covers. Add a note or a ticket for when it comes back.'
  }),
  lineRule({
    id: 'js/todo',
    title: 'TODO added',
    severity: 'nit',
    category: 'maintainability',
    pattern: /\b(TODO|FIXME|HACK|XXX)\b/,
    detail: 'New TODOs tend to stay. Link a ticket or finish it in this change.'
  }),
  lineRule({
    id: 'js/hardcoded-secret',
    title: 'Possible secret in code',
    severity: 'blocker',
    category: 'security',
    pattern: /(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[bp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY|(password|passwd|secret|api_?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"])/i,
    unless: /process\.env|import\.meta\.env|useRuntimeConfig|example|placeholder|your[-_]|xxxx|<.*>/i,
    detail: 'This looks like a credential. Anything committed stays in git history, so rotate it and load it from an environment variable or secret store.'
  })
]

const tsRules: Rule[] = [
  lineRule({
    id: 'ts/any',
    title: 'Type set to any',
    severity: 'minor',
    category: 'maintainability',
    pattern: /:\s*any\b|\bas any\b|<any>/,
    detail: 'any switches off type checking for this value and everything it touches. Use unknown and narrow it, or write the type.'
  }),
  lineRule({
    id: 'ts/ignore',
    title: 'Type error silenced',
    severity: 'minor',
    category: 'maintainability',
    pattern: /@ts-(ignore|nocheck)\b/,
    detail: '@ts-ignore hides every error on the next line, including ones added later. Prefer @ts-expect-error with a reason, or fix the type.',
    suggest: (c) => c.replace('@ts-ignore', '@ts-expect-error <reason>')
  }),
  lineRule({
    id: 'ts/non-null',
    title: 'Non-null assertion',
    severity: 'nit',
    category: 'bug',
    pattern: /\w\)?!\.(?!=)/,
    unless: /!==|!=\s/,
    detail: 'The ! tells TypeScript the value is never null without checking. If it can be, this throws at runtime. Check it or use ?.'
  })
]

const roleOf = (p: string): string | undefined => {
  if (isTestPath(p)) return 'Test'
  if (/(^|\/)(package\.json|tsconfig[^/]*\.json|\.eslintrc[^/]*|eslint\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s)$/.test(p)) return 'Config'
  if (/(^|\/)(migrations?)\//.test(p)) return 'Migration'
  if (/auth|session|login|password|token|crypto/i.test(p)) return 'Auth / security'
  if (isScriptPath(p)) return 'Script'
  if (/\.d\.ts$|(^|\/)types?\//.test(p)) return 'Types'
  return undefined
}

export const roleRisk = (role: string): number =>
  ({ 'Auth / security': 1, Migration: 0.9, 'API route': 0.8, 'Server middleware': 0.8, Server: 0.6, Config: 0.5, Store: 0.5, Test: -0.3, Types: -0.2, Docs: -0.6, Script: -0.2 })[role] ?? 0

export const javascript: ReviewPlugin = {
  name: 'javascript',
  kind: 'language',
  label: 'JavaScript',
  color: '#f1e05a',
  extensions: ['.js', '.mjs', '.cjs', '.jsx'],
  classify: roleOf,
  roleRisk,
  rules: scriptRules,
  guidance: 'Async mistakes (missing await, unhandled rejections), null and undefined handling, mutation of shared state, and input that reaches the DOM, a shell or a query.'
}

export const typescript: ReviewPlugin = {
  name: 'typescript',
  kind: 'language',
  label: 'TypeScript',
  color: '#3178c6',
  extensions: ['.ts', '.mts', '.cts', '.tsx'],
  classify: roleOf,
  roleRisk,
  rules: [...scriptRules, ...tsRules],
  guidance: 'Types that lie (casts, any, ! assertions), missing narrowing, async mistakes, and public types that changed in a breaking way.'
}
