/** Helper for single-line pattern rules. */
export function lineRule(opts) {
    return {
        id: opts.id,
        title: opts.title,
        severity: opts.severity,
        category: opts.category,
        appliesTo: opts.appliesTo,
        check: ({ added }) => {
            const hits = [];
            for (const { line, content } of added) {
                const trimmed = content.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
                    // Comments only count for rules that look for comment text.
                    if (!/TODO|FIXME|HACK|ts-ignore|ts-nocheck|eslint-disable/.test(opts.pattern.source))
                        continue;
                }
                const m = content.match(opts.pattern);
                if (!m || (opts.unless && opts.unless.test(content)))
                    continue;
                const after = opts.suggest?.(content);
                hits.push({
                    line,
                    title: opts.title,
                    detail: typeof opts.detail === 'function' ? opts.detail(m, content) : opts.detail,
                    suggestion: after !== undefined ? { before: content.trim(), after: after.trim() } : undefined
                });
            }
            return hits;
        }
    };
}
export const isTestPath = (p) => /(^|\/)(__tests__|tests?|spec|e2e)\/|\.(test|spec|e2e)\.[cm]?[jt]sx?$/.test(p);
export const isScriptPath = (p) => /(^|\/)(scripts?|bin|tools)\//.test(p) || /(^|\/)cli\.[cm]?[jt]s$/.test(p);
