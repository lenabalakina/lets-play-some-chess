import { GameLayout } from '@/components/game/GameLayout'

export default function Play3DPage() {
  return (
    <GameLayout
      me={{ username: 'YOU', elo: 1200 }}
      opponent={{ username: 'OPPONENT', elo: 1200 }}
      force3D={true}
    />
  )
}
