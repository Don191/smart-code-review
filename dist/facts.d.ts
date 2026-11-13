import type { ChangeFact, DiffFile, SymbolChange } from './types.ts';
/** Functions, classes, methods and types that the diff adds, changes or removes. */
export declare function symbolChanges(file: DiffFile): SymbolChange[];
/** Facts about the change that matter outside the file: routes, pages, dependencies, env vars, config. */
export declare function changeFacts(file: DiffFile): ChangeFact[];
/** A plain description from the lines themselves, for when the model gives none: what it calls. */
export declare function describeSymbol(s: SymbolChange): string;
/** What an agent setup file is: "Skill: deploy", "Subagent: tester", "Instructions: CLAUDE.md". */
export declare function agentLabel(p: string): {
    label: string;
    detail?: string;
} | undefined;
