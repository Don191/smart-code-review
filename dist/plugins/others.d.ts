import { type ReviewPlugin } from './types.ts';
/**
 * A small Python plugin. It is here mostly as a worked example of adding a
 * language: an extension list, a colour, a few line rules and review notes.
 */
export declare const python: ReviewPlugin;
/** Files with no language plugin still get a label and colour in the report. */
export declare const plain: ReviewPlugin[];
export declare const lockfile: (p: string) => boolean;
