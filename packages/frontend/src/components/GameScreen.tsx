import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { BoardState, GameTimeControl, SessionParticipantRole, ShutdownState } from '@ih3t/shared'
import { playTilePlacedSound } from '../soundEffects'
import GameBoardCanvas from './game-screen/GameBoardCanvas'
import GameScreenHud from './game-screen/GameScreenHud'
import TurnTimerHud from './game-screen/TurnTimerHud'
import { getCellKey, getPlayerColor } from './game-screen/gameBoardUtils'
import useGameBoard from './game-screen/useGameBoard'

interface GameScreenProps {
  players: string[]
  participantRole: SessionParticipantRole
  currentPlayerId: string
  boardState: BoardState
  timeControl?: GameTimeControl
  shutdown: ShutdownState | null
  onPlaceCell: (x: number, y: number) => void
  onLeave: () => void
  overlay?: ReactNode
  interactionEnabled?: boolean
}

function mergeCellKeys(existingKeys: string[], addedKeys: string[]) {
  return [...new Set([...existingKeys, ...addedKeys])]
}

function GameScreen({
  players,
  participantRole,
  currentPlayerId,
  boardState,
  timeControl,
  shutdown,
  onPlaceCell,
  onLeave,
  overlay,
  interactionEnabled = true
}: Readonly<GameScreenProps>) {
  const [highlightedCellKeys, setHighlightedCellKeys] = useState<string[]>([])
  const previousBoardStateRef = useRef<BoardState | null>(null)
  const previousCellCountRef = useRef(boardState.cells.length)
  const ongoingOpponentTurnKeysRef = useRef<string[]>([])
  const lastOpponentTurnKeysRef = useRef<string[]>([])

  const effectiveTimeControl: GameTimeControl = timeControl ?? { mode: 'unlimited' }
  const isSpectator = participantRole === 'spectator'
  const ownColor = getPlayerColor(players, currentPlayerId)
  const isOwnTurn = Boolean(currentPlayerId) && boardState.currentTurnPlayerId === currentPlayerId
  const canPlaceCell = interactionEnabled && !isSpectator && isOwnTurn

  useEffect(() => {
    previousBoardStateRef.current = null
    previousCellCountRef.current = boardState.cells.length
    ongoingOpponentTurnKeysRef.current = []
    lastOpponentTurnKeysRef.current = []
    setHighlightedCellKeys([])
  }, [currentPlayerId, participantRole])

  useEffect(() => {
    if (!interactionEnabled || isSpectator || !currentPlayerId) {
      previousBoardStateRef.current = boardState
      ongoingOpponentTurnKeysRef.current = []
      lastOpponentTurnKeysRef.current = []
      setHighlightedCellKeys([])
      return
    }

    const previousBoardState = previousBoardStateRef.current
    if (!previousBoardState || boardState.cells.length < previousBoardState.cells.length) {
      previousBoardStateRef.current = boardState
      ongoingOpponentTurnKeysRef.current = []
      lastOpponentTurnKeysRef.current = []
      setHighlightedCellKeys([])
      return
    }

    const previousCellKeys = new Set(previousBoardState.cells.map(cell => getCellKey(cell.x, cell.y)))
    const addedOpponentCellKeys = boardState.cells.reduce<string[]>((addedKeys, cell) => {
      const cellKey = getCellKey(cell.x, cell.y)
      if (!previousCellKeys.has(cellKey) && cell.occupiedBy !== currentPlayerId) {
        addedKeys.push(cellKey)
      }
      return addedKeys
    }, [])
    const wasOpponentTurn = Boolean(previousBoardState.currentTurnPlayerId) && previousBoardState.currentTurnPlayerId !== currentPlayerId
    const isOpponentTurn = Boolean(boardState.currentTurnPlayerId) && boardState.currentTurnPlayerId !== currentPlayerId

    if (addedOpponentCellKeys.length > 0) {
      if (isOpponentTurn) {
        ongoingOpponentTurnKeysRef.current = mergeCellKeys(
          wasOpponentTurn ? ongoingOpponentTurnKeysRef.current : [],
          addedOpponentCellKeys
        )
        setHighlightedCellKeys(ongoingOpponentTurnKeysRef.current)
      } else {
        const completedOpponentTurnKeys = mergeCellKeys(
          wasOpponentTurn ? ongoingOpponentTurnKeysRef.current : [],
          addedOpponentCellKeys
        )
        ongoingOpponentTurnKeysRef.current = []
        lastOpponentTurnKeysRef.current = completedOpponentTurnKeys
        setHighlightedCellKeys(completedOpponentTurnKeys)
      }
    } else if (!isOpponentTurn && wasOpponentTurn && ongoingOpponentTurnKeysRef.current.length > 0) {
      lastOpponentTurnKeysRef.current = ongoingOpponentTurnKeysRef.current
      ongoingOpponentTurnKeysRef.current = []
      setHighlightedCellKeys(lastOpponentTurnKeysRef.current)
    } else if (isOpponentTurn && ongoingOpponentTurnKeysRef.current.length > 0) {
      setHighlightedCellKeys(ongoingOpponentTurnKeysRef.current)
    } else {
      setHighlightedCellKeys(lastOpponentTurnKeysRef.current)
    }

    previousBoardStateRef.current = boardState
  }, [boardState, currentPlayerId, interactionEnabled, isSpectator])

  const {
    canvasRef,
    canvasClassName,
    canvasHandlers,
    renderableCellCount,
    resetView
  } = useGameBoard({
    boardState,
    players,
    interactionEnabled,
    canPlaceCell,
    isOwnTurn,
    isSpectator,
    highlightedCellKeys,
    onPlaceCell
  })

  useEffect(() => {
    const previousCellCount = previousCellCountRef.current
    if (interactionEnabled && boardState.cells.length > previousCellCount) {
      playTilePlacedSound()
    }

    previousCellCountRef.current = boardState.cells.length
  }, [boardState.cells.length, interactionEnabled])

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
              effectiveTimeControl={effectiveTimeControl}
              players={players}
              currentTurnPlayerId={boardState.currentTurnPlayerId}
              localPlayerId={isSpectator ? null : currentPlayerId}
            />
          )}

          {interactionEnabled && (
            <GameScreenHud
              isSpectator={isSpectator}
              occupiedCellCount={boardState.cells.length}
              ownColor={ownColor}
              renderableCellCount={renderableCellCount}
              shutdown={shutdown}
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
