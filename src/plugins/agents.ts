import { AGENT_FILE } from '../modules.ts'
import { lineRule, type ReviewPlugin } from './types.ts'

const isAgent = (p: string) => AGENT_FILE.test(p)

/** Instructions, skills, subagents, commands, hooks and MCP config for AI coding agents. */
export const agents: ReviewPlugin = {
  name: 'agents',
  kind: 'framework',
  label: 'AI agent setup',
  match: isAgent,
  detect: (paths) => paths.some(isAgent),
  classify: (p) => {
    if (!isAgent(p)) return undefined
    if (/skills\//.test(p)) return 'Agent skill'
    if (/agents\//.test(p)) return 'Subagent'
    if (/commands\/|prompts\//.test(p)) return 'Agent command'
    if (/settings(\.local)?\.json$|hooks\//.test(p)) return 'Agent settings'
    if (/\.mcp\.json$/.test(p)) return 'MCP config'
    return 'Agent instructions'
  },
  rules: [
    lineRule({
      id: 'agents/any-shell',
      title: 'Agent may run any shell command',
      severity: 'major',
      category: 'security',
      appliesTo: isAgent,
      pattern: /"Bash(\(\*\))?"|"Bash\(\s*\*\s*\)"/,
      detail: 'This allows every shell command without asking, including ones that delete files or send data out. Allow the specific commands the work needs instead, such as "Bash(yarn test)".'
    }),
    lineRule({
      id: 'agents/bypass',
      title: 'Agent permission checks turned off',
      severity: 'major',
      category: 'security',
      appliesTo: isAgent,
      pattern: /bypassPermissions|dangerously-skip-permissions|--yolo\b|"approval_policy"\s*[:=]\s*"never"/,
      detail: 'The agent will act without asking first. Keep this to throwaway sandboxes.'
    }),
    lineRule({
      id: 'agents/secret',
      title: 'Secret in agent config',
      severity: 'blocker',
      category: 'security',
      appliesTo: isAgent,
      pattern: /\b(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[bp]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/,
      detail: 'Agent config is committed and read by every agent session. Load the value from the environment instead, and rotate this one.'
    })
  ],
  guidance: 'Agent instructions that conflict, permissions wider than the work needs, hooks that run commands on every edit, and secrets.'
}
