import axios from 'axios'
import { icalToEvents } from './icalToEvents'

const meetupClient = axios.create({
  baseURL: 'https://www.meetup.com',
})

export async function fetchEventsForGroup(
  groupKey: string,
  group: { slug?: string },
  getCalendar: (path: string) => Promise<{ data: string }> = (path) => meetupClient.get(path),
): Promise<Record<string, unknown>> {
  if (!group.slug) return {}

  // A failed feed must abort the full replacement before existing events change.
  const response = await getCalendar(`/${group.slug}/events/ical/`)
  return icalToEvents(groupKey, response.data)
}
