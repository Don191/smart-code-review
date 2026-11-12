import type { DiffFile, DiffLine } from './types.ts';
/** Parses a unified diff (git diff, GitHub's .diff, `diff -u`) into files and hunks. */
export declare function parseDiff(text: string): DiffFile[];
/** The lines a change adds, with their line numbers in the new file. */
export declare function addedLines(file: DiffFile): {
    line: number;
    content: string;
}[];
/** A diff back as text, for prompts and the full diff view. */
export declare function formatFile(file: DiffFile, withNumbers?: boolean): string;
/** The diff lines around a line in the new file, for showing a finding in place. */
export declare function excerpt(file: DiffFile, line: number, radius?: number): DiffLine[];
