import { type SymbolChange, type Review, type Severity } from '../types.ts';
/** A shape per severity, so it reads without colour too. */
export declare function sevIcon(s: Severity, size?: number): string;
/** Green to amber to red. */
export declare function riskColor(r: number): string;
/** Added, changed, removed and renamed as a coloured shape, so the word isn't needed. */
export declare function actIcon(a: SymbolChange['action'] | 'renamed', size?: number): string;
/** The main path through the change, as a sequence diagram. */
export declare function flowDiagram(flow: NonNullable<Review['change']['flow']>): string;
export interface RenderOptions {
    /** Include the review JSON in the page so tools can read it back. Default true. */
    embedData?: boolean;
}
/** Renders a review as one self-contained HTML page. */
export declare function renderHtml(review: Review, opts?: RenderOptions): string;
