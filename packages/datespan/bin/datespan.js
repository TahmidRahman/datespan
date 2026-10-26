#!/usr/bin/env node
// `npx datespan agents` — installs datespan usage guidance for AI coding agents into the current project.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [cmd] = process.argv.slice(2)
if (cmd !== 'agents') {
  console.log('Usage: npx datespan agents   Install the datespan skill for Claude Code, Cursor and AGENTS.md')
  process.exit(cmd ? 1 : 0)
}

const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../skills/datespan/SKILL.md'), 'utf8')
const body = skill.replace(/^---[\s\S]*?---\n/, '')
const description = /description: (.*)/.exec(skill)[1]
const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  console.log(`  wrote ${file}`)
}

write('.claude/skills/datespan/SKILL.md', skill)
write('.cursor/rules/datespan.mdc', `---\ndescription: ${description}\nglobs: "**/*.{tsx,jsx}"\nalwaysApply: false\n---\n${body}`)

const marker = '<!-- datespan -->'
if (!existsSync('AGENTS.md') || !readFileSync('AGENTS.md', 'utf8').includes(marker)) {
  appendFileSync(
    'AGENTS.md',
    `\n${marker}\n## Date pickers\n\nFor date pickers, month pickers, month range / time-period pickers and date presets, use \`datespan\` (headless, accessible). Read \`.claude/skills/datespan/SKILL.md\` or \`node_modules/datespan/llms-full.txt\` before writing one.\n`,
  )
  console.log('  updated AGENTS.md')
}
