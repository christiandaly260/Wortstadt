import { useState } from 'react'
import { getDistrict } from './data'
import { dueWords, getState } from './game/progress'
import { CityMap } from './components/CityMap'
import { LineMap, type LineTarget } from './components/LineMap'
import { StationRun } from './components/StationRun'
import { Boss, Challenge, Review } from './components/Gauntlet'
import { FxLayer, TrainArrival } from './components/Fx'

type Screen = { kind: 'city' } | { kind: 'line'; district: string } | ({ district: string } & LineTarget)

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'city' })
  const [arriving, setArriving] = useState<{ next: Screen; dest: string } | null>(null)
  const [reviewIds, setReviewIds] = useState<string[]>([])

  return (
    <>
      <FxLayer />
      {arriving ? (
        <TrainArrival
          line={getDistrict((arriving.next as { district: string }).district).line}
          color={getDistrict((arriving.next as { district: string }).district).color}
          dest={arriving.dest}
          onDone={() => {
            setScreen(arriving.next)
            setArriving(null)
          }}
        />
      ) : (
        <Screens screen={screen} setScreen={setScreen} setArriving={setArriving} reviewIds={reviewIds} setReviewIds={setReviewIds} />
      )}
    </>
  )
}

function Screens({
  screen,
  setScreen,
  setArriving,
  reviewIds,
  setReviewIds,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  setArriving: (a: { next: Screen; dest: string }) => void
  reviewIds: string[]
  setReviewIds: (ids: string[]) => void
}) {
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
            const next = { ...t, district: district.id }
            if (t.kind === 'review') {
              // Freeze the review list when entering, so it doesn't shift as answers come in.
              setReviewIds(dueWords(district, getState()))
              setScreen(next)
              return
            }
            const dest =
              t.kind === 'station' ? district.stations.find((s) => s.id === t.id)!.name : t.kind === 'boss' ? district.boss.name : district.challenge.name
            setArriving({ next, dest })
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
