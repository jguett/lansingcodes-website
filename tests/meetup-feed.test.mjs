import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const loadModule = createRequire(import.meta.url)

async function loadTypeScript(file, resolveImport) {
  const source = await fs.readFile(new URL(file, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  })
  const exports = {}
  new Function('exports', 'require', outputText)(exports, resolveImport)
  return exports
}

const { icalToEvents } = await loadTypeScript('../lib/meetup/icalToEvents.ts', (name) => {
  if (name.startsWith('./helpers/')) return {}
  return loadModule(name)
})
const { fetchEventsForGroup } = await loadTypeScript('../lib/meetup/fetchEventsForGroup.ts', (name) => {
  if (name === './icalToEvents') return { icalToEvents }
  return loadModule(name)
})

test('a failed Meetup feed rejects instead of looking like an empty calendar', async () => {
  await assert.rejects(
    fetchEventsForGroup('devops', { slug: 'devops' }, async () => {
      throw new Error('Meetup unavailable')
    }),
    /Meetup unavailable/,
  )
})

test('a malformed calendar rejects, while a valid empty calendar remains empty', () => {
  assert.throws(() => icalToEvents('devops', 'not a calendar'), /without VCALENDAR/)
  assert.deepEqual(icalToEvents('devops', 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'), {})
})
