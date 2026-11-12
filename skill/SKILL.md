---
name: smart-code-review
description: Review a branch or pull request with smart-code-review and its linked requirements, then hand back the HTML report. Use when asked to review code, a PR or a diff, especially JS, TS, Vue, Node or Nuxt.
---

# Code review with smart-code-review

Produces a self-contained HTML report: verdict and risk first, then a risk map of the files, findings, and a check of each acceptance criterion from the linked tickets.

## 1. Pick what to review

- Current branch against main: no arguments.
- A GitHub PR: `--pr <url>`.
- Uncommitted work: `--working`. Staged only: `--staged`.

## 2. Gather the requirements first

The review is much better when it knows what the change was meant to do. Look in the PR title, description, branch name and commit messages for:

- Azure DevOps work items: `AB#1234` or `dev.azure.com/.../_workitems/edit/1234`
- Notion pages: `notion.so/...` links
- GitHub issues: `#12`, `owner/repo#12`
- Jira keys: `PROJ-123`

If you have tools for those systems (for example Notion or Azure DevOps MCP servers), fetch each item yourself and write them to `review-context.json`:

```json
[
  {
    "source": "Azure DevOps",
    "id": "AB#1234",
    "kind": "requirement",
    "title": "Save a cart for later",
    "url": "https://dev.azure.com/org/project/_workitems/edit/1234",
    "summary": "One or two sentences from the description.",
    "acceptanceCriteria": ["One line per criterion"],
    "reproSteps": "For bugs only"
  }
]
```

`kind` is `requirement`, `bug`, `task`, `issue` or `doc`. Keep each criterion to one checkable line. For a bug with no criteria, leave `acceptanceCriteria` empty; the reviewer checks that the bug is fixed.

If you have no tools for them, the CLI fetches them itself when these are set: `AZURE_DEVOPS_ORG` + `AZURE_DEVOPS_PAT`, `NOTION_TOKEN`, `GITHUB_TOKEN`, `JIRA_BASE_URL` + `JIRA_EMAIL` + `JIRA_API_TOKEN`.

## 3. Run it

```bash
npx github:Don191/smart-code-review --context review-context.json --out reviews/review.html --json reviews/review.json
```

Needs `GEMINI_API_KEY` (free tier is fine) or `OPENAI_API_KEY`. Add `--provider none` for static checks only. A `.smart-code-review.md` file in the repo root is added to the prompt as house rules.

## 4. Report back

Read `reviews/review.json` and reply with:

1. The verdict and risk score, and the headline.
2. Blockers and majors, one line each with `file:line`.
3. Any acceptance criteria marked `missing` or `partial`.
4. The path to the HTML report.

Do not paste the whole report. If asked to fix findings, work through them from most to least severe, then run the review again.
