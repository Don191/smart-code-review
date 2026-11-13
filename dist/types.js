/** Shared types for diffs, findings, context and the finished review. */
export const SEVERITIES = ['blocker', 'major', 'minor', 'nit'];
/** The same severities on the common critical to low scale, for tools that use it. */
export const SEVERITY_LEVEL = { blocker: 'critical', major: 'high', minor: 'medium', nit: 'low' };
export const CATEGORIES = [
    'bug',
    'security',
    'performance',
    'requirements',
    'tests',
    'accessibility',
    'maintainability',
    'style'
];
