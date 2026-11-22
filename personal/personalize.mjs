// Turns an official Orca checkout into a personal build that updates from this fork's releases.
// Usage: node personalize.mjs <owner/repo>   (run from the Orca checkout root)
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const repo = process.argv[2] ?? ''
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  throw new Error(`Expected <owner/repo>, got '${repo}'`)
}
const [owner, name] = repo.split('/')
const escapeForRegexSource = (text) => text.replace(/[.]/g, '\\.')

// The updater hardcodes the official release repo; every other mention of it is docs or fixtures.
const UPDATER_ROOTS = ['src/main/updater', 'src/shared/updater']
const PLAIN = /stablyai\/orca(?![-\w])/g
const REGEX_SOURCE = /stablyai\\\/orca(?![-\w])/g

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path)
    } else if (path.endsWith('.ts') && !path.endsWith('.test.ts')) {
      yield path
    }
  }
}

let replaced = 0
for (const root of UPDATER_ROOTS) {
  for (const file of sourceFiles(root)) {
    const before = readFileSync(file, 'utf8')
    let count = 0
    const after = before
      .replace(REGEX_SOURCE, () => {
        count++
        return `${escapeForRegexSource(owner)}\\/${escapeForRegexSource(name)}`
      })
      .replace(PLAIN, () => {
        count++
        return repo
      })
    if (count > 0) {
      writeFileSync(file, after)
      replaced += count
      console.log(`personalize: ${file} (${count})`)
    }
  }
}
// Fewer hits means upstream moved the updater; publishing would ship a build that updates from the official feed.
const EXPECTED_MIN = 8
if (replaced < EXPECTED_MIN) {
  throw new Error(`Only ${replaced} updater references rewritten (expected >= ${EXPECTED_MIN}); updater layout changed.`)
}

// Unsigned builds: no publisherName, so electron-updater accepts this fork's installers.
const baseConfig = 'config/electron-builder.config.cjs'
if (!existsSync(baseConfig)) {
  throw new Error(`${baseConfig} not found`)
}
writeFileSync(
  'config/electron-builder.personal.cjs',
  `const base = require('./electron-builder.config.cjs')
const { publisherName: _unused, ...signtoolOptions } = base.win.signtoolOptions ?? {}
module.exports = {
  ...base,
  win: { ...base.win, signtoolOptions, verifyUpdateCodeSignature: false },
  publish: { provider: 'github', owner: ${JSON.stringify(owner)}, repo: ${JSON.stringify(name)}, releaseType: 'release' }
}
`
)
console.log(`personalize: ${replaced} updater references now point at ${repo}`)
