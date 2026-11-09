import { useState } from 'react'
import { getDistrict } from './data'
import { dueWords, getState } from './game/progress'
import { CityMap } from './components/CityMap'
import { LineMap, type LineTarget } from './components/LineMap'
import { StationRun } from './components/StationRun'
import { Boss, Challenge, Review } from './components/Gauntlet'

type Screen = { kind: 'city' } | { kind: 'line'; district: string } | ({ district: string } & LineTarget)

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'city' })
  const [reviewIds, setReviewIds] = useState<string[]>([])

  if (screen.kind === 'city') return <CityMap onOpen={(id) => setScreen({ kind: 'line', district: id })} />

  const district = getDistrict(screen.district)
  const back = () => setScreen({ kind: 'line', district: district.id })

  switch (screen.kind) {
    case 'line':
      return (
        <LineMap
          district={district}
          onBack={() => setScreen({ kind: 'city' })}
          onGo={(t) => {
            // Freeze the review list when entering, so it doesn't shift as answers come in.
            if (t.kind === 'review') setReviewIds(dueWords(district, getState()))
            setScreen({ ...t, district: district.id })
          }}
        />
      )
    case 'station':
      return <StationRun key={screen.id} district={district} station={district.stations.find((s) => s.id === screen.id)!} onExit={back} />
    case 'boss':
      return <Boss district={district} onExit={back} />
    case 'challenge':
      return <Challenge district={district} onExit={back} />
    case 'review':
      return <Review district={district} ids={reviewIds} onExit={back} />
  }
}
