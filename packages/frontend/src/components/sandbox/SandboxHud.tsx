import { useState } from 'react'

interface SandboxHudProps {
  occupiedCellCount: number
  renderableCellCount: number
  onNewBoard: () => void
  onResetView: () => void
}

function SandboxHud({
  occupiedCellCount,
  renderableCellCount,
  onNewBoard,
  onResetView
}: Readonly<SandboxHudProps>) {
  const [isHudOpen, setIsHudOpen] = useState(true)

  return (
    <>
      {!isHudOpen && (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2 md:bottom-4 md:left-4 md:right-auto md:items-start">
          <button
            onClick={() => setIsHudOpen(true)}
            aria-label="Open sandbox HUD"
            title="Open sandbox HUD"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/95 shadow-lg transition hover:bg-slate-600"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 8h14" />
              <path d="M5 12h14" />
              <path d="M5 16h14" />
            </svg>
          </button>
        </div>
      )}

      {isHudOpen && (
        <div
          className="
            pointer-events-auto absolute bottom-0 left-0 right-0 w-auto rounded-t-[1.5rem] bg-slate-800 px-4 py-4 pb-4 text-left
            shadow-[0_12px_45px_rgba(15,23,42,0.22)] backdrop-blur-md
            md:left-0 md:w-full md:max-w-sm md:rounded-tl-none md:rounded-tr-[1.5rem]
          "
        >
          <div className="pointer-events-auto absolute right-3 top-3 z-10">
            <button
              onClick={() => setIsHudOpen(false)}
              aria-expanded={isHudOpen}
              aria-label="Close sandbox HUD"
              title="Close sandbox HUD"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/95 shadow-lg transition hover:bg-slate-600"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6 18 18" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="text-sm uppercase tracking-[0.25em] text-emerald-300">Sandbox Mode</div>
          <h1 className="mt-1 text-2xl font-bold">Infinite Hex Tic-Tac-Toe</h1>
          <div className="mt-2 text-sm text-slate-300">
            Local pass-and-play with no clock. Tap to place, drag to pan, pinch to zoom, right-drag to draw and right-click a line to erase.
          </div>

          <div className="mt-4 border-l border-white/18 pl-3 text-sm">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Cells</div>
            <div className="mt-1 text-white">{renderableCellCount} active</div>
            <div className="text-slate-300">{occupiedCellCount} occupied</div>
          </div>

          <div className="pointer-events-auto mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={onNewBoard}
              className="min-w-[9rem] flex-1 rounded-full bg-emerald-500 px-4 py-2 font-medium shadow-lg transition hover:bg-emerald-400 md:flex-none"
            >
              New Board
            </button>
            <button
              onClick={onResetView}
              className="min-w-[9rem] flex-1 rounded-full bg-sky-600 px-4 py-2 font-medium shadow-lg transition hover:bg-sky-500 md:flex-none"
            >
              Reset View
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default SandboxHud
