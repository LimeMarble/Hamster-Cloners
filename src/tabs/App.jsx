import { useGameController } from '../hooks/useGameController.js'
import { GameNavigation, GameHeader } from './GameNavigation.jsx'
import { GameOverlays } from './GameOverlays.jsx'
import { GameScreen } from './GameScreen.jsx'
import { MajorProgressionBar } from './MajorProgressionBar.jsx'
import './App.css'

function App() {
  const { navigation, screen, overlays, progression } = useGameController()

  return (
    <main className="game-shell">
      <GameHeader />
      <GameNavigation {...navigation} />
      <GameScreen {...screen} />
      <MajorProgressionBar {...progression} />
      <GameOverlays {...overlays} />
    </main>
  )
}

export default App
