import type { Annotation, Review } from './types.ts';
/**
 * Reads notes exported from a report ("Export notes"), or a plain list of annotations.
 * Unknown statuses become "discuss" so nothing is lost.
 */
export declare function parseAnnotations(json: string | unknown): Annotation[];
/**
 * Adds notes to a review, so they're built into the report. Finding ids are stable,
 * so notes from the last review of a change carry over to the next one. The newest
 * note for a finding wins; notes for findings that are gone are dropped.
 */
export declare function applyAnnotations(review: Review, notes: Annotation[]): Review;
/** Findings nobody has dealt with yet: no note, or marked for discussion. */
export declare function unresolvedFindings(review: Review): import("./types.ts").Finding[];
