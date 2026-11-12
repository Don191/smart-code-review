import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  parseDiff,
  review,
  renderHtml,
  parseContext,
  criteriaFrom,
  azureDevOps,
  notion,
  githubIssues,
  lineRule,
  type LlmProvider,
  type ReviewPlugin
} from '../src/index.ts'

const diff = readFileSync(new URL('./fixtures/saved-carts.diff', import.meta.url), 'utf8')
const context = parseContext(readFileSync(new URL('../examples/saved-carts.context.json', import.meta.url), 'utf8'))

test('parses files, statuses and line numbers', () => {
  const files = parseDiff(diff)
  assert.deepEqual(files.map(f => f.path).sort(), [
    'app/components/CartSummary.vue',
    'app/composables/useCart.ts',
    'server/api/cart/discount.get.ts',
    'server/api/cart/index.post.ts',
    'test/cart.test.ts'
  ])
  const post = files.find(f => f.path.endsWith('index.post.ts'))!
  assert.equal(post.status, 'added')
  assert.equal(post.additions, 10)
  const first = post.hunks[0]!.lines[0]!
  assert.equal(first.newLine, 1)
})

test('parses renames and plain diff -u output', () => {
  const files = parseDiff(`diff --git a/old.ts b/new.ts
similarity index 90%
rename from old.ts
rename to new.ts
--- a/old.ts
+++ b/new.ts
@@ -1,2 +1,2 @@
-const a = 1
+const a = 2
 export { a }
`)
  assert.equal(files[0]!.status, 'renamed')
  assert.equal(files[0]!.oldPath, 'old.ts')
  const plain = parseDiff(`--- x.js\t2024-01-01
+++ x.js\t2024-01-02
@@ -1 +1 @@
-a
+b
--- y.js
+++ y.js
@@ -1 +1,2 @@
 a
+-- not a header
`)
  assert.equal(plain.length, 2)
  assert.equal(plain[1]!.additions, 1)
})

test('static checks find the planted problems', async () => {
  const r = await review({ diff, title: 'Saved carts' }, { fetchContext: false })
  const ids = new Set(r.findings.map(f => f.ruleId))
  for (const id of ['node/sql-concat', 'vue/mutate-prop', 'vue/v-html', 'js/foreach-async', 'js/only-test', 'vue/v-for-key', 'vue/img-alt', 'js/loose-equality', 'nuxt/browser-global', 'ts/any', 'node/sync-fs']) {
    assert.ok(ids.has(id), `expected ${id}`)
  }
  assert.equal(r.verdict, 'request-changes')
  assert.equal(r.findings[0]!.severity, 'blocker')
  assert.equal(r.files.find(f => f.path.endsWith('discount.get.ts'))!.role, 'API route')
  assert.equal(r.files.find(f => f.path.endsWith('CartSummary.vue'))!.language, 'Vue')
})

test('merges the model reply and fills every criterion', async () => {
  const fake: LlmProvider = {
    name: 'Fake',
    model: 'fake-1',
    complete: async () => JSON.stringify({
      verdict: 'request-changes',
      risk: 80,
      headline: 'Adds saved carts, but discount codes allow SQL injection.',
      summary: ['SQL injection in discount lookup'],
      files: [{ path: 'server/api/cart/discount.get.ts', purpose: 'Looks up discount codes', risk: 95 }],
      findings: [
        { severity: 'major', category: 'requirements', file: 'app/composables/useCart.ts', line: 33, title: 'No cap on discount', detail: 'A code can take off more than 50%.' },
        { severity: 'blocker', category: 'security', file: 'server/api/cart/discount.get.ts', line: 6, title: 'SQL injection', detail: 'dup of the rule' }
      ],
      requirements: [{ id: 'AB#4821/1', status: 'met', evidence: 'Save button calls save()' }],
      tests: { adequate: false, note: 'No tests for the new code.' }
    })
  }
  const r = await review({ diff }, { provider: fake, context, fetchContext: false })
  assert.equal(r.headline, 'Adds saved carts, but discount codes allow SQL injection.')
  assert.equal(r.findings.filter(f => f.file?.endsWith('discount.get.ts') && f.line === 6).length, 1, 'duplicate dropped')
  assert.ok(r.findings.some(f => f.title === 'No cap on discount' && f.source === 'ai'))
  assert.equal(r.requirements.length, 9)
  assert.equal(r.requirements[0]!.status, 'met')
  assert.equal(r.requirements[1]!.status, 'unclear')
  assert.equal(r.files.find(f => f.path.endsWith('discount.get.ts'))!.purpose, 'Looks up discount codes')
})

