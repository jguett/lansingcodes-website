import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sameCommunityEvent } from '../lib/utils/simplifiedName.ts'

const at = Date.parse('2027-03-01T05:30:00Z')

test('keeps different programming language titles separate at the same time', () => {
  assert.equal(sameCommunityEvent(
    { name: 'C++ Basics', startTime: at },
    { name: 'C# Basics', startTime: at },
  ), false)
})

test('still groups harmless title punctuation changes at the same time', () => {
  assert.equal(sameCommunityEvent(
    { name: 'Node.js Workshop', startTime: at },
    { name: 'Nodejs Workshop', startTime: at },
  ), true)
  assert.equal(sameCommunityEvent(
    { name: 'AI Workshop', startTime: at },
    { name: 'AI-Workshop', startTime: at + 60_000 },
  ), false)
})
