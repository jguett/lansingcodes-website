import { firestoreStore } from './firestore'
import { localStore } from './local'
import { mockStore } from './mock'
import type { DataStore } from './types'

// DATA_STORE selects the backend (development only for anything but the default):
//   unset    — Firestore when configured, otherwise mock data in development
//   mock     — bundled, relative-date fixtures (no credentials or sync)
//   local    — JSON files in .data/ (no Firebase needed)
//   emulator — Firestore code path against the local Firebase emulator
//              (see lib/firebase/admin.ts and `npm run emulator`)
export function getStoreMode(): 'firestore' | 'mock' | 'local' | 'emulator' {
  const configured = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_PRIVATE_KEY,
  )
  const mode = process.env.DATA_STORE || (configured ? 'firestore' : 'mock')

  if (mode === 'firestore') return mode

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`DATA_STORE=${mode} is for development only`)
  }
  if (mode === 'mock' || mode === 'local' || mode === 'emulator') return mode
  throw new Error(`Unknown DATA_STORE "${mode}". Use "mock", "local", or "emulator".`)
}

export function isMockMode(): boolean {
  return getStoreMode() === 'mock'
}

export function getStore(): DataStore {
  switch (getStoreMode()) {
    case 'mock':
      return mockStore
    case 'local':
      return localStore
    default:
      return firestoreStore
  }
}
