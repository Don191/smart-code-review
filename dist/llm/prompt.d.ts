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
        readonly change: {
            readonly type: "object";
            readonly description: "A neutral description of what the change does. Facts only: no judgement, no problems, no praise.";
            readonly properties: {
                readonly summary: {
                    readonly type: "string";
                    readonly description: "One or two plain sentences, under 35 words, on what the change does and why, as a release note would say it.";
                };
                readonly points: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                    readonly maxItems: 4;
                    readonly description: "The main things it changes, each under 12 words. Start with a verb: Adds, Changes, Removes, Moves.";
                };
                readonly effort: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly maximum: 5;
                    readonly description: "Time a careful reviewer needs: 1 = under 10 minutes, 3 = about an hour, 5 = most of a day.";
                };
                readonly features: {
                    readonly type: "array";
                    readonly maxItems: 12;
                    readonly description: "The separate features, fixes or chores the change contains, as a reader would name them, e.g. \"Saved carts\", \"Discount codes\", \"Dependency upgrades\", \"Agent setup\". One entry if the change does one thing. Chores are features too: dependency upgrades, a shared component change, agent setup. Every changed file goes in at least one, including tests and package.json files. A file shared by several features goes in each, with only that feature's functions in symbols.";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                                readonly description: "Under 5 words.";
                            };
                            readonly summary: {
                                readonly type: "string";
                                readonly description: "What it does, one sentence under 20 words. Facts only.";
                            };
                            readonly files: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly symbols: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                                readonly description: "Names from \"Changed functions and components\" that belong to this feature. Empty for whole files.";
                            };
                        };
                        readonly required: readonly ["name", "summary", "files", "symbols"];
                    };
                };
                readonly flow: {
                    readonly type: "array";
                    readonly maxItems: 8;
                    readonly description: "The main runtime path the change adds or alters, as calls between parts (user, components, composables, API routes, services, database). Empty if there is no flow, e.g. docs or config only.";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly from: {
                                readonly type: "string";
                                readonly description: "Short name, e.g. \"CartSummary\", \"useCart\", \"POST /api/cart\", \"Database\", \"User\".";
                            };
                            readonly to: {
                                readonly type: "string";
                            };
                            readonly label: {
                                readonly type: "string";
                                readonly description: "What is called or sent, under 6 words.";
                            };
                        };
                        readonly required: readonly ["from", "to", "label"];
                    };
                };
            };
            readonly required: readonly ["summary", "points", "effort", "features", "flow"];
        };
        readonly headline: {
            readonly type: "string";
            readonly description: "The review in one plain sentence, under 16 words: is it ready, and the main problem if any.";
        };
        readonly summary: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly maxItems: 3;
            readonly description: "Up to 3 review notes, each under 14 words: the problems or risks that matter most.";
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
                        readonly description: "What changed in this module, under 14 words. Facts only, no judgement.";
                    };
                    readonly points: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly maxItems: 4;
                        readonly description: "What changed here, each under 10 words, starting with a verb. Facts only.";
                    };
                    readonly impact: {
                        readonly type: "string";
                        readonly enum: readonly ["high", "medium", "low"];
                        readonly description: "How much this module's behaviour changes for users or other modules.";
                    };
                };
                readonly required: readonly ["name", "summary", "points", "impact"];
            };
        };
        readonly files: {
            readonly type: "array";
            readonly description: "One entry for every changed file. Do not skip any.";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly purpose: {
                        readonly type: "string";
                        readonly description: "What changed in this file, under 12 words. Facts only.";
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
        readonly symbols: {
            readonly type: "array";
            readonly description: "One entry for every item under \"Changed functions and components\", in the same order. Do not skip any.";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly file: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly change: {
                        readonly type: "string";
                        readonly description: "One sentence, under 20 words, on what it does; for a changed item, what is different now. Facts only, e.g. \"Posts the cart items to /api/cart and sets saving while it waits\".";
                    };
                };
                readonly required: readonly ["file", "name", "change"];
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
    readonly required: readonly ["change", "verdict", "risk", "headline", "summary", "modules", "files", "symbols", "findings", "requirements", "tests"];
};
export declare const SYSTEM_PROMPT = "You describe and then review code changes, like a careful senior engineer.\n\nYour reply has two separate parts.\n1. The description: \"change\", \"modules\", \"files\" and \"symbols\". Say what the code now does, as plain facts. No judgement, no problems, no praise, no words like \"critical\", \"broken\", \"improves\" or \"properly\".\n2. The review: \"verdict\", \"risk\", \"headline\", \"summary\", \"findings\", \"requirements\" and \"tests\".\n\nFiles under \"AI agent setup\" (CLAUDE.md, AGENTS.md, .claude/ skills, subagents, commands, hooks and settings, MCP config) instruct AI coding agents. Describe what an agent will now do differently. In the review, flag permissions or hooks that let an agent run commands or reach data more widely, secrets in these files, and instructions that conflict with each other.\n\nReport only real problems in the changed lines: bugs, security holes, data loss, performance traps, missing tests for risky logic, accessibility failures, and requirements the change does not meet. Skip style preferences and anything a formatter or linter would fix. Do not praise. If the change is fine, say so and return few or no findings.\n\nRules for findings:\n- Always give the file and the new-file line number, read from the number at the start of each diff line.\n- severity: blocker = must not merge (breaks things, security hole, data loss); major = likely bug or clear risk; minor = worth fixing; nit = optional.\n- Do not repeat issues listed under \"Already found by static checks\".\n- Write in plain English. Short titles. No markdown in titles.\n\nIf requirements, bugs or tickets are given, check every acceptance criterion against the diff. \"met\" needs code in the diff that does it; \"partial\" when some of it is there; \"missing\" when nothing in the diff does it; \"unclear\" when it can't be told from the diff. Missing criteria count against the verdict.\n\nReply with JSON only, matching the schema.";
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
    symbols?: {
        file: string;
        name: string;
        action: string;
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