test('a broken model reply falls back to static checks', async () => {
  const bad: LlmProvider = { name: 'Bad', model: 'x', complete: async () => 'not json' }
  const r = await review({ diff }, { provider: bad, fetchContext: false })
  assert.ok(r.warnings.some(w => w.includes('AI review failed')))
  assert.ok(r.findings.length > 5)
})

test('custom plugins add rules', async () => {
  const noLodash: ReviewPlugin = {
    name: 'house',
    kind: 'framework',
    label: 'House rules',
    extensions: ['.ts'],
    rules: [lineRule({ id: 'house/fetch', title: '$fetch in a composable', severity: 'nit', category: 'style', pattern: /\$fetch\(/, detail: 'Use the API client.' })]
  }
  const r = await review({ diff }, { plugins: [noLodash], fetchContext: false })
  assert.ok(r.findings.some(f => f.ruleId === 'house/fetch'))
})

test('connectors find their references', () => {
  const text = 'Fixes AB#4790 and #12, see https://www.notion.so/team/Discount-codes-3f2a9c1e0b6d4a7c9e1f2a3b4c5d6e7f and https://dev.azure.com/acme/shop/_workitems/edit/77'
  assert.deepEqual(azureDevOps.findRefs(text, { env: {} }).map(r => r.id), ['4790', '77'])
  assert.equal(notion.findRefs(text, { env: {} })[0]!.id, '3f2a9c1e0b6d4a7c9e1f2a3b4c5d6e7f')
  assert.deepEqual(githubIssues.findRefs(text, { env: {}, repo: 'acme/shop' }).map(r => r.id), ['acme/shop#12'])
})

test('reads acceptance criteria from text', () => {
  assert.deepEqual(criteriaFrom('Intro\n\n## Acceptance criteria\n- [ ] Shows an error\n- [x] Keeps the total\n\n## Notes\n- not this'), ['Shows an error', 'Keeps the total'])
  assert.deepEqual(criteriaFrom('Given a cart\nWhen I save\nThen it is stored'), ['Given a cart', 'When I save', 'Then it is stored'])
  const md = parseContext('# Bug: total wrong (AB#12)\nRepro: add two items.\n- The total is right after removing an item')
  assert.equal(md[0]!.id, 'AB#12')
  assert.equal(md[0]!.kind, 'bug')
  assert.deepEqual(md[0]!.acceptanceCriteria, ['The total is right after removing an item'])
})

test('renders a self-contained report', async () => {
  const r = await review({ diff, title: 'Saved <carts>' }, { context, fetchContext: false })
  const html = renderHtml(r)
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(html.includes('Saved &lt;carts&gt;'))
  assert.ok(!html.includes('<carts>'))
  assert.ok(html.includes('class="treemap"'))
  assert.ok(html.includes('AB#4821'))
  assert.ok(!/<(script|link)[^>]+(src|href)=["']https?:/.test(html), 'no external assets')
  const data = JSON.parse(html.match(/<script type="application\/json" id="review-data">([\s\S]*?)<\/script>/)![1]!)
  assert.equal(data.verdict, r.verdict)
})

test('groups files into modules', async () => {
  const r = await review({ diff }, { fetchContext: false })
  assert.deepEqual(r.modules.map(m => m.name).sort(), ['Backend', 'Frontend', 'Tests'])
  const mono = await review({ diff: diff.replaceAll('app/components/', 'apps/portal/components/').replaceAll('server/api/', 'apps/api/server/api/') }, { fetchContext: false })
  const names = mono.modules.map(m => m.name)
  assert.ok(names.includes('portal') && names.includes('api'))
  assert.equal(mono.modules.find(m => m.name === 'portal')!.kind, 'frontend')
  assert.equal(mono.modules.find(m => m.name === 'api')!.kind, 'backend')
  const custom = await review({ diff }, { fetchContext: false, modules: [{ name: 'Checkout', paths: ['app/', 'server/api/cart/'] }] })
  assert.ok(custom.modules.some(m => m.name === 'Checkout' && m.files.length === 4))
})
