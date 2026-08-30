import { useGameController } from '../hooks/useGameController.js'
import { GameNavigation, GameHeader } from './GameNavigation.jsx'
import { CloverFortune } from './CloverFortune.jsx'
import { BackgroundCatchUpOverlay } from './BackgroundCatchUpOverlay.jsx'
import { GameOverlays } from './GameOverlays.jsx'
import { GameScreen } from './GameScreen.jsx'
import { MajorProgressionBar } from './MajorProgressionBar.jsx'
import './App.css'

function App() {
  const {
    isGameReady,
    navigation,
    screen,
    overlays,
    progression,
  } = useGameController()

  if (!isGameReady) {
    return (
      <main className="game-shell game-shell-catch-up">
        <BackgroundCatchUpOverlay {...overlays.backgroundCatchUp} />
      </main>
    )
  }

  return (
    <main className="game-shell">
      <GameHeader />
      <GameNavigation {...navigation} />
      <CloverFortune {...overlays.fortune} />
      <GameScreen {...screen} />
      <MajorProgressionBar {...progression} />
      <GameOverlays {...overlays} />
    </main>
  )
}

export default App
