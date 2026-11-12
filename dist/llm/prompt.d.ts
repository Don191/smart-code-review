import type { ChangeInput, ContextItem, DiffFile, Finding } from '../types.ts';
export declare const AI_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly verdict: {
            readonly type: "string";
            readonly enum: readonly ["approve", "comment", "request-changes"];
        };
        readonly risk: {
            readonly type: "integer";
            readonly minimum: 0;
            readonly maximum: 100;
            readonly description: "How risky it is to merge: 0 trivial, 100 likely to break production.";
        };
        readonly headline: {
            readonly type: "string";
            readonly description: "One plain sentence, at most 18 words: what the change does, then the main problem if any. E.g. \"Adds CSV export, but large exports load every row into memory.\"";
        };
        readonly summary: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly maxItems: 3;
            readonly description: "The key changes, up to 3 short points. Each under 14 words. Say what the change does; problems belong in findings.";
        };
        readonly modules: {
            readonly type: "array";
            readonly description: "One entry per module listed under \"Modules\".";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly summary: {
                        readonly type: "string";
                        readonly description: "What changed in this module, under 12 words. Say what it does now; problems belong in findings.";
                    };
                    readonly impact: {
                        readonly type: "string";
                        readonly enum: readonly ["high", "medium", "low"];
                        readonly description: "How much this module's behaviour changes for users or other modules.";
                    };
                };
                readonly required: readonly ["name", "summary", "impact"];
            };
        };
        readonly files: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly purpose: {
                        readonly type: "string";
                        readonly description: "What changed in this file, under 12 words.";
                    };
                    readonly risk: {
                        readonly type: "integer";
                        readonly minimum: 0;
                        readonly maximum: 100;
                    };
                };
                readonly required: readonly ["path", "purpose", "risk"];
            };
        };
        readonly findings: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly severity: {
                        readonly type: "string";
                        readonly enum: readonly ["blocker", "major", "minor", "nit"];
                    };
                    readonly category: {
                        readonly type: "string";
                        readonly enum: readonly ["bug", "security", "performance", "maintainability", "tests", "accessibility", "requirements", "style"];
                    };
                    readonly file: {
                        readonly type: "string";
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly description: "Line number in the new file, from the numbers shown in the diff.";
                    };
                    readonly title: {
                        readonly type: "string";
                        readonly description: "Under 9 words.";
                    };
                    readonly detail: {
                        readonly type: "string";
                        readonly description: "What goes wrong and when, in 1 to 3 sentences.";
                    };
                    readonly fix: {
                        readonly type: "string";
                        readonly description: "Replacement code for that line or block, if a fix is clear. Code only.";
                    };
                };
                readonly required: readonly ["severity", "category", "file", "line", "title", "detail"];
            };
        };
        readonly requirements: {
            readonly type: "array";
            readonly description: "One entry for every criterion id given under the linked requirements and bugs.";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly description: "The criterion id, e.g. AB#12/2.";
                    };
                    readonly status: {
                        readonly type: "string";
                        readonly enum: readonly ["met", "partial", "missing", "unclear"];
                    };
                    readonly evidence: {
                        readonly type: "string";
                        readonly description: "Where in the diff it is done, or what is missing. Under 25 words.";
                    };
                    readonly files: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly required: readonly ["id", "status", "evidence"];
            };
        };
        readonly tests: {
            readonly type: "object";
            readonly properties: {
                readonly adequate: {
                    readonly type: "boolean";
                };
                readonly note: {
                    readonly type: "string";
                    readonly description: "Under 25 words.";
                };
            };
            readonly required: readonly ["adequate"];
        };
    };
    readonly required: readonly ["verdict", "risk", "headline", "summary", "modules", "files", "findings", "requirements", "tests"];
};
export declare const SYSTEM_PROMPT = "You review code changes like a careful senior engineer.\n\nReport only real problems in the changed lines: bugs, security holes, data loss, performance traps, missing tests for risky logic, accessibility failures, and requirements the change does not meet. Skip style preferences and anything a formatter or linter would fix. Do not praise. If the change is fine, say so and return few or no findings.\n\nRules for findings:\n- Always give the file and the new-file line number, read from the number at the start of each diff line.\n- severity: blocker = must not merge (breaks things, security hole, data loss); major = likely bug or clear risk; minor = worth fixing; nit = optional.\n- Do not repeat issues listed under \"Already found by static checks\".\n- Write in plain English. Short titles. No markdown in titles.\n\nIf requirements, bugs or tickets are given, check every acceptance criterion against the diff. \"met\" needs code in the diff that does it; \"partial\" when some of it is there; \"missing\" when nothing in the diff does it; \"unclear\" when it can't be told from the diff. Missing criteria count against the verdict.\n\nReply with JSON only, matching the schema.";
/** Criteria to check for an item. A bug with none gets one: that it is fixed. */
export declare function criteriaOf(c: ContextItem): string[];
export declare function buildPrompt(args: {
    input: ChangeInput;
    files: DiffFile[];
    roles: Record<string, string>;
    modules: {
        name: string;
        files: string[];
    }[];
    guidance: string[];
    ruleFindings: Finding[];
    context: ContextItem[];
    extraInstructions?: string;
}): {
    prompt: string;
    truncated: string[];
};
/** Pulls the JSON object out of a reply, even if the model wrapped it in a code fence. */
export declare function parseJson(text: string): any;
