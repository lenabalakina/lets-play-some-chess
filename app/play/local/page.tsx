import { GameLayout } from '@/components/game/GameLayout'

export default function LocalPlayPage() {
  return (
    <GameLayout
      me={{ username: 'YOU', elo: 1200 }}
      opponent={{ username: 'OPPONENT', elo: 1200 }}
    />
  )
}
