import { firestoreStore } from './firestore'
import { localStore } from './local'
import type { DataStore } from './types'

// Set DATA_STORE=local to read/write JSON files in .data/ instead of
// Firestore (no Firebase credentials needed). Development only.
export function getStore(): DataStore {
  if (process.env.DATA_STORE !== 'local') return firestoreStore

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATA_STORE=local is for development only')
  }
  return localStore
}
