import { useMemo, useState } from 'react'
import type { BoardState } from '@ih3t/shared'

const VIEWPORT_RADIUS = 6

interface GameScreenProps {
  sessionId: string
  players: string[]
  isHost: boolean
  boardState: BoardState
  onPlaceCell: (x: number, y: number) => void
  onLeave: () => void
}

function GameScreen({
  sessionId,
  players,
  isHost,
  boardState,
  onPlaceCell,
  onLeave
}: GameScreenProps) {
  const [origin, setOrigin] = useState({ x: 0, y: 0 })

  const cellMap = useMemo(() => {
    return new Map(boardState.cells.map((cell) => [`${cell.x},${cell.y}`, cell.occupiedBy]))
  }, [boardState])

  const visibleRows = []
  for (let y = origin.y - VIEWPORT_RADIUS; y <= origin.y + VIEWPORT_RADIUS; y += 1) {
    const row = []

    for (let x = origin.x - VIEWPORT_RADIUS; x <= origin.x + VIEWPORT_RADIUS; x += 1) {
      const occupant = cellMap.get(`${x},${y}`)
      row.push(
        <button
          key={`${x},${y}`}
          onClick={() => {
            if (!occupant) {
              onPlaceCell(x, y)
            }
          }}
          className={`h-12 w-12 rounded border text-sm font-semibold transition ${occupant
            ? 'cursor-default border-slate-500 bg-slate-700 text-white'
            : 'border-slate-400 bg-slate-100 text-slate-700 hover:bg-sky-100'
            }`}
          disabled={Boolean(occupant)}
          title={`(${x}, ${y})`}
        >
          {occupant ? occupant.slice(0, 2).toUpperCase() : ''}
        </button>
      )
    }

    visibleRows.push(
      <div
        key={`row-${y}`}
        className="flex gap-1"
      >
        {row}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 px-6 py-5 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-800/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-sky-300">Live Match</div>
            <h1 className="mt-2 text-3xl font-bold">Infinite Cellular Board</h1>
            <p className="mt-2 text-slate-300">Session: <strong>{sessionId}</strong></p>
            <p className="text-slate-300">Players: {players.length}/2</p>
            <p className="text-slate-300">Role: {isHost ? 'Host' : 'Guest'}</p>
            <p className="text-slate-300">Placed cells: {boardState.cells.length}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOrigin((current) => ({ ...current, y: current.y - 1 }))}
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
            >
              Up
            </button>
            <button
              onClick={() => setOrigin((current) => ({ ...current, x: current.x - 1 }))}
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
            >
              Left
            </button>
            <button
              onClick={() => setOrigin({ x: 0, y: 0 })}
              className="rounded bg-sky-600 px-4 py-2 hover:bg-sky-500"
            >
              Center
            </button>
            <button
              onClick={() => setOrigin((current) => ({ ...current, x: current.x + 1 }))}
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
            >
              Right
            </button>
            <button
              onClick={() => setOrigin((current) => ({ ...current, y: current.y + 1 }))}
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
            >
              Down
            </button>
            <button
              onClick={onLeave}
              className="rounded bg-red-500 px-4 py-2 hover:bg-red-400"
            >
              Leave Game
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/90 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Viewport</h2>
            <p className="text-sm text-slate-300">Centered near ({origin.x}, {origin.y})</p>
          </div>

          <div className="flex flex-col gap-1 overflow-auto">
            {visibleRows}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameScreen
