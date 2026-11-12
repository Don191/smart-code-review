/** Shared types for diffs, findings, context and the finished review. */

export type Severity = 'blocker' | 'major' | 'minor' | 'nit'

export const SEVERITIES: Severity[] = ['blocker', 'major', 'minor', 'nit']

export type Category =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'tests'
  | 'accessibility'
  | 'requirements'
  | 'style'

export const CATEGORIES: Category[] = [
  'bug',
  'security',
  'performance',
  'requirements',
  'tests',
  'accessibility',
  'maintainability',
  'style'
]

export type Verdict = 'approve' | 'comment' | 'request-changes'

export interface DiffLine {
  type: 'add' | 'del' | 'ctx'
  content: string
  oldLine?: number
  newLine?: number
}

export interface Hunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffFile {
  path: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  binary: boolean
  additions: number
  deletions: number
  hunks: Hunk[]
}

export interface Suggestion {
  /** The code as it is now. */
  before?: string
  /** The code as it should be. */
  after: string
}

export interface Finding {
  id: string
  severity: Severity
  category: Category
  file?: string
  line?: number
  title: string
  detail: string
  suggestion?: Suggestion
  /** `rule` findings come from a plugin's checks, `ai` from the model. */
  source: 'rule' | 'ai'
  ruleId?: string
  plugin?: string
}

/** A requirement, bug or doc pulled in by a connector. */
export interface ContextItem {
  source: string
  id: string
  kind: 'requirement' | 'bug' | 'task' | 'issue' | 'doc'
  title: string
  url?: string
  status?: string
  summary?: string
  acceptanceCriteria: string[]
  reproSteps?: string
}

export interface RequirementCheck {
  itemId: string
  criterion: string
  status: 'met' | 'partial' | 'missing' | 'unclear'
  evidence?: string
  files?: string[]
}

export type ModuleKind = 'frontend' | 'backend' | 'shared' | 'tests' | 'docs' | 'config'

/** A high level part of the change: a workspace in a monorepo, or a layer such as frontend or backend. */
export interface ModuleSummary {
  name: string
  kind: ModuleKind
  /** Path prefix, for workspaces. */
  root?: string
  /** One short sentence on what changed here. */
  summary?: string
  impact: 'high' | 'medium' | 'low'
  /** 0 to 100. */
  risk: number
  files: string[]
  additions: number
  deletions: number
}

export interface FileSummary {
  path: string
  module: string
  language: string
  languageColor: string
  role: string
  purpose?: string
  /** 0 to 100. */
  risk: number
  additions: number
  deletions: number
  status: DiffFile['status']
}

export interface ReviewMeta {
  title: string
  description?: string
  url?: string
  repo?: string
  author?: string
  base?: string
  head?: string
  generatedAt: string
  provider?: string
  model?: string
  durationMs?: number
  plugins: string[]
  connectors: string[]
}

export interface Review {
  meta: ReviewMeta
  verdict: Verdict
  /** 0 to 100. */
  risk: number
  headline: string
  summary: string[]
  modules: ModuleSummary[]
  files: FileSummary[]
  findings: Finding[]
  context: ContextItem[]
  requirements: RequirementCheck[]
  tests: { changed: boolean; note?: string }
  diff: DiffFile[]
  warnings: string[]
}

/** What a review starts from: a diff and whatever is known about the change. */
export interface ChangeInput {
  diff: string
  title?: string
  description?: string
  url?: string
  repo?: string
  author?: string
  base?: string
  head?: string
  /** Branch name and commit messages are searched for work item references too. */
  commits?: string[]
}
