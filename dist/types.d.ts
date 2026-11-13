/** Shared types for diffs, findings, context and the finished review. */
export type Severity = 'blocker' | 'major' | 'minor' | 'nit';
export declare const SEVERITIES: Severity[];
export type Category = 'bug' | 'security' | 'performance' | 'maintainability' | 'tests' | 'accessibility' | 'requirements' | 'style';
export declare const CATEGORIES: Category[];
export type Verdict = 'approve' | 'comment' | 'request-changes';
export interface DiffLine {
    type: 'add' | 'del' | 'ctx';
    content: string;
    oldLine?: number;
    newLine?: number;
}
export interface Hunk {
    header: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: DiffLine[];
}
export interface DiffFile {
    path: string;
    oldPath?: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    binary: boolean;
    additions: number;
    deletions: number;
    hunks: Hunk[];
}
export interface Suggestion {
    /** The code as it is now. */
    before?: string;
    /** The code as it should be. */
    after: string;
}
export interface Finding {
    id: string;
    severity: Severity;
    category: Category;
    file?: string;
    line?: number;
    title: string;
    detail: string;
    suggestion?: Suggestion;
    /** `rule` findings come from a plugin's checks, `ai` from the model. */
    source: 'rule' | 'ai';
    ruleId?: string;
    plugin?: string;
}
/** A requirement, bug or doc pulled in by a connector. */
export interface ContextItem {
    source: string;
    id: string;
    kind: 'requirement' | 'bug' | 'task' | 'issue' | 'doc';
    title: string;
    url?: string;
    status?: string;
    summary?: string;
    acceptanceCriteria: string[];
    reproSteps?: string;
}
export interface RequirementCheck {
    itemId: string;
    criterion: string;
    status: 'met' | 'partial' | 'missing' | 'unclear';
    evidence?: string;
    files?: string[];
}
/** A function, class, method, type or template the diff adds, changes or removes. */
export interface SymbolChange {
    name: string;
    kind: 'function' | 'class' | 'method' | 'type' | 'template' | 'test';
    action: 'added' | 'changed' | 'removed';
    file: string;
    line?: number;
    /** What changed in it, in a few words. */
    description?: string;
    /** The diff lines inside it. */
    lines: DiffLine[];
}
/** One feature or fix inside a change, with the files and functions that make it up. */
export interface Feature {
    name: string;
    summary?: string;
    files: string[];
    /** Names of the functions, components or templates that belong to it. Empty means the whole file. */
    symbols: string[];
}
/** Something the change does that matters outside its file. */
export interface ChangeFact {
    kind: 'route' | 'page' | 'component' | 'dependency' | 'env' | 'config' | 'migration' | 'agent';
    action: 'added' | 'changed' | 'removed';
    label: string;
    detail?: string;
    file: string;
}
export type ModuleKind = 'frontend' | 'backend' | 'shared' | 'tests' | 'docs' | 'config' | 'agents';
/** A high level part of the change: a workspace in a monorepo, or a layer such as frontend or backend. */
export interface ModuleSummary {
    name: string;
    kind: ModuleKind;
    /** Path prefix, for workspaces. */
    root?: string;
    /** One short sentence on what changed here, without judgement. */
    summary?: string;
    /** Short points on what changed here. */
    points?: string[];
    impact: 'high' | 'medium' | 'low';
    /** 0 to 100. */
    risk: number;
    files: string[];
    additions: number;
    deletions: number;
}
export interface FileSummary {
    path: string;
    module: string;
    language: string;
    languageColor: string;
    role: string;
    purpose?: string;
    /** 0 to 100. */
    risk: number;
    additions: number;
    deletions: number;
    status: DiffFile['status'];
    symbols: SymbolChange[];
    facts: ChangeFact[];
}
export interface ReviewMeta {
    title: string;
    description?: string;
    url?: string;
    repo?: string;
    author?: string;
    base?: string;
    head?: string;
    generatedAt: string;
    provider?: string;
    model?: string;
    durationMs?: number;
    plugins: string[];
    connectors: string[];
}
export interface Review {
    meta: ReviewMeta;
    verdict: Verdict;
    /** 0 to 100. */
    risk: number;
    /** What the change does, described without judgement. */
    change: {
        summary: string;
        points: string[];
        facts: ChangeFact[];
        /** How long a careful review would take: 1 (minutes) to 5 (hours). */
        effort: number;
        /** The separate features or fixes in the change, for large PRs. Files not in any are left out. */
        features?: Feature[];
        /** The main path through the changed code, as steps between parts of the system. */
        flow?: {
            from: string;
            to: string;
            label: string;
        }[];
    };
    /** The review's one line assessment. */
    headline: string;
    /** Short review notes. */
    summary: string[];
    modules: ModuleSummary[];
    files: FileSummary[];
    findings: Finding[];
    context: ContextItem[];
    requirements: RequirementCheck[];
    tests: {
        changed: boolean;
        note?: string;
    };
    diff: DiffFile[];
    warnings: string[];
}
/** What a review starts from: a diff and whatever is known about the change. */
export interface ChangeInput {
    diff: string;
    title?: string;
    description?: string;
    url?: string;
    repo?: string;
    author?: string;
    base?: string;
    head?: string;
    /** Branch name and commit messages are searched for work item references too. */
    commits?: string[];
}
