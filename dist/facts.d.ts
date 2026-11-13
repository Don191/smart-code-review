import type { ChangeFact, DiffFile, SymbolChange } from './types.ts';
/** Functions, classes, methods and types that the diff adds, changes or removes. */
export declare function symbolChanges(file: DiffFile): SymbolChange[];
/** Facts about the change that matter outside the file: routes, pages, dependencies, env vars, config. */
export declare function changeFacts(file: DiffFile): ChangeFact[];
