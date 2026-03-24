import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import type { GameState, LobbyOptions, SessionChatMessage, SessionParticipant, SessionParticipantRole, ShutdownState } from '@ih3t/shared'
import { playTilePlacedSound } from '../soundEffects'
import { getPlayerLabel, getPlayerTileColor } from '../utils/gameBoard'
import GameBoardCanvas from './game-screen/GameBoardCanvas'
import GameScreenHud, { HudPlayerInfo } from './game-screen/GameScreenHud'
import GameChatBox from './game-screen/GameChatBox'
import TurnTimerHud from './game-screen/TurnTimerHud'
import useGameBoard from './game-screen/useGameBoard'
import ShutdownTimer from './game-screen/ShutdownTimer'

interface GameScreenProps {
  sessionId: string
  gameId: string
  players: SessionParticipant[]
  gameOptions: LobbyOptions
  participantRole: SessionParticipantRole
  currentPlayerId: string
  gameState: GameState
  shutdown: ShutdownState | null
  isChatOpen: boolean
  onChatOpenChange: (isOpen: boolean) => void
  onPlaceCell: (x: number, y: number) => void
  onSendChatMessage?: (message: string) => void
  onLeave: () => void
  leaveLabel?: string
  overlay?: ReactNode
  interactionEnabled?: boolean
  showTilePieceMarkers?: boolean
  chatMessages?: SessionChatMessage[]
}

function GameScreen({
  sessionId,
  gameId,
  players,
  gameOptions,
  participantRole,
  currentPlayerId,
  gameState,
  shutdown,
  isChatOpen,
  onChatOpenChange,
  onPlaceCell,
  onSendChatMessage,
  onLeave,
  leaveLabel,
  overlay,
  interactionEnabled = true,
  showTilePieceMarkers = false,
  chatMessages = []
}: Readonly<GameScreenProps>) {
  const previousCellCountRef = useRef(gameState.cells.length)

  const playerIds = players.map(player => player.id)
  const playerNames = Object.fromEntries(players.map(player => [player.id, player.displayName]))
  const isSpectator = participantRole === 'spectator'
  const isOwnTurn = Boolean(currentPlayerId) && gameState.currentTurnPlayerId === currentPlayerId
  const canPlaceCell = interactionEnabled && !isSpectator && isOwnTurn

  const hudPlayerInfo = useMemo(() => {
    return playerIds.map(playerId => ({
      playerId,
      displayName: getPlayerLabel(playerIds, playerId, playerNames),
      displayColor: getPlayerTileColor(gameState.playerTiles, playerId)
    } satisfies HudPlayerInfo))
  }, [gameState.playerTiles, playerIds, playerNames])

  useEffect(() => {
    previousCellCountRef.current = gameState.cells.length
  }, [currentPlayerId, participantRole, gameId])

  const {
    canvasRef,
    canvasClassName,
    canvasHandlers,
    renderableCellCount,
    resetView
  } = useGameBoard({
    gameState: gameState,
    highlightedCells: gameState.winner?.cells ?? "turn",
    localPlayerId: isSpectator ? null : currentPlayerId,
    interactionEnabled,
    showTilePieceMarkers,
    onPlaceCell: canPlaceCell ? onPlaceCell : undefined
  })

  useEffect(() => {
    const previousCellCount = previousCellCountRef.current
    if (interactionEnabled && gameState.cells.length > previousCellCount) {
      playTilePlacedSound()
    }

    previousCellCountRef.current = gameState.cells.length
  }, [gameState.cells.length, interactionEnabled])

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 text-white">
      <GameBoardCanvas
        canvasRef={canvasRef}
        className={canvasClassName}
        handlers={canvasHandlers}
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="flex h-full flex-col justify-between gap-4">
          {interactionEnabled && (
            <TurnTimerHud
              gameOptions={gameOptions}
              players={players}
              gameState={gameState}
              localPlayerId={isSpectator ? null : currentPlayerId}
            />
          )}

          {shutdown && (
            <div className="rounded-full border border-amber-200/30 bg-slate-950/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-lg">
              Restarting <ShutdownTimer shutdown={shutdown} />
            </div>
          )}
        </div>
      </div>

      {overlay && (
        <div className="absolute inset-0">
          {overlay}
        </div>
      )}

      <div className={"absolute inset-0 flex flex-col justify-end pointer-events-none"}>
        <GameChatBox
          currentParticipantId={currentPlayerId}
          messages={chatMessages}
          isOpen={isChatOpen}
          onOpenChange={onChatOpenChange}
          onSendMessage={onSendChatMessage}
          placement={interactionEnabled ? 'in-game' : 'finished'}
        />
        {interactionEnabled && (
          <GameScreenHud
            sessionId={sessionId}
            players={hudPlayerInfo}
            localPlayerId={currentPlayerId}

            occupiedCellCount={gameState.cells.length}
            renderableCellCount={renderableCellCount}

            shutdown={shutdown}

            leaveLabel={leaveLabel}
            onLeave={onLeave}
            onResetView={resetView}
          />
        )}
      </div>
    </div >
  )
}

export default GameScreen
