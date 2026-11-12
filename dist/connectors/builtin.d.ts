import { type Connector } from './types.ts';
/**
 * Azure DevOps Boards. Finds AB#123 (the standard link syntax) and work item
 * URLs, and reads the title, state, description, acceptance criteria and
 * repro steps. Needs AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT (work items: read).
 */
export declare const azureDevOps: Connector;
/**
 * Notion pages, e.g. a spec or a ticket in a database. Finds notion.so and
 * notion.site links, reads the page title, its text, and to-do or bullet
 * blocks as acceptance criteria. Needs NOTION_TOKEN, and the page must be
 * shared with that integration.
 */
export declare const notion: Connector;
/**
 * GitHub issues linked from the PR ("Fixes #12", owner/repo#12, issue URLs).
 * Works on public repos with no token; GITHUB_TOKEN raises the rate limit and
 * reaches private ones.
 */
export declare const githubIssues: Connector;
/**
 * Jira issues by key (PROJ-123) or browse URL. Needs JIRA_BASE_URL,
 * JIRA_EMAIL and JIRA_API_TOKEN.
 */
export declare const jira: Connector;
export declare const BUILT_IN_CONNECTORS: Connector[];
