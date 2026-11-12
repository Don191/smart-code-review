import { type ReviewPlugin, type Rule } from './types.ts';
/** Rules shared by every JavaScript flavour, including the script blocks of .vue files. */
export declare const scriptRules: Rule[];
export declare const roleRisk: (role: string) => number;
export declare const javascript: ReviewPlugin;
export declare const typescript: ReviewPlugin;
