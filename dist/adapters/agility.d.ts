import { type Review } from '../types.ts';
/**
 * smart-code-review is the PR review step of AGIlity, a private multi-agent
 * platform for the whole software lifecycle. These are the shapes AGIlity's
 * `reviewer` agent works with, and the mapping from a Review to them.
 */
export interface AgilityFinding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    detail: string;
    category: string;
    file?: string;
    line?: number;
    evidence?: {
        kind: string;
        label: string;
        content: string;
    }[];
    fix?: string;
    agent: string;
}
export interface AgilityReviewResult {
    agent: 'reviewer';
    verdict: 'pass' | 'warn' | 'fail';
    summary: string;
    findings: AgilityFinding[];
    artifacts: {
        label: string;
        ref: string;
        html?: string;
    }[];
    /** Acceptance criteria the change doesn't clearly meet, as questions for the person who owns the work item. */
    questions: string[];
    model?: string;
    ms?: number;
    /** The HTML report, also in artifacts. */
    html: string;
}
export declare function toAgilityResult(review: Review, opts?: {
    html?: boolean;
}): AgilityReviewResult;
