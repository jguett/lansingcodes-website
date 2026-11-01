import { getUpcomingEvents } from '@/lib/firestore/events'
import { getAllGroups } from '@/lib/firestore/groups'
import { getAllSponsors } from '@/lib/firestore/sponsors'
import Welcome from '@/components/sections/Welcome'
import Events from '@/components/sections/Events'
import Meetups from '@/components/sections/Meetups'
import Resources from '@/components/sections/Resources'
import Sponsors from '@/components/sections/Sponsors'
import Newsletter from '@/components/sections/Newsletter'
import { isMockMode } from '@/lib/store'

export const dynamic = 'force-dynamic'

function getCurrentTime() {
  return Date.now()
}

export default async function Home() {
  const mockMode = isMockMode()
  const [events, groups, sponsors] = await Promise.all([
    getUpcomingEvents(),
    getAllGroups(),
    getAllSponsors(),
  ])

  const now = getCurrentTime()

  return (
    <>
      <Welcome events={events} groups={groups} now={now} />
      <Events events={events} groups={groups} now={now} />
      <Meetups groups={groups} />
      <Resources />
      <Sponsors sponsors={sponsors} />
      <Newsletter />
      {mockMode && (
        <p className="bg-yellow-100 px-4 py-2 text-center text-sm text-black">
          Mock data for local development — these are not real events.
        </p>
      )}
    </>
  )
}
