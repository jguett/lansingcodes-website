import { randomUUID } from 'node:crypto'
import { getFirestore } from '@/lib/firebase/admin'
import type { DataStore } from './types'

const LEASE_MS = 10 * 60 * 1000
const WRITES_PER_TRANSACTION = 200

export class EventSyncInProgressError extends Error {
  constructor() {
    super('An event sync is already running')
    this.name = 'EventSyncInProgressError'
  }
}

export const firestoreStore: DataStore = {
  async listDocs<T>(collection: string, opts: Parameters<DataStore['listDocs']>[1] = {}) {
    let query: FirebaseFirestore.Query = getFirestore().collection(collection)
    if (opts.range) {
      query = query
        .where(opts.range.field, '>=', opts.range.min)
        .where(opts.range.field, '<=', opts.range.max)
    }
    if (opts.orderBy) query = query.orderBy(opts.orderBy, 'asc')

    const snapshot = await query.get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as T) }))
  },

  // Writing before deleting avoids a window where docs are missing from the site.
  async replaceCollection(collection, docs) {
    const ref = getFirestore().collection(collection)
    const currentIds = new Set(Object.keys(docs))

    await Promise.all(
      Object.entries(docs).map(([id, doc]) => ref.doc(id).set(doc)),
    )

    const existingDocs = await ref.listDocuments()
    const staleDocs = existingDocs.filter((doc) => !currentIds.has(doc.id))
    await Promise.all(staleDocs.map((doc) => doc.delete()))
  },

  async syncEvents(loadEvents) {
    const db = getFirestore()
    const lockRef = db.collection('_sync_locks').doc('events')
    const owner = randomUUID()

    // The lease coordinates scheduled and manual syncs across instances.
    await db.runTransaction(async (transaction) => {
      const lock = await transaction.get(lockRef)
      if (lock.exists && Number(lock.get('expiresAt')) > Date.now()) {
        throw new EventSyncInProgressError()
      }
      transaction.set(lockRef, { owner, expiresAt: Date.now() + LEASE_MS })
    })

    let syncError: unknown
    try {
      const events = await loadEvents()
      const eventsRef = db.collection('events')
      const newEventIds = new Set(Object.keys(events))
      const existingDocs = await eventsRef.listDocuments()
      const staleDocs = existingDocs.filter((doc) => !newEventIds.has(doc.id))
      const operations = [
        ...Object.entries(events).map(([id, event]) => ({
          kind: 'set' as const,
          ref: eventsRef.doc(id),
          value: event,
        })),
        ...staleDocs.map((ref) => ({ kind: 'delete' as const, ref })),
      ]

      for (let start = 0; start < operations.length; start += WRITES_PER_TRANSACTION) {
        const chunk = operations.slice(start, start + WRITES_PER_TRANSACTION)
        await db.runTransaction(async (transaction) => {
          const lock = await transaction.get(lockRef)
          if (lock.get('owner') !== owner || Number(lock.get('expiresAt')) <= Date.now()) {
            throw new Error('Event sync lease was lost before applying changes')
          }
          transaction.update(lockRef, { expiresAt: Date.now() + LEASE_MS })
          for (const operation of chunk) {
            if (operation.kind === 'set') transaction.set(operation.ref, operation.value)
            else transaction.delete(operation.ref)
          }
        })
      }
    } catch (error) {
      syncError = error
      throw error
    } finally {
      try {
        await db.runTransaction(async (transaction) => {
          const lock = await transaction.get(lockRef)
          if (lock.get('owner') === owner) transaction.delete(lockRef)
        })
      } catch (error) {
        if (!syncError) throw error
        console.error('Failed to release event sync lease:', error)
      }
    }
  },
}
