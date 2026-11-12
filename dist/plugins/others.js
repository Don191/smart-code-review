import { lineRule } from "./types.js";
/**
 * A small Python plugin. It is here mostly as a worked example of adding a
 * language: an extension list, a colour, a few line rules and review notes.
 */
export const python = {
    name: 'python',
    kind: 'language',
    label: 'Python',
    color: '#3572a5',
    extensions: ['.py'],
    classify: (p) => (/(^|\/)tests?\/|test_\w+\.py$/.test(p) ? 'Test' : undefined),
    rules: [
        lineRule({ id: 'py/bare-except', title: 'Bare except', severity: 'minor', category: 'bug', pattern: /^\s*except\s*:/, detail: 'A bare except also catches KeyboardInterrupt and SystemExit. Catch Exception or something narrower.' }),
        lineRule({ id: 'py/print', title: 'print left in', severity: 'nit', category: 'maintainability', pattern: /^\s*print\(/, detail: 'Use logging so output can be filtered and turned off.' }),
        lineRule({ id: 'py/eval', title: 'eval or exec', severity: 'major', category: 'security', pattern: /\b(eval|exec)\(/, detail: 'eval and exec run any string as code.' }),
        lineRule({ id: 'py/mutable-default', title: 'Mutable default argument', severity: 'minor', category: 'bug', pattern: /def \w+\([^)]*=\s*(\[\]|\{\}|set\(\))/, detail: 'The default list or dict is shared between calls. Default to None and create it inside the function.' })
    ],
    guidance: 'Exceptions that are too broad, mutable defaults, resource handling without context managers, and blocking calls in async code.'
};
const DOCS = ['.md', '.mdx', '.txt', '.rst'];
const STYLE = ['.css', '.scss', '.sass', '.less', '.pcss'];
const DATA = ['.json', '.yml', '.yaml', '.toml'];
/** Files with no language plugin still get a label and colour in the report. */
export const plain = [
    { name: 'css', kind: 'language', label: 'CSS', color: '#663399', extensions: STYLE },
    { name: 'html', kind: 'language', label: 'HTML', color: '#e34c26', extensions: ['.html', '.htm'] },
    { name: 'docs', kind: 'language', label: 'Docs', color: '#8b949e', extensions: DOCS, classify: () => 'Docs' },
    {
        name: 'data',
        kind: 'language',
        label: 'Config',
        color: '#cb171e',
        extensions: DATA,
        classify: (p) => (/(^|\/)(package-lock\.json|pnpm-lock\.yaml)$/.test(p) ? 'Lockfile' : 'Config')
    }
];
export const lockfile = (p) => /(^|\/)(yarn\.lock|package-lock\.json|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock)$/.test(p);
