import { type Review, type Severity } from '../types.ts';
/** A shape per severity, so it reads without colour too. */
export declare function sevIcon(s: Severity, size?: number): string;
/** Green to amber to red. */
export declare function riskColor(r: number): string;
export interface RenderOptions {
    /** Include the review JSON in the page so tools can read it back. Default true. */
    embedData?: boolean;
}
/** Renders a review as one self-contained HTML page. */
export declare function renderHtml(review: Review, opts?: RenderOptions): string;
