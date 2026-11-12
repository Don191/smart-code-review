/** Turns HTML from a work item field into plain text. */
export function htmlToText(html = '') {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
/**
 * Pulls a list of acceptance criteria out of free text: checkbox and bullet
 * lines, Given/When/Then lines, or numbered lines. The first matching
 * section wins if the text has an "Acceptance criteria" heading.
 */
export function criteriaFrom(text = '') {
    const lines = text.split('\n');
    const head = lines.findIndex(l => /acceptance criteria|requirements|definition of done/i.test(l) && l.trim().length < 60);
    const scope = head >= 0 ? lines.slice(head + 1) : lines;
    const out = [];
    for (const raw of scope) {
        const l = raw.trim();
        if (head >= 0 && out.length && /^#{1,6}\s|^[A-Z][\w ]{2,40}:$/.test(l))
            break;
        const m = l.match(/^(?:[-*•]\s*(?:\[[ xX]\]\s*)?|\d+[.)]\s+|(?:given|when|then|and)\s)(.+)$/i);
        if (m)
            out.push((/^(given|when|then|and)\s/i.test(l) ? l : m[1]).trim());
    }
    return out.filter(c => c.length > 3).slice(0, 20);
}
export const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);
