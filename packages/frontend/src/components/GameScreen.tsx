import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameBoard, LobbyOptions, SessionParticipant, SessionParticipantRole, ShutdownState } from '@ih3t/shared'
import { playTilePlacedSound } from '../soundEffects'
import GameBoardCanvas from './game-screen/GameBoardCanvas'
import GameScreenHud, { HudPlayerInfo } from './game-screen/GameScreenHud'
import TurnTimerHud from './game-screen/TurnTimerHud'
import { getCellKey, getPlayerColor, getPlayerLabel } from './game-screen/gameBoardUtils'
import useGameBoard from './game-screen/useGameBoard'

interface GameScreenProps {
  sessionId: string
  gameId: string
  players: SessionParticipant[]
  gameOptions: LobbyOptions
  participantRole: SessionParticipantRole
  currentPlayerId: string
  gameState: GameBoard
  shutdown: ShutdownState | null
  onPlaceCell: (x: number, y: number) => void
  onLeave: () => void
  leaveLabel?: string
  overlay?: ReactNode
  interactionEnabled?: boolean
}

function mergeCellKeys(existingKeys: string[], addedKeys: string[]) {
  return [...new Set([...existingKeys, ...addedKeys])]
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
  onPlaceCell,
  onLeave,
  leaveLabel,
  overlay,
  interactionEnabled = true
}: Readonly<GameScreenProps>) {
  const [highlightedCellKeys, setHighlightedCellKeys] = useState<string[]>([])
  const previousBoardStateRef = useRef<GameBoard | null>(null)
  const previousCellCountRef = useRef(gameState.cells.length)
  const ongoingHighlightedTurnKeysRef = useRef<string[]>([])
  const ongoingHighlightedTurnPlayerIdRef = useRef<string | null>(null)
  const lastHighlightedTurnKeysRef = useRef<string[]>([])

  const playerIds = players.map(player => player.id)
  const playerNames = Object.fromEntries(players.map(player => [player.id, player.displayName]))
  const isSpectator = participantRole === 'spectator'
  const isOwnTurn = Boolean(currentPlayerId) && gameState.currentTurnPlayerId === currentPlayerId
  const canPlaceCell = interactionEnabled && !isSpectator && isOwnTurn

  const hudPlayerInfo = useMemo(() => {
    return playerIds.map(playerId => ({
      playerId,
      displayName: getPlayerLabel(playerIds, playerId, playerNames),
      displayColor: getPlayerColor(playerIds, playerId)
    } satisfies HudPlayerInfo))
  }, [playerIds, playerNames]);

  useEffect(() => {
    previousBoardStateRef.current = null
    previousCellCountRef.current = gameState.cells.length
    ongoingHighlightedTurnKeysRef.current = []
    ongoingHighlightedTurnPlayerIdRef.current = null
    lastHighlightedTurnKeysRef.current = []
    setHighlightedCellKeys([])
  }, [currentPlayerId, participantRole, gameId])

  useEffect(() => {
    if (!interactionEnabled || (!isSpectator && !currentPlayerId)) {
      previousBoardStateRef.current = gameState
      ongoingHighlightedTurnKeysRef.current = []
      ongoingHighlightedTurnPlayerIdRef.current = null
      lastHighlightedTurnKeysRef.current = []
      setHighlightedCellKeys([])
      return
    }

    const previousBoardState = previousBoardStateRef.current
    if (!previousBoardState || gameState.cells.length < previousBoardState.cells.length) {
      previousBoardStateRef.current = gameState
      ongoingHighlightedTurnKeysRef.current = []
      ongoingHighlightedTurnPlayerIdRef.current = null
      lastHighlightedTurnKeysRef.current = []
      setHighlightedCellKeys([])
      return
    }

    const isTrackedTurnPlayer = (playerId: string | null): playerId is string => {
      if (!playerId) {
        return false
      }

      return isSpectator || playerId !== currentPlayerId
    }

    const previousCellKeys = new Set(previousBoardState.cells.map(cell => getCellKey(cell.x, cell.y)))
    const addedHighlightedTurnCells = gameState.cells.reduce<GameBoard['cells']>((addedCells, cell) => {
      const cellKey = getCellKey(cell.x, cell.y)
      if (!previousCellKeys.has(cellKey) && (isSpectator || cell.occupiedBy !== currentPlayerId)) {
        addedCells.push(cell)
      }
      return addedCells
    }, [])

    if (addedHighlightedTurnCells.length > 0) {
      const addedHighlightedTurnPlayerId = addedHighlightedTurnCells[0]?.occupiedBy ?? null
      if (ongoingHighlightedTurnPlayerIdRef.current !== addedHighlightedTurnPlayerId) {
        if (ongoingHighlightedTurnKeysRef.current.length > 0) {
          lastHighlightedTurnKeysRef.current = ongoingHighlightedTurnKeysRef.current
        }

        ongoingHighlightedTurnPlayerIdRef.current = addedHighlightedTurnPlayerId
        ongoingHighlightedTurnKeysRef.current = []
      }

      ongoingHighlightedTurnKeysRef.current = mergeCellKeys(
        ongoingHighlightedTurnKeysRef.current,
        addedHighlightedTurnCells.map(cell => getCellKey(cell.x, cell.y))
      )
    }

    const currentHighlightedTurnPlayerId = isTrackedTurnPlayer(gameState.currentTurnPlayerId)
      ? gameState.currentTurnPlayerId
      : null

    if (
      ongoingHighlightedTurnPlayerIdRef.current !== null &&
      ongoingHighlightedTurnPlayerIdRef.current !== currentHighlightedTurnPlayerId &&
      ongoingHighlightedTurnKeysRef.current.length > 0
    ) {
      lastHighlightedTurnKeysRef.current = ongoingHighlightedTurnKeysRef.current
      ongoingHighlightedTurnKeysRef.current = []
    }

    ongoingHighlightedTurnPlayerIdRef.current = currentHighlightedTurnPlayerId

    if (ongoingHighlightedTurnKeysRef.current.length > 0) {
      setHighlightedCellKeys(ongoingHighlightedTurnKeysRef.current)
    } else {
      setHighlightedCellKeys(lastHighlightedTurnKeysRef.current)
    }

    previousBoardStateRef.current = gameState
  }, [gameState, currentPlayerId, interactionEnabled, isSpectator])

  const {
    canvasRef,
    canvasClassName,
    canvasHandlers,
    renderableCellCount,
    resetView
  } = useGameBoard({
    boardState: gameState,
    players: playerIds,
    interactionEnabled,
    canPlaceCell,
    isOwnTurn,
    isSpectator,
    highlightedCellKeys,
    onPlaceCell
  })

  useEffect(() => {
    const previousCellCount = previousCellCountRef.current
    if (interactionEnabled && gameState.cells.length > previousCellCount) {
      playTilePlacedSound()
    }

    previousCellCountRef.current = gameState.cells.length
  }, [gameState.cells.length, interactionEnabled])

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-950 text-white">
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
      </div>

      {overlay && (
        <div className="absolute inset-0">
          {overlay}
        </div>
      )}
    </div>
  )
}

export default GameScreen
