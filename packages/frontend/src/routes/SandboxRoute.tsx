import {
  applyGameMove,
  cloneGameState,
  createStartedGameState,
  GameRuleError,
  type SessionParticipant
} from '@ih3t/shared'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { playTilePlacedSound } from '../soundEffects'
import GameBoardCanvas from '../components/game-screen/GameBoardCanvas'
import useGameBoard from '../components/game-screen/useGameBoard'
import SandboxHud from '../components/sandbox/SandboxHud'
import SandboxTurnIndicator from '../components/sandbox/SandboxTurnIndicator'
import SandboxWelcomeModal from '../components/sandbox/SandboxWelcomeModal'
import SandboxWinnerBanner from '../components/sandbox/SandboxWinnerBanner'

const SANDBOX_PLAYERS: SessionParticipant[] = [
  {
    id: 'sandbox-player-1',
    displayName: 'Player 1',
    profileId: null,
    elo: null,
    eloChange: null,
    connection: { status: 'connected' }
  },
  {
    id: 'sandbox-player-2',
    displayName: 'Player 2',
    profileId: null,
    elo: null,
    eloChange: null,
    connection: { status: 'connected' }
  }
]

function createSandboxGameState() {
  return createStartedGameState(SANDBOX_PLAYERS.map((player) => player.id))
}

function SandboxRoute() {
  const [gameState, setGameState] = useState(() => createSandboxGameState())
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [isWelcomeModalVisible, setIsWelcomeModalVisible] = useState(true)
  const [isWinnerBannerVisible, setIsWinnerBannerVisible] = useState(false)
  const previousCellCountRef = useRef(gameState.cells.length)

  const localPlayerId = winnerId === null
    ? (gameState.currentTurnPlayerId ?? SANDBOX_PLAYERS[0]!.id)
    : null

  const handlePlaceCell = (x: number, y: number) => {
    const actingPlayerId = gameState.currentTurnPlayerId ?? SANDBOX_PLAYERS[0]!.id
    const nextGameState = cloneGameState(gameState)

    try {
      const result = applyGameMove(nextGameState, {
        playerId: actingPlayerId,
        x,
        y
      })

      if (result.winningPlayerId) {
        nextGameState.currentTurnPlayerId = null
        nextGameState.placementsRemaining = 0
        nextGameState.currentTurnExpiresAt = null
      }

      setGameState(nextGameState)
      setWinnerId(result.winningPlayerId)
      setIsWinnerBannerVisible(Boolean(result.winningPlayerId))
    } catch (error) {
      const errorMessage = error instanceof GameRuleError
        ? error.message
        : 'This move is not legal in sandbox mode.'
      toast.error(errorMessage, {
        toastId: `sandbox:${errorMessage}`
      })
    }
  }

  const {
    canvasRef,
    canvasClassName,
    canvasHandlers,
    renderableCellCount,
    resetView
  } = useGameBoard({
    boardState: gameState,
    highlightedCells: gameState.highlightedCells,
    localPlayerId,
    interactionEnabled: !isWelcomeModalVisible && !isWinnerBannerVisible,
    onPlaceCell: winnerId === null ? handlePlaceCell : undefined
  })

  useEffect(() => {
    const previousCellCount = previousCellCountRef.current
    if (gameState.cells.length > previousCellCount) {
      playTilePlacedSound()
    }

    previousCellCountRef.current = gameState.cells.length
  }, [gameState.cells.length])

  const restartSandbox = () => {
    const nextGameState = createSandboxGameState()
    previousCellCountRef.current = nextGameState.cells.length
    setGameState(nextGameState)
    setWinnerId(null)
    setIsWinnerBannerVisible(false)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-white">
      <GameBoardCanvas
        canvasRef={canvasRef}
        className={canvasClassName}
        handlers={canvasHandlers}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="flex h-full flex-col justify-between gap-4">
          {!isWelcomeModalVisible && (
            <SandboxTurnIndicator
              players={SANDBOX_PLAYERS}
              gameState={gameState}
              winnerId={winnerId}
            />
          )}

          {!isWelcomeModalVisible && (
            <SandboxWinnerBanner
              players={SANDBOX_PLAYERS}
              gameState={gameState}
              winnerId={isWinnerBannerVisible ? winnerId : null}
              onNewBoard={restartSandbox}
              onExploreBoard={() => setIsWinnerBannerVisible(false)}
            />
          )}

          <SandboxWelcomeModal
            isOpen={isWelcomeModalVisible}
            onClose={() => setIsWelcomeModalVisible(false)}
          />

          {!isWelcomeModalVisible && (
            <SandboxHud
              occupiedCellCount={gameState.cells.length}
              renderableCellCount={renderableCellCount}
              onNewBoard={restartSandbox}
              onResetView={resetView}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default SandboxRoute
