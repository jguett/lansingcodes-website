import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { tz } from '@date-fns/tz'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const fixtures = {
  '@/data/groups.json': require(path.join(root, 'data/groups.json')),
  '@/data/sponsors.json': require(path.join(root, 'data/sponsors.json')),
  '@/data/mock/events.json': require(path.join(root, 'data/mock/events.json')),
}

async function load(sourcePath, modules, env = {}, now = Date.now()) {
  const source = await readFile(path.join(root, sourcePath), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  })
  const exports = {}
  class FixedDate extends Date {
    static now() { return now }
  }
  vm.runInNewContext(outputText, {
    exports,
    Date: FixedDate,
    process: { env },
    require: (name) => modules[name] ?? require(name),
  }, { filename: sourcePath })
  return exports
}

const mockModules = {
  ...fixtures,
  '@/config/time-zone': { inLansing: tz('America/Detroit') },
}

test('mock events stay populated and use Lansing wall time through DST changes', async () => {
  for (const [now, expected] of [
    ['2026-03-07T17:00:00Z', '2026-03-08T22:00:00Z'],
    ['2026-10-31T16:00:00Z', '2026-11-01T23:00:00Z'],
  ]) {
    const { mockStore } = await load('lib/store/mock.ts', mockModules, {}, Date.parse(now))
    const events = await mockStore.listDocs('events', { orderBy: 'startTime' })
    assert.equal(events.length, 15)
    assert.equal(events.find((event) => event.id === 'devops-intro').startTime, Date.parse(expected))
    assert.equal(events.filter((event) => event.id.startsWith('shared-')).length, 2)
    const groups = await mockStore.listDocs('groups')
    const sponsors = await mockStore.listDocs('sponsors')
    assert.ok(groups.length > 0 && sponsors.length > 0)
    assert.ok(events.every((event) => groups.some((group) => group.id === event.group)))
    await assert.rejects(mockStore.replaceCollection('events', {}), /sync disabled in mock mode/)
  }
})

test('fresh development uses mock data while production fails closed', async () => {
  const modules = {
    './firestore': { firestoreStore: {} },
    './local': { localStore: {} },
    './mock': { mockStore: {} },
  }
  const index = async (env) => load('lib/store/index.ts', modules, env)
  assert.equal((await index({ NODE_ENV: 'development' })).getStoreMode(), 'mock')
  assert.equal((await index({ NODE_ENV: 'development', DATA_STORE: 'local' })).getStoreMode(), 'local')
  assert.equal((await index({ NODE_ENV: 'development', FIREBASE_PROJECT_ID: 'partial' })).getStoreMode(), 'firestore')
  assert.equal((await index({ NODE_ENV: 'production', FIREBASE_PROJECT_ID: 'configured' })).getStoreMode(), 'firestore')
  const noConfigProduction = await index({ NODE_ENV: 'production' })
  const explicitMockProduction = await index({ NODE_ENV: 'production', DATA_STORE: 'mock' })
  assert.throws(() => noConfigProduction.getStoreMode(), /development only/)
  assert.throws(() => explicitMockProduction.getStoreMode(), /development only/)
})
