// Single source of truth for the docs. Run after `tsdown`.
//  - `<!-- example: name -->…<!-- /example -->` in README.md / SKILL.md ← examples/name.tsx (typechecked + tested)
//  - `<!-- sizes -->…<!-- /sizes -->` ← measured `size-limit --json`
//  - llms-full.txt ← README.md + dist/index.d.ts (one rolled-up declaration file, JSDoc included)
// `--check` writes nothing and fails if any generated file is stale, a tsx block in the docs is not
// an injected example, or a public export lacks a declaration in llms-full.txt.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const check = process.argv.includes('--check')
const read = (f) => readFileSync(f, 'utf8')
const problems = []

let sizeJson
try {
  sizeJson = execSync('npx size-limit --json', { encoding: 'utf8' })
} catch (e) {
  sizeJson = e.stdout // non-zero exit = a budget failed; still render, then report it
}
const sizes = JSON.parse(sizeJson)
for (const s of sizes.filter((s) => !s.passed)) problems.push(`size budget: ${s.name} is ${s.size} B > ${s.sizeLimit} B`)
const sizeTable = [
  '| Import (minified + brotli, React excluded) | Size |',
  '| --- | --- |',
  ...sizes.map((s) => `| ${s.name} | ${(s.size / 1000).toFixed(2)} kB |`),
].join('\n')

const render = (md) =>
  md
    .replace(/<!-- example: ([\w-]+) -->[\s\S]*?<!-- \/example -->/g, (_, name) => {
      const code = read(`examples/${name}.tsx`).trim()
      return `<!-- example: ${name} -->\n\`\`\`tsx\n${code}\n\`\`\`\n<!-- /example -->`
    })
    .replace(/<!-- sizes -->[\s\S]*?<!-- \/sizes -->/g, `<!-- sizes -->\n${sizeTable}\n<!-- /sizes -->`)

const dts = read('dist/index.d.ts').replace(/^\/\/#(end)?region.*\n/gm, '')
if (/ as [a-z]\b/.test(dts.match(/^export \{[^}]*\}/m)?.[0] ?? '')) problems.push('dist/index.d.ts has bundler aliases')
const exported = [...read('dist/index.js').matchAll(/^export \{([^}]*)\}/gm)].flatMap((m) =>
  m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()),
)
for (const name of exported) {
  if (!new RegExp(`(function|const|interface|type) ${name}\\b`).test(dts)) problems.push(`no declaration for export ${name}`)
}

const outputs = {}
for (const f of ['README.md', 'skills/datespan/SKILL.md']) {
  outputs[f] = render(read(f))
  const stripped = outputs[f].replace(/<!-- example: [\w-]+ -->[\s\S]*?<!-- \/example -->/g, '')
  if (/```(tsx|jsx|ts)\b/.test(stripped)) problems.push(`${f}: code block outside an <!-- example --> marker (put it in examples/)`)
}
outputs['llms-full.txt'] = `${outputs['README.md']}\n\n---\n\n# Type reference (dist/index.d.ts)\n\n\`\`\`ts\n${dts.trim()}\n\`\`\`\n`

for (const [f, text] of Object.entries(outputs)) {
  let current = ''
  try {
    current = read(f)
  } catch {}
  if (current === text) continue
  if (check) problems.push(`${f} is stale: run \`pnpm build\``)
  else writeFileSync(f, text)
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'))
  process.exit(1)
}
console.log(`docs ${check ? 'up to date' : 'written'} (${exported.length} exports documented)`)
