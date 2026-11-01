import { addDays, set, startOfDay } from 'date-fns'
import { inLansing } from '@/config/time-zone'
import groupFixtures from '@/data/groups.json'
import sponsorFixtures from '@/data/sponsors.json'
import eventFixtures from '@/data/mock/events.json'
import type { DataStore, ListOptions, StoredDoc } from './types'
import type { Event } from '@/lib/firestore/events'

type MockEvent = Omit<Event, 'startTime'> & { dayOffset: number; time: string }

function eventsForToday(): Event[] {
  const today = startOfDay(Date.now(), { in: inLansing })
  return (eventFixtures as MockEvent[]).map(({ dayOffset, time, ...event }) => {
    const [hours, minutes] = time.split(':').map(Number)
    const date = addDays(today, dayOffset, { in: inLansing })
    return { ...event, startTime: set(date, { hours, minutes }, { in: inLansing }).getTime() }
  })
}

function documentsFor(collection: string): (StoredDoc & { id: string })[] {
  if (collection === 'events') {
    return eventsForToday() as unknown as (StoredDoc & { id: string })[]
  }
  if (collection === 'groups') {
    return Object.entries(groupFixtures).map(([id, doc]) => ({ id, ...doc }))
  }
  if (collection === 'sponsors') {
    return Object.entries(sponsorFixtures).map(([id, doc]) => ({ id, ...doc }))
  }
  throw new Error(`No mock data for collection "${collection}"`)
}

export const mockStore: DataStore = {
  async listDocs<T>(collection: string, opts: ListOptions = {}) {
    let docs = documentsFor(collection)
    if (opts.range) {
      const { field, min, max } = opts.range
      docs = docs.filter((doc) => {
        const value = doc[field] as number
        return value >= min && value <= max
      })
    }
    if (opts.orderBy) {
      const field = opts.orderBy
      docs.sort((a, b) => {
        const x = a[field] as string | number
        const y = b[field] as string | number
        return x < y ? -1 : x > y ? 1 : 0
      })
    }
    return docs as (T & { id: string })[]
  },
  async replaceCollection() {
    throw new Error('sync disabled in mock mode')
  },
}
