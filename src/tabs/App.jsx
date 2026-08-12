import { useGameController } from '../hooks/useGameController.js'
import { GameNavigation, GameHeader } from './GameNavigation.jsx'
import { GameOverlays } from './GameOverlays.jsx'
import { GameScreen } from './GameScreen.jsx'
import './App.css'

function App() {
  const { navigation, screen, overlays } = useGameController()

  return (
    <main className="game-shell">
      <GameHeader />
      <GameNavigation {...navigation} />
      <GameScreen {...screen} />
      <GameOverlays {...overlays} />
    </main>
  )
}

export default App
