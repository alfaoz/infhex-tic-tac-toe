import { useState } from 'react'
import type { LobbyOptions, ShutdownState } from '@ih3t/shared'
import GameHudShell from './GameHudShell'
import { ShutdownTimer } from './ShutdownTimer'
import HudInfoBlock from './HudInfoBlock'
import { formatTimeControl } from '../../utils/gameTimeControl'
import { NavLink } from 'react-router'

export type HudPlayerInfo = {
  playerId: string,
  profileId: string | null,

  displayColor: string,
  displayName: string,

  isConnected: boolean,
}

interface GameScreenHudProps {
  sessionId: string
  localPlayerId: string | null
  players: HudPlayerInfo[]

  occupiedCellCount: number
  renderableCellCount: number

  gameOptions: LobbyOptions

  shutdown: ShutdownState | null

  leaveLabel?: string
  onLeave: () => void
  onResetView: () => void
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 8h14" />
      <path d="M5 12h14" />
      <path d="M5 16h14" />
    </svg>
  )
}

function OfflineIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8.5a16 16 0 0 1 20 0" />
      <path d="M5 12.5a11.5 11.5 0 0 1 14 0" />
      <path d="M8.5 16a6.5 6.5 0 0 1 7 0" />
      <path d="M12 19.5h.01" />
      <path d="M3 3 21 21" />
    </svg>
  )
}

function GameScreenHud({
  sessionId,

  players,
  localPlayerId,

  occupiedCellCount,
  renderableCellCount,

  shutdown,
  gameOptions,

  leaveLabel = 'Leave Game',
  onLeave,
  onResetView
}: Readonly<GameScreenHudProps>) {
  const [isHudOpen, setIsHudOpen] = useState(true)

  return (
    <GameHudShell
      role="left"
      isOpen={isHudOpen}
      onOpen={() => setIsHudOpen(true)}
      onClose={() => setIsHudOpen(false)}
      openTitle="Open HUD"
      openIcon={<MenuIcon />}
      closeTitle="Close HUD"
    >
      <div className="text-sm uppercase tracking-[0.25em] text-sky-300">Live Match {sessionId}</div>
      <h1 className="mt-1 text-2xl font-bold">Infinite Hex Tic-Tac-Toe</h1>
      <div className="mt-2 text-sm text-slate-300">
        Connect 6 hexagons in a row.<br />
        {localPlayerId ? 'Tap to place, drag to pan, pinch to zoom, right-drag to draw and right-click a line to erase.' : 'Drag to pan, pinch to zoom, right-drag to draw and right-click a line to erase.'}
      </div>

      {shutdown && (
        <div className="mt-4 rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">Shutdown Scheduled</div>
          <div className="mt-1">New games are disabled. This server restarts in <ShutdownTimer shutdown={shutdown} />.</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-1">
        <HudInfoBlock label="Game">
          <div className="text-white">{gameOptions.rated ? 'Rated Game' : 'Casual Game'}</div>
          <div className="text-slate-300">Clock {formatTimeControl(gameOptions.timeControl)}</div>
        </HudInfoBlock>

        <HudInfoBlock label="Cells">
          <div className="text-white">{renderableCellCount} active</div>
          <div className="text-slate-300">{occupiedCellCount} occupied</div>
        </HudInfoBlock>

        <HudInfoBlock label="Players">
          {players.map(({ playerId, profileId, displayColor, displayName, isConnected }) => (
            <div key={playerId} className="mt-1 flex items-center gap-2.5 text-white">
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/20 flex-shrink-0"
                style={{ backgroundColor: displayColor }}
              />
              {profileId ? (
                <NavLink to={`/profile/${profileId}`}>
                  {displayName}
                </NavLink>
              ) : (
                <span>{displayName}</span>
              )}

              {!isConnected && (
                <span
                  title={`${displayName} is offline`}
                  aria-label={`${displayName} is offline`}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-100"
                >
                  <OfflineIcon />
                </span>
              )}
              {playerId === localPlayerId && (
                <span className="rounded-md border border-white/10 bg-white/6 px-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  You
                </span>
              )}
            </div>
          ))}
        </HudInfoBlock>
      </div>

      <div className="pointer-events-auto mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onLeave}
          className="min-w-[9rem] flex-1 rounded-full bg-red-500 px-4 py-2 font-medium shadow-lg hover:bg-red-400 md:flex-none"
        >
          {leaveLabel}
        </button>
        <button
          onClick={onResetView}
          className="min-w-[9rem] flex-1 rounded-full bg-sky-600 px-4 py-2 font-medium shadow-lg hover:bg-sky-500 md:flex-none"
        >
          Reset View
        </button>
      </div>
    </GameHudShell>
  )
}

export default GameScreenHud
