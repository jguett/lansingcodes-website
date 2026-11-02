import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkSyncSecret } from '../lib/api/auth.ts'

test('accepts the configured sync secret and rejects unequal values', () => {
  const previous = process.env.SYNC_SECRET
  process.env.SYNC_SECRET = 'test'
  try {
    assert.equal(checkSyncSecret({ headers: new Headers({ Authorization: 'Bearer test' }) }), true)
    assert.equal(checkSyncSecret({ headers: new Headers({ Authorization: 'Bearer rest' }) }), false)
    assert.equal(checkSyncSecret({ headers: new Headers({ Authorization: 'Bearer tést' }) }), false)
  } finally {
    if (previous === undefined) delete process.env.SYNC_SECRET
    else process.env.SYNC_SECRET = previous
  }
})
