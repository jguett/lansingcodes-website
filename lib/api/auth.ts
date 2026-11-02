import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

export function checkSyncSecret(request: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET
  if (!secret) return false
  const auth = request.headers.get('Authorization')
  if (!auth) return false

  const expected = `Bearer ${secret}`
  const actualBytes = Buffer.from(auth)
  const expectedBytes = Buffer.from(expected)
  if (actualBytes.length !== expectedBytes.length) return false

  return timingSafeEqual(actualBytes, expectedBytes)
}
